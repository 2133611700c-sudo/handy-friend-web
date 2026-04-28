/**
 * WhatsApp media/photo handling.
 * When customer sends an image on WhatsApp:
 * 1. Extract media_id from webhook payload
 * 2. Fetch media URL from Meta Graph API
 * 3. Store media reference in Supabase (direct REST, no SDK)
 * 4. Notify owner in Telegram with media proof
 * 5. Return structured result for Alex context
 */

function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

function sbUrl(path) {
  return `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1/${path}`;
}

/**
 * Process a WhatsApp image message.
 * @param {object} params
 * @param {string} params.mediaId - from webhook message.image.id
 * @param {string} params.customerPhone
 * @param {string} params.inboundWamid
 * @param {string} params.mimeType - e.g. 'image/jpeg'
 */
async function handleInboundMedia({ mediaId, customerPhone, inboundWamid, mimeType = 'image/jpeg' }) {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  const result = {
    ok: false,
    mediaId,
    mediaUrl: null,
    stored: false,
    ownerNotified: false,
    error: null,
  };

  try {
    // Fetch media URL from Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) {
      result.error = `Meta media fetch failed: ${metaRes.status}`;
      return result;
    }
    const metaData = await metaRes.json();
    result.mediaUrl = metaData.url || null;

    // Store in Supabase via direct REST
    await fetch(sbUrl('whatsapp_messages'), {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        direction: 'in',
        customer_phone: customerPhone,
        wamid: `${inboundWamid}_media`,
        body: '[Photo received]',
        status: 'received',
        raw: {
          type: 'image',
          media_id: mediaId,
          media_url: result.mediaUrl,
          mime_type: mimeType,
          in_reply_to_wamid: inboundWamid,
        },
      }),
    });
    result.stored = true;

    // Notify owner in Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const phone = customerPhone.replace(/^(\d{3})/, '+$1');
    const maskedPhone = phone.slice(0, 6) + '****' + phone.slice(-3);
    const msg = `📷 Photo received from ${maskedPhone}\nMedia ID: ${mediaId}\nNote: Download not implemented — owner must retrieve from WhatsApp manually.`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg }),
    });
    result.ownerNotified = true;
    result.ok = true;
  } catch (e) {
    result.error = e?.message || String(e);
  }

  return result;
}

/**
 * Build Alex context hint when photos have been received.
 */
function buildPhotoContextHint(photoCount = 1, lang = 'en') {
  const msgs = {
    en: `[CONTEXT: Customer sent ${photoCount} photo(s). Acknowledge the photo(s) and ask only remaining details you don't have yet.]`,
    ru: `[CONTEXT: Клиент прислал ${photoCount} фото. Поблагодари за фото и уточни только недостающие детали.]`,
    uk: `[CONTEXT: Клієнт надіслав ${photoCount} фото. Подякуй за фото і уточни лише відсутні деталі.]`,
    es: `[CONTEXT: El cliente envió ${photoCount} foto(s). Agradece las fotos y pregunta solo por los detalles que aún faltan.]`,
  };
  return msgs[lang] || msgs.en;
}

module.exports = { handleInboundMedia, buildPhotoContextHint };
