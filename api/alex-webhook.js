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
const { createOrMergeLead, logEvent: pipelineLogEvent } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode, GUARD_MODES } = require('../lib/alex-one-truth.js');

const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v19.0';
const MAX_HISTORY_TURNS = 16;

export default async function handler(req, res) {
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

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        await handleMessagingEvent(event);
      }
    }
  } catch (err) {
    console.error('[ALEX_WEBHOOK] Processing error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  return res.status(200).send('EVENT_RECEIVED');
}

function verifyWebhook(req, res) {
  const verifyToken = process.env.FB_VERIFY_TOKEN || '';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!verifyToken) {
    return res.status(500).send('FB_VERIFY_TOKEN is not configured');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(String(challenge || 'ok'));
  }
  return res.status(403).send('Forbidden');
}

async function handleMessagingEvent(event) {
  const senderId = String(event?.sender?.id || '');
  if (!senderId) return;

  if (event.message?.is_echo) return;

  if (event.postback?.payload === 'GET_STARTED') {
    await sendFacebookMessage(
      senderId,
      "Hi! I'm Alex from Handy & Friend 👋 Tell me what service you need and I’ll guide you to the right estimate."
    );
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

  const guardMode = getGuardMode({ hasPhone, userMsgCount });
  const systemPrompt = buildSystemPrompt({ guardMode });
  const alexResult = await callAlex(messages, systemPrompt);
  let reply = stripLeadPayloadBlock(String(alexResult.reply || '').trim());

  if (!hasPhone && guardMode !== GUARD_MODES.POST_CONTACT_EXACT) {
    reply = enforceContactCaptureCTA(reply, guardMode);
  }
  reply = stripMarkdownArtifacts(reply).slice(0, 1500);
  if (!reply) reply = 'Please send your project details and best phone number 📲';

  await saveTurns(sessionId, null, inboundText, reply);

  const inferredLead = inferLeadFromConversation(messages);
  if (inferredLead) {
    try {
      const created = await createOrMergeLead({
        name: inferredLead.name || 'Unknown',
        phone: inferredLead.phone || '',
        email: inferredLead.email || '',
        service_type: inferredLead.service_type || '',
        message: inferredLead.problem_description || inboundText,
        source: 'facebook',
        session_id: sessionId
      });

      await pipelineLogEvent(created.id, 'messenger_capture', {
        source: 'facebook',
        sender_id: senderId,
        session_id: sessionId
      }).catch(() => {});
    } catch (err) {
      console.error('[ALEX_WEBHOOK] Lead capture failed:', err.message);
    }
  }

  await sendFacebookMessage(senderId, reply);

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
  if (text) return text;

  const attachments = Array.isArray(event?.message?.attachments) ? event.message.attachments : [];
  if (!attachments.length) return '';

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

function stripLeadPayloadBlock(rawReply) {
  const leadMatch = rawReply.match(/\n```lead-payload\s*\n(\{[\s\S]*?\})\n```\s*$/);
  if (!leadMatch) return rawReply;
  return rawReply.slice(0, leadMatch.index).trim();
}

function enforceContactCaptureCTA(reply, guardMode) {
  const text = String(reply || '').trim();
  if (!text) return text;

  const asksContact = /(phone|number|call|text|телефон|номер|telefono|n[uú]mero)/i.test(text);
  if (asksContact) return text;

  if (guardMode === GUARD_MODES.NO_CONTACT_HARDENED) {
    return `${text}\n\nShare your phone number, or call (213) 361-1700 📲`;
  }
  return `${text}\n\nSend your phone number and I’ll calculate the exact estimate 📲`;
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
  if (!serviceType) return null;

  const nameMatch = joined.match(/\b(?:my name is|i am|this is|name[:\s])\s+([A-Za-z][A-Za-z' -]{1,40})/i);
  return {
    name: nameMatch ? String(nameMatch[1]).trim() : 'Unknown',
    phone,
    email: '',
    service_type: serviceType,
    problem_description: userText[userText.length - 1]?.slice(0, 500) || ''
  };
}

function inferServiceType(text) {
  const t = String(text || '').toLowerCase();
  const map = [
    ['cabinet painting', ['cabinet', 'door', 'drawer', 'kitchen cabinet', 'facade']],
    ['furniture assembly', ['furniture assembly', 'assemble', 'ikea', 'bed frame', 'dresser']],
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
