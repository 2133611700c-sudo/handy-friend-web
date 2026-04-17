/**
 * Telegram delivery watchdog.
 *
 * Cron-triggered (daily at 05:00 UTC via vercel.json crons entry).
 * Also callable manually with the VERCEL_CRON_SECRET header for ad-hoc
 * runs.
 *
 * What it does:
 *   - Query public.v_leads_without_telegram (real leads last 7d with
 *     telegram_proofs=0).
 *   - If count > 0, fire one Telegram alert to the owner chat so the
 *     gap is visible operationally.
 *   - Always returns JSON summary (count, lead ids).
 *
 * What it does NOT do:
 *   - It does NOT retry missed sends. That's the outbound_jobs worker
 *     (api/process-outbox.js). This is an audit/alerting layer only.
 */

const { sendTelegramMessage } = require('../lib/telegram/send.js');

const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.VERCEL_CRON_SECRET || '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Authenticate:
  //   Vercel Cron requests carry 'Authorization: Bearer <VERCEL_CRON_SECRET>'.
  //   Manual testing: same bearer header.
  //   Everything else is blocked.
  const auth = String(req.headers.authorization || '');
  const bearerOk = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
  if (!bearerOk) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase_env_missing' });
  }

  // Pull real leads from the watchdog view. Limit 50 so the alert stays readable.
  let rows;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/v_leads_without_telegram?select=id,full_name,phone,source,service_type,minutes_since_created,telegram_proofs&order=created_at.desc&limit=50`,
      {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      }
    );
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `supabase_${r.status}`, details: t.slice(0, 300) });
    }
    rows = await r.json();
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'supabase_fetch_failed', details: String(err?.message || err).slice(0, 300) });
  }

  const missing = (Array.isArray(rows) ? rows : []).filter(r => Number(r.telegram_proofs) === 0);
  const summary = {
    ok: true,
    checked_at: new Date().toISOString(),
    total_real_leads_7d: Array.isArray(rows) ? rows.length : 0,
    missing_telegram_proof: missing.length
  };

  if (missing.length === 0) {
    return res.status(200).json({ ...summary, alert_sent: false });
  }

  // Send ONE aggregated alert with the list.
  const lines = missing.slice(0, 10).map(r => {
    const mins = Math.round(Number(r.minutes_since_created || 0));
    return ` • <code>${escapeHtml(String(r.id).slice(0, 40))}</code> | ${escapeHtml(r.source || '?')} | ${escapeHtml(r.service_type || '?')} | ${mins} min ago`;
  });
  const overflow = missing.length > 10 ? `\n(+ ${missing.length - 10} more)` : '';

  const text = `🟠 <b>Watchdog: leads without Telegram proof</b>\n` +
    `Missing: <b>${missing.length}</b> of ${summary.total_real_leads_7d} real leads in last 7 days\n\n` +
    lines.join('\n') +
    overflow +
    `\n\nView: <code>v_leads_without_telegram</code> (Supabase)`;

  const send = await sendTelegramMessage({
    source: 'watchdog',
    text,
    timeoutMs: 4000,
    extra: { lead_ids_sample: missing.slice(0, 10).map(r => r.id) }
  });

  return res.status(200).json({
    ...summary,
    alert_sent: send.ok,
    alert_message_id: send.messageId,
    alert_telegram_send_id: send.telegramSendId,
    alert_error: send.ok ? null : { code: send.errorCode, description: send.errorDescription }
  });
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
