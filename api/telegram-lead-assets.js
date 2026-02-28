/**
 * Telegram Lead Assets Endpoint
 * Sends lead attribution context + uploaded photos to Telegram.
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

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return res.status(200).json({ success: true, mode: 'skipped', note: 'Telegram not configured' });
  }

  const {
    leadId,
    name,
    phone,
    service,
    message,
    attribution,
    photos
  } = req.body || {};

  if (!leadId || !name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: leadId, name, phone'
    });
  }

  const safePhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];

  try {
    const shouldSendContext = Boolean(attribution) || Boolean(message);
    if (shouldSendContext) {
      const contextText = buildContextText({
        leadId,
        name,
        phone,
        service,
        message,
        attribution
      });
      await sendText(contextText);
    }

    let sentCount = 0;
    for (const photo of safePhotos) {
      const ok = await sendPhoto(photo, leadId);
      if (ok) sentCount += 1;
    }

    return res.status(200).json({
      success: true,
      mode: 'telegram_assets',
      sentPhotos: sentCount
    });
  } catch (err) {
    console.error('[TELEGRAM_ASSETS_ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to send Telegram assets'
    });
  }
}

function buildContextText({ leadId, name, phone, service, message, attribution }) {
  const source = attribution?.utmSource || 'direct';
  const medium = attribution?.utmMedium || 'none';
  const campaign = attribution?.utmCampaign || 'none';
  const referrer = attribution?.referrer || 'direct';
  const pageUrl = attribution?.pageUrl || '';
  const clickId = attribution?.clickId || {};
  const clickSummary = [
    clickId.fbclid ? 'fbclid' : '',
    clickId.gclid ? 'gclid' : '',
    clickId.msclkid ? 'msclkid' : '',
    clickId.ttclid ? 'ttclid' : '',
    clickId.gbraid ? 'gbraid' : '',
    clickId.wbraid ? 'wbraid' : ''
  ].filter(Boolean).join(', ') || 'none';

  return `🧾 <b>Lead Context Update</b>

<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>
<b>Name:</b> ${escapeHtml(name)}
<b>Phone:</b> <code>${escapeHtml(phone)}</code>
<b>Service:</b> ${escapeHtml(service || 'General')}
<b>Message:</b> ${escapeHtml(message || '—')}

<b>Source:</b> ${escapeHtml(source)} / ${escapeHtml(medium)}
<b>Campaign:</b> ${escapeHtml(campaign)}
<b>Referrer:</b> ${escapeHtml(referrer)}
<b>Click IDs:</b> ${escapeHtml(clickSummary)}
<b>Landing Page:</b> ${escapeHtml(pageUrl)}`;
}

async function sendText(text) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data?.description || 'Telegram sendMessage failed');
  }
}

async function sendPhoto(photo, leadId) {
  if (!photo || !photo.dataUrl || typeof photo.dataUrl !== 'string') {
    return false;
  }

  const [meta, b64] = photo.dataUrl.split(',');
  if (!meta || !b64 || !meta.includes('base64')) {
    return false;
  }

  const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64$/.exec(meta);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length) {
    return false;
  }

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  form.append('caption', `📸 Lead photo · ${leadId}`);
  form.append('photo', new Blob([buffer], { type: mimeType }), sanitizeFileName(photo.name));

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    console.error('[TELEGRAM_PHOTO_ERROR]', data?.description || response.statusText);
    return false;
  }
  return true;
}

function sanitizeFileName(name) {
  const clean = String(name || 'lead_photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'lead_photo.jpg';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
