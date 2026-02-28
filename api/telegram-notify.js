/**
 * Telegram Bot Notification Endpoint - Vercel Serverless Function
 * Sends real-time lead alerts to owner via Telegram
 *
 * Bot: Handy & Friend lead bot
 * Uses Telegram Bot API to send formatted lead notifications
 *
 * SETUP: Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to Vercel → Settings → Environment Variables
 * Get free Telegram bot at: https://t.me/BotFather
 */

const { saveLeadContext } = require('./lead-context-store.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, phone, zip, preferredContact, service, message, source, leadId, lang } = req.body || {};
  const resolvedLeadId = leadId || `lead_${Date.now()}`;

  // Validate required fields
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, phone'
    });
  }

  // Check if Telegram credentials are configured
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('[TELEGRAM_SKIPPED] Bot token or chat ID not configured');
    return res.status(200).json({
      success: true,
      mode: 'skipped',
      note: 'Telegram not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to env vars.'
    });
  }

  try {
    saveLeadContext({
      leadId: resolvedLeadId,
      name,
      phone,
      service,
      zip: zip || '',
      preferredContact: preferredContact || 'call',
      source: source || '',
      lang: lang || 'en'
    }).catch((err) => console.error('[LEAD_CONTEXT_ASYNC_ERROR]', err.message));

    // Format message for Telegram
    const telegramMessage = `🔧 <b>NEW LEAD!</b>

<b>Name:</b> ${escapeHtml(name)}
<b>Phone:</b> <code>${escapeHtml(phone)}</code>
<b>Email:</b> ${escapeHtml(email || 'Not provided')}
<b>Service:</b> ${escapeHtml(service || 'General')}
<b>ZIP:</b> ${escapeHtml(zip || '—')}
<b>Preferred Contact:</b> ${escapeHtml(preferredContact || 'call')}
<b>Source:</b> <code>${escapeHtml(source || 'direct')}</code>

<b>Message:</b>
${escapeHtml(message || '—')}

<b>Lead ID:</b> <code>${resolvedLeadId}</code>
<b>CTX:</b> <code>CTX:${resolvedLeadId}:${phone}</code>
<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT

${email ? `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${phone.replace(/\D/g, '')}">💬 WhatsApp</a> • <a href="mailto:${email}">📧 Email</a>` : `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${phone.replace(/\D/g, '')}">💬 WhatsApp</a>`}`;

    // Create interactive inline buttons
    const replyMarkup = {
      inline_keyboard: [
        // Row 0: One-tap reply language
        [
          { text: '💬 Ответ RU', callback_data: `reply:ru:greeting:${resolvedLeadId}` },
          { text: '💬 Reply EN', callback_data: `reply:en:greeting:${resolvedLeadId}` }
        ],

        // Row 1: Lead accepted
        [{ text: '✅ Взял в работу', callback_data: `taken_${resolvedLeadId}` }],

        // Row 2: Qualification follow-up
        [
          { text: '📍 Нужен адрес', callback_data: `askaddr_${resolvedLeadId}` },
          { text: '📸 Нужны фото', callback_data: `askphoto_${resolvedLeadId}` }
        ],

        // Row 3: Timing / decline
        [
          { text: '⏱ Связь через 15 мин', callback_data: `cb15_${resolvedLeadId}` },
          { text: '❌ Отказ', callback_data: `decline_${resolvedLeadId}` }
        ],
        [{ text: '📍 WhatsApp', url: `https://wa.me/${phone.replace(/\D/g, '')}` }]
      ]
    };

    // Send to Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: telegramMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup
      })
    });

    if (!telegramRes.ok) {
      const err = await telegramRes.json().catch(() => ({}));
      console.error('[TELEGRAM_ERROR]', telegramRes.status, err);
      return res.status(500).json({
        success: false,
        error: 'Failed to send Telegram notification',
        details: err
      });
    }

    const data = await telegramRes.json();
    console.log('[TELEGRAM_SENT]', data.result.message_id, 'to chat', process.env.TELEGRAM_CHAT_ID);

    return res.status(200).json({
      success: true,
      mode: 'telegram',
      messageId: data.result.message_id,
      leadId: resolvedLeadId
    });
  } catch (err) {
    console.error('[TELEGRAM_FETCH_ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Telegram notification failed',
      details: err.message
    });
  }
}

/**
 * Escape special HTML characters for Telegram HTML parse mode
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
