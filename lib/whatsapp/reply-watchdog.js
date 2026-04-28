/**
 * Missed-reply watchdog.
 * Checks if inbound WhatsApp messages have received a reply within 60 seconds.
 * If not, alerts owner in Telegram and logs a lead_event.
 *
 * Uses direct Supabase REST calls (no SDK dependency).
 * This module is called from /api/alex-webhook after the auto-reply attempt,
 * and can also be called from a periodic job.
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
 * Alert owner in Telegram about a failed/missing auto-reply.
 */
async function alertOwnerMissedReply({ inboundWamid, customerPhone, inboundText, reason = 'unknown' }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const maskedPhone = String(customerPhone || '').slice(0, 4) + '****';
  const preview = String(inboundText || '').slice(0, 80);
  const msg = `⚠️ WA AUTO-REPLY FAILED\nPhone: ${maskedPhone}\nWamid: ${inboundWamid}\nText: "${preview}"\nReason: ${reason}`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg }),
    });
  } catch (e) {
    console.error('[watchdog] Telegram alert failed:', e?.message);
  }
}

/**
 * Log a missed-reply event to Supabase lead_events via direct REST.
 */
async function logMissedReplyEvent({ inboundWamid, customerPhone, reason }) {
  try {
    await fetch(sbUrl('lead_events'), {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        event_type: 'whatsapp_auto_reply_failed',
        payload: { inbound_wamid: inboundWamid, customer_phone: customerPhone, reason },
      }),
    });
  } catch (e) {
    console.error('[watchdog] Supabase log failed:', e?.message);
  }
}

/**
 * Check if a specific inbound message has an outbound reply.
 * Returns true if reply exists.
 */
async function hasOutboundReply(inboundWamid) {
  try {
    const url = sbUrl(
      `whatsapp_messages?raw->>in_reply_to_wamid=eq.${encodeURIComponent(inboundWamid)}&direction=eq.out&limit=1&select=id`
    );
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Schedule a deferred check (after 60s) to verify reply was sent.
 * In production, this is done asynchronously (fire-and-forget setTimeout).
 */
function scheduleReplyCheck({ inboundWamid, customerPhone, inboundText, delayMs = 60000 }) {
  setTimeout(async () => {
    try {
      const replied = await hasOutboundReply(inboundWamid);
      if (!replied) {
        await Promise.all([
          alertOwnerMissedReply({ inboundWamid, customerPhone, inboundText, reason: 'no_outbound_within_60s' }),
          logMissedReplyEvent({ inboundWamid, customerPhone, reason: 'no_outbound_within_60s' }),
        ]);
      }
    } catch (e) {
      console.error('[watchdog] check error:', e?.message);
    }
  }, delayMs);
}

module.exports = {
  alertOwnerMissedReply,
  logMissedReplyEvent,
  hasOutboundReply,
  scheduleReplyCheck,
};
