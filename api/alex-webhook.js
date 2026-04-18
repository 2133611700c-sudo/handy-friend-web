/**
 * Facebook Messenger webhook for Alex
 * GET  /api/alex-webhook -> Meta webhook verification
 * POST /api/alex-webhook -> inbound messages, AI reply, send back to Messenger
 *
 * Required env:
 * - FB_VERIFY_TOKEN
 * - FB_PAGE_ACCESS_TOKEN
 * - DEEPSEEK_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const { restInsert, getConfig, logLeadEvent } = require('./_lib/supabase-admin.js');
const { callAlex } = require('../lib/ai-fallback.js');
const { processInbound, transitionLead, logEvent: pipelineLogEvent, drainOutboxInline } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode, GUARD_MODES } = require('../lib/alex-one-truth.js');
const { getMessengerPostbackTexts, getPricingSourceVersion } = require('../lib/price-registry.js');
const { inferServiceType: inferServiceTypeShared } = require('../lib/alex-policy-engine.js');
const { createEnvelope } = require('../lib/inbound-envelope.js');
const { sendTelegramMessage: unifiedTelegramSend, sendTelegramPhoto: unifiedTelegramPhoto } = require('../lib/telegram/send.js');

const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v19.0';
const MAX_HISTORY_TURNS = 16;

// ─── Webhook dedup (Meta can re-deliver the same event) ─────────────────────
const WEBHOOK_SEEN_TTL = 5 * 60 * 1000; // 5 minutes
const webhookSeen = globalThis.__HF_FB_WEBHOOK_SEEN || new Map();
globalThis.__HF_FB_WEBHOOK_SEEN = webhookSeen;

function webhookDedupKey(event) {
  const mid = event?.message?.mid || '';
  const sender = event?.sender?.id || '';
  const ts = event?.timestamp || '';
  return mid ? `mid:${mid}` : `${sender}:${ts}`;
}

function isWebhookDuplicate(event) {
  const key = webhookDedupKey(event);
  if (!key) return false;
  const now = Date.now();
  // Cleanup old entries
  if (webhookSeen.size > 500) {
    for (const [k, t] of webhookSeen) { if (now - t > WEBHOOK_SEEN_TTL) webhookSeen.delete(k); }
  }
  if (webhookSeen.has(key)) return true;
  webhookSeen.set(key, now);
  return false;
}

const POSTBACK_RESPONSES = getMessengerPostbackTexts();

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return verifyWebhook(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body || {};
  if (body.object !== 'page') {
    return res.status(404).json({ error: 'Unsupported webhook object' });
  }

  const errors = [];
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (isWebhookDuplicate(event)) {
        console.log('[ALEX_WEBHOOK] Dedup skip:', webhookDedupKey(event));
        continue;
      }
      try {
        await handleMessagingEvent(event);
      } catch (err) {
        const msg = String(err?.message || err || 'Unknown error');
        errors.push(msg);
        console.error('[ALEX_WEBHOOK] Event processing error:', msg);
      }
    }
  }

  if (errors.length) {
    // Always ack the webhook to avoid repeated delivery loops from Meta.
    console.error('[ALEX_WEBHOOK] Completed with errors:', errors.slice(0, 5));
  }

  return res.status(200).send('EVENT_RECEIVED');
}

module.exports = handler;

function verifyWebhook(req, res) {
  const verifyToken = String(process.env.FB_VERIFY_TOKEN || '').trim();
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const urlQuery = parseUrlQuery(req?.url || '');

  const mode = firstNonEmpty(query['hub.mode'], urlQuery.get('hub.mode'));
  const token = firstNonEmpty(query['hub.verify_token'], urlQuery.get('hub.verify_token')).trim();
  const challenge = firstNonEmpty(query['hub.challenge'], urlQuery.get('hub.challenge'));

  if (!verifyToken) {
    return res.status(500).send('FB_VERIFY_TOKEN is not configured');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(String(challenge || 'ok'));
  }
  return res.status(403).send('Forbidden');
}

function parseUrlQuery(url) {
  try {
    const base = 'https://handyandfriend.com';
    return new URL(url, base).searchParams;
  } catch (_) {
    return new URLSearchParams();
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) {
      const candidate = String(value[0] || '').trim();
      if (candidate) return candidate;
      continue;
    }
    const candidate = String(value || '').trim();
    if (candidate) return candidate;
  }
  return '';
}

async function handleMessagingEvent(event) {
  const senderId = String(event?.sender?.id || '');
  if (!senderId) return;

  if (event.message?.is_echo) return;

  const postbackPayload = event.postback?.payload || '';
  const postbackText = POSTBACK_RESPONSES[postbackPayload];
  if (postbackText) {
    await sendFacebookMessage(senderId, postbackText);
    if (postbackPayload !== 'GET_STARTED') {
      await saveTurns(`fb_${senderId}`, null, `[${postbackPayload}]`, postbackText);
    }
    return;
  }

  const inboundText = normalizeInboundText(event);
  if (!inboundText) return;

  const sessionId = `fb_${senderId}`;
  const history = await loadConversationHistory(sessionId);
  const messages = [...history, { role: 'user', content: inboundText }].slice(-20);
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const sessionContext = await fetchSessionLeadContext(sessionId);
  const hasPhone = sessionContext.hasPhone || hasPhoneCapture(messages);
  const hasContact = hasPhone || hasEmailCapture(messages) || sessionContext.hasContact;

  const guardMode = getGuardMode({ hasContact, hasPhone });
  const systemPrompt = buildSystemPrompt({ guardMode });
  const alexResult = await callAlex(messages, systemPrompt);
  let reply = stripLeadPayloadBlock(String(alexResult.reply || '').trim());

  // v11: Strip cross-sell from plumbing/electrical (AI may generate despite prompt rules)
  const allUserText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const fbServiceInference = inferServiceTypeShared(allUserText);
  const fbIsStandalone = fbServiceInference.serviceId === 'plumbing' || fbServiceInference.serviceId === 'electrical';
  if (fbIsStandalone) {
    reply = stripCrossSellFromStandalone(reply);
  }

  // v11: Soft CTA every 3rd message, not every reply
  if (!hasContact && userMsgCount % 3 === 0 && userMsgCount > 0) {
    reply = enforceContactCaptureCTA(reply);
  }
  reply = stripMarkdownArtifacts(reply).slice(0, 1500);
  if (!reply) reply = 'Please send your project details and best phone number 📲';

  await saveTurns(sessionId, null, inboundText, reply);

  const inferredLead = inferLeadFromConversation(messages);
  console.log('[ALEX_WEBHOOK] inferredLead:', inferredLead ? JSON.stringify({ phone: inferredLead.phone, service: inferredLead.service_type }) : 'null');
  if (inferredLead) {
    try {
      // Unified Lead System v3: envelope → processInbound handles dedup + side effects via outbox
      const fbEnvelope = createEnvelope({
        source:            'facebook',
        source_user_id:    senderId,
        source_message_id: `fb_${senderId}_${event?.message?.mid || Date.now()}`,
        source_thread_id:  sessionId,
        lead_phone:        inferredLead.phone  || '',
        lead_email:        inferredLead.email  || '',
        lead_name:         inferredLead.name   || 'Unknown',
        raw_text:          inferredLead.problem_description || inboundText,
        service_hint:      inferredLead.service_type || '',
        meta:              { sender_id: senderId, session_id: sessionId, pricing_version: getPricingSourceVersion() }
      });

      const created = await processInbound(fbEnvelope);

      await transitionLead(created.id, 'contacted', {
        contacted_at: new Date().toISOString()
      }).catch(() => {});

      if ((inferredLead.service_type || 'unknown') === 'unknown') {
        await pipelineLogEvent(created.id, 'service_inference_failed', {
          source: 'facebook',
          sender_id: senderId,
          session_id: sessionId,
          idempotency_key: `service_inference_failed:${sessionId}:${created.id}`
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[ALEX_WEBHOOK] Lead capture failed:', err.message, err.code || '', JSON.stringify(err.details || err.hint || ''));
    }
  }

  await sendFacebookMessage(senderId, reply);

  // Drain outbox inline (compensates for Hobby plan daily-only cron)
  drainOutboxInline();

  if (alexResult.model === 'static_fallback') {
    await logLeadEvent(null, 'alex_fallback', {
      source: 'facebook',
      sender_id: senderId,
      session_id: sessionId
    }).catch(() => {});
  }
}

function normalizeInboundText(event) {
  const text = String(event?.message?.text || '').trim();

  const attachments = Array.isArray(event?.message?.attachments) ? event.message.attachments : [];
  const imageUrls = attachments
    .filter((a) => a?.type === 'image' && a?.payload?.url)
    .map((a) => String(a.payload.url))
    .slice(0, 4);

  // v11: Forward Messenger photos to Telegram immediately
  if (imageUrls.length > 0) {
    forwardMessengerPhotosToTelegram(imageUrls, event?.sender?.id, text).catch((e) =>
      console.error('[ALEX_WEBHOOK] Photo forward error:', e.message)
    );
  }

  if (text) {
    if (imageUrls.length > 0) {
      return `${text}\n\n[Customer sent ${imageUrls.length} photo(s) -- photos forwarded to manager for review]`;
    }
    return text;
  }

  if (!attachments.length) return '';

  if (imageUrls.length > 0) {
    return `Customer sent ${imageUrls.length} photo(s) of their project. Photos forwarded to manager. To provide an estimate, please describe the project scope.`;
  }

  const names = attachments
    .map((a) => String(a?.type || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!names.length) return '';
  return `Customer sent attachment: ${names.join(', ')}`;
}

async function sendFacebookMessage(recipientId, text) {
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN || '';
  if (!pageToken) {
    throw new Error('FB_PAGE_ACCESS_TOKEN is not configured');
  }

  const resp = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: String(text || '').slice(0, 1900) }
    })
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Facebook send failed (${resp.status}): ${body.slice(0, 300)}`);
  }
}

async function loadConversationHistory(sessionId) {
  const config = getConfig();
  if (!config || !sessionId) return [];

  try {
    const query = new URLSearchParams({
      select: 'message_role,message_text',
      session_id: `eq.${sessionId}`,
      order: 'created_at.asc',
      limit: String(MAX_HISTORY_TURNS)
    }).toString();

    const resp = await fetch(`${config.projectUrl}/rest/v1/ai_conversations?${query}`, {
      method: 'GET',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Accept: 'application/json'
      }
    });
    if (!resp.ok) return [];

    const rows = await resp.json().catch(() => []);
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        role: row?.message_role === 'assistant' ? 'assistant' : 'user',
        content: String(row?.message_text || '').slice(0, 2000).trim()
      }))
      .filter((m) => m.content);
  } catch (_) {
    return [];
  }
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

function hasPhoneCapture(messages) {
  if (!Array.isArray(messages) || !messages.length) return false;
  const fullText = messages.map((m) => String(m.content || '')).join(' ');
  const phoneRegex = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
  return phoneRegex.test(fullText);
}

function hasEmailCapture(messages) {
  if (!Array.isArray(messages) || !messages.length) return false;
  const fullText = messages.map((m) => String(m.content || '')).join(' ');
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  return emailRegex.test(fullText);
}

function stripLeadPayloadBlock(rawReply) {
  const leadMatch = rawReply.match(/\n```lead-payload\s*\n(\{[\s\S]*?\})\n```\s*$/);
  if (!leadMatch) return rawReply;
  return rawReply.slice(0, leadMatch.index).trim();
}

function enforceContactCaptureCTA(reply) {
  const text = String(reply || '').trim();
  if (!text) return text;

  const asksContact = /(phone|number|call|text|телефон|номер|telefono|n[uú]mero|\(213\))/i.test(text);
  if (asksContact) return text;

  // v11: Soft CTA -- booking-focused
  return `${text}\n\nFor exact pricing and to book, share your phone or email, or call (213) 361-1700`;
}

function inferLeadFromConversation(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const userText = messages.filter((m) => m.role === 'user').map((m) => String(m.content || ''));
  if (!userText.length) return null;
  const joined = userText.join('\n');

  const phoneMatch = joined.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';
  if (!phone) return null;

  const serviceType = inferServiceType(joined);

  const nameMatch = joined.match(/\b(?:my name is|i am|this is|name[:\s])\s+([A-Za-z][A-Za-z' -]{1,40})/i);
  return {
    name: nameMatch ? String(nameMatch[1]).trim() : 'Unknown',
    phone,
    email: '',
    service_type: serviceType || 'unknown',
    problem_description: userText[userText.length - 1]?.slice(0, 500) || ''
  };
}

function inferServiceType(text) {
  return inferServiceTypeShared(text).serviceId || '';
}

// v11: Strict Sales Card for Messenger leads
async function notifyTelegramFbLead({ leadId, sessionId, phone, service, userText, aiReply }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const esc = (s) => String(s || '--').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + 60 * 60 * 1000);
  const slaTime = slaDeadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });

  const text = `🔔 <b>FB_MESSENGER_LEAD</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 Phone: <code>${esc(phone)}</code>\n` +
    `🔧 Service: ${esc(service)}\n` +
    `🌐 Channel: Facebook Messenger\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>Next action:</b> Call customer\n` +
    `⏰ <b>SLA deadline:</b> ${slaTime} PT\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Session: <code>${esc(sessionId)}</code>\n` +
    `Lead: <code>${esc(leadId)}</code>\n\n` +
    `<b>User:</b> ${esc(String(userText || '').slice(0, 300))}\n` +
    `<b>Alex:</b> ${esc(String(aiReply || '').slice(0, 300))}`;

  const sendResult = await unifiedTelegramSend({
    source: 'alex_webhook:fb_lead_card',
    leadId: leadId ? String(leadId) : null,
    sessionId: sessionId ? String(sessionId) : null,
    text,
    chatId,
    token,
    extra: { channel: 'fb_messenger', variant: 'lead_captured_card' }
  });
  if (sendResult.ok) {
    console.log('[ALEX_WEBHOOK] Telegram notified, msg_id:', sendResult.messageId);
  } else {
    console.error('[ALEX_WEBHOOK] Telegram error:', sendResult.errorDescription || sendResult.errorCode);
  }
}

// v11: Forward Messenger photos to Telegram immediately (pre-lead)
async function forwardMessengerPhotosToTelegram(imageUrls, senderId, userText) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !imageUrls.length) return;

  const esc = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const msg = `📷 <b>FB_MESSENGER_PHOTO</b> (no phone yet)\n` +
    `Sender: <code>fb_${esc(String(senderId || ''))}</code>\n` +
    `Photos: ${imageUrls.length}\n` +
    `<b>Text:</b> ${esc(String(userText || '').slice(0, 300))}`;

  const sessionKey = `fb_${String(senderId || 'unknown')}`;

  await unifiedTelegramSend({
    source: 'alex_webhook:fb_photo_text',
    sessionId: sessionKey,
    text: msg,
    chatId,
    token,
    extra: { channel: 'fb_messenger', variant: 'pre_lead_photo_summary', photo_count: imageUrls.length }
  }).catch(() => {});

  // Send each photo URL directly (Telegram can fetch from URL)
  for (const url of imageUrls) {
    const photoResult = await unifiedTelegramPhoto({
      source: 'alex_webhook:fb_photo_forward',
      sessionId: sessionKey,
      photo: url,
      caption: `FB Messenger photo (sender: fb_${String(senderId || '').slice(0, 20)})`,
      chatId,
      token,
      extra: { channel: 'fb_messenger' }
    }).catch((e) => ({ ok: false, errorDescription: e && e.message }));
    if (photoResult && !photoResult.ok) {
      console.error('[ALEX_WEBHOOK] TG photo send error:', photoResult.errorDescription || photoResult.errorCode);
    }
  }
}

function stripCrossSellFromStandalone(text) {
  const t = String(text || '');
  const lines = t.split('\n\n');
  const filtered = lines.filter(paragraph => {
    const p = paragraph.toLowerCase();
    return !(
      (p.includes('also') && (p.includes('same visit') || p.includes('while we') || p.includes('book both'))) ||
      (p.includes('by the way') && p.includes('same visit')) ||
      (p.includes('bundle') && p.includes('save')) ||
      /\bкстати\b.*визит/i.test(p) ||
      /\bдо речі\b.*візит/i.test(p) ||
      /\bpor cierto\b.*visita/i.test(p)
    );
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
