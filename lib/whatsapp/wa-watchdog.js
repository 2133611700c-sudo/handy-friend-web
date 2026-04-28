/**
 * WA Auto-Reply Watchdog — core logic (CJS, testable).
 *
 * Extracted from api/health.js so tests can require() this directly
 * without hitting ESM/CJS boundary issues in health.js (export default).
 *
 * Called by api/health.js when GET /api/health?type=wa_watchdog.
 *
 * Logic:
 *   1. Query Supabase for inbound WhatsApp messages in the last 10 min
 *      with no linked outbound row.
 *   2. For each missed reply (not yet watchdog_alerted):
 *      - dry_run=1: count only, no Telegram, no Supabase writes.
 *      - live mode:  send Telegram alert + insert lead_event + PATCH watchdog_alerted.
 *
 * Response shape:
 *   { ok, checked, missed, alerted, failures, dry_run }
 */

'use strict';

async function runWaWatchdog(req, res, { getConfig, fetchFn } = {}) {
  const _fetch = fetchFn || global.fetch;

  // ── Auth: cron header OR matching secret ──────────────────────────────────
  const cronSecret  = process.env.CRON_SECRET || '';
  const reqSecret   = req.query?.secret || req.headers?.['x-cron-secret'] || '';
  const isCronCall  = req.headers?.['x-vercel-cron'] === '1';
  if (!isCronCall && cronSecret && reqSecret !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // P0-C: dry_run=1 → inspect only, no side effects.
  const isDryRun = req.query?.dry_run === '1';

  // ── Supabase config ────────────────────────────────────────────────────────
  const sbUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbUrl || !sbKey) {
    return res.status(500).json({ ok: false, error: 'supabase_env_missing' });
  }
  // Support optional injected getConfig (used when called from health.js).
  const config = getConfig ? getConfig() : { projectUrl: sbUrl, serviceRoleKey: sbKey };
  if (!config) return res.status(500).json({ ok: false, error: 'supabase_config_missing' });

  const sbBase = (config.projectUrl || sbUrl).replace(/\/$/, '') + '/rest/v1';
  const sbKey2 = config.serviceRoleKey || sbKey;
  const sbH = {
    apikey: sbKey2,
    Authorization: `Bearer ${sbKey2}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // ── 1. Query inbound rows in last 10 min ──────────────────────────────────
  const windowMs = 10 * 60 * 1000;
  const since    = new Date(Date.now() - windowMs).toISOString();
  let inboundRows = [];
  try {
    const inRes = await _fetch(
      `${sbBase}/whatsapp_messages?direction=eq.in&created_at=gte.${encodeURIComponent(since)}&select=id,wamid,customer_phone,body,raw,created_at&order=created_at.desc&limit=50`,
      { headers: sbH }
    );
    if (inRes.ok) {
      const data = await inRes.json();
      inboundRows = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error('[wa_watchdog] Supabase inbound query error:', e?.message);
    return res.status(500).json({ error: 'supabase_error', message: e?.message });
  }

  // ── 2. Skip already-alerted rows ─────────────────────────────────────────
  const pending = inboundRows.filter(row => !row.raw?.watchdog_alerted);
  if (!pending.length) {
    return res.status(200).json({ ok: true, checked: inboundRows.length, missed: 0, alerted: 0, failures: 0, dry_run: isDryRun });
  }

  let alerted = 0;
  const results = [];

  // ── 3. Per-row: check for linked outbound, alert if missing ──────────────
  for (const row of pending) {
    try {
      const outRes = await _fetch(
        `${sbBase}/whatsapp_messages?direction=eq.out&raw->>in_reply_to_wamid=eq.${encodeURIComponent(row.wamid)}&select=id&limit=1`,
        { headers: sbH }
      );
      let hasReply = false;
      if (outRes.ok) {
        const outData = await outRes.json();
        hasReply = Array.isArray(outData) && outData.length > 0;
      }

      if (!hasReply) {
        const ageSeconds = Math.round((Date.now() - new Date(row.created_at).getTime()) / 1000);
        const reason = `no_outbound_after_${ageSeconds}s`;

        if (isDryRun) {
          // P0-C: dry_run — count only, no Telegram, no Supabase writes.
          results.push({ wamid: row.wamid, action: 'would_alert', reason, dry_run: true });
        } else {
          const bodyPreview = String(row.body || '').slice(0, 80);
          const botToken    = process.env.TELEGRAM_BOT_TOKEN;
          const chatId      = process.env.TELEGRAM_CHAT_ID;
          const masked      = String(row.customer_phone || '').slice(0, 5) + '****';
          const text        = `⚠️ WA AUTO-REPLY FAILED\nPhone: ${masked}\nWamid: ${row.wamid}\nText: "${bodyPreview}"\nReason: ${reason}`;

          await Promise.all([
            botToken && chatId
              ? _fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, text }),
                }).catch(e => console.error('[wa_watchdog] Telegram alert error:', e?.message))
              : Promise.resolve(),
            _fetch(`${sbBase}/lead_events`, {
              method: 'POST',
              headers: sbH,
              body: JSON.stringify({
                event_type: 'whatsapp_auto_reply_failed',
                payload: { inbound_wamid: row.wamid, customer_phone: row.customer_phone, reason },
              }),
            }).catch(e => console.error('[wa_watchdog] lead_event error:', e?.message)),
            _fetch(`${sbBase}/whatsapp_messages?id=eq.${row.id}`, {
              method: 'PATCH',
              headers: sbH,
              body: JSON.stringify({ raw: { watchdog_alerted: true } }),
            }).catch(e => console.error('[wa_watchdog] PATCH error:', e?.message)),
          ]);
          results.push({ wamid: row.wamid, action: 'alerted', reason });
        }
        alerted++;
      } else {
        results.push({ wamid: row.wamid, action: 'has_reply' });
      }
    } catch (e) {
      console.error('[wa_watchdog] row check error wamid=%s:', row.wamid, e?.message);
      results.push({ wamid: row.wamid, action: 'error', error: e?.message });
    }
  }

  const failures = results.filter(r => r.action === 'error').length;
  console.log(JSON.stringify({ component: 'wa_watchdog', checked: pending.length, alerted, failures, dry_run: isDryRun }));
  return res.status(200).json({ ok: true, checked: pending.length, missed: alerted, alerted, failures, dry_run: isDryRun });
}

module.exports = { runWaWatchdog };
