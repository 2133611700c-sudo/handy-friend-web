/**
 * WhatsApp Cloud API webhook for Alex
 * GET  /api/whatsapp-webhook -> Meta webhook verification
 * POST /api/whatsapp-webhook -> inbound WhatsApp messages -> Alex -> WhatsApp reply
 *
 * Required env:
 * - WHATSAPP_VERIFY_TOKEN
 * - WHATSAPP_ACCESS_TOKEN  (User token with whatsapp_business_messaging scope)
 * - WHATSAPP_PHONE_NUMBER_ID (production: 920678054472684)
 * - DEEPSEEK_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 */

const { restInsert, getConfig, logLeadEvent } = require('./_lib/supabase-admin.js');
const { callAlex } = require('../lib/ai-fallback.js');
const { processInbound, transitionLead, logEvent: pipelineLogEvent } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode } = require('../lib/alex-one-truth.js');
const { getPricingSourceVersion } = require('../lib/price-registry.js');
const { inferServiceType: inferServiceTypeShared } = require('../lib/alex-policy-engine.js');
const { createEnvelope } = require('../lib/inbound-envelope.js');
const { sendTelegramMessage: unifiedTelegramSend } = require('../lib/telegram/send.js');

const WA_GRAPH_VERSION = 'v19.0';
const MAX_HISTORY_TURNS = 16;

// ─── Dedup (Meta can re-deliver the same event) ──────────────────────────────
const WEBHOOK_SEEN_TTL = 5 * 60 * 1000;
const webhookSeen = globalThis.__HF_WA_WEBHOOK_SEEN || new Map();
globalThis.__HF_WA_WEBHOOK_SEEN = webhookSeen;

function isWaDuplicate(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (webhookSeen.size > 500) {
    for (const [k, t] of webhookSeen) { if (now - t > WEBHOOK_SEEN_TTL) webhookSeen.delete(k); }
  }
  if (webhookSeen.has(msgId)) return true;
  webhookSeen.set(msgId, now);
  return false;
}

// ─── Synthetic / test message detection ───────────────────────────────────────
function isSyntheticWaMessage(from, msgId) {
  // Test phone numbers: 19991234567 or 15556xxxxxx range, or wamid contains "e2e" / "test"
  if (!from) return false;
  if (from === '19991234567') return true;
  if (/^1555/.test(from)) return true;
  if (msgId && /e2e|test|probe|synthetic/i.test(msgId)) return true;
  return false;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Hub-Signature-256');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return verifyWebhook(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = req.body || {};

  // WhatsApp status callbacks (delivery receipts) — ack and skip
  if (body.object === 'whatsapp_business_account') {
    const errors = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change?.value || {};
        // Status callbacks (read, delivered, sent)
        if (value.statuses?.length) {
          console.log('[WA_WEBHOOK] Status callback:', JSON.stringify(value.statuses[0]));
          continue;
        }
        // Inbound messages
        for (const msg of value.messages || []) {
          if (isWaDuplicate(msg.id)) {
            console.log('[WA_WEBHOOK] Dedup skip:', msg.id);
            continue;
          }
          const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';
          const phoneNumberId = value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
          try {
            await handleWhatsAppMessage(msg, contactName, phoneNumberId);
          } catch (err) {
            const errMsg = String(err?.message || err || 'Unknown error');
            errors.push(errMsg);
            console.error('[WA_WEBHOOK] Message processing error:', errMsg);
          }
        }
      }
    }
    if (errors.length) console.error('[WA_WEBHOOK] Completed with errors:', errors.slice(0, 3));
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(404).json({ error: 'Unsupported webhook object' });
}

module.exports = handler;

// ─── Webhook verification ─────────────────────────────────────────────────────
function verifyWebhook(req, res) {
  // Support both WHATSAPP_VERIFY_TOKEN and FB_VERIFY_TOKEN
  const waVerifyToken = String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
  const fbVerifyToken = String(process.env.FB_VERIFY_TOKEN || '').trim();

  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const urlQuery = (() => { try { return new URL(req?.url || '', 'https://handyandfriend.com').searchParams; } catch (_) { return new URLSearchParams(); } })();

  const mode = String(query['hub.mode'] || urlQuery.get('hub.mode') || '');
  const token = String(query['hub.verify_token'] || urlQuery.get('hub.verify_token') || '').trim();
  const challenge = String(query['hub.challenge'] || urlQuery.get('hub.challenge') || '');

  if (mode === 'subscribe' && token && (token === waVerifyToken || token === fbVerifyToken)) {
    return res.status(200).send(challenge || 'ok');
  }
  return res.status(403).send('Forbidden');
}

// ─── Process one inbound WhatsApp message ─────────────────────────────────────
async function handleWhatsAppMessage(msg, contactName, phoneNumberId) {
  const from = String(msg?.from || '');
  const msgId = String(msg?.id || '');
  const msgType = String(msg?.type || '');
  const ts = String(msg?.timestamp || '');

  if (!from) return;

  // Only handle text messages for now
  const inboundText = msgType === 'text' ? String(msg?.text?.body || '').trim() : '';
  if (!inboundText) {
    console.log('[WA_WEBHOOK] Skipping non-text message type:', msgType, 'from:', from);
    return;
  }

  const synthetic = isSyntheticWaMessage(from, msgId);
  const sessionId = `wa_${from}`;

  console.log('[WA_WEBHOOK] inbound from=%s msgId=%s synthetic=%s text=%s',
    from, msgId, synthetic, inboundText.slice(0, 80));

  // Log inbound event
  await logLeadEvent(null, 'whatsapp_inbound', {
    from,
    msg_id: msgId,
    session_id: sessionId,
    synthetic,
    text_preview: inboundText.slice(0, 100),
    phone_number_id: phoneNumberId
  }).catch(() => {});

  // Load conversation history
  const history = await loadConversationHistory(sessionId);
  const messages = [...history, { role: 'user', content: inboundText }].slice(-20);
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const sessionContext = await fetchSessionLeadContext(sessionId);
  const hasPhone = sessionContext.hasPhone;
  const hasContact = hasPhone || sessionContext.hasContact || hasPhoneInText(messages);

  // Log visibility classification
  await logLeadEvent(null, 'whatsapp_visibility_classification', {
    from,
    session_id: sessionId,
    synthetic,
    user_msg_count: userMsgCount,
    has_phone: hasContact
  }).catch(() => {});

  if (synthetic) {
    console.log('[WA_WEBHOOK] Synthetic probe — Alex will NOT reply, logging only');
    await saveTurns(sessionId, null, inboundText, '[SYNTHETIC_PROBE_NO_REPLY]');
    return;
  }

  // Call Alex
  const guardMode = getGuardMode({ hasContact, hasPhone });
  const systemPrompt = buildSystemPrompt({ guardMode });
  const alexResult = await callAlex(messages, systemPrompt);
  let reply = stripLeadPayload(String(alexResult.reply || '').trim());
  reply = stripMarkdownArtifacts(reply).slice(0, 1000); // WhatsApp safe limit
  if (!reply) reply = 'Hi! Please send your project details and best phone number 📲';

  await saveTurns(sessionId, null, inboundText, reply);

  // Lead capture
  let createdLeadId = null;
  const inferredLead = inferLeadFromMessages(messages);
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
      console.log('[WA_WEBHOOK] Lead created/found id=%s phone=%s', createdLeadId, inferredLead.phone);
    } catch (err) {
      console.error('[WA_WEBHOOK] Lead capture error:', err.message);
    }
  }

  // Send WhatsApp reply
  let replySent = false;
  let replyMsgId = null;
  try {
    const sendResult = await sendWhatsAppReply(phoneNumberId, from, reply, msgId);
    replySent = sendResult.ok;
    replyMsgId = sendResult.messageId;
    console.log('[WA_WEBHOOK] Reply sent ok=%s msgId=%s', replySent, replyMsgId);
    await logLeadEvent(createdLeadId, 'whatsapp_ai_reply_sent', {
      from,
      session_id: sessionId,
      outbound_msg_id: replyMsgId,
      reply_preview: reply.slice(0, 100)
    }).catch(() => {});
  } catch (err) {
    console.error('[WA_WEBHOOK] Reply send failed:', err.message);
    await logLeadEvent(createdLeadId, 'whatsapp_ai_reply_failed', {
      from,
      session_id: sessionId,
      error: err.message,
      error_code: err.code || 'unknown'
    }).catch(() => {});
  }

  // Telegram owner alert when lead captured
  if (createdLeadId) {
    await notifyTelegramWaLead({
      leadId: createdLeadId,
      sessionId,
      from,
      contactName,
      service: inferredLead?.service_type || 'unknown',
      userText: inboundText,
      aiReply: reply
    }).catch((e) => console.error('[WA_WEBHOOK] TG alert error:', e.message));
  }
}

// ─── WhatsApp Cloud API send ──────────────────────────────────────────────────
async function sendWhatsAppReply(phoneNumberId, to, text, replyToMessageId) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  if (!accessToken) throw Object.assign(new Error('WHATSAPP_ACCESS_TOKEN not configured'), { code: 'missing_token' });
  if (!phoneNumberId) throw Object.assign(new Error('WHATSAPP_PHONE_NUMBER_ID not configured'), { code: 'missing_phone_id' });

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to),
    type: 'text',
    text: { body: String(text || '').slice(0, 4096) }
  };
  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const resp = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const respBody = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const code = respBody?.error?.code || resp.status;
    const msg = respBody?.error?.message || `HTTP ${resp.status}`;
    throw Object.assign(new Error(`WA send failed (${code}): ${msg}`), { code: String(code) });
  }

  const messageId = respBody?.messages?.[0]?.id || null;
  return { ok: true, messageId };
}

// ─── Conversation history ─────────────────────────────────────────────────────
async function loadConversationHistory(sessionId) {
  const config = getConfig();
  if (!config || !sessionId) return [];
  try {
    const q = new URLSearchParams({
      select: 'message_role,message_text',
      session_id: `eq.${sessionId}`,
      order: 'created_at.asc',
      limit: String(MAX_HISTORY_TURNS)
    }).toString();
    const resp = await fetch(`${config.projectUrl}/rest/v1/ai_conversations?${q}`, {
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json' }
    });
    if (!resp.ok) return [];
    const rows = await resp.json().catch(() => []);
    return (Array.isArray(rows) ? rows : [])
      .map((r) => ({ role: r?.message_role === 'assistant' ? 'assistant' : 'user', content: String(r?.message_text || '').slice(0, 2000).trim() }))
      .filter((m) => m.content);
  } catch (_) { return []; }
}

async function fetchSessionLeadContext(sessionId) {
  const config = getConfig();
  if (!config || !sessionId) return { hasPhone: false, hasContact: false };
  try {
    const q = new URLSearchParams({ select: 'phone,email', session_id: `eq.${sessionId}`, order: 'created_at.desc', limit: '1' }).toString();
    const resp = await fetch(`${config.projectUrl}/rest/v1/leads?${q}`, {
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json' }
    });
    if (!resp.ok) return { hasPhone: false, hasContact: false };
    const data = await resp.json().catch(() => []);
    const row = Array.isArray(data) ? data[0] : null;
    return { hasPhone: Boolean(String(row?.phone || '').trim()), hasContact: Boolean(String(row?.phone || '').trim() || String(row?.email || '').trim()) };
  } catch (_) { return { hasPhone: false, hasContact: false }; }
}

async function saveTurns(sessionId, leadId, userMsg, assistantMsg) {
  const turns = [];
  if (userMsg) turns.push({ session_id: sessionId, lead_id: leadId || null, message_role: 'user', message_text: String(userMsg).slice(0, 4000) });
  if (assistantMsg) turns.push({ session_id: sessionId, lead_id: leadId || null, message_role: 'assistant', message_text: String(assistantMsg).slice(0, 4000) });
  if (!turns.length) return;
  await restInsert('ai_conversations', turns, { returning: false });
}

// ─── Lead inference helpers ───────────────────────────────────────────────────
function hasPhoneInText(messages) {
  const text = messages.map((m) => String(m.content || '')).join(' ');
  return /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(text);
}

function inferLeadFromMessages(messages) {
  const userText = messages.filter((m) => m.role === 'user').map((m) => String(m.content || ''));
  if (!userText.length) return null;
  const joined = userText.join('\n');
  const phoneMatch = joined.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';
  if (!phone) return null;
  const serviceType = inferServiceTypeShared(joined).serviceId || 'unknown';
  const nameMatch = joined.match(/\b(?:my name is|i am|this is|name[:\s])\s+([A-Za-z][A-Za-z' -]{1,40})/i);
  return { name: nameMatch ? String(nameMatch[1]).trim() : 'Unknown', phone, service_type: serviceType, problem_description: userText[userText.length - 1]?.slice(0, 500) || '' };
}

function stripLeadPayload(text) {
  const m = text.match(/\n```lead-payload\s*\n(\{[\s\S]*?\})\n```\s*$/);
  return m ? text.slice(0, m.index).trim() : text;
}

function stripMarkdownArtifacts(text) {
  return String(text || '').replace(/```[\s\S]*?```/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/^\s*[-*]\s+/gm, '• ').trim();
}

// ─── Telegram owner alert ─────────────────────────────────────────────────────
async function notifyTelegramWaLead({ leadId, sessionId, from, contactName, service, userText, aiReply }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const esc = (s) => String(s || '--').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const slaDeadline = new Date(Date.now() + 60 * 60 * 1000);
  const slaTime = slaDeadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });

  const text =
    `🟢 <b>WHATSAPP_LEAD</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 Phone: <code>+${esc(from)}</code>\n` +
    `👤 Name: ${esc(contactName)}\n` +
    `🔧 Service: ${esc(service)}\n` +
    `🌐 Channel: WhatsApp Business\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>SLA deadline:</b> ${slaTime} PT\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>User:</b> ${esc(String(userText || '').slice(0, 300))}\n` +
    `<b>Alex:</b> ${esc(String(aiReply || '').slice(0, 300))}\n` +
    `<i>Session: ${esc(sessionId)} | Lead: ${esc(leadId)}</i>`;

  await unifiedTelegramSend({
    source: 'wa_webhook',
    leadId,
    sessionId,
    text,
    token,
    chatId,
    timeoutMs: 4000,
    extra: { channel: 'whatsapp', kind: 'lead_capture', wa_from: from }
  });
}
