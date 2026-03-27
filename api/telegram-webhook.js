/**
 * Telegram webhook for Alex AI
 * POST /api/telegram-webhook -> inbound Telegram messages → Alex → reply
 *
 * Required env:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID       (owner notification chat)
 * - DEEPSEEK_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Setup:
 *   curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://handyandfriend.com/api/telegram-webhook&secret_token={TG_SECRET}"
 */

const { callAlex } = require('../lib/ai-fallback.js');
const { processInbound, transitionLead, logEvent: pipelineLogEvent, drainOutboxInline } = require('../lib/lead-pipeline.js');
const { buildSystemPrompt, getGuardMode } = require('../lib/alex-one-truth.js');
const { getPricingSourceVersion } = require('../lib/price-registry.js');
const { inferServiceType: inferServiceTypeShared } = require('../lib/alex-policy-engine.js');
const { createEnvelope } = require('../lib/inbound-envelope.js');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

const START_MSG = `👋 Hey! I'm Alex — your Handy & Friend assistant in Los Angeles.

I can help you with:
• 🎨 Cabinet painting (from $75/door)
• 📺 TV mounting (from $150)
• 🪵 Flooring (from $3/sq ft)
• 🖌️ Interior painting (from $3/sq ft)
• 🪑 Furniture assembly (from $150)
• ⚡ Electrical & 🔧 Plumbing

Just tell me what you need — I'll give you an exact price and schedule. What project can I help with?`;

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Validate secret token if set
  if (TG_SECRET) {
    const incoming = req.headers['x-telegram-bot-api-secret-token'] || '';
    if (incoming !== TG_SECRET) {
      console.warn('[TG_WEBHOOK] Invalid secret token');
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const update = req.body || {};
  const message = update.message || update.edited_message;

  // Ignore non-message updates (channel posts, inline queries, etc.)
  if (!message) return res.status(200).json({ ok: true });

  const chatId = String(message.chat?.id || '');
  const fromId = String(message.from?.id || '');
  const text = (message.text || '').trim();
  const firstName = message.from?.first_name || '';
  const lastName = message.from?.last_name || '';
  const userName = [firstName, lastName].filter(Boolean).join(' ') || `tg_${fromId}`;

  if (!chatId || !text) return res.status(200).json({ ok: true });

  console.log(`[TG_WEBHOOK] Message from ${userName} (${chatId}): ${text.substring(0, 80)}`);

  // /start command
  if (text === '/start') {
    await sendTelegramMessage(chatId, START_MSG);
    return res.status(200).json({ ok: true });
  }

  // /help command
  if (text === '/help') {
    await sendTelegramMessage(chatId, `Need help? Just describe your project and I'll give you a price and availability.\n\nOr call us directly: (213) 361-1700\n🌐 handyandfriend.com`);
    return res.status(200).json({ ok: true });
  }

  const updateId = String(update.update_id || '');
  try {
    await processMessage({ chatId, fromId, userName, text, updateId });
  } catch (err) {
    console.error('[TG_WEBHOOK] Error:', err?.message || err);
    // Don't let errors crash the webhook — always ack Telegram
    await sendTelegramMessage(chatId, 'Something went wrong on my end. Please try again or call (213) 361-1700 📞').catch(() => {});
  }

  return res.status(200).json({ ok: true });
}

module.exports = handler;

async function processMessage({ chatId, fromId, userName, text, updateId }) {
  const sessionId = `tg_${chatId}`;

  // Load conversation history
  const history = await loadHistory(sessionId);
  const messages = [...history, { role: 'user', content: text }].slice(-20);
  const userMsgCount = messages.filter(m => m.role === 'user').length;

  // Check if phone/contact captured
  const hasPhone = hasPhoneCapture(messages);
  const hasContact = hasPhone || hasEmailCapture(messages);

  // Build Alex prompt and call AI
  const guardMode = getGuardMode({ hasContact, hasPhone });
  const systemPrompt = buildSystemPrompt({ guardMode });
  const alexResult = await callAlex(messages, systemPrompt);
  let reply = String(alexResult.reply || '').trim();

  // Strip lead payload block (internal markers)
  reply = stripLeadPayload(reply);

  // Strip cross-sell from standalone services
  const allUserText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const serviceInference = inferServiceTypeShared(allUserText);
  const isStandalone = ['plumbing', 'electrical'].includes(serviceInference.serviceId);
  if (isStandalone) reply = stripCrossSell(reply);

  // Soft CTA every 3rd message
  if (!hasContact && userMsgCount % 3 === 0 && userMsgCount > 0) {
    reply = enforceContactCTA(reply);
  }

  // Telegram max 4096 chars
  reply = stripMarkdown(reply).slice(0, 4000);
  if (!reply) reply = 'Please describe your project and share your phone number so we can schedule 📲';

  // Save turn to history
  await saveTurns(sessionId, text, reply);

  // Send reply
  await sendTelegramMessage(chatId, reply);

  // Drain outbox inline (compensates for Hobby plan daily-only cron)
  drainOutboxInline();

  // Lead capture — Unified Lead System v3: envelope → processInbound → outbox
  const lead = inferLead(messages, userName);
  if (lead) {
    try {
      const tgEnvelope = createEnvelope({
        source:            'telegram',
        source_user_id:    String(fromId || chatId),
        source_message_id: updateId ? `tg_${updateId}` : `tg_${chatId}_${Date.now()}`,
        source_thread_id:  sessionId,
        lead_phone:        lead.phone  || '',
        lead_email:        lead.email  || '',
        lead_name:         lead.name   || userName || '',
        raw_text:          lead.problem_description || text,
        service_hint:      lead.service_type || '',
        meta:              { chat_id: chatId, from_id: fromId, session_id: sessionId, pricing_version: getPricingSourceVersion() }
      });

      const created = await processInbound(tgEnvelope);

      await transitionLead(created.id, 'contacted', {
        contacted_at: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('[TG_WEBHOOK] Lead capture error:', err?.message);
    }
  }
}

// ─── Telegram API ─────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId, text) {
  if (!TG_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  const data = await res.json();
  if (!data.ok) console.error('[TG_WEBHOOK] sendMessage error:', JSON.stringify(data));
  return data;
}

async function notifyOwner({ lead, userName, chatId, text, service }) {
  if (!OWNER_CHAT_ID || !TG_TOKEN) return;
  const msg = [
    `🤖 <b>New Telegram Lead</b>`,
    `👤 ${escapeHtml(lead.full_name || userName)}`,
    lead.phone ? `📞 ${escapeHtml(lead.phone)}` : null,
    `🔧 ${escapeHtml(service || 'unknown')}`,
    `💬 ${escapeHtml(text.substring(0, 120))}`,
    `🆔 chat_id: <code>${chatId}</code>`,
    `🔗 Session: tg_${chatId}`
  ].filter(Boolean).join('\n');

  await sendTelegramMessage(OWNER_CHAT_ID, msg);
}

// ─── History (via Supabase ai_conversations) ──────────────────────────────────

async function loadHistory(sessionId) {
  try {
    const { restGet } = require('./_lib/supabase-admin.js');
    const rows = await restGet('ai_conversations', {
      session_id: `eq.${sessionId}`,
      order: 'created_at.asc',
      limit: 20
    });
    if (!Array.isArray(rows)) return [];
    return rows.flatMap(r => [
      r.user_message ? { role: 'user', content: r.user_message } : null,
      r.ai_reply ? { role: 'assistant', content: r.ai_reply } : null
    ]).filter(Boolean);
  } catch (err) {
    console.warn('[TG_WEBHOOK] loadHistory error:', err?.message);
    return [];
  }
}

async function saveTurns(sessionId, userMsg, aiReply) {
  try {
    const { restInsert } = require('./_lib/supabase-admin.js');
    await restInsert('ai_conversations', {
      session_id: sessionId,
      user_message: userMsg,
      ai_reply: aiReply,
      source: 'telegram',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[TG_WEBHOOK] saveTurns error:', err?.message);
  }
}

// ─── Lead Inference ───────────────────────────────────────────────────────────

function inferLead(messages, userName) {
  const allText = messages.map(m => m.content).join(' ');
  const phone = extractPhone(allText);
  if (!phone) return null;

  const service = inferServiceTypeShared(messages.filter(m => m.role === 'user').map(m => m.content).join(' ')).serviceId;
  const name = extractName(allText) || userName;

  return { phone, name, service_type: service !== 'unknown' ? service : '', problem_description: messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '' };
}

function extractPhone(text) {
  const match = text.match(/(\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  return match ? match[1].replace(/\D/g, '').slice(-10) : null;
}

function extractName(text) {
  const match = text.match(/(?:my name is|i(?:'m| am)|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  return match ? match[1] : null;
}

function hasPhoneCapture(messages) {
  return messages.some(m => /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(m.content || ''));
}

function hasEmailCapture(messages) {
  return messages.some(m => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(m.content || ''));
}

// ─── Text Helpers ─────────────────────────────────────────────────────────────

function stripLeadPayload(text) {
  return text.replace(/\[\[LEAD_PAYLOAD[\s\S]*?\]\]/g, '').trim();
}

function stripCrossSell(text) {
  return text.replace(/same visit[^.]*\./gi, '').replace(/also (handle|do|offer)[^.]*\./gi, '').trim();
}

function enforceContactCTA(text) {
  if (/\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(text)) return text;
  return text + '\n\nWhat\'s the best number to reach you? 📱';
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .trim();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
