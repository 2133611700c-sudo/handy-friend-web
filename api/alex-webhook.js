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

const crypto = require('crypto');
const { restInsert, getConfig, logLeadEvent } = require('./_lib/supabase-admin.js');
const { callAlex } = require('../lib/ai-fallback.js');
const { processInbound, transitionLead, logEvent: pipelineLogEvent, drainOutboxInline, enqueueOutboundJob } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode, GUARD_MODES } = require('../lib/alex-one-truth.js');
const { getMessengerPostbackTexts, getPricingSourceVersion } = require('../lib/price-registry.js');
const { inferServiceType: inferServiceTypeShared } = require('../lib/alex-policy-engine.js');
const { createEnvelope, normalizePhone } = require('../lib/inbound-envelope.js');
const { sendTelegramMessage: unifiedTelegramSend, sendTelegramPhoto: unifiedTelegramPhotoSend } = require('../lib/telegram/send.js');
const {
  createMessageDeduper,
  parseWhatsAppWebhook,
  normalizeWhatsAppInbound,
  classifyLeadVisibility,
  isLikelySyntheticWhatsApp,
  sendWhatsAppText
} = require('../lib/whatsapp-cloud.js');

const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v19.0';
const MAX_HISTORY_TURNS = 16;

// ─── Webhook dedup (Meta can re-deliver the same event) ─────────────────────
const WEBHOOK_SEEN_TTL = 5 * 60 * 1000; // 5 minutes
const webhookSeen = globalThis.__HF_FB_WEBHOOK_SEEN || new Map();
globalThis.__HF_FB_WEBHOOK_SEEN = webhookSeen;
const whatsappDeduper = globalThis.__HF_WA_WEBHOOK_SEEN || createMessageDeduper();
globalThis.__HF_WA_WEBHOOK_SEEN = whatsappDeduper;

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

  // Collect raw body (bodyParser disabled for HMAC validation)
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  let body;
  try {
    body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // ── Telegram bot callback (inline keyboard for WhatsApp approval) ──────────
  // Telegram does NOT send X-Hub-Signature-256 — skip HMAC for these requests.
  // Note: in production the Telegram bot webhook URL points to /api/telegram-webhook,
  // which also imports the same shared handler. This path stays for backward compat.
  if (body.callback_query || body.update_id) {
    const { isWAApprovalCallback, handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');
    if (isWAApprovalCallback(body)) return handleWAApprovalCallback(body, res);
    return handleTelegramUpdate(body, res);
  }

  // ── WhatsApp Business — Cloud API only (NO bridge fallback) ────────────────
  if (body.object === 'whatsapp_business_account') {
    // HMAC X-Hub-Signature-256 validation — fail-closed when FB_APP_SECRET is set.
    const appSecret = (process.env.FB_APP_SECRET || process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
    if (appSecret) {
      const sig = req.headers['x-hub-signature-256'] || '';
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        console.warn('[WA_WEBHOOK] HMAC INVALID — rejected');
        return res.status(403).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[WA_WEBHOOK] FB_APP_SECRET not set — accepting unverified (soft-fail)');
    }

    const errors = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change?.value || {};
        const phoneNumberId = (value.metadata?.phone_number_id || process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
        // Status callbacks
        if (value.statuses?.length) {
          const { updateStatus } = require('../lib/whatsapp/dedup.js');
          for (const s of value.statuses) {
            console.log('[WA_WEBHOOK] Status:', JSON.stringify(s));
            await updateStatus({ wamid: s.id, status: s.status, timestamp: Number(s.timestamp || 0), errorReason: s.errors?.[0]?.title || null }).catch(e => console.error('[WA_WEBHOOK] status update err:', e.message));
          }
          continue;
        }
        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';
        for (const msg of value.messages || []) {
          if (isWaDuplicate(msg.id)) { console.log('[WA_WEBHOOK] Local dedup:', msg.id); continue; }
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

  if (body.object === 'page') {
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
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };

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

function resolveWebhookVerifyToken(req) {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const urlQuery = parseUrlQuery(req?.url || '');
  const incoming = firstNonEmpty(query['hub.verify_token'], urlQuery.get('hub.verify_token')).trim();
  const fb = String(process.env.FB_VERIFY_TOKEN || '').trim();
  const wa = String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
  if (incoming && incoming === wa) return wa;
  if (incoming && incoming === fb) return fb;
  return fb || wa || '';
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

async function handleWhatsAppWebhook(body) {
  const parsed = parseWhatsAppWebhook(body);
  let processedMessages = 0;
  let processedStatuses = 0;
  let duplicateMessages = 0;
  let syntheticMessages = 0;

  for (const payload of parsed.messages) {
    const normalized = normalizeWhatsAppInbound(payload);
    if (!normalized.waMessageId || !normalized.waFrom) continue;
    if (whatsappDeduper.hasSeen(normalized.waMessageId)) {
      duplicateMessages += 1;
      continue;
    }

    try {
      const wasSynthetic = await handleWhatsAppInboundMessage(normalized, payload);
      if (wasSynthetic) syntheticMessages += 1;
      processedMessages += 1;
    } catch (err) {
      console.error('[ALEX_WEBHOOK] WhatsApp message error:', err?.message || err);
    }
  }

  for (const payload of parsed.statuses) {
    try {
      await handleWhatsAppStatusUpdate(payload);
      processedStatuses += 1;
    } catch (err) {
      console.error('[ALEX_WEBHOOK] WhatsApp status error:', err?.message || err);
    }
  }

  return {
    processed_messages: processedMessages,
    processed_statuses: processedStatuses,
    duplicate_messages: duplicateMessages,
    synthetic_messages: syntheticMessages
  };
}

async function handleWhatsAppInboundMessage(normalized, payload) {
  const waText = String(normalized.text || '').trim();
  const inboundText = waText || `Customer sent ${normalized.type || 'message'} in WhatsApp`;
  const synthetic = isLikelySyntheticWhatsApp({
    text: inboundText,
    waFrom: normalized.waFrom,
    profileName: normalized.profileName
  });
  if (synthetic) {
    await logLeadEvent(null, 'whatsapp_synthetic_ignored', {
      wa_message_id: normalized.waMessageId,
      wa_from: normalized.waFrom,
      source: 'meta_whatsapp'
    }).catch(() => {});
    return true;
  }

  const sessionId = `wa_${normalized.waFrom}`;
  const history = await loadConversationHistory(sessionId);
  const messages = [...history, { role: 'user', content: inboundText }].slice(-20);
  const context = await fetchSessionLeadContext(sessionId);
  const hasPhone = context.hasPhone || Boolean(normalized.waFrom);
  const hasContact = hasPhone || context.hasContact;
  const guardMode = getGuardMode({ hasContact, hasPhone });
  const systemPrompt = buildSystemPrompt({ guardMode });
  let alexResult;
  try {
    alexResult = await callAlex(messages, systemPrompt);
  } catch (err) {
    console.error('[ALEX_WEBHOOK] callAlex failed for WhatsApp:', err?.message || err);
    alexResult = {
      reply: 'Thanks for your message. We received it and will respond with project details shortly.'
    };
  }
  let reply = stripLeadPayloadBlock(String(alexResult.reply || '').trim());
  reply = stripMarkdownArtifacts(reply).slice(0, 1500);
  if (!reply) reply = 'Thanks for reaching out. Share your project details and we will help right away.';

  const serviceInference = inferServiceTypeShared(messages.map((m) => m.content).join('\n'));
  const visibility = classifyLeadVisibility({
    text: inboundText,
    serviceHint: serviceInference.serviceId || ''
  });

  await saveTurns(sessionId, null, inboundText, reply);

  let leadId = null;
  const envelope = createEnvelope({
    source: 'whatsapp',
    source_user_id: normalized.waFrom,
    source_message_id: normalized.waMessageId,
    source_thread_id: sessionId,
    lead_phone: normalized.waFrom,
    lead_name: normalized.profileName || 'WhatsApp Customer',
    raw_text: inboundText,
    service_hint: serviceInference.serviceId || '',
    attachments: normalized.attachments || [],
    meta: {
      channel: 'meta_whatsapp',
      wa_from: normalized.waFrom,
      wa_message_id: normalized.waMessageId,
      wa_type: normalized.type || 'unknown',
      referral: normalized.referral || null
    }
  });

  const created = await processInbound(envelope);
  leadId = created.id;

  if (visibility.kind === 'pre_lead') {
    await markLeadPartial(leadId, visibility.reason);
    await sendWhatsAppPreLeadReviewAlert({
      leadId,
      waFrom: normalized.waFrom,
      message: inboundText,
      reason: visibility.reason
    });
  } else {
    await transitionLead(leadId, 'contacted', {
      contacted_at: new Date().toISOString()
    }).catch(() => {});
  }

  await pipelineLogEvent(leadId, 'whatsapp_visibility_classification', {
    kind: visibility.kind,
    reason: visibility.reason,
    wa_message_id: normalized.waMessageId,
    source: 'meta_whatsapp',
    idempotency_key: `wa_visibility:${normalized.waMessageId}`
  }).catch(() => {});

  const waSend = await sendWhatsAppText({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    to: normalized.waFrom,
    text: reply,
    replyToMessageId: normalized.waMessageId
  });

  await logLeadEvent(leadId, waSend.ok ? 'whatsapp_ai_reply_sent' : 'whatsapp_ai_reply_failed', {
    source: 'meta_whatsapp',
    wa_message_id: normalized.waMessageId,
    wa_from: normalized.waFrom,
    wa_outbound_message_id: waSend.messageId || null,
    error_code: waSend.errorCode || null,
    error_description: waSend.errorDescription || null
  }).catch(() => {});

  drainOutboxInline();
  return synthetic;
}

async function handleWhatsAppStatusUpdate(payload) {
  const status = payload?.status || {};
  const messageId = String(status.id || '').trim();
  if (!messageId) return;
  const recipient = String(status.recipient_id || '').trim();
  const leadId = await findLeadIdByPhone(recipient);

  await logLeadEvent(leadId, 'whatsapp_status', {
    source: 'meta_whatsapp',
    wa_outbound_message_id: messageId,
    wa_status: String(status.status || 'unknown'),
    wa_recipient_id: recipient || null,
    wa_timestamp: status.timestamp ? String(status.timestamp) : null,
    conversation: status.conversation || null,
    pricing: status.pricing || null
  }).catch(() => {});
}

async function findLeadIdByPhone(phoneRaw) {
  const config = getConfig();
  const normalized = normalizePhone(phoneRaw);
  if (!config || !normalized) return null;

  try {
    const query = new URLSearchParams({
      select: 'id',
      phone: `eq.${normalized}`,
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
    if (!resp.ok) return null;
    const rows = await resp.json().catch(() => []);
    return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null;
  } catch (_) {
    return null;
  }
}

async function markLeadPartial(leadId, reason) {
  const config = getConfig();
  if (!config || !leadId) return;
  const now = new Date().toISOString();
  const payload = {
    status: 'partial',
    updated_at: now,
    source_details: {
      pre_lead_reason: reason,
      channel: 'meta_whatsapp',
      updated_at: now
    }
  };
  try {
    const query = new URLSearchParams({ id: `eq.${leadId}` }).toString();
    await fetch(`${config.projectUrl}/rest/v1/leads?${query}`, {
      method: 'PATCH',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (_) {
    // Best effort only.
  }
}

async function sendWhatsAppPreLeadReviewAlert({ leadId, waFrom, message, reason }) {
  if (!leadId) return;
  const esc = (v) => String(v || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const text = `⚠️ <b>PRE_LEAD_REVIEW</b>\n` +
    `Source: WhatsApp\n` +
    `Phone: <code>${esc(normalizePhone(waFrom) || waFrom)}</code>\n` +
    `Reason: ${esc(reason)}\n` +
    `Action: check WhatsApp thread and qualify\n` +
    `Lead: <code>${esc(leadId)}</code>\n\n` +
    `${esc(String(message || '').slice(0, 280))}`;
  const hour = Math.floor(Date.now() / 3600000);
  const dedupKey = `wa_pre_lead_review:${leadId}:${hour}`;
  await enqueueOutboundJob('telegram_owner', leadId, { text }, dedupKey).catch(async () => {
    // Fallback to direct sender only if outbox unavailable.
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = process.env.TELEGRAM_CHAT_ID || '';
    if (!token || !chatId) return;
    await unifiedTelegramSend({
      source: 'alex_webhook_whatsapp',
      leadId,
      text,
      token,
      chatId,
      timeoutMs: 4000,
      extra: { channel: 'meta_whatsapp', kind: 'pre_lead_review', fallback: true }
    }).catch(() => {});
  });
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

// WhatsApp dedup (separate store from Messenger and from whatsappDeduper)
// Must use a DIFFERENT globalThis key than __HF_WA_WEBHOOK_SEEN (used by whatsappDeduper above).
const waSeen = globalThis.__HF_WA_DEDUP_MAP || new Map();
globalThis.__HF_WA_DEDUP_MAP = waSeen;

function isWaDuplicate(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (waSeen.size > 500) { for (const [k, t] of waSeen) { if (now - t > WEBHOOK_SEEN_TTL) waSeen.delete(k); } }
  if (waSeen.has(msgId)) return true;
  waSeen.set(msgId, now);
  return false;
}

function isSyntheticWaMessage(from, msgId, text) {
  if (!from) return false;
  if (from === '19991234567') return true;
  if (/^1555/.test(from)) return true;
  if (msgId && /e2e|test|probe|synthetic/i.test(msgId)) return true;
  if (text && /e2e synthetic|synthetic probe|ignore this|audit test|qa only|test only/i.test(text)) return true;
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

  const synthetic = isSyntheticWaMessage(from, msgId, inboundText);
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

  // Alex — WhatsApp engine: English-only, post-generation safety validator
  const { generateAlexWhatsAppReply } = require('../lib/alex/whatsapp-reply-engine.js');
  const waAlex = await generateAlexWhatsAppReply({
    inboundText,
    customerPhone: from,
    conversationHistory: messages.slice(0, -1),
  });
  let reply = stripMarkdownArtifacts(stripLeadPayloadBlock(waAlex.replyText)).slice(0, 1200);
  console.log(JSON.stringify({
    component: 'wa_alex',
    source: waAlex.source,
    model: waAlex.model,
    reason: waAlex.reason,
    safety_flags: waAlex.safetyFlags,
    reply_preview: reply.slice(0, 80),
  }));

  await saveTurns(sessionId, null, inboundText, reply);

  // Lead capture — for WhatsApp, ALWAYS create lead on first inbound (we have phone via `from`)
  let createdLeadId = null;
  const inferredLead = inferLeadFromConversation(messages) || {};
  try {
    const waEnvelope = createEnvelope({
      source:            'whatsapp',
      source_user_id:    from,
      source_message_id: msgId,
      source_thread_id:  sessionId,
      lead_phone:        inferredLead.phone || from,
      lead_email:        '',
      lead_name:         contactName !== 'Unknown' ? contactName : (inferredLead.name || 'WhatsApp Lead'),
      raw_text:          inferredLead.problem_description || inboundText,
      service_hint:      inferredLead.service_type || '',
      meta:              { wa_from: from, session_id: sessionId, pricing_version: getPricingSourceVersion() }
    });
    const created = await processInbound(waEnvelope);
    createdLeadId = created?.id || null;
    if (createdLeadId) {
      await transitionLead(created.id, 'contacted', { contacted_at: new Date().toISOString() }).catch(() => {});
      console.log('[WA_WEBHOOK] Lead id=%s phone=%s (auto on inbound)', createdLeadId, inferredLead.phone || from);
    }
  } catch (err) {
    console.error('[WA_WEBHOOK] Lead error:', err.message);
  }

  // Cloud API path: send DRAFT to operator approval, do NOT auto-send to customer
  try {
    const { sendApprovalRequest } = require('../lib/telegram/approval.js');
    const { recordInbound } = require('../lib/whatsapp/dedup.js');

    // Persist inbound + draft for later approval flow
    await recordInbound({
      wamid: msgId, from, to: phoneNumberId, body: inboundText, media: null, type: msgType, contextWamid: null, pushName: contactName,
    }).catch(e => console.warn('[WA_WEBHOOK] dedup.recordInbound (table may need migration):', e.message));

    const ar = await sendApprovalRequest({
      inboundWamid: msgId,
      customerPhone: from,
      customerName: contactName,
      customerMessage: inboundText,
      alexDraft: reply,
      threadId: sessionId,
    });
    console.log('[WA_WEBHOOK] approval queued ok=%s tg_msg_id=%s', ar?.ok, ar?.messageId);
    await logLeadEvent(createdLeadId, 'whatsapp_approval_queued', {
      from, session_id: sessionId, telegram_message_id: ar?.messageId || null, draft_preview: reply.slice(0, 120),
    }).catch(() => {});
  } catch (err) {
    console.error('[WA_WEBHOOK] approval queue failed:', err.message);
    await logLeadEvent(createdLeadId, 'whatsapp_approval_failed', {
      from, session_id: sessionId, error: err.message,
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

// ═══════════════════════════════════════════════════════════════════════════════
// Telegram bot callback — inline keyboard for WhatsApp approval
// (merged into alex-webhook to stay under Vercel Hobby 12-function limit)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleTelegramUpdate(update, res) {
  const cb = update.callback_query;
  if (!cb || !cb.data) return res.status(200).json({ ok: true, ignored: 'no callback_query' });

  const operator = cb.from?.username || String(cb.from?.id || 'unknown');
  const m = String(cb.data).match(/^wa:(approve|reject|edit):(.+)$/);
  if (!m) return res.status(200).json({ ok: true, ignored: 'unknown format' });
  const [, action, sid] = m;

  const cloudApi = require('../lib/whatsapp/cloud-api-client.js');
  const dedup = require('../lib/whatsapp/dedup.js');
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  // Resolve short_id → original approval request via telegram_sends.extra
  async function resolveShortId(s) {
    const url = `${SB_URL}/rest/v1/telegram_sends?source=eq.whatsapp_approval&extra->>short_id=eq.${encodeURIComponent(s)}&order=created_at.desc&limit=1`;
    const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    const arr = await r.json();
    return Array.isArray(arr) && arr[0] ? arr[0].extra : null;
  }

  let result, alert;
  try {
    const ctx = await resolveShortId(sid);
    if (!ctx) { result = { ok: false, error: 'short_id not found' }; alert = '❌ ' + result.error; }
    else if (action === 'approve') {
      const replyText = String(ctx.alex_draft || '').trim().slice(0, 4000);
      const to = String(ctx.wa_from || '').replace(/^\+/, '');
      if (!replyText || !to) { result = { ok: false, error: 'missing draft or to' }; alert = '❌ ' + result.error; }
      else {
        const sent = await cloudApi.sendTextMessage(to, replyText, ctx.wamid || null);
        await dedup.recordOutbound({ wamid: sent.wamid, to, body: replyText, status: 'sent', approvedBy: operator, draftText: replyText }).catch(() => {});
        result = { ok: true, sentWamid: sent.wamid };
        alert = `✅ Sent (${String(sent.wamid).slice(0, 12)}…)`;
      }
    } else if (action === 'reject') {
      if (ctx.wamid) await dedup.updateStatus({ wamid: ctx.wamid, status: 'rejected' }).catch(() => {});
      result = { ok: true, action: 'rejected' };
      alert = '❌ Rejected';
    } else {
      result = { ok: true, action: 'edit_pending' };
      alert = '✏️ Reply with new text — feature WIP';
    }
  } catch (e) {
    result = { ok: false, error: e.message };
    alert = `❌ ${String(e.message).slice(0, 180)}`;
  }

  if (BOT_TOKEN) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id, text: alert, show_alert: false }),
    }).catch(() => {});
  }
  return res.status(200).json({ ok: true, action, sid, result });
}
