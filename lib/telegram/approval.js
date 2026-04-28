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

module.exports = { sendApprovalRequest, buildApprovalKeyboard, shortId };
