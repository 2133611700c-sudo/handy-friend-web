/**
 * Unified Notify Endpoint
 * Replaces: send-telegram.js + send-sms.js
 *
 * POST /api/notify
 * Body: { type: 'telegram' | 'sms', ...payload }
 *
 * type=telegram  → Telegram Bot API sendMessage to owner chat
 * type=sms       → SMS via Twilio (or demo mode)
 *
 * Backward compat: requests without type= default to telegram.
 * Frontend /api/send-sms calls are handled via type=sms.
 */

const { logLeadEvent } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const ip = getClientIp(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const type = String(body.type || 'telegram').toLowerCase();

  const rateKey = `notify:${type}:${ip}`;
  const rate = checkRateLimit({ key: rateKey, limit: 20, windowMs: 60 * 1000 });
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ success: false, error: 'Too many requests. Please retry shortly.' });
  }

  if (type === 'sms') {
    return handleSms(req, res, body);
  }

  return handleTelegram(req, res, body);
}

// ─── Telegram ────────────────────────────────────────────────────────────────

async function handleTelegram(req, res, lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(200).json({ success: true, mode: 'skipped', note: 'Telegram env not configured' });
  }

  const leadId = String(lead.leadId || lead.id || 'unknown');
  const message = buildTelegramMessage(lead);
  const replyMarkup = buildTelegramMarkup(lead);

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup
      })
    });

    const data = await telegramRes.json().catch(() => ({}));
    if (!telegramRes.ok || !data.ok) {
      await logLeadEvent(leadId, 'telegram_failed', {
        status: telegramRes.status,
        description: data?.description || 'unknown_telegram_error'
      });
      return res.status(502).json({ success: false, error: 'Telegram request failed' });
    }

    await logLeadEvent(leadId, 'telegram_sent', { message_id: data?.result?.message_id || null });
    return res.status(200).json({ success: true, messageId: data?.result?.message_id || null });
  } catch (err) {
    await logLeadEvent(leadId, 'telegram_failed', {
      error: String(err?.message || 'telegram_exception').slice(0, 300)
    });
    return res.status(500).json({ success: false, error: 'Telegram delivery exception' });
  }
}

function buildTelegramMessage(lead) {
  const fullName = escapeHtml(lead.fullName || lead.name || 'Not provided');
  const rawName = String(lead.fullName || lead.name || 'there');
  const rawService = String(lead.serviceType || lead.service || 'your project');
  const phone = escapeHtml(lead.phone || 'N/A');
  const email = escapeHtml(lead.email || 'N/A');
  const city = escapeHtml(lead.city || 'N/A');
  const zip = escapeHtml(lead.zip || 'N/A');
  const service = escapeHtml(lead.serviceType || lead.service || 'N/A');
  const summary = escapeHtml(lead.aiSummaryShort || lead.message || lead.problemDescription || 'N/A');
  const budget = escapeHtml(lead.budgetRange || 'N/A');
  const photos = Number(lead.photosCount || 0);
  const leadId = escapeHtml(lead.leadId || lead.id || 'unknown');
  const quickReplyEn = escapeHtml(`Hi ${rawName}, thanks for your request. We can help with ${rawService}. What time works best today for a quick confirmation call?`);
  const quickReplyRu = escapeHtml(`Здравствуйте, ${rawName}! Спасибо за заявку. Поможем с работой: ${rawService}. Подскажите, когда вам удобно коротко созвониться сегодня?`);

  return `🚨 <b>New Lead</b>\nName: ${fullName}\nContact: <code>${phone}</code> / ${email}\nArea: ${city} / ${zip}\nService: ${service}\nSummary: ${summary}\nBudget: ${budget}\nPhotos: ${photos}\nLead ID: <code>${leadId}</code>\n\n<b>Quick Reply EN:</b>\n<code>${quickReplyEn}</code>\n\n<b>Quick Reply RU:</b>\n<code>${quickReplyRu}</code>`;
}

function buildTelegramMarkup(lead) {
  const rawName = String(lead.fullName || lead.name || 'there').trim() || 'there';
  const rawService = String(lead.serviceType || lead.service || 'your project');
  const leadId = String(lead.leadId || lead.id || 'unknown');
  const phoneDigits = String(lead.phone || '').replace(/\D/g, '');
  const quickReplyEn = `Hi ${rawName}, thanks for your request. We can help with ${rawService}. What time works best today for a quick confirmation call?`;
  const quickReplyRu = `Здравствуйте, ${rawName}! Спасибо за заявку. Поможем с работой: ${rawService}. Подскажите, когда вам удобно коротко созвониться сегодня?`;
  const waText = encodeURIComponent(quickReplyEn);
  const panelBase = `https://handyandfriend.com/r/one-tap/?leadId=${encodeURIComponent(leadId)}&phone=${encodeURIComponent(phoneDigits)}`;
  const panelEn = `${panelBase}&lang=en&action=reply_en&text=${encodeURIComponent(quickReplyEn)}`;
  const panelRu = `${panelBase}&lang=ru&action=reply_ru&text=${encodeURIComponent(quickReplyRu)}`;

  if (!phoneDigits) return undefined;

  const rows = [
    [{ text: '📝 Reply EN', url: panelEn }, { text: '📝 Reply RU', url: panelRu }],
    [{ text: '💬 WhatsApp', url: `https://wa.me/${phoneDigits}?text=${waText}` }],
    [{ text: '🧩 One-Tap Panel', url: panelEn }]
  ];
  return { inline_keyboard: rows };
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

async function handleSms(req, res, body) {
  const { phone, estimate, timestamp, consent } = body;

  if (!phone || !estimate || !consent) {
    return res.status(400).json({ success: false, error: 'Missing required fields: phone, estimate, consent' });
  }
  if (!/^\+?[\d\s\-()+]+$/.test(phone)) {
    return res.status(400).json({ success: false, error: 'Invalid phone format' });
  }

  // Twilio (if configured)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const auth = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE || '+12133611700';
      const normalized = normalizePhone(phone);
      const msgBody = `Hi! Here's your Handy & Friend estimate: ${estimate}\n\nTo book: Reply BOOK or call 213-361-1700`;

      const tRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: normalized, From: from, Body: msgBody })
      });
      const data = await tRes.json();
      if (!tRes.ok) throw new Error(data.message || 'Twilio error');
      return res.status(200).json({ success: true, message_sid: data.sid });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SMS delivery failed' });
    }
  }

  // Demo mode (Twilio not configured)
  return res.status(200).json({ success: true, mode: 'demo', message: 'SMS lead captured (demo mode)' });
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  let n = String(phone || '').replace(/[^\d+]/g, '');
  if (!n.startsWith('+')) n = '+1' + n.slice(-10);
  return n;
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
