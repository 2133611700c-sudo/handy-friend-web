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

const POSTBACK_RESPONSES = {
  GET_STARTED: "Hi! I'm Alex from Handy & Friend 👋\n\nTell me what service you need and I'll guide you to the right estimate.\n\nWe're available same-week in LA — what can I help you with?",
  ICE_TV: "📺 TV Mounting Pricing:\n\n• Standard flat/tilt mount — $165\n• Full-motion mount — $165\n• Concealed in-wall wiring — $250\n\nIncludes stud location, level mount, and cleanup.\n\nWhat size TV and what type of wall? Send your phone number and I'll confirm availability today 📲",
  ICE_CABINET: "🎨 Cabinet Painting Pricing:\n\n• Full spray finish (both sides) — $155/door\n• 2-side spray — $125/door\n• 1-side spray — $95/door\n• Roller finish — $45/door\n• Drawer fronts — from $65\n• Island — $460\n\nIncludes premium paint, primer, degreasing, and prep.\n\nHow many doors do you have? Send your phone and I'll calculate your exact quote 📲",
  ICE_SERVICES: "🔧 Handy & Friend — Full Service List:\n\n📺 TV Mounting from $165\n🎨 Cabinet Painting from $95/door\n🖌️ Interior Painting from $3/sq ft\n🪑 Furniture Assembly from $150\n🖼️ Art & Mirror Hanging $175\n🏠 LVP Flooring from $3.50/sq ft\n🔧 Minor Plumbing from $150\n⚡ Minor Electrical from $150\n\nBook 2+ services = 20% off combo!\n\nInsured. Upfront pricing. Same-week availability.\n\nText your project details and I'll quote you instantly 📲",
  ICE_BOOK: "📅 Ready to book? Let's go!\n\nWe're available same-week Mon–Sat 8am–8pm in LA.\n\nJust tell me:\n1️⃣ What service do you need?\n2️⃣ Your neighborhood or zip code\n3️⃣ Your phone number\n\nI'll confirm the date and price within minutes! 🚀",
  MENU_QUOTE: "Let's get your free quote!\n\nTell me:\n• What service do you need?\n• Your neighborhood in LA\n• Your phone number\n\nI'll calculate the exact price and check availability right now 📲",
  MENU_SERVICES: "🔧 Our Services & Prices:\n\n📺 TV Mounting — from $165\n🎨 Cabinet Painting — from $95/door\n🖌️ Interior Painting — from $3/sq ft\n🪑 Furniture Assembly — from $150\n🖼️ Art/Mirror Hanging — $175\n🏠 LVP Flooring — from $3.50/sq ft\n\n💡 Book 2+ services = 20% combo discount\n\nFull pricing: handyandfriend.com\nOr just ask me anything here 👋"
};

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
  console.log('[ALEX_WEBHOOK] inferredLead:', inferredLead ? JSON.stringify({ phone: inferredLead.phone, service: inferredLead.service_type }) : 'null');
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

      // Notify Telegram about new Facebook Messenger lead
      notifyTelegramFbLead({
        leadId: created.id,
        sessionId,
        phone: inferredLead.phone,
        service: inferredLead.service_type,
        userText: inboundText,
        aiReply: reply
      }).catch((e) => console.error('[ALEX_WEBHOOK] Telegram notify error:', e.message));
    } catch (err) {
      console.error('[ALEX_WEBHOOK] Lead capture failed:', err.message, err.code || '', JSON.stringify(err.details || err.hint || ''));
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
  const t = String(text || '').toLowerCase();
  const map = [
    ['cabinet painting', ['cabinet', 'door', 'drawer', 'kitchen cabinet', 'facade',
      'шкаф', 'шкафчик', 'дверца', 'фасад', 'кухон', 'armario', 'gabinete', 'puerta']],
    ['furniture assembly', ['furniture assembly', 'assemble', 'ikea', 'bed frame', 'dresser',
      'сборка', 'мебел', 'кровать', 'комод', 'mueble', 'ensamblar', 'cama']],
    ['interior painting', ['interior painting', 'paint walls', 'wall paint', 'ceiling paint', 'painting',
      'покраска стен', 'стены', 'покраска', 'pintura', 'pared', 'pintar']],
    ['flooring', ['flooring', 'laminate', 'lvp', 'vinyl floor', 'floor install',
      'пол', 'укладка', 'ламинат', 'piso', 'suelo', 'piso laminado']],
    ['tv mounting', ['tv mount', 'tv mounting',
      'телевизор', 'монтаж тв', 'тв', 'televisor', 'instalar tv', 'montar tv']],
    ['art hanging', ['mirror', 'art hanging', 'picture hanging', 'curtain',
      'зеркало', 'картин', 'карниз', 'espejo', 'cuadro', 'cortina']],
    ['plumbing', ['plumbing', 'faucet', 'toilet', 'shower head', 'caulk tub',
      'сантехник', 'кран', 'унитаз', 'душ', 'plomería', 'grifo', 'sanitario']],
    ['electrical', ['electrical', 'light fixture', 'outlet', 'switch', 'smart lock', 'doorbell',
      'электрик', 'светильник', 'розетка', 'выключатель', 'eléctrico', 'tomacorriente']]
  ];
  for (const [service, keywords] of map) {
    if (keywords.some((k) => t.includes(k))) return service;
  }
  return '';
}

async function notifyTelegramFbLead({ leadId, sessionId, phone, service, userText, aiReply }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const esc = (s) => String(s || '—').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const text = `🔔 <b>FB_MESSENGER_LEAD</b>\n` +
    `📱 Contact: <code>${esc(phone)}</code>\n` +
    `🔧 Service: ${esc(service)}\n` +
    `Session: <code>${esc(sessionId)}</code>\n` +
    `Lead: <code>${esc(leadId)}</code>\n\n` +
    `<b>User:</b> ${esc(String(userText || '').slice(0, 300))}\n` +
    `<b>Alex:</b> ${esc(String(aiReply || '').slice(0, 300))}`;

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  const tgData = await tgRes.json().catch(() => ({}));
  if (tgRes.ok && tgData.ok) {
    console.log('[ALEX_WEBHOOK] Telegram notified, msg_id:', tgData.result?.message_id);
  } else {
    console.error('[ALEX_WEBHOOK] Telegram error:', JSON.stringify(tgData));
  }
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
