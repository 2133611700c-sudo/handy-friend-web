/**
 * Send Alex's reply to a WhatsApp customer via Cloud API.
 *
 * Hard idempotency: one inbound wamid produces at most one outbound wamid.
 * Achieved by checking whatsapp_messages.direction='out'.raw.in_reply_to_wamid
 * BEFORE calling Cloud API, and writing that field on success.
 *
 * Used by /api/alex-webhook in WHATSAPP_REPLY_MODE=auto. The Telegram message
 * is sent AFTER the Cloud API success as PROOF only — never as an approval gate.
 *
 * Contract:
 *   sendAlexReply({ inboundWamid, customerPhone, customerName, customerMessage,
 *                   replyText, source, model })
 *     → { ok, inboundWamid, outboundWamid, replyText, alreadySent, error?, errorCode? }
 */

const cloudApi = require('./cloud-api-client.js');
const { recordOutbound, hasOutboundFor } = require('./dedup.js');
const { detectSafetyFlags } = require('../alex/whatsapp-safety.js');

async function notifyOwnerProof({ inboundWamid, outboundWamid, customerPhone, customerName, customerMessage, replyText, ok, errorCode, errorDescription }) {
  // Telegram is PROOF only here. Use the unified send (logs to telegram_sends).
  try {
    const { sendTelegramMessage } = require('../telegram/send.js');
    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const head = ok ? '🟢 <b>WHATSAPP AUTO-REPLY SENT</b>' : '🔴 <b>WHATSAPP AUTO-REPLY FAILED</b>';
    const text = [
      head,
      '━━━━━━━━━━━━━━━━━━━━',
      `📱 To: <code>+${esc(customerPhone)}</code>`,
      `👤 Name: ${esc(customerName || 'Unknown')}`,
      `🆔 inbound wamid: <code>${esc(String(inboundWamid).slice(0, 60))}…</code>`,
      ok ? `✅ outbound wamid: <code>${esc(String(outboundWamid).slice(0, 60))}…</code>` : `❌ error: ${esc(errorCode || '')} ${esc(errorDescription || '').slice(0, 200)}`,
      '━━━━━━━━━━━━━━━━━━━━',
      `<b>Customer:</b>\n${esc(String(customerMessage || '').slice(0, 600))}`,
      '',
      `<b>Alex reply (sent verbatim):</b>\n${esc(String(replyText || '').slice(0, 1500))}`,
    ].join('\n');
    await sendTelegramMessage({
      source: 'whatsapp_auto_reply_proof',
      text,
      timeoutMs: 4500,
      extra: { kind: 'auto_reply_proof', inbound_wamid: inboundWamid, outbound_wamid: outboundWamid, ok },
    }).catch(() => {});
  } catch { /* never fail the user-facing send because of telegram */ }
}

async function sendAlexReply({ inboundWamid, customerPhone, customerName, customerMessage, replyText, source = 'model', model = null }) {
  const to = String(customerPhone || '').replace(/^\+/, '');
  const text = String(replyText || '').trim();

  // Sanity guards.
  if (!inboundWamid) return { ok: false, error: 'missing_inbound_wamid' };
  if (!to) return { ok: false, inboundWamid, error: 'missing_recipient' };
  const flags = detectSafetyFlags(text);
  if (flags.length > 0) return { ok: false, inboundWamid, error: 'unsafe_reply', safetyFlags: flags };

  // Hard idempotency: bail if outbound already exists for this inbound.
  try {
    const prior = await hasOutboundFor(inboundWamid);
    if (prior && prior.wamid) {
      return {
        ok: true,
        inboundWamid,
        outboundWamid: prior.wamid,
        replyText: prior.body || text,
        alreadySent: true,
      };
    }
  } catch { /* fall through; the UNIQUE constraint on outbound wamid is the last guard */ }

  // Send via Cloud API.
  let sentWamid = null;
  try {
    const r = await cloudApi.sendTextMessage(to, text, inboundWamid);
    sentWamid = r && r.wamid;
    if (!sentWamid) throw new Error('cloud_api_returned_no_wamid');
  } catch (e) {
    console.error(JSON.stringify({
      component: 'send-alex-reply', error: 'cloud_api_send_failed',
      inbound_wamid: inboundWamid, code: e.code, message: String(e.message || e).slice(0, 300),
    }));
    await notifyOwnerProof({
      inboundWamid, outboundWamid: null, customerPhone: to, customerName,
      customerMessage, replyText: text, ok: false,
      errorCode: e.code || 'cloud_api_error', errorDescription: e.message || String(e),
    });
    return { ok: false, inboundWamid, error: 'cloud_api_failed', errorCode: e.code, errorDescription: e.message };
  }

  // Persist outbound row linked to inbound.
  await recordOutbound({
    wamid: sentWamid,
    to,
    body: text,
    status: 'sent',
    approvedBy: source === 'auto' || source === 'model' ? 'alex_auto' : (source || 'alex_auto'),
    draftText: text,
    inReplyToWamid: inboundWamid,
    source,
    model,
  }).catch(err => console.warn(JSON.stringify({ component: 'send-alex-reply', warn: 'recordOutbound failed', err: String(err).slice(0, 200) })));

  // Telegram proof (best-effort, never blocks customer reply).
  await notifyOwnerProof({
    inboundWamid, outboundWamid: sentWamid, customerPhone: to, customerName,
    customerMessage, replyText: text, ok: true,
  });

  console.log(JSON.stringify({
    component: 'send-alex-reply', ok: true,
    inbound_wamid: inboundWamid, outbound_wamid: sentWamid,
    source, model, len: text.length,
  }));

  return {
    ok: true,
    inboundWamid,
    outboundWamid: sentWamid,
    replyText: text,
    alreadySent: false,
  };
}

module.exports = { sendAlexReply };
