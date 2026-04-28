/**
 * /api/wa-watchdog — Cron-safe missed-reply watchdog for WhatsApp auto-replies.
 *
 * Called by Vercel Cron every 2 minutes (configured in vercel.json).
 * Can also be called manually: GET /api/wa-watchdog?secret=<CRON_SECRET>
 *
 * Logic:
 *   1. Query Supabase for inbound WhatsApp messages from the last 10 minutes
 *      that have direction='in' and no linked outbound row.
 *   2. For each missed reply:
 *      - Send Telegram alert: "⚠️ WA AUTO-REPLY FAILED"
 *      - Insert lead_event: whatsapp_auto_reply_failed
 *      - Mark the inbound row raw.watchdog_alerted=true so we don't double-alert.
 *   3. Return JSON summary.
 *
 * Why cron instead of setTimeout:
 *   Vercel serverless functions are terminated immediately after the HTTP response
 *   is sent. A setTimeout of 60s inside an auto-reply handler will never fire
 *   after the function returns 200. This endpoint is the only reliable alternative.
 */

function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function sbUrl(path) {
  return `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1/${path}`;
}

/** Send a Telegram alert about a missed reply. */
async function alertMissedReply({ wamid, customerPhone, bodyPreview, reason }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  const masked = String(customerPhone || '').slice(0, 5) + '****';
  const text = `⚠️ WA AUTO-REPLY FAILED\nPhone: ${masked}\nWamid: ${wamid}\nText: "${bodyPreview}"\nReason: ${reason}`;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(e => console.error('[wa-watchdog] Telegram alert error:', e?.message));
}

/** Insert a lead_event row for the missed reply. */
async function logMissedReplyEvent({ wamid, customerPhone, reason }) {
  await fetch(sbUrl('lead_events'), {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({
      event_type: 'whatsapp_auto_reply_failed',
      payload: { inbound_wamid: wamid, customer_phone: customerPhone, reason },
    }),
  }).catch(e => console.error('[wa-watchdog] Supabase lead_event error:', e?.message));
}

/** Mark the inbound row as watchdog_alerted so we don't alert again on next run. */
async function markWatchdogAlerted(rowId) {
  await fetch(sbUrl(`whatsapp_messages?id=eq.${rowId}`), {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify({ raw: { watchdog_alerted: true } }),
  }).catch(e => console.error('[wa-watchdog] PATCH error:', e?.message));
}

export default async function handler(req, res) {
  // Allow GET (cron) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Basic secret check — cron calls don't need a secret (Vercel validates cron),
  // but manual calls should pass ?secret=<CRON_SECRET> for safety.
  const cronSecret = process.env.CRON_SECRET || '';
  const reqSecret = req.query?.secret || req.headers?.['x-cron-secret'] || '';
  const isCronCall = req.headers?.['x-vercel-cron'] === '1';
  if (!isCronCall && cronSecret && reqSecret !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Query inbound rows from the last 10 minutes with no outbound reply.
  // We look for rows where:
  //   direction = 'in'
  //   created_at >= now - 10 minutes
  //   watchdog_alerted is not already set
  // Then cross-check: do they have a corresponding direction='out' row
  // with raw->>'in_reply_to_wamid' matching their wamid?
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const since = new Date(Date.now() - windowMs).toISOString();

  let inboundRows = [];
  try {
    const inRes = await fetch(
      sbUrl(`whatsapp_messages?direction=eq.in&created_at=gte.${encodeURIComponent(since)}&select=id,wamid,customer_phone,body,raw,created_at&order=created_at.desc&limit=50`),
      { headers: sbHeaders() }
    );
    if (inRes.ok) {
      const data = await inRes.json();
      inboundRows = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error('[wa-watchdog] Supabase inbound query error:', e?.message);
    return res.status(500).json({ error: 'supabase_error', message: e?.message });
  }

  // Filter out rows already alerted
  const pending = inboundRows.filter(row => !row.raw?.watchdog_alerted);
  if (!pending.length) {
    return res.status(200).json({ ok: true, checked: inboundRows.length, missed: 0, alerted: 0 });
  }

  // For each pending inbound, check if there's a linked outbound
  let alerted = 0;
  const results = [];

  for (const row of pending) {
    try {
      // Look for outbound row with in_reply_to_wamid matching this inbound wamid
      const outRes = await fetch(
        sbUrl(`whatsapp_messages?direction=eq.out&select=id,wamid&limit=1`),
        { headers: { ...sbHeaders(), 'x-raw-filter': `raw->>in_reply_to_wamid.eq.${row.wamid}` } }
      );
      // Alternative: filter by raw JSON field using PostgREST syntax
      const outRes2 = await fetch(
        sbUrl(`whatsapp_messages?direction=eq.out&raw->>in_reply_to_wamid=eq.${encodeURIComponent(row.wamid)}&select=id&limit=1`),
        { headers: sbHeaders() }
      );
      let hasReply = false;
      if (outRes2.ok) {
        const outData = await outRes2.json();
        hasReply = Array.isArray(outData) && outData.length > 0;
      }

      if (!hasReply) {
        // Missed reply — alert owner + log event
        const bodyPreview = String(row.body || '').slice(0, 80);
        const ageSeconds = Math.round((Date.now() - new Date(row.created_at).getTime()) / 1000);
        const reason = `no_outbound_after_${ageSeconds}s`;
        await Promise.all([
          alertMissedReply({ wamid: row.wamid, customerPhone: row.customer_phone, bodyPreview, reason }),
          logMissedReplyEvent({ wamid: row.wamid, customerPhone: row.customer_phone, reason }),
          markWatchdogAlerted(row.id),
        ]);
        alerted++;
        results.push({ wamid: row.wamid, action: 'alerted', reason });
      } else {
        results.push({ wamid: row.wamid, action: 'has_reply' });
      }
    } catch (e) {
      console.error('[wa-watchdog] row check error wamid=%s:', row.wamid, e?.message);
      results.push({ wamid: row.wamid, action: 'error', error: e?.message });
    }
  }

  console.log(JSON.stringify({ component: 'wa_watchdog', checked: pending.length, alerted, results }));
  return res.status(200).json({ ok: true, checked: pending.length, missed: alerted, alerted, results });
}
