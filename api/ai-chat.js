/**
 * AI Sales Chat — BLOCK 2
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
const { createOrMergeLead, logEvent: pipelineLogEvent } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode, GUARD_MODES } = require('../lib/alex-one-truth.js');

// Legacy support: hasContactCapture for lead detection + language helper
const { hasContactCapture, detectLanguage } = require('../lib/alex-v8-system.js');

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

  const { sessionId, messages, lang = 'en' } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return res.status(400).json({ error: 'sessionId required (string, max 128 chars)' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Detect language from messages (auto-detect if not provided)
  const detectedLang = lang && ['en', 'ru', 'uk', 'es'].includes(lang) ? lang : detectLanguage(messages);
  const safeLang = ['en', 'ru', 'uk', 'es'].includes(detectedLang) ? detectedLang : 'en';
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
  const userOnlyMessages = safeMessages.filter((m) => m.role === 'user');
  const sessionContext = await fetchSessionLeadContext(sessionId);
  const userMsgCount = userOnlyMessages.length;
  // Contact detection must look at user messages only (not assistant messages).
  const hasContact = hasContactCapture(userOnlyMessages) || sessionContext.hasContact;

  // ALEX v9: Guard mode determination and prompt building
  // Determine guard mode based on contact capture and message count
  const guardMode = getGuardMode({ hasContact, userMsgCount });

  // Build complete system prompt with dynamic guard suffix
  const systemPrompt = buildSystemPrompt({ guardMode });

  // Check API key
  if (!process.env.DEEPSEEK_API_KEY) {
    // Graceful fallback when key not configured
    return res.status(200).json({
      reply: 'Hi! I\'m Alex from Handy & Friend. We\'d love to help with your project! Please call us at (213) 361-1700 or use the quote form below — we respond within 1 hour.',
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

      // Optional: Retry with stricter guard if needed (safety measure)
      if (guardMode === GUARD_MODES.PRE_CONTACT_RANGE && shouldRegenerateForStrictRange({ guardMode, reply: rawReply })) {
        const strictPrompt = `${systemPrompt}\n\nCRITICAL: User has no contact yet. Give RANGES ONLY. No per-unit prices, no math, no lists.`;
        const retry = await callAlex(safeMessages, strictPrompt);
        rawReply = retry.reply;
      }

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
    return res.status(502).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }

  // Enforce a direct contact CTA before contact is captured to improve conversion.
  if (!hasContact && !isClearlyOutOfScopeRequest(latestUserText)) {
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
      const result = await createLead(leadData, sessionId, safeLang, safeMessages);
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
        const fallbackResult = await createLead(inferredLead, sessionId, safeLang, safeMessages);
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

  // Save conversation turn (fire-and-forget)
  const lastUser = safeMessages[safeMessages.length - 1];
  saveTurns(sessionId, leadId, lastUser?.content, reply).catch(err =>
    console.error('[AI_CHAT] saveTurns error:', err.message)
  );

  // Notify Telegram only for captured leads (cleaner signal, less noise).
  if (leadCaptured && leadId) {
    sendLeadCapturedToTelegram({
      sessionId,
      leadId,
      lang: safeLang,
      userText: lastUser?.content || '',
      aiReply: reply,
      photos: latestUserPhotos,
      lead: capturedLead
    }).catch((err) => console.error('[AI_CHAT] Telegram forward error:', err.message));
  }

  return res.status(200).json({
    reply,
    leadCaptured,
    leadId,
    guard_mode: guardMode,
    contact_captured: Boolean(sessionContext.hasContact || leadCaptured),
    price_detail_level: guardMode === 'post_contact_exact' ? 'exact' : 'range'
  });
}

// callDeepSeek has been replaced by callAlex() from lib/ai-fallback.js
// which provides automatic retry logic and static fallback when API is down

async function createLead(leadData, sessionId, lang, messages) {
  const { name, phone, email, service, description } = normalizeLeadPreview(leadData);

  if (!service || (!phone && !email)) {
    return { ok: false, error: 'missing_service_or_contact' };
  }

  try {
    // === PIPELINE: Smart dedup + lead creation ===
    const pipelineResult = await createOrMergeLead({
      name: String(name || 'Unknown').slice(0, 160),
      email: String(email || '').slice(0, 160),
      phone: String(phone || '').slice(0, 40),
      service_type: String(service || '').slice(0, 120),
      message: String(description || '').slice(0, 2000),
      source: 'website_chat',
      session_id: sessionId
    });

    const leadId = pipelineResult.id;

    // Log to pipeline event trail
    await pipelineLogEvent(leadId, 'ai_chat_capture', {
      service,
      lang,
      session_id: sessionId,
      is_new: pipelineResult.isNew,
      conversation_summary: buildSummary(messages, lang).slice(0, 500)
    }).catch(err => console.error('[PIPELINE_LOG]', err.message));

    console.log('[AI_CHAT] Lead captured:', leadId, service, phone || email, pipelineResult.isNew ? '(new)' : '(merged)');
    return { ok: true, leadId, lead: { name, phone, email, service, description } };

  } catch (err) {
    console.error('[AI_CHAT] Pipeline error:', err.message);
    // Fallback to legacy insertion
    console.warn('[FALLBACK_TO_LEGACY_INSERT]');
    const fallbackId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const record = {
      id: fallbackId,
      source: 'ai_chat',
      status: 'new',
      full_name: String(name || 'Unknown').slice(0, 160),
      phone: String(phone || '').slice(0, 40),
      email: String(email || '').slice(0, 160),
      service_type: String(service || '').slice(0, 120),
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
    return { ok: true, leadId: fallbackId, lead: { name, phone, email, service, description } };
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
  const contactLine = safeLeadData.phone || safeLeadData.email || '—';
  const locationLine = safeLeadData.city || safeLeadData.zip || '—';
  const text = `🔔 <b>LEAD_CAPTURED</b>\nName: <b>${escapeHtml(safeLeadData.name || 'Unknown')}</b>\nContact: <code>${escapeHtml(contactLine)}</code>\nService: ${escapeHtml(safeLeadData.service || '—')}\nArea: ${escapeHtml(locationLine)}\nSession: <code>${escapeHtml(safeSession)}</code>\nLead: <code>${escapeHtml(safeLead)}</code>\nLang: ${escapeHtml(String(lang || 'en').toUpperCase())}\nPhotos: ${photoCount}\n\n<b>User intent:</b> ${escapeHtml(String(userText || '—').slice(0, 320))}\n<b>Alex reply:</b> ${escapeHtml(String(aiReply || '—').slice(0, 320))}`;

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
    service: String(data.service || data.service_type || '').trim().slice(0, 120),
    description: String(data.description || data.problem_description || '').trim().slice(0, 600),
    city: String(data.city || '').trim().slice(0, 80),
    zip: String(data.zip || '').trim().slice(0, 16)
  };
}

function shouldRegenerateForStrictRange({ guardMode, reply }) {
  if (!reply || guardMode === 'post_contact_exact') return false;
  const text = String(reply || '').toLowerCase();

  const mathIntent = [' x ', ' × ', ' per door', '/door', 'per sq', '/sf', 'line item', 'breakdown', 'subtotal'];
  const exactSignals = ['exact', 'total is', 'that comes to', 'would come to', 'equals', 'formula'];
  const hasMathIntent = mathIntent.some((k) => text.includes(k));
  const hasExactSignal = exactSignals.some((k) => text.includes(k));
  const hasManyDollarValues = (text.match(/\$\s*\d[\d,.]*/g) || []).length >= 2;

  return (hasMathIntent && hasManyDollarValues) || (hasExactSignal && hasManyDollarValues);
}

function enforceContactCaptureCTA(reply, lang, guardMode) {
  const text = String(reply || '').trim();
  if (!text) return text;

  const asksForContact = /(phone|email|number|contact|call|text|телефон|почт|email|номер|контакт|phone\/email|телефон\/email|correo|telefono|n[uú]mero|контакт|дзвінок|пошта|номер)/i.test(text);
  if (asksForContact) return text;

  const ctaByLang = {
    en: guardMode === GUARD_MODES.NO_CONTACT_HARDENED
      ? 'Share your phone or email, or call (213) 361-1700 📲'
      : 'Your name and best phone or email? I’ll send exact numbers 📲',
    ru: guardMode === GUARD_MODES.NO_CONTACT_HARDENED
      ? 'Оставьте телефон или email, либо позвоните (213) 361-1700 📲'
      : 'Ваше имя и лучший телефон или email? Отправлю точный расчет 📲',
    uk: guardMode === GUARD_MODES.NO_CONTACT_HARDENED
      ? 'Залиште телефон або email, або телефонуйте (213) 361-1700 📲'
      : "Ваше ім'я та найкращий телефон або email? Надішлю точний розрахунок 📲",
    es: guardMode === GUARD_MODES.NO_CONTACT_HARDENED
      ? 'Deja tu telefono o email, o llama al (213) 361-1700 📲'
      : 'Tu nombre y mejor telefono o email? Te envio el calculo exacto 📲'
  };

  const cta = ctaByLang[lang] || ctaByLang.en;
  return `${text}\n\n${cta}`;
}

function inferLeadFromConversation(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const userText = messages.filter((m) => m.role === 'user').map((m) => String(m.content || ''));
  if (!userText.length) return null;
  const joined = userText.join('\n');
  const latest = userText[userText.length - 1] || '';

  const emailMatch = joined.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const phoneMatch = joined.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const email = emailMatch ? emailMatch[0].trim() : '';
  const phone = phoneMatch ? phoneMatch[0].trim() : '';
  if (!email && !phone) return null;

  const serviceType = inferServiceType(joined);
  if (!serviceType) return null;

  const nameMatch = joined.match(/\b(?:my name is|i am|this is|name[:\s])\s+([A-Za-z][A-Za-z' -]{1,40})/i);
  const rawName = nameMatch ? nameMatch[1].trim() : '';
  const name = rawName ? rawName.replace(/\s{2,}/g, ' ') : 'Unknown';
  const zipMatch = joined.match(/\b9\d{4}\b/);
  const cityMatch = joined.match(/\b(los angeles|hollywood|west hollywood|beverly hills|santa monica|burbank|glendale)\b/i);

  return {
    name,
    phone,
    email,
    service: serviceType,
    description: latest.slice(0, 500),
    zip: zipMatch ? zipMatch[0] : '',
    city: cityMatch ? cityMatch[1] : ''
  };
}

function inferServiceType(text) {
  const t = String(text || '').toLowerCase();
  const map = [
    ['cabinet painting', ['cabinet', 'door', 'drawer', 'kitchen cabinet']],
    ['furniture assembly', ['furniture assembly', 'assemble', 'ikea', 'bed frame', 'dresser']],
    ['furniture painting', ['furniture painting', 'refinish furniture', 'paint furniture']],
    ['interior painting', ['interior painting', 'paint walls', 'wall paint', 'ceiling paint', 'painting']],
    ['flooring', ['flooring', 'laminate', 'lvp', 'vinyl floor', 'floor install']],
    ['tv mounting', ['tv mount', 'tv mounting']],
    ['art hanging', ['mirror', 'art hanging', 'picture hanging', 'curtain']],
    ['plumbing', ['plumbing', 'faucet', 'toilet', 'shower head', 'caulk tub']],
    ['electrical', ['electrical', 'light fixture', 'outlet', 'switch', 'smart lock', 'doorbell']]
  ];
  for (const [service, keywords] of map) {
    if (keywords.some((k) => t.includes(k))) return service;
  }
  return '';
}

async function fetchSessionLeadContext(sessionId) {
  const config = getConfig();
  if (!config || !sessionId) return { hasContact: false };

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
    if (!resp.ok) return { hasContact: false };
    const data = await resp.json().catch(() => []);
    const row = Array.isArray(data) ? data[0] : null;
    const phone = String(row?.phone || '').trim();
    const email = String(row?.email || '').trim();
    return { hasContact: Boolean(phone || email) };
  } catch (_) {
    return { hasContact: false };
  }
}
