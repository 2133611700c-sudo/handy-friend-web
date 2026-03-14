/**
 * AI Sales Chat -- BLOCK 2
 * POST /api/ai-chat
 * Body: { sessionId, messages, lang }
 * Returns: { reply, leadCaptured, leadId }
 *
 * Requires: DEEPSEEK_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { restInsert, logLeadEvent, getConfig } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');
const { createHash } = require('node:crypto');
const { callAlex } = require('../lib/ai-fallback.js');
const { createOrMergeLead, transitionLead, logEvent: pipelineLogEvent } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode, GUARD_MODES, POLICY_VERSION } = require('../lib/alex-one-truth.js');
const { getPricingSourceVersion } = require('../lib/price-registry.js');
const {
  inferServiceType: inferServiceTypeShared,
  appendCrossSellNudge: appendCrossSellNudgeShared,
  stripDollarAmounts
} = require('../lib/alex-policy-engine.js');

// Legacy language helper; prompt logic is sourced only from alex-one-truth.js
const { detectLanguage } = require('../lib/alex-v8-system.js');

const PHOTO_DEDUP_WINDOW_MS = Number(process.env.TELEGRAM_PHOTO_DEDUP_MS || 10 * 60 * 1000);
const PHOTO_DEDUP_CACHE = globalThis.__HF_CHAT_PHOTO_DEDUP || new Map();
globalThis.__HF_CHAT_PHOTO_DEDUP = PHOTO_DEDUP_CACHE;

// Prompt source of truth is lib/alex-one-truth.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ip = getClientIp(req);
  const rate = checkRateLimit({
    key: `ai-chat:${ip}`,
    limit: 30,
    windowMs: 60 * 1000
  });
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ error: 'Too many chat messages. Please wait a moment.' });
  }

  const { sessionId, messages, lang = 'en', attribution } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return res.status(400).json({ error: 'sessionId required (string, max 128 chars)' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Prefer message language auto-detection to avoid mixed-language output when UI lang differs.
  const detectedLang = detectLanguage(messages);
  const safeLang = ['en', 'ru', 'uk', 'es'].includes(detectedLang)
    ? detectedLang
    : (['en', 'ru', 'uk', 'es'].includes(lang) ? lang : 'en');
  const latestUserPhotos = extractLatestUserPhotos(messages);

  // Sanitize and limit messages
  const safeMessages = messages
    .slice(-20) // max 20 turns history
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000)
    }))
    .filter(m => m.content.trim());

  if (!safeMessages.length) {
    return res.status(400).json({ error: 'No valid messages' });
  }
  const latestUserText = safeMessages[safeMessages.length - 1]?.content || '';

  // v11: Prompt injection defense -- detect and deflect
  if (hasPromptInjectionSignals(latestUserText)) {
    console.warn('[AI_CHAT] Prompt injection attempt detected:', latestUserText.slice(0, 100));
    const deflect = {
      en: "I can only help with our handyman services: painting, flooring, TV mounting, plumbing, and electrical. What project can I help you with?",
      ru: "Я могу помочь только с нашими услугами: покраска, полы, монтаж ТВ, сантехника, электрика. Какой у вас проект?",
      uk: "Я можу допомогти лише з нашими послугами: фарбування, підлога, монтаж ТВ, сантехніка, електрика. Який у вас проект?",
      es: "Solo puedo ayudar con nuestros servicios: pintura, pisos, montaje TV, plomeria, electrica. En que proyecto puedo ayudarte?"
    };
    return res.status(200).json({
      reply: deflect[safeLang] || deflect.en,
      leadCaptured: false, leadId: null, contact_captured: false, service: '', fallback_used: false
    });
  }
  const userOnlyMessages = safeMessages.filter((m) => m.role === 'user');
  const sessionContext = await fetchSessionLeadContext(sessionId);
  const userMsgCount = userOnlyMessages.length;
  const hasPhone = hasPhoneCapture(userOnlyMessages) || sessionContext.hasPhone;

  // ALEX v9: Guard mode determination and prompt building
  // Determine guard mode based on contact capture and message count
  const guardMode = getGuardMode({ hasPhone, userMsgCount });

  // Build complete system prompt with dynamic guard suffix
  const systemPrompt = buildSystemPrompt({ guardMode });

  // Check API key
  if (!process.env.DEEPSEEK_API_KEY) {
    // Graceful fallback when key not configured
    return res.status(200).json({
      reply: 'Hi! I\'m Alex from Handy & Friend. We\'d love to help with your project! Please call us at (213) 361-1700 or use the quote form below -- we respond within 1 hour.',
      leadCaptured: false,
      leadId: null,
      fallback: true
    });
  }

  let rawReply;
  try {
    if (isClearlyOutOfScopeRequest(latestUserText)) {
      rawReply = getOutOfScopeReply(safeLang);
    } else {
      // Use resilient AI fallback (handles retries and static fallback)
      // ALEX v9 system prompt handles all guard rules internally
      const alexResult = await callAlex(safeMessages, systemPrompt);
      rawReply = alexResult.reply;

      // v11: No more regeneration -- soft gate allows ranges pre-phone

      if (alexResult.model === 'static_fallback') {
        console.warn('[AI_CHAT] Using static fallback for DeepSeek API');
        await pipelineLogEvent(null, 'alex_fallback', {
          sessionId,
          reason: 'DeepSeek API down, using static fallback'
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[AI_CHAT] AI error:', err.message);
    // v11: Sales-safe fallback -- NEVER dead-end the conversation
    const salesFallback = {
      en: "I'm having a brief connection issue, but I can still help! Tell me about your project -- what service do you need? Share details and your phone number, and our manager will call with a quote within 30 minutes. Or call us: (213) 361-1700",
      ru: "Небольшой сбой связи, но я все равно могу помочь! Расскажите о проекте -- какая услуга нужна? Оставьте детали и номер телефона, наш менеджер перезвонит с расчетом в течение 30 минут. Или звоните: (213) 361-1700",
      uk: "Невеликий збій зв'язку, але я все одно можу допомогти! Розкажіть про проект -- яка послуга потрібна? Залиште деталі та номер телефону, наш менеджер передзвонить з розрахунком протягом 30 хвилин. Або телефонуйте: (213) 361-1700",
      es: "Tengo un breve problema de conexion, pero puedo ayudarte! Cuentame sobre tu proyecto -- que servicio necesitas? Comparte los detalles y tu numero de telefono, y nuestro gerente te llamara con un presupuesto en 30 minutos. O llama: (213) 361-1700"
    };
    rawReply = salesFallback[safeLang] || salesFallback.en;
  }

  // v11 Soft CTA: only append phone CTA every 3rd user message (not every reply)
  // Skip CTA if user explicitly declined giving phone in conversation
  const userDeclinedPhone = userOnlyMessages.some(m => {
    const t = String(m.content || '').toLowerCase();
    return (
      (t.includes('no phone') || t.includes('dont want') || t.includes("don't want") || t.includes('not giving') || t.includes('no number')) &&
      (t.includes('phone') || t.includes('number'))
    ) || (
      (t.includes('не хочу') || t.includes('не дам') || t.includes('не буду')) &&
      (t.includes('телефон') || t.includes('номер'))
    ) || (
      (t.includes('no quiero') || t.includes('no voy a dar')) &&
      (t.includes('telefono') || t.includes('numero'))
    );
  });
  if (!hasPhone && !isClearlyOutOfScopeRequest(latestUserText) && !userDeclinedPhone && userMsgCount % 3 === 0 && userMsgCount > 0) {
    rawReply = enforceContactCaptureCTA(rawReply, safeLang, guardMode);
  }

  // Extract lead-payload signal (format: ```lead-payload\n{...}\n```)
  const leadMatch = rawReply.match(/\n```lead-payload\s*\n(\{[\s\S]*?\})\n```\s*$/);
  let reply = rawReply;
  let leadCaptured = false;
  let leadId = null;
  let capturedLead = null;

  if (leadMatch) {
    // Strip the JSON marker from visible reply
    reply = rawReply.slice(0, leadMatch.index).trim();
    try {
      const leadData = JSON.parse(leadMatch[1]);
      const result = await createLead(leadData, sessionId, safeLang, safeMessages, attribution);
      if (result.ok) {
        leadCaptured = true;
        leadId = result.leadId;
        capturedLead = result.lead || normalizeLeadPreview(leadData);
      }
    } catch (parseErr) {
      console.error('[AI_CHAT] Lead payload parse error:', parseErr.message, leadMatch[1]);
    }
  }

  // Fallback capture when model did not return lead-payload block.
  if (!leadCaptured) {
    const inferredLead = inferLeadFromConversation(safeMessages);
    if (inferredLead) {
      try {
        const fallbackResult = await createLead(inferredLead, sessionId, safeLang, safeMessages, attribution);
        if (fallbackResult.ok) {
          leadCaptured = true;
          leadId = fallbackResult.leadId;
          capturedLead = fallbackResult.lead || normalizeLeadPreview(inferredLead);
        }
      } catch (err) {
        console.error('[AI_CHAT] Fallback lead inference failed:', err.message);
      }
    }
  }

  const serviceInference = inferServiceType(userOnlyMessages.map((m) => m.content).join('\n'));
  const inferredService = serviceInference.serviceId || '';
  const isStandalone = inferredService === 'plumbing' || inferredService === 'electrical';

  // v11: Strip cross-sell from plumbing/electrical (AI sometimes generates it despite prompt rules)
  if (isStandalone) {
    reply = stripCrossSellFromStandalone(reply);
  }

  if (guardMode === GUARD_MODES.POST_CONTACT_EXACT && !isClearlyOutOfScopeRequest(latestUserText) && !isStandalone) {
    const serviceForUpsell = String(capturedLead?.service || inferredService || '').toLowerCase();
    reply = appendCrossSellNudgeShared({ reply, lang: safeLang, serviceId: serviceForUpsell });
  }

  // Final output hygiene: keep chat text clean
  reply = stripMarkdownArtifacts(reply);
  // v11: prices are allowed pre-phone (ranges). No more dollar stripping.
  if (!isClearlyOutOfScopeRequest(latestUserText)) {
    reply = enforceMaterialPolicyHint(reply, latestUserText, safeLang);
  }

  // Save conversation turn (fire-and-forget)
  const lastUser = safeMessages[safeMessages.length - 1];
  saveTurns(sessionId, leadId, lastUser?.content, reply).catch(err =>
    console.error('[AI_CHAT] saveTurns error:', err.message)
  );

  // v11: Send photos to Telegram IMMEDIATELY (pre-lead) so owner sees all inquiries
  if (latestUserPhotos.length > 0 && !leadCaptured) {
    sendPreLeadPhotoToTelegram({
      sessionId,
      lang: safeLang,
      userText: lastUser?.content || '',
      photos: latestUserPhotos,
      serviceInference
    }).catch((err) => console.error('[AI_CHAT] Telegram pre-lead photo error:', err.message));
  }

  // v11: Strict Sales Card for captured leads
  if (leadCaptured && leadId) {
    await Promise.race([
      sendStrictSalesCard({
        sessionId,
        leadId,
        lang: safeLang,
        userText: lastUser?.content || '',
        aiReply: reply,
        photos: latestUserPhotos,
        lead: capturedLead,
        serviceInference,
        estimateMode: hasPhone ? 'exact' : 'range'
      }),
      sleep(1800)
    ]).catch((err) => console.error('[AI_CHAT] Telegram sales card error:', err.message));
  }

  // v11: enriched response contract
  const contactCaptured = Boolean(sessionContext.hasPhone || hasPhoneCapture(userOnlyMessages));
  // v11: Only expose fields the frontend needs. Internal state stays server-side.
  return res.status(200).json({
    reply,
    leadCaptured,
    leadId,
    contact_captured: contactCaptured,
    service: serviceInference.serviceId || '',
    fallback_used: false
  });
}

// callDeepSeek has been replaced by callAlex() from lib/ai-fallback.js
// which provides automatic retry logic and static fallback when API is down

async function createLead(leadData, sessionId, lang, messages, attributionInput) {
  const { name, phone, email, service, description } = normalizeLeadPreview(leadData);
  const normalizedService = service || 'unknown';

  if (!phone) {
    return { ok: false, error: 'missing_phone' };
  }

  try {
    // === PIPELINE: Smart dedup + lead creation ===
    const pipelineResult = await createOrMergeLead({
      name: String(name || 'Unknown').slice(0, 160),
      email: String(email || '').slice(0, 160),
      phone: String(phone || '').slice(0, 40),
      service_type: String(normalizedService || '').slice(0, 120),
      message: String(description || '').slice(0, 2000),
      source: 'website_chat',
      source_details: attributionInput && typeof attributionInput === 'object' ? attributionInput : undefined,
      session_id: sessionId
    });

    const leadId = pipelineResult.id;

    // Log to pipeline event trail
    await pipelineLogEvent(leadId, 'ai_chat_capture', {
      service: normalizedService,
      lang,
      session_id: sessionId,
      correlation_id: `ai_chat:${sessionId}`,
      idempotency_key: `ai_chat_capture:${sessionId}:${leadId}`,
      is_new: pipelineResult.isNew,
      conversation_summary: buildSummary(messages, lang).slice(0, 500)
    }).catch(err => console.error('[PIPELINE_LOG]', err.message));
    await transitionLead(leadId, 'contacted', {
      contacted_at: new Date().toISOString()
    }).catch(() => {});

    if (normalizedService === 'unknown') {
      await pipelineLogEvent(leadId, 'service_inference_failed', {
        source: 'website_chat',
        session_id: sessionId,
        correlation_id: `ai_chat:${sessionId}`,
        idempotency_key: `service_inference_failed:${sessionId}:${leadId}`,
        lang
      }).catch(() => {});
    }

    console.log('[AI_CHAT] Lead captured:', leadId, normalizedService, phone, pipelineResult.isNew ? '(new)' : '(merged)');
    return { ok: true, leadId, lead: { name, phone, email, service: normalizedService, description } };

  } catch (err) {
    console.error('[AI_CHAT] Pipeline error:', err.message);
    // Fallback to legacy insertion
    console.warn('[FALLBACK_TO_LEGACY_INSERT]');
    const fallbackId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const record = {
      id: fallbackId,
      source: 'website_chat',
      status: 'new',
      full_name: String(name || 'Unknown').slice(0, 160),
      phone: String(phone || '').slice(0, 40),
      email: String(email || '').slice(0, 160),
      service_type: String(normalizedService || '').slice(0, 120),
      problem_description: String(description || '').slice(0, 2000),
      ai_summary: buildSummary(messages, lang).slice(0, 2000),
      source_details: { session_id: sessionId, lang, channel: 'chat_widget' }
    };

    const result = await restInsert('leads', record, { returning: false });
    if (!result.ok && !result.skipped) {
      console.error('[AI_CHAT] Lead insert failed:', result.error, result.details || '');
      return { ok: false, error: result.error };
    }

    console.log('[AI_CHAT] Lead created (legacy fallback):', fallbackId);
    return { ok: true, leadId: fallbackId, lead: { name, phone, email, service: normalizedService, description } };
  }
}

async function saveTurns(sessionId, leadId, userMsg, assistantMsg) {
  const turns = [];
  if (userMsg) {
    turns.push({
      session_id: sessionId,
      lead_id: leadId || null,
      message_role: 'user',
      message_text: String(userMsg).slice(0, 4000)
    });
  }
  if (assistantMsg) {
    turns.push({
      session_id: sessionId,
      lead_id: leadId || null,
      message_role: 'assistant',
      message_text: String(assistantMsg).slice(0, 4000)
    });
  }
  if (!turns.length) return;
  await restInsert('ai_conversations', turns, { returning: false });
}

function buildSummary(messages, lang) {
  const turns = messages.slice(-6).map(m =>
    `${m.role === 'user' ? 'Client' : 'Alex'}: ${m.content}`
  );
  return `[AI Chat | ${lang.toUpperCase()}]\n` + turns.join('\n');
}

function extractLatestUserPhotos(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) return [];
  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    const msg = rawMessages[i];
    if (!msg || msg.role !== 'user') continue;
    const list = Array.isArray(msg.photos) ? msg.photos : [];
    return list.slice(0, 6).map((item, idx) => {
      if (typeof item === 'string') {
        return {
          dataUrl: item,
          name: `chat_photo_${idx + 1}.jpg`
        };
      }
      return {
        dataUrl: String(item?.dataUrl || ''),
        name: String(item?.name || `chat_photo_${idx + 1}.jpg`)
      };
    }).filter((p) => p.dataUrl.startsWith('data:image/'));
  }
  return [];
}

async function sendLeadCapturedToTelegram({ sessionId, leadId, lang, userText, aiReply, photos, lead }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const safeLead = String(leadId || 'pending');
  const safeSession = String(sessionId || 'unknown');
  const photoCount = Array.isArray(photos) ? photos.length : 0;
  const safeLeadData = normalizeLeadPreview(lead);
  const contactLine = safeLeadData.phone || '--';
  const locationLine = safeLeadData.city || safeLeadData.zip || '--';
  const text = `🔔 <b>LEAD_CAPTURED</b>\nName: <b>${escapeHtml(safeLeadData.name || 'Unknown')}</b>\nContact: <code>${escapeHtml(contactLine)}</code>\nService: ${escapeHtml(safeLeadData.service || '--')}\nArea: ${escapeHtml(locationLine)}\nSession: <code>${escapeHtml(safeSession)}</code>\nLead: <code>${escapeHtml(safeLead)}</code>\nLang: ${escapeHtml(String(lang || 'en').toUpperCase())}\nPhotos: ${photoCount}\n\n<b>User intent:</b> ${escapeHtml(String(userText || '--').slice(0, 320))}\n<b>Alex reply:</b> ${escapeHtml(String(aiReply || '--').slice(0, 320))}`;

  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  const msgData = await msgRes.json().catch(() => ({}));
  if (!msgRes.ok || !msgData.ok) {
    throw new Error(msgData?.description || `sendMessage failed (${msgRes.status})`);
  }

  if (!photoCount) return;

  const dedup = filterDedupedPhotos(safeSession, photos);
  const photoQueue = dedup.photos;
  const dedupSkippedCount = dedup.skipped;
  const sentIds = [];
  const failedPhotos = [];

  for (let i = 0; i < photoQueue.length; i += 1) {
    const result = await sendTelegramPhotoWithRetry(token, chatId, photoQueue[i], {
      caption: i === 0 ? `📸 Chat photos\nLead: ${safeLead}\nSession: ${safeSession}` : ''
    });

    if (result.ok) {
      if (result.messageId) sentIds.push(result.messageId);
    } else {
      failedPhotos.push({
        idx: i,
        file: sanitizeName(photoQueue[i]?.name || `photo_${i + 1}.jpg`),
        error: result.error || 'telegram_send_photo_failed',
        attempts: result.attempts || 1
      });
    }
  }

  const photosForwardedCount = sentIds.length;
  console.log('[AI_CHAT_PHOTO_FORWARD]', JSON.stringify({
    session_id: safeSession,
    lead_id: leadId || null,
    photos_total: photoCount,
    photos_after_dedup: photoQueue.length,
    photos_forwarded_count: photosForwardedCount,
    telegram_photo_sent_ids: sentIds,
    dedup_skipped_count: dedupSkippedCount,
    failed_count: failedPhotos.length
  }));

  if (leadId) {
    await logLeadEvent(safeLead, failedPhotos.length ? 'telegram_failed' : 'telegram_sent', {
      stage: 'ai_chat_forward',
      session_id: safeSession,
      photos_total: photoCount,
      photos_after_dedup: photoQueue.length,
      photos_forwarded_count: photosForwardedCount,
      telegram_photo_sent_ids: sentIds,
      dedup_skipped_count: dedupSkippedCount
    });
  }

  if (failedPhotos.length) {
    await logLeadEvent(leadId || null, 'chat_photo_telegram_failed', {
      stage: 'ai_chat_forward',
      session_id: safeSession,
      lead_id: leadId || null,
      photos_total: photoCount,
      photos_after_dedup: photoQueue.length,
      failed_count: failedPhotos.length,
      failed: failedPhotos
    });
  }
}

// v11: Pre-lead photo notification -- owner sees photos BEFORE phone is captured
async function sendPreLeadPhotoToTelegram({ sessionId, lang, userText, photos, serviceInference }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const service = serviceInference?.serviceId || 'unknown';
  const confidence = serviceInference?.confidence || 0;
  const text = `📷 <b>NEW_INQUIRY</b> (no phone yet)\n` +
    `Service: ${escapeHtml(service)} (${Math.round(confidence * 100)}%)\n` +
    `Lang: ${escapeHtml(String(lang || 'en').toUpperCase())}\n` +
    `Session: <code>${escapeHtml(String(sessionId || 'unknown'))}</code>\n` +
    `Photos: ${photos.length}\n\n` +
    `<b>User:</b> ${escapeHtml(String(userText || '').slice(0, 400))}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  }).catch(() => {});

  // Forward photos
  const dedup = filterDedupedPhotos(String(sessionId || 'unknown'), photos);
  for (let i = 0; i < dedup.photos.length; i++) {
    await sendTelegramPhotoWithRetry(token, chatId, dedup.photos[i], {
      caption: i === 0 ? `📸 Pre-lead inquiry\nSession: ${String(sessionId || '').slice(0, 40)}` : ''
    }).catch(() => {});
  }
}

// v11: Strict Sales Card -- structured lead notification with next action + SLA
async function sendStrictSalesCard({ sessionId, leadId, lang, userText, aiReply, photos, lead, serviceInference, estimateMode }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const safeLead = normalizeLeadPreview(lead);
  const photoCount = Array.isArray(photos) ? photos.length : 0;
  const service = safeLead.service || serviceInference?.serviceId || 'unknown';
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + 60 * 60 * 1000); // +1hr
  const slaTime = slaDeadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });

  const text = `🔔 <b>LEAD_CAPTURED</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Name: <b>${escapeHtml(safeLead.name || 'Unknown')}</b>\n` +
    `📱 Phone: <code>${escapeHtml(safeLead.phone || '--')}</code>\n` +
    `🔧 Service: ${escapeHtml(service)}\n` +
    `📍 Area: ${escapeHtml(safeLead.city || safeLead.zip || '--')}\n` +
    `🌐 Lang: ${escapeHtml(String(lang || 'en').toUpperCase())}\n` +
    `📷 Photos: ${photoCount}\n` +
    `💰 Estimate: ${escapeHtml(estimateMode || 'range')}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>Next action:</b> Call customer\n` +
    `⏰ <b>SLA deadline:</b> ${slaTime} PT\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Session: <code>${escapeHtml(String(sessionId || ''))}</code>\n` +
    `Lead: <code>${escapeHtml(String(leadId || ''))}</code>\n\n` +
    `<b>User:</b> ${escapeHtml(String(userText || '').slice(0, 300))}\n` +
    `<b>Alex:</b> ${escapeHtml(String(aiReply || '').slice(0, 300))}`;

  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const msgData = await msgRes.json().catch(() => ({}));
  if (!msgRes.ok || !msgData.ok) {
    if (leadId) {
      await pipelineLogEvent(leadId, 'telegram_failed', {
        source: 'ai_chat',
        step: 'sendMessage',
        session_id: sessionId,
        error: String(msgData?.description || `sendMessage_${msgRes.status}`).slice(0, 300)
      }).catch(() => {});
    }
    throw new Error(msgData?.description || `sendMessage failed (${msgRes.status})`);
  }

  const sentPhotoIds = [];
  const failedPhotos = [];

  // Forward photos if any
  if (!photoCount) {
    if (leadId) {
      await pipelineLogEvent(leadId, 'telegram_sent', {
        source: 'ai_chat',
        session_id: sessionId,
        message_id: msgData?.result?.message_id || null,
        photos_total: 0,
        photos_sent: 0
      }).catch(() => {});
    }
    return;
  }
  const dedup = filterDedupedPhotos(String(sessionId || 'unknown'), photos);
  for (let i = 0; i < dedup.photos.length; i++) {
    const result = await sendTelegramPhotoWithRetry(token, chatId, dedup.photos[i], {
      caption: i === 0 ? `📸 Lead photos\nLead: ${String(leadId || '').slice(0, 40)}` : ''
    }).catch((err) => ({ ok: false, error: String(err?.message || 'send_photo_error').slice(0, 300) }));
    if (result?.ok) sentPhotoIds.push(result.messageId || null);
    else failedPhotos.push({ i, error: result?.error || 'send_photo_failed' });
  }

  if (leadId) {
    if (failedPhotos.length) {
      await pipelineLogEvent(leadId, 'telegram_failed', {
        source: 'ai_chat',
        step: 'sendPhoto',
        session_id: sessionId,
        message_id: msgData?.result?.message_id || null,
        photos_total: dedup.photos.length,
        photos_sent: sentPhotoIds.filter(Boolean).length,
        dedup_skipped_count: dedup.skipped,
        failed_count: failedPhotos.length,
        failed: failedPhotos.slice(0, 5)
      }).catch(() => {});
    } else {
      await pipelineLogEvent(leadId, 'telegram_sent', {
        source: 'ai_chat',
        session_id: sessionId,
        message_id: msgData?.result?.message_id || null,
        photo_message_ids: sentPhotoIds.filter(Boolean),
        photos_total: dedup.photos.length,
        photos_sent: sentPhotoIds.filter(Boolean).length,
        dedup_skipped_count: dedup.skipped
      }).catch(() => {});
    }
  }
}

async function sendTelegramPhotoWithRetry(token, chatId, photo, { caption = '' } = {}) {
  const first = await sendTelegramPhoto(token, chatId, photo, { caption });
  if (first.ok) return { ...first, attempts: 1 };

  const retryMs = randomInt(2000, 5000);
  await sleep(retryMs);
  const second = await sendTelegramPhoto(token, chatId, photo, { caption });
  if (second.ok) return { ...second, attempts: 2 };
  return {
    ok: false,
    attempts: 2,
    error: second.error || first.error || 'telegram_send_photo_failed'
  };
}

async function sendTelegramPhoto(token, chatId, photo, { caption = '' } = {}) {
  if (!photo || typeof photo.dataUrl !== 'string') {
    return { ok: false, error: 'invalid_photo_payload' };
  }
  const parts = photo.dataUrl.split(',');
  if (parts.length !== 2) {
    return { ok: false, error: 'invalid_data_url' };
  }
  const [meta, b64] = parts;
  const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64$/i.exec(meta);
  const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return { ok: false, error: 'unsupported_mime_type' };
  }

  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
    return { ok: false, error: 'invalid_or_large_buffer' };
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption.slice(0, 900));
  form.append('photo', new Blob([buffer], { type: mimeType }), sanitizeName(photo.name));

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    return {
      ok: false,
      error: String(data?.description || `sendPhoto_${response.status}`).slice(0, 300)
    };
  }
  return {
    ok: true,
    messageId: data?.result?.message_id || null
  };
}

function filterDedupedPhotos(sessionId, photos) {
  const now = Date.now();
  cleanupPhotoDedup(now);
  const keyPrefix = String(sessionId || 'unknown');
  const deduped = [];
  let skipped = 0;

  for (const photo of photos) {
    const hash = hashPhotoDataUrl(photo?.dataUrl || '');
    if (!hash) {
      deduped.push(photo);
      continue;
    }
    const key = `${keyPrefix}:${hash}`;
    const expiresAt = PHOTO_DEDUP_CACHE.get(key);
    if (expiresAt && expiresAt > now) {
      skipped += 1;
      continue;
    }
    PHOTO_DEDUP_CACHE.set(key, now + PHOTO_DEDUP_WINDOW_MS);
    deduped.push(photo);
  }

  return { photos: deduped, skipped };
}

function hashPhotoDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return '';
  try {
    return createHash('sha256').update(dataUrl).digest('hex').slice(0, 24);
  } catch (_) {
    return '';
  }
}

function cleanupPhotoDedup(now) {
  if (PHOTO_DEDUP_CACHE.size < 250) return;
  for (const [key, expiresAt] of PHOTO_DEDUP_CACHE.entries()) {
    if (!expiresAt || expiresAt <= now) {
      PHOTO_DEDUP_CACHE.delete(key);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function sanitizeName(name) {
  return String(name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo.jpg';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isClearlyOutOfScopeRequest(text) {
  const t = String(text || '').toLowerCase();
  if (!t || t.length < 6) return false;

  const supported = [
    'cabinet', 'kitchen cabinet', 'door spray', 'drawer', 'furniture assembly', 'furniture painting', 'interior painting',
    'painting', 'flooring', 'lvp', 'laminate', 'tv mounting', 'tv mount', 'mirror', 'art hanging', 'curtain',
    'plumbing', 'faucet', 'shower head', 'toilet repair', 'electrical', 'light fixture', 'outlet', 'switch',
    'сантех', 'сантехника', 'электрик', 'электрика', 'монтаж тв', 'шкаф', 'покраск', 'плинтус', 'пол', 'ламинат',
    'підлог', 'фарбув', 'шаф', 'збірк', 'монтаж', 'розетк', 'сантехн',
    'pintura', 'gabinete', 'muebles', 'ensamblaje', 'pisos', 'plomería', 'plomeria', 'eléctrica', 'electrica', 'montaje tv'
  ];
  if (supported.some((k) => t.includes(k))) return false;

  const requestSignals = [
    'need', 'quote', 'estimate', 'price', 'cost', 'can you', 'do you', 'help with', 'service',
    'нужн', 'можете', 'делаете', 'цена', 'стоим', 'смет', 'помочь',
    'потріб', 'робите', 'ціна', 'кошторис', 'допомог',
    'necesito', 'pueden', 'hacen', 'precio', 'cotización', 'cotizacion', 'servicio'
  ];
  if (!requestSignals.some((k) => t.includes(k))) return false;

  const outOfScope = [
    'roof', 'roofing', 'hvac', 'ac repair', 'air conditioner', 'heating', 'solar', 'landscaping', 'lawn', 'gardening',
    'tree trimming', 'pest control', 'moving', 'cleaning service', 'house cleaning', 'car repair', 'auto repair',
    'legal advice', 'attorney', 'doctor', 'medical', 'tax', 'loan', 'mortgage', 'insurance policy',
    'крыш', 'кондиционер', 'авто', 'машин', 'юрист', 'медицин', 'налог', 'кредит',
    'дах', 'авто', 'юрист', 'меди', 'подат', 'кредит',
    'techo', 'aire acondicionado', 'jardinería', 'jardineria', 'mudanza', 'abogado', 'médic', 'medic', 'impuestos', 'préstamo', 'prestamo'
  ];
  return outOfScope.some((k) => t.includes(k));
}

function getOutOfScopeReply(lang) {
  const map = {
    en: "We only handle services listed on our website. This request is outside our service scope.",
    ru: "Мы работаем только с услугами, указанными на сайте. Этот запрос не входит в наш сервис.",
    uk: "Ми працюємо тільки з послугами, вказаними на сайті. Цей запит не входить у наш сервіс.",
    es: "Solo trabajamos con servicios publicados en nuestro sitio. Esta solicitud esta fuera de nuestro alcance."
  };
  return map[lang] || map.en;
}

function normalizeLeadPreview(leadData) {
  const data = leadData && typeof leadData === 'object' ? leadData : {};
  return {
    name: String(data.name || '').trim().slice(0, 160) || 'Unknown',
    phone: String(data.phone || '').trim().slice(0, 40),
    email: String(data.email || '').trim().slice(0, 160),
    service: extractServiceString(data.service || data.service_type || '').slice(0, 120),
    description: String(data.description || data.problem_description || '').trim().slice(0, 600),
    city: String(data.city || '').trim().slice(0, 80),
    zip: String(data.zip || '').trim().slice(0, 16)
  };
}

/**
 * Safely extract service_type as a string.
 * Handles: string, object ({serviceId: '...'}), null/undefined.
 * Prevents [object Object] from ever reaching the database.
 */
function extractServiceString(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    return String(raw.serviceId || raw.service_id || raw.id || raw.name || '').trim();
  }
  return String(raw).trim();
}

function hasPhoneCapture(messages) {
  if (!Array.isArray(messages) || !messages.length) return false;
  const fullText = messages.map((m) => String(m.content || '')).join(' ');
  const phoneRegex = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
  return phoneRegex.test(fullText);
}



function enforceContactCaptureCTA(reply, lang) {
  const text = String(reply || '').trim();
  if (!text) return text;

  const asksForContact = /(phone|number|call|text|телефон|номер|дзвінок|telefono|n[uú]mero|\(213\))/i.test(text);
  if (asksForContact) return text;

  // v11: Soft CTA -- booking-focused, not aggressive
  const ctaByLang = {
    en: 'For exact pricing and to book a date, share your phone number or call (213) 361-1700',
    ru: 'Для точного расчета и бронирования оставьте номер или позвоните (213) 361-1700',
    uk: 'Для точного розрахунку та бронювання залиште номер або телефонуйте (213) 361-1700',
    es: 'Para precio exacto y reservar fecha, comparte tu numero o llama al (213) 361-1700'
  };

  const cta = ctaByLang[lang] || ctaByLang.en;
  return `${text}\n\n${cta}`;
}

function appendCrossSellNudge(reply, lang, service) {
  const text = String(reply || '').trim();
  if (!text) return text;
  if (hasCrossSellNudge(text)) return text;

  const map = {
    en: {
      cabinet: "Also, we can bundle wall refresh while cabinets dry to save a trip.",
      paint: "Also, we can add baseboards or ceiling in the same visit for one finish style.",
      flooring: "Also, we can paint baseboards while flooring is in progress for a clean final look.",
      tv: "Also, we can hang mirrors or art in the same visit.",
      furniture: "Also, we can add TV or shelf mounting in the same trip.",
      plumbing: "Also, we can include a light fixture swap in the same visit.",
      electrical: "Also, we can include smart lock or doorbell install in the same visit.",
      generic: "Also, we can bundle one more service in the same visit to save a trip."
    },
    ru: {
      cabinet: "Также можем сразу обновить стены, пока фасады сохнут -- это экономит выезд.",
      paint: "Также можем добавить потолок или плинтус в этот же визит для единого финиша.",
      flooring: "Также можем покрасить плинтус во время укладки пола для аккуратного финала.",
      tv: "Также можем повесить зеркала или картины в тот же визит.",
      furniture: "Также можем добавить монтаж ТВ или полок в ту же поездку.",
      plumbing: "Также можем заменить светильник в этот же визит.",
      electrical: "Также можем установить smart-lock или doorbell в этот же визит.",
      generic: "Также можем объединить еще одну услугу в этот же визит и сэкономить выезд."
    },
    uk: {
      cabinet: "Також можемо оновити стіни, поки фасади сохнуть -- це економить виїзд.",
      paint: "Також можемо додати стелю або плінтус у цей же візит для єдиного фінішу.",
      flooring: "Також можемо пофарбувати плінтус під час укладання підлоги для чистого фіналу.",
      tv: "Також можемо повісити дзеркала або картини в той самий візит.",
      furniture: "Також можемо додати монтаж ТВ або полиць у ту ж поїздку.",
      plumbing: "Також можемо замінити світильник у цей самий візит.",
      electrical: "Також можемо встановити smart-lock або doorbell у цей самий візит.",
      generic: "Також можемо об'єднати ще одну послугу в цей же візит і зекономити виїзд."
    },
    es: {
      cabinet: "Tambien podemos incluir pintura de paredes mientras secan los gabinetes para ahorrar una visita.",
      paint: "Tambien podemos agregar techo o zocalos en la misma visita para un acabado uniforme.",
      flooring: "Tambien podemos pintar zocalos mientras se instala el piso para un cierre limpio.",
      tv: "Tambien podemos colgar espejos o cuadros en la misma visita.",
      furniture: "Tambien podemos agregar montaje de TV o repisas en el mismo viaje.",
      plumbing: "Tambien podemos incluir cambio de luminaria en la misma visita.",
      electrical: "Tambien podemos incluir instalacion de smart lock o timbre en la misma visita.",
      generic: "Tambien podemos agrupar un servicio mas en la misma visita para ahorrar un viaje."
    }
  };

  const local = map[lang] || map.en;
  let line = local.generic;
  if (service.includes('cabinet')) line = local.cabinet;
  else if (service.includes('interior painting') || service.includes('painting')) line = local.paint;
  else if (service.includes('flooring')) line = local.flooring;
  else if (service.includes('tv')) line = local.tv;
  else if (service.includes('furniture assembly')) line = local.furniture;
  else if (service.includes('plumbing')) line = local.plumbing;
  else if (service.includes('electrical')) line = local.electrical;

  return `${text}\n\n${line}`;
}

function hasCrossSellNudge(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('also') ||
    t.includes('также') ||
    t.includes('також') ||
    t.includes('tambien') ||
    t.includes('bundle') ||
    t.includes('same visit') ||
    t.includes('same trip') ||
    t.includes('baseboard') ||
    t.includes('зеконом') ||
    t.includes('в этот же визит') ||
    t.includes('в той самий візит') ||
    t.includes('mismo viaje') ||
    t.includes('misma visita')
  );
}

function inferLeadFromConversation(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const userText = messages.filter((m) => m.role === 'user').map((m) => String(m.content || ''));
  if (!userText.length) return null;
  const joined = userText.join('\n');
  const latest = userText[userText.length - 1] || '';

  const phoneMatch = joined.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';
  if (!phone) return null;

  const serviceResult = inferServiceType(joined);
  const serviceType = serviceResult.serviceId || 'unknown';

  const nameMatch = joined.match(/\b(?:my name is|i am|this is|name[:\s])\s+([A-Za-z][A-Za-z' -]{1,40})/i);
  const rawName = nameMatch ? nameMatch[1].trim() : '';
  const name = rawName ? rawName.replace(/\s{2,}/g, ' ') : 'Unknown';
  const zipMatch = joined.match(/\b9\d{4}\b/);
  const cityMatch = joined.match(/\b(los angeles|hollywood|west hollywood|beverly hills|santa monica|burbank|glendale)\b/i);

  return {
    name,
    phone,
    email: '',
    service: serviceType,
    description: latest.slice(0, 500),
    zip: zipMatch ? zipMatch[0] : '',
    city: cityMatch ? cityMatch[1] : ''
  };
}

function hasPromptInjectionSignals(text) {
  const t = String(text || '').toLowerCase();
  const patterns = [
    /ignore\s+(your|all|previous|prior)\s+(instructions?|rules?|prompt)/,
    /reveal\s+(your|the|system)\s+(prompt|instructions?|rules?)/,
    /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/,
    /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?)/,
    /forget\s+(your|all|previous)\s+(rules?|instructions?)/,
    /override\s+(your|the|all)\s+(rules?|settings?|instructions?)/,
    /\b(admin|debug|developer|sudo|root)\s+mode\b/,
    /pretend\s+(you\s+)?(are|to\s+be)\s+(a|an|the)\b/,
    /act\s+as\s+(if|a|an|the)\b/,
    /you\s+are\s+now\s+(a|an|in)\b/,
    /\bdisregard\b.*\b(above|previous|prior|instructions?)\b/,
    /\bjailbreak\b/,
    /\bDAN\b.*\bmode\b/,
    /print\s+(your|the)\s+(system|initial)\s+(prompt|message)/
  ];
  return patterns.some(p => p.test(t));
}

function inferServiceType(text) {
  return inferServiceTypeShared(text); // returns { serviceId, confidence }
}

/**
 * v11: Strip cross-sell/upsell paragraphs from plumbing/electrical responses.
 * AI sometimes generates "also we can re-caulk..." despite prompt rules.
 */
function stripCrossSellFromStandalone(text) {
  const t = String(text || '');
  // Remove paragraphs containing cross-sell signals
  const lines = t.split('\n\n');
  const filtered = lines.filter(paragraph => {
    const p = paragraph.toLowerCase();
    const hasCrossSell = (
      (p.includes('also') && (p.includes('same visit') || p.includes('while we') || p.includes('book both') || p.includes('save 20'))) ||
      (p.includes('by the way') && (p.includes('same visit') || p.includes('save 20'))) ||
      (p.includes('bundle') && p.includes('save')) ||
      /\bкстати\b.*визит/i.test(p) ||
      /\bдо речі\b.*візит/i.test(p) ||
      /\bpor cierto\b.*visita/i.test(p)
    );
    return !hasCrossSell;
  });
  return filtered.join('\n\n').trim();
}

function stripMarkdownArtifacts(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}


function enforceMaterialPolicyHint(reply, userText, lang) {
  const r = String(reply || '').trim();
  const u = String(userText || '').toLowerCase();
  if (!u) return r;

  const asksMaterials = /(material|materials|входят|материал|включ|materiales|incluye|incluidos|incluye)/i.test(u);
  if (!asksMaterials) return r;

  const serviceResult = inferServiceType(u);
  const service = serviceResult.serviceId || '';
  const alreadyMentions = /(labor-only|materials.*separate|you purchase.*materials|материалы.*отдель|материалы.*самостоятель|только работа|solo mano de obra|materiales.*separ|cliente.*compra.*material|premium paint.*included|краска.*включ|pintura.*incluid)/i.test(r);
  if (alreadyMentions) return r;

  const byLang = {
    en: {
      cabinet: 'For cabinet painting, premium paint, primer, degreasing, and prep are included.',
      labor: 'For this service, it is labor-only. You purchase and provide materials.'
    },
    ru: {
      cabinet: 'Для покраски кухонных фасадов краска, грунт, обезжиривание и подготовка включены.',
      labor: 'По этой услуге это только работа. Материалы покупаете и предоставляете вы.'
    },
    uk: {
      cabinet: 'Для фарбування кухонних фасадів фарба, ґрунт, знежирення і підготовка включені.',
      labor: 'За цією послугою це тільки робота. Матеріали купуєте та надаєте ви.'
    },
    es: {
      cabinet: 'Para pintura de gabinetes, pintura premium, primer, desengrasado y preparación están incluidos.',
      labor: 'Para este servicio es solo mano de obra. Usted compra y proporciona los materiales.'
    }
  };
  const l = byLang[lang] || byLang.en;
  const line = service.includes('cabinet') ? l.cabinet : l.labor;
  return `${r}\n\n${line}`.trim();
}

async function fetchSessionLeadContext(sessionId) {
  const config = getConfig();
  if (!config || !sessionId) return { hasPhone: false, hasContact: false };

  try {
    const query = new URLSearchParams({
      select: 'phone,email',
      session_id: `eq.${sessionId}`,
      order: 'created_at.desc',
      limit: '1'
    }).toString();
    const resp = await fetch(`${config.projectUrl}/rest/v1/leads?${query}`, {
      method: 'GET',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Accept: 'application/json'
      }
    });
    if (!resp.ok) return { hasPhone: false, hasContact: false };
    const data = await resp.json().catch(() => []);
    const row = Array.isArray(data) ? data[0] : null;
    const phone = String(row?.phone || '').trim();
    const email = String(row?.email || '').trim();
    return { hasPhone: Boolean(phone), hasContact: Boolean(phone || email) };
  } catch (_) {
    return { hasPhone: false, hasContact: false };
  }
}
