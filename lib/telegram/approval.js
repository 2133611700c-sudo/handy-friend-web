/**
 * Telegram Approval Gate for WhatsApp outbound replies.
 *
 * Flow:
 *   1. Inbound WhatsApp arrives → Alex generates draft → store in whatsapp_messages.draft_text
 *   2. sendApprovalRequest() → operator gets Telegram with inline keyboard ✅/✏️/❌
 *   3. Operator clicks → /api/telegram-callback (separate handler) processes:
 *        ✅ Approve  → cloudApi.sendTextMessage(to, draft) + updateStatus
 *        ✏️ Edit     → bot prompts operator for new text via reply
 *        ❌ Reject   → updateStatus rejected, no send
 *
 * Callback data format: "wa:approve:<wamid>" / "wa:reject:<wamid>" / "wa:edit:<wamid>"
 */
const crypto = require('crypto');
const { sendTelegramMessage } = require('./send.js');

// Telegram callback_data has 64-byte limit.
// We use a 16-hex-char SHA-256 prefix of the full wamid, then store the
// short→full mapping in lead_events.event_data for callback lookup.
function shortId(wamid) {
  return crypto.createHash('sha256').update(String(wamid)).digest('hex').slice(0, 16);
}

function buildApprovalKeyboard(inboundWamid) {
  const sid = shortId(inboundWamid);
  return {
    inline_keyboard: [[
      { text: '✅ Approve & Send', callback_data: `wa:approve:${sid}` },
      { text: '✏️ Edit', callback_data: `wa:edit:${sid}` },
      { text: '❌ Reject', callback_data: `wa:reject:${sid}` },
    ]],
  };
}

function escapeHtml(s) {
  return String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

async function sendApprovalRequest({ inboundWamid, customerPhone, customerName, customerMessage, alexDraft, threadId }) {
  const sid = shortId(inboundWamid);
  const text =
    `🟢 <b>WHATSAPP REPLY APPROVAL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 From: <code>+${escapeHtml(customerPhone)}</code>\n` +
    `👤 Name: ${escapeHtml(customerName || 'Unknown')}\n` +
    `🆔 sid: <code>${sid}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Customer:</b>\n${escapeHtml(String(customerMessage || '').slice(0, 600))}\n\n` +
    `<b>Alex draft:</b>\n${escapeHtml(String(alexDraft || '').slice(0, 1500))}\n` +
    `━━━━━━━━━━━━━━━━━━━━`;
  return sendTelegramMessage({
    source: 'whatsapp_approval',
    sessionId: threadId,
    text,
    replyMarkup: buildApprovalKeyboard(inboundWamid),
    timeoutMs: 4500,
    extra: {
      kind: 'approval_request',
      wa_from: customerPhone,
      wamid: inboundWamid,
      short_id: sid,
      alex_draft: String(alexDraft || '').slice(0, 4000),
      customer_message: String(customerMessage || '').slice(0, 1000),
      customer_name: customerName || null,
    },
  });
}

/**
 * Edit an existing Telegram approval message body in place. Preserves the
 * inline keyboard. Used when a draft is regenerated and the operator's view
 * must reflect the exact text that will be sent to the customer.
 *
 * Returns { ok, errorCode, errorDescription }.
 */
async function editApprovalMessage({ chatId, messageId, customerPhone, customerName, customerMessage, alexDraft, inboundWamid }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token || !chatId || !messageId) {
    return { ok: false, errorCode: 'env_missing', errorDescription: 'token/chatId/messageId required' };
  }
  const sid = shortId(inboundWamid);
  const text =
    `🟢 <b>WHATSAPP REPLY APPROVAL</b>  <i>(regenerated)</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 From: <code>+${escapeHtml(customerPhone)}</code>\n` +
    `👤 Name: ${escapeHtml(customerName || 'Unknown')}\n` +
    `🆔 sid: <code>${sid}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Customer:</b>\n${escapeHtml(String(customerMessage || '').slice(0, 600))}\n\n` +
    `<b>Alex draft (exact text that will be sent):</b>\n${escapeHtml(String(alexDraft || '').slice(0, 1500))}\n` +
    `━━━━━━━━━━━━━━━━━━━━`;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: buildApprovalKeyboard(inboundWamid),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      return { ok: false, errorCode: String(r.status), errorDescription: String(j?.description || 'edit_failed').slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, errorCode: 'network', errorDescription: String(e?.message || e).slice(0, 300) };
  }
}

module.exports = { sendApprovalRequest, buildApprovalKeyboard, shortId, editApprovalMessage };
