const { logLeadEvent } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const ip = getClientIp(req);
  const rate = checkRateLimit({
    key: `send-telegram:${ip}`,
    limit: 20,
    windowMs: 60 * 1000
  });
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ success: false, error: 'Too many requests. Please retry shortly.' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(200).json({ success: true, mode: 'skipped', note: 'Telegram env not configured' });
  }

  const lead = req.body && typeof req.body === 'object' ? req.body : {};
  const leadId = String(lead.leadId || lead.id || 'unknown');
  const message = buildTelegramMessage(lead);

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
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
  const phone = escapeHtml(lead.phone || 'N/A');
  const email = escapeHtml(lead.email || 'N/A');
  const city = escapeHtml(lead.city || 'N/A');
  const zip = escapeHtml(lead.zip || 'N/A');
  const service = escapeHtml(lead.serviceType || lead.service || 'N/A');
  const summary = escapeHtml(lead.aiSummaryShort || lead.message || lead.problemDescription || 'N/A');
  const budget = escapeHtml(lead.budgetRange || 'N/A');
  const photos = Number(lead.photosCount || 0);
  const leadId = escapeHtml(lead.leadId || lead.id || 'unknown');

  return `🚨 <b>New Lead</b>\nName: ${fullName}\nContact: <code>${phone}</code> / ${email}\nArea: ${city} / ${zip}\nService: ${service}\nSummary: ${summary}\nBudget: ${budget}\nPhotos: ${photos}\nLead ID: <code>${leadId}</code>`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
