/**
 * Owner Notification Endpoint - compatibility wrapper.
 * Primary notification channel is Telegram.
 */

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

  const { name, email, phone, service, message, leadId } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, phone'
    });
  }

  const notifId = `notif_${Date.now()}`;
  console.log('[OWNER_NOTIFICATION]', {
    notifId,
    name,
    email,
    phone,
    service,
    timestamp: new Date().toISOString()
  });

  // Primary: Telegram notification
  let telegramSent = false;
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const telegramMessage = `🔧 <b>NEW LEAD!</b>

<b>Name:</b> ${escapeHtml(name)}
<b>Phone:</b> <code>${escapeHtml(phone)}</code>
<b>Email:</b> ${escapeHtml(email || 'Not provided')}
<b>Service:</b> ${escapeHtml(service || 'General')}

<b>Message:</b>
${escapeHtml(message || '—')}

<b>Lead ID:</b> <code>${escapeHtml(leadId || notifId)}</code>
<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT`;

      const telegramRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      if (telegramRes.ok) {
        const data = await telegramRes.json();
        telegramSent = Boolean(data?.ok);
        if (telegramSent) {
          console.log('[OWNER_TELEGRAM_SENT]', data.result?.message_id);
        }
      }
    } catch (err) {
      console.error('[OWNER_TELEGRAM_ERROR]', err.message);
    }
  }

  // Optional fallback: owner SMS via Twilio if configured
  if (!telegramSent && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.OWNER_PHONE) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const smsBody = `NEW LEAD: ${name}, ${phone}, ${service || 'General'}`;
      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE || '+1XXXXXXXXXX',
          To: process.env.OWNER_PHONE,
          Body: smsBody
        }).toString()
      });

      if (twilioRes.ok) {
        const data = await twilioRes.json();
        console.log('[OWNER_SMS_SENT]', data.sid);
        return res.status(200).json({ success: true, mode: 'sms', notifId });
      }
    } catch (err) {
      console.error('[OWNER_SMS_ERROR]', err.message);
    }
  }

  return res.status(200).json({
    success: true,
    mode: telegramSent ? 'telegram' : 'log_only',
    notifId,
    note: telegramSent
      ? 'Lead sent to Telegram.'
      : 'Lead logged. Configure TELEGRAM_* (preferred) or TWILIO_* + OWNER_PHONE.'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
