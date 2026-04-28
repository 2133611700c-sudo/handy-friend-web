/**
 * Shared WhatsApp Approval Callback handler.
 *
 * Used by BOTH /api/alex-webhook (legacy bot path) AND /api/telegram-webhook
 * (current production Telegram bot webhook URL).
 *
 * Bug history:
 *   Telegram bot webhook is configured to /api/telegram-webhook, but the only
 *   wa:(approve|reject|edit):<sid> handler used to live in /api/alex-webhook
 *   inside `handleTelegramUpdate`. Telegram-webhook dropped callback_query as
 *   "non-message" → owner taps ✅ → 200 OK → no Cloud API send → customer
 *   never receives reply (real production failure 2026-04-28).
 *
 * Fix: extract handler into this shared module so both endpoints route the
 * same callback to the same Cloud API send + dedup + idempotent outbound row.
 *
 * Idempotency:
 *   - First approve: sends WhatsApp, records outbound row keyed by sentWamid.
 *   - Repeated approve for same short_id: detects existing outbound row keyed
 *     by approvedBy + short_id and skips re-send.
 *   - Inbound dedup is handled upstream by lib/whatsapp/dedup.js (UNIQUE wamid).
 */

const FALLBACK_REPLY = "Hi! Thanks for reaching out. Please send a few photos and a short description of what needs to be done, and we'll get back to you with the next steps.";

function isWAApprovalCallback(update) {
  const cb = update?.callback_query;
  if (!cb || !cb.data) return false;
  return /^wa:(approve|reject|edit):/.test(String(cb.data));
}

async function handleWAApprovalCallback(update, res) {
  const cb = update.callback_query;
  if (!cb || !cb.data) return res.status(200).json({ ok: true, ignored: 'no callback_query' });

  const operator = cb.from?.username || String(cb.from?.id || 'unknown');
  const m = String(cb.data).match(/^wa:(approve|reject|edit):(.+)$/);
  if (!m) return res.status(200).json({ ok: true, ignored: 'unknown format' });
  const [, action, sid] = m;

  const cloudApi = require('../whatsapp/cloud-api-client.js');
  const dedup = require('../whatsapp/dedup.js');
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  async function resolveShortId(s) {
    const url = `${SB_URL}/rest/v1/telegram_sends?source=eq.whatsapp_approval&extra->>short_id=eq.${encodeURIComponent(s)}&order=created_at.desc&limit=1`;
    const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    const arr = await r.json();
    return Array.isArray(arr) && arr[0] ? arr[0].extra : null;
  }

  // Idempotency: did we already send an outbound to this customer recently?
  // Window: last 5 minutes — protects against double-tap of ✅ in Telegram.
  async function alreadySentTo(toPhone) {
    if (!toPhone) return null;
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const url = `${SB_URL}/rest/v1/whatsapp_messages?direction=eq.out&phone_number=eq.${encodeURIComponent(toPhone)}&created_at=gte.${encodeURIComponent(cutoff)}&select=wamid,phone_number,body,created_at&order=created_at.desc&limit=1`;
    try {
      const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
      const arr = await r.json();
      return Array.isArray(arr) && arr.length ? arr[0] : null;
    } catch { return null; }
  }

  let result, alert;
  try {
    const ctx = await resolveShortId(sid);
    if (!ctx) {
      result = { ok: false, error: 'short_id not found' };
      alert = '❌ ' + result.error;
    } else if (action === 'approve') {
      const to = String(ctx.wa_from || '').replace(/^\+/, '');
      let replyText = (String(ctx.alex_draft || '').trim().slice(0, 4000)) || FALLBACK_REPLY;

      // Hard block: never let a stale/unsafe draft reach the customer.
      // Replace with safe fallback and report the reason in the Telegram alert.
      const { detectSafetyFlags, SAFE_FALLBACK } = require('../alex/whatsapp-reply-engine.js');
      const flags = detectSafetyFlags(replyText);
      let blockedReason = null;
      if (flags.length > 0) {
        blockedReason = flags.join(',');
        replyText = SAFE_FALLBACK;
      }

      if (!to) {
        result = { ok: false, error: 'missing recipient' };
        alert = '❌ ' + result.error;
      } else {
        // Idempotency check: was outbound already sent to this customer in last 5 min?
        const existing = await alreadySentTo(to);
        if (existing) {
          result = { ok: true, sentWamid: existing.wamid, idempotent: true };
          alert = `↻ Already sent (${String(existing.wamid).slice(0, 12)}…)`;
        } else {
          const sent = await cloudApi.sendTextMessage(to, replyText, ctx.wamid || null);
          await dedup.recordOutbound({
            wamid: sent.wamid,
            to,
            body: replyText,
            status: 'sent',
            approvedBy: operator,
            draftText: replyText,
          }).catch(() => {});
          result = { ok: true, sentWamid: sent.wamid, fallback: !!blockedReason };
          if (blockedReason) {
            alert = `⚠️ Draft blocked (${blockedReason}). Sent SAFE_FALLBACK instead (${String(sent.wamid).slice(0, 12)}…)`;
          } else {
            alert = `✅ Sent (${String(sent.wamid).slice(0, 12)}…)`;
          }
        }
      }
    } else if (action === 'reject') {
      if (ctx.wamid) await dedup.updateStatus({ wamid: ctx.wamid, status: 'rejected' }).catch(() => {});
      result = { ok: true, action: 'rejected' };
      alert = '❌ Rejected';
    } else {
      result = { ok: true, action: 'edit_pending' };
      alert = '✏️ Reply with new text — feature WIP';
    }
  } catch (e) {
    result = { ok: false, error: e.message };
    alert = `❌ ${String(e.message).slice(0, 180)}`;
  }

  if (BOT_TOKEN) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id, text: alert, show_alert: false }),
    }).catch(() => {});
  }
  return res.status(200).json({ ok: true, action, sid, result });
}

module.exports = { handleWAApprovalCallback, isWAApprovalCallback, FALLBACK_REPLY };
