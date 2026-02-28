/**
 * Lead Submission Endpoint - Vercel Serverless Function
 * Replaces Formspree (which was using placeholder ID "xyzqwert")
 *
 * Sends email notification to owner via Resend API (free tier: 3000/month)
 * Falls back to console log in demo mode if RESEND_API_KEY not set
 *
 * SETUP: Add RESEND_API_KEY to Vercel → Settings → Environment Variables
 * Get free key at: https://resend.com/signup
 */

const { saveLeadContext } = require('./lead-context-store.js');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    name,
    email,
    phone,
    zip,
    preferredContact,
    service,
    message,
    attachments,
    attribution,
    lang,
    timestamp,
    recaptchaToken,
    recaptchaAction,
    _subject
  } = req.body || {};
  const normalizedAttribution = normalizeAttribution(attribution);

  // Basic validation
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, phone'
    });
  }

  // Email validation (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  if (process.env.RECAPTCHA_SECRET_KEY) {
    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing reCAPTCHA token'
      });
    }

    try {
      const verifyBody = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      });

      const recaptchaResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyBody
      });
      const recaptchaData = await recaptchaResp.json();
      const expectedAction = recaptchaAction || 'lead_submit';
      const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

      if (
        !recaptchaData.success ||
        recaptchaData.action !== expectedAction ||
        Number(recaptchaData.score || 0) < minScore
      ) {
        console.warn('[RECAPTCHA_BLOCKED]', recaptchaData);
        return res.status(403).json({
          success: false,
          error: 'reCAPTCHA validation failed'
        });
      }
    } catch (err) {
      console.error('[RECAPTCHA_ERROR]', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify reCAPTCHA'
      });
    }
  }

  // Log lead
  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const safeAttachments = Array.isArray(attachments)
    ? attachments.slice(0, 6).map((item) => ({
      name: String(item?.name || 'photo.jpg'),
      type: String(item?.type || 'image/jpeg'),
      size: Number(item?.size || 0)
    }))
    : [];

  const leadData = {
    leadId,
    name,
    email,
    phone,
    zip: String(zip || ''),
    preferredContact: String(preferredContact || 'call'),
    service: service || 'Not specified',
    message: message || 'No message',
    attachments: safeAttachments,
    attribution: normalizedAttribution,
    lang: lang || 'en',
    timestamp: timestamp || new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    source: normalizedAttribution.summary || req.headers['referer'] || 'https://handyandfriend.com',
    sourceDetails: {
      utmSource: normalizedAttribution.utmSource || '',
      utmCampaign: normalizedAttribution.utmCampaign || '',
      placementId: normalizedAttribution.placementId || ''
    }
  };

  console.log('[LEAD_CAPTURED]', JSON.stringify(leadData));
  saveLeadContext(leadData).catch((err) => console.error('[LEAD_CONTEXT_ASYNC_ERROR]', err.message));

  // Build email HTML
  const subjectLine = _subject || `New Quote Request: ${service || 'General'} from ${name}`;
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f7f4">
  <div style="background:#3a3a3a;padding:20px;border-radius:12px 12px 0 0">
    <h1 style="color:#b88924;margin:0;font-size:22px">🔧 Handy & Friend</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:14px">New Quote Request</p>
  </div>

  <div style="background:#fff;padding:24px;border:1px solid #e5dfd5">
    <h2 style="color:#3a3a3a;font-size:18px;margin:0 0 20px">
      ${subjectLine}
    </h2>

    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px;width:120px">Name</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${name}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Email</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">
          ${email ? `<a href="mailto:${email}" style="color:#b88924">${email}</a>` : 'Not provided'}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Phone</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">
          <a href="tel:${phone}" style="color:#b88924">${phone}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Service</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${service || 'Not specified'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">ZIP</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${escapeHtml(leadData.zip || 'Not provided')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Preferred Contact</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${escapeHtml(leadData.preferredContact || 'call')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Attachments</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${leadData.attachments.length} photo(s)</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top">Message</td>
        <td style="padding:10px 0;color:#3a3a3a">${message || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top">Attribution</td>
        <td style="padding:10px 0;color:#3a3a3a">${escapeHtml(leadData.source || 'direct')}</td>
      </tr>
    </table>
  </div>

  <div style="background:#f9f7f4;padding:16px;border:1px solid #e5dfd5;border-top:0;border-radius:0 0 12px 12px">
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <a href="tel:${phone}" style="background:#b88924;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">📞 Call Now</a>
      ${email ? `<a href="mailto:${email}" style="background:#3a3a3a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">📧 Reply Email</a>` : ''}
      <a href="https://wa.me/${phone.replace(/\D/g, '')}" style="background:#25d366;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">💬 WhatsApp</a>
    </div>
    <p style="margin:0;font-size:11px;color:#999">
      Lead ID: ${leadId} · Received: ${new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PT
      · IP: ${leadData.ip}
    </p>
  </div>
</body>
</html>
  `.trim();

  // === SEND EMAIL ===

  // OPTION 1: Resend API (recommended, free 3000/month)
  if (process.env.RESEND_API_KEY) {
    try {
      const resendPayload = {
        from: 'Handy & Friend Leads <leads@handyandfriend.com>',
        to: [process.env.OWNER_EMAIL || '2133611700c@gmail.com'],
        subject: subjectLine,
        html: emailHtml
      };
      if (email) resendPayload.reply_to = email;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
      });

      if (!resendRes.ok) {
        const err = await resendRes.json().catch(() => ({}));
        console.error('[RESEND_ERROR]', resendRes.status, err);
        // Fall through to demo mode
      } else {
        const data = await resendRes.json();
        console.log('[RESEND_SENT]', data.id, 'to', process.env.OWNER_EMAIL || '2133611700c@gmail.com');

        // Fire Telegram notification asynchronously (don't wait for it)
        notifyViaTelegram(leadData);

        return res.status(200).json({
          success: true,
          mode: 'resend',
          leadId
        });
      }
    } catch (err) {
      console.error('[RESEND_FETCH_ERROR]', err.message);
      // Fall through to demo mode
    }
  }

  // OPTION 2: Sendgrid fallback
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sendgridPayload = {
        personalizations: [{ to: [{ email: process.env.OWNER_EMAIL || '2133611700c@gmail.com' }] }],
        from: { email: 'leads@handyandfriend.com', name: 'Handy & Friend Leads' },
        subject: subjectLine,
        content: [{ type: 'text/html', value: emailHtml }]
      };
      if (email) sendgridPayload.reply_to = { email };

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendgridPayload)
      });

      if (sgRes.ok || sgRes.status === 202) {
        console.log('[SENDGRID_SENT] to', process.env.OWNER_EMAIL || '2133611700c@gmail.com');

        // Fire Telegram notification asynchronously
        notifyViaTelegram(leadData);

        return res.status(200).json({ success: true, mode: 'sendgrid', leadId });
      }
    } catch (err) {
      console.error('[SENDGRID_ERROR]', err.message);
    }
  }

  // OPTION 3: Demo mode (no email sent — lead logged to console only)
  console.log('[DEMO_MODE] No email API configured. Lead logged only.');
  console.log('[DEMO_LEAD]', JSON.stringify(leadData, null, 2));

  // Fire Telegram notification asynchronously even in demo mode
  notifyViaTelegram(leadData);

  return res.status(200).json({
    success: true,
    mode: 'demo',
    leadId,
    note: 'Lead captured. Add RESEND_API_KEY to Vercel env vars to receive email notifications.'
  });
}

/**
 * Send lead notification via Telegram Bot (fire and forget, doesn't block main response)
 */
function notifyViaTelegram(leadData) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return; // Silently skip if not configured
  }

  const { leadId, name, phone, email, zip, preferredContact, service, message, attachments, attribution } = leadData;

  const telegramMessage = `🔧 <b>NEW LEAD!</b>

<b>Name:</b> ${escapeHtml(name)}
<b>Phone:</b> <code>${escapeHtml(phone)}</code>
<b>Email:</b> ${escapeHtml(email || 'Not provided')}
<b>Service:</b> ${escapeHtml(service || 'General')}
<b>ZIP:</b> ${escapeHtml(zip || '—')}
<b>Preferred Contact:</b> ${escapeHtml(preferredContact || 'call')}
<b>Photos:</b> ${Array.isArray(attachments) ? attachments.length : 0}

<b>Message:</b>
${escapeHtml(message || '—')}

<b>Attribution:</b> <code>${escapeHtml((attribution && attribution.summary) || 'direct')}</code>

<b>Lead ID:</b> <code>${leadId}</code>
<b>CTX:</b> <code>CTX:${leadId}:${phone}</code>
<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT

${email ? `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${phone.replace(/\D/g, '')}">💬 WhatsApp</a> • <a href="mailto:${email}">📧 Email</a>` : `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${phone.replace(/\D/g, '')}">💬 WhatsApp</a>`}`;

  // Create interactive buttons
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '💬 Ответ RU', callback_data: `reply:ru:greeting:${leadId}` },
        { text: '💬 Reply EN', callback_data: `reply:en:greeting:${leadId}` }
      ],
      [{ text: '✅ Взял в работу', callback_data: `taken_${leadId}` }],
      [
        { text: '📍 Нужен адрес', callback_data: `askaddr_${leadId}` },
        { text: '📸 Нужны фото', callback_data: `askphoto_${leadId}` }
      ],
      [
        { text: '⏱ Связь через 15 мин', callback_data: `cb15_${leadId}` },
        { text: '❌ Отказ', callback_data: `decline_${leadId}` }
      ],
      [{ text: '📍 WhatsApp', url: `https://wa.me/${phone.replace(/\D/g, '')}` }]
    ]
  };

  // Non-blocking fetch to Telegram API
  fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: replyMarkup
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        console.log('[TELEGRAM_SENT]', data.result.message_id, 'Lead ID:', leadId);
      } else {
        console.error('[TELEGRAM_ERROR]', data.error_code, data.description);
      }
    })
    .catch(err => console.error('[TELEGRAM_FETCH_ERROR]', err.message));
}

/**
 * Escape special HTML characters for Telegram
 */
function normalizeAttribution(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const clickId = safe.clickId && typeof safe.clickId === 'object' ? safe.clickId : {};
  const normalized = {
    pageUrl: String(safe.pageUrl || ''),
    referrer: String(safe.referrer || ''),
    utmSource: String(safe.utmSource || ''),
    utmMedium: String(safe.utmMedium || ''),
    utmCampaign: String(safe.utmCampaign || ''),
    utmContent: String(safe.utmContent || ''),
    utmTerm: String(safe.utmTerm || ''),
    placementId: String(safe.placementId || ''),
    landingPath: String(safe.landingPath || ''),
    lang: String(safe.lang || ''),
    clickId: {
      fbclid: String(clickId.fbclid || ''),
      gclid: String(clickId.gclid || ''),
      msclkid: String(clickId.msclkid || ''),
      ttclid: String(clickId.ttclid || ''),
      gbraid: String(clickId.gbraid || ''),
      wbraid: String(clickId.wbraid || '')
    }
  };

  const summaryParts = [];
  if (normalized.utmSource) summaryParts.push('src=' + normalized.utmSource);
  if (normalized.utmMedium) summaryParts.push('med=' + normalized.utmMedium);
  if (normalized.utmCampaign) summaryParts.push('cmp=' + normalized.utmCampaign);
  if (normalized.placementId) summaryParts.push('plc=' + normalized.placementId);
  if (normalized.referrer) summaryParts.push('ref=' + normalized.referrer);

  const clickParts = [];
  if (normalized.clickId.fbclid) clickParts.push('fbclid');
  if (normalized.clickId.gclid) clickParts.push('gclid');
  if (normalized.clickId.msclkid) clickParts.push('msclkid');
  if (normalized.clickId.ttclid) clickParts.push('ttclid');
  if (normalized.clickId.gbraid) clickParts.push('gbraid');
  if (normalized.clickId.wbraid) clickParts.push('wbraid');
  if (clickParts.length) summaryParts.push('click=' + clickParts.join(','));

  normalized.summary = summaryParts.join(' | ') || 'direct';
  return normalized;
}
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
