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
const { sendTelegramMessage: unifiedTelegramSend, sendTelegramPhoto: unifiedTelegramPhotoSend } = require('../lib/telegram/send.js');

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

  // ── WhatsApp Business ────────────────────────────────────────────────────────
  if (body.object === 'whatsapp_business_account') {
    const errors = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change?.value || {};
        if (value.statuses?.length) {
          console.log('[WA_WEBHOOK] Status callback:', JSON.stringify(value.statuses[0]));
          continue;
        }
        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';
        const phoneNumberId = (value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
        for (const msg of value.messages || []) {
          if (isWaDuplicate(msg.id)) {
            console.log('[WA_WEBHOOK] Dedup skip:', msg.id);
            continue;
          }
          try {
            await handleWhatsAppMessage(msg, contactName, phoneNumberId);
          } catch (err) {
            const errMsg = String(err?.message || err || 'Unknown error');
            errors.push(errMsg);
            console.error('[WA_WEBHOOK] Processing error:', errMsg);
          }
        }
      }
    }
    if (errors.length) console.error('[WA_WEBHOOK] Completed with errors:', errors.slice(0, 3));
    return res.status(200).send('EVENT_RECEIVED');
  }

  // ── Facebook Messenger ───────────────────────────────────────────────────────
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
  // Accept either FB_VERIFY_TOKEN (Messenger) or WHATSAPP_VERIFY_TOKEN (WhatsApp)
  const fbToken  = String(process.env.FB_VERIFY_TOKEN        || '').trim();
  const waToken  = String(process.env.WHATSAPP_VERIFY_TOKEN  || '').trim();
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const urlQuery = parseUrlQuery(req?.url || '');

  const mode      = firstNonEmpty(query['hub.mode'],         urlQuery.get('hub.mode'));
  const token     = firstNonEmpty(query['hub.verify_token'], urlQuery.get('hub.verify_token')).trim();
  const challenge = firstNonEmpty(query['hub.challenge'],    urlQuery.get('hub.challenge'));

  if (!fbToken && !waToken) {
    return res.status(500).send('Verify token not configured');
  }

  const valid = (fbToken && token === fbToken) || (waToken && token === waToken);
  if (mode === 'subscribe' && valid) {
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

  // P0-3: PRE_LEAD visibility — alert owner after ≥3 user turns with no phone captured.
  // Awaited BEFORE sendFacebookMessage to prevent Vercel serverless cut-off.
  // Fires once per session (idempotent guard inside). Errors logged, never thrown.
  if (!inferredLead && userMsgCount >= 3) {
    await maybeCreateFbPreLead(senderId, sessionId, messages).catch((err) =>
      console.error('[ALEX_WEBHOOK] pre_lead error:', err.message)
    );
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

  const send = await unifiedTelegramSend({
    source: 'alex_webhook',
    leadId,
    sessionId,
    text,
    token,
    chatId,
    timeoutMs: 4000,
    extra: { channel: 'fb_messenger', kind: 'lead_capture' }
  });
  if (send.ok) {
    console.log('[ALEX_WEBHOOK] Telegram notified, msg_id:', send.messageId);
  } else {
    console.error('[ALEX_WEBHOOK] Telegram error:', JSON.stringify({
      error_code: send.errorCode,
      error_description: send.errorDescription
    }));
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

  await unifiedTelegramSend({
    source: 'alex_webhook',
    text: msg,
    token,
    chatId,
    timeoutMs: 4000,
    extra: { channel: 'fb_messenger', kind: 'photo_preface', sender_id: String(senderId || '') }
  }).catch(() => {});

  // Send each photo URL directly (Telegram can fetch from URL)
  for (const url of imageUrls) {
    await unifiedTelegramPhotoSend({
      source: 'alex_webhook',
      photo: url,
      caption: `FB Messenger photo (sender: fb_${String(senderId || '').slice(0, 20)})`,
      token,
      chatId,
      timeoutMs: 4000,
      extra: { channel: 'fb_messenger', kind: 'photo_forward' }
    }).catch((e) => console.error('[ALEX_WEBHOOK] TG photo send error:', e.message));
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

// P0-3: Create a pre_lead row + owner Telegram alert when engagement ≥ threshold but no phone yet.
// Idempotent: skips if any lead row already exists for this session_id.
async function maybeCreateFbPreLead(senderId, sessionId, messages) {
  const config = getConfig();
  if (!config) return;

  // Guard: skip if ANY lead row (real or pre_lead) already exists for this session
  const checkQuery = new URLSearchParams({
    select: 'id',
    session_id: `eq.${sessionId}`,
    limit: '1'
  }).toString();
  const checkResp = await fetch(`${config.projectUrl}/rest/v1/leads?${checkQuery}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: 'application/json'
    }
  });
  if (checkResp.ok) {
    const existing = await checkResp.json().catch(() => []);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log('[ALEX_WEBHOOK] pre_lead skip — lead row exists for session:', sessionId);
      return;
    }
  }

  // Infer service from conversation text
  const allUserText = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
  const serviceInference = inferServiceTypeShared(allUserText);
  const service = serviceInference.serviceId || 'unclear';
  const userMsgs = messages.filter((m) => m.role === 'user');
  const lastMsg = String(userMsgs[userMsgs.length - 1]?.content || '').slice(0, 500);

  // Insert pre_lead row (status='new'; source_details flags it as pre_lead)
  const now = new Date().toISOString();
  const preleadRowId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const payload = {
    id: preleadRowId,
    source: 'facebook',
    channel: 'messenger',
    full_name: `FB:${senderId}`,
    phone: null,
    email: null,
    service_type: service !== 'unclear' ? service : null,
    problem_description: `FB Messenger pre-lead: ${userMsgs.length} turns, no phone. Last: ${lastMsg.slice(0, 200)}`,
    status: 'new',
    stage: 'new',
    session_id: sessionId,
    is_test: false,
    created_at: now,
    updated_at: now,
    source_details: { pre_lead: true, fb_sender_id: senderId, turns: userMsgs.length }
  };

  let preleadId = null;
  try {
    const insertResp = await fetch(`${config.projectUrl}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    if (insertResp.ok) {
      const data = await insertResp.json().catch(() => []);
      preleadId = Array.isArray(data) && data.length ? data[0]?.id : null;
      console.log('[ALEX_WEBHOOK] pre_lead created id=%s session=%s service=%s', preleadId, sessionId, service);
    } else {
      const errText = await insertResp.text().catch(() => '');
      console.error('[ALEX_WEBHOOK] pre_lead insert failed %d: %s', insertResp.status, errText.slice(0, 200));
    }
  } catch (err) {
    console.error('[ALEX_WEBHOOK] pre_lead insert error:', err.message);
  }

  // Send owner Telegram alert (non-blocking — errors already caught by caller)
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const esc = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const alertText =
    `👁 <b>FB_PRE_LEAD — Check Messenger Inbox</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 Channel: Facebook Messenger\n` +
    `🔧 Service: ${esc(service)}\n` +
    `💬 Turns: ${userMsgs.length} messages — no phone captured yet\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Last message:</b>\n${esc(lastMsg.slice(0, 300))}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Session: ${esc(sessionId)}</i>\n` +
    `<i>→ Reply in FB Messenger or call to capture phone</i>`;

  await unifiedTelegramSend({
    source: 'alex_webhook',
    leadId: preleadId,
    sessionId,
    text: alertText,
    token,
    chatId,
    timeoutMs: 4000,
    extra: { channel: 'fb_messenger', kind: 'pre_lead_alert', sender_id: String(senderId || '') }
  }).catch((e) => console.error('[ALEX_WEBHOOK] pre_lead TG alert error:', e.message));
}

// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Cloud API — handler + helpers
// ═══════════════════════════════════════════════════════════════════════════════

const WA_GRAPH_VERSION = 'v19.0';

// WhatsApp dedup (separate store from Messenger)
const waSeen = globalThis.__HF_WA_WEBHOOK_SEEN || new Map();
globalThis.__HF_WA_WEBHOOK_SEEN = waSeen;

function isWaDuplicate(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (waSeen.size > 500) { for (const [k, t] of waSeen) { if (now - t > WEBHOOK_SEEN_TTL) waSeen.delete(k); } }
  if (waSeen.has(msgId)) return true;
  waSeen.set(msgId, now);
  return false;
}

function isSyntheticWaMessage(from, msgId) {
  if (!from) return false;
  if (from === '19991234567') return true;
  if (/^1555/.test(from)) return true;
  if (msgId && /e2e|test|probe|synthetic/i.test(msgId)) return true;
  return false;
}

async function handleWhatsAppMessage(msg, contactName, phoneNumberId) {
  const from = String(msg?.from || '');
  const msgId = String(msg?.id || '');
  const msgType = String(msg?.type || '');
  if (!from) return;

  const inboundText = msgType === 'text' ? String(msg?.text?.body || '').trim() : '';
  if (!inboundText) {
    console.log('[WA_WEBHOOK] Skip non-text type=%s from=%s', msgType, from);
    return;
  }

  const synthetic = isSyntheticWaMessage(from, msgId);
  const sessionId = `wa_${from}`;
  console.log('[WA_WEBHOOK] from=%s msgId=%s synthetic=%s text=%s', from, msgId, synthetic, inboundText.slice(0, 80));

  // Log inbound
  await logLeadEvent(null, 'whatsapp_inbound', {
    from, msg_id: msgId, session_id: sessionId, synthetic, text_preview: inboundText.slice(0, 100), phone_number_id: phoneNumberId
  }).catch(() => {});

  // Load history + classify
  const history = await loadConversationHistory(sessionId);
  const messages = [...history, { role: 'user', content: inboundText }].slice(-20);
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const sessionCtx = await fetchSessionLeadContext(sessionId);
  const hasPhone = sessionCtx.hasPhone || hasPhoneCapture(messages);
  const hasContact = hasPhone || sessionCtx.hasContact;

  await logLeadEvent(null, 'whatsapp_visibility_classification', {
    from, session_id: sessionId, synthetic, user_msg_count: userMsgCount, has_phone: hasContact
  }).catch(() => {});

  if (synthetic) {
    console.log('[WA_WEBHOOK] Synthetic probe — logging only, no reply');
    await saveTurns(sessionId, null, inboundText, '[SYNTHETIC_PROBE_NO_REPLY]');
    return;
  }

  // Alex
  const guardMode = getGuardMode({ hasContact, hasPhone });
  const systemPrompt = buildSystemPrompt({ guardMode });
  const alexResult = await callAlex(messages, systemPrompt);
  let reply = stripLeadPayloadBlock(String(alexResult.reply || '').trim());
  reply = stripMarkdownArtifacts(reply).slice(0, 1000);
  if (!reply) reply = 'Hi! Please share your project details and best phone number 📲';

  await saveTurns(sessionId, null, inboundText, reply);

  // Lead capture
  let createdLeadId = null;
  const inferredLead = inferLeadFromConversation(messages);
  if (inferredLead) {
    try {
      const waEnvelope = createEnvelope({
        source:            'whatsapp',
        source_user_id:    from,
        source_message_id: msgId,
        source_thread_id:  sessionId,
        lead_phone:        inferredLead.phone || from,
        lead_email:        '',
        lead_name:         contactName !== 'Unknown' ? contactName : (inferredLead.name || 'Unknown'),
        raw_text:          inferredLead.problem_description || inboundText,
        service_hint:      inferredLead.service_type || '',
        meta:              { wa_from: from, session_id: sessionId, pricing_version: getPricingSourceVersion() }
      });
      const created = await processInbound(waEnvelope);
      createdLeadId = created?.id || null;
      await transitionLead(created.id, 'contacted', { contacted_at: new Date().toISOString() }).catch(() => {});
      console.log('[WA_WEBHOOK] Lead id=%s phone=%s', createdLeadId, inferredLead.phone);
    } catch (err) {
      console.error('[WA_WEBHOOK] Lead error:', err.message);
    }
  }

  // Send reply
  try {
    const sendResult = await sendWhatsAppReply(phoneNumberId, from, reply, msgId);
    console.log('[WA_WEBHOOK] Reply sent ok=%s outbound_id=%s', sendResult.ok, sendResult.messageId);
    await logLeadEvent(createdLeadId, 'whatsapp_ai_reply_sent', {
      from, session_id: sessionId, outbound_msg_id: sendResult.messageId, reply_preview: reply.slice(0, 100)
    }).catch(() => {});
  } catch (err) {
    console.error('[WA_WEBHOOK] Reply failed:', err.message);
    await logLeadEvent(createdLeadId, 'whatsapp_ai_reply_failed', {
      from, session_id: sessionId, error: err.message, error_code: err.code || 'unknown'
    }).catch(() => {});
  }

  // Telegram alert on lead
  if (createdLeadId) {
    await notifyTelegramWaLead({ leadId: createdLeadId, sessionId, from, contactName, service: inferredLead?.service_type || 'unknown', userText: inboundText, aiReply: reply })
      .catch((e) => console.error('[WA_WEBHOOK] TG alert error:', e.message));
  }
}

async function sendWhatsAppReply(phoneNumberId, to, text, replyToMessageId) {
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  if (!accessToken) throw Object.assign(new Error('WHATSAPP_ACCESS_TOKEN not configured'), { code: 'missing_token' });
  const cleanPhoneNumberId = (String(phoneNumberId || '')).trim();
  if (!cleanPhoneNumberId) throw Object.assign(new Error('WHATSAPP_PHONE_NUMBER_ID not configured'), { code: 'missing_phone_id' });

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to),
    type: 'text',
    text: { body: String(text || '').slice(0, 4096) }
  };
  if (replyToMessageId) payload.context = { message_id: replyToMessageId };

  const resp = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${cleanPhoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const respBody = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const code = respBody?.error?.code || resp.status;
    const errMsg = respBody?.error?.message || `HTTP ${resp.status}`;
    throw Object.assign(new Error(`WA send failed (${code}): ${errMsg}`), { code: String(code) });
  }
  return { ok: true, messageId: respBody?.messages?.[0]?.id || null };
}

async function notifyTelegramWaLead({ leadId, sessionId, from, contactName, service, userText, aiReply }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const esc = (s) => String(s || '--').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const slaTime = new Date(Date.now() + 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
  const text = `🟢 <b>WHATSAPP_LEAD</b>\n━━━━━━━━━━━━━━━━━━━━\n📱 Phone: <code>+${esc(from)}</code>\n👤 Name: ${esc(contactName)}\n🔧 Service: ${esc(service)}\n🌐 Channel: WhatsApp Business\n━━━━━━━━━━━━━━━━━━━━\n⏰ <b>SLA:</b> ${slaTime} PT\n━━━━━━━━━━━━━━━━━━━━\n<b>User:</b> ${esc(String(userText || '').slice(0, 300))}\n<b>Alex:</b> ${esc(String(aiReply || '').slice(0, 300))}\n<i>Session: ${esc(sessionId)}</i>`;
  await unifiedTelegramSend({ source: 'alex_webhook', leadId, sessionId, text, token, chatId, timeoutMs: 4000, extra: { channel: 'whatsapp', kind: 'lead_capture', wa_from: from } });
}
