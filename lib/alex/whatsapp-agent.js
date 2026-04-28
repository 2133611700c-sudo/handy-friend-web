/**
 * Alex WhatsApp agent — public entry for production code that needs to ask
 * Alex to draft a customer-facing WhatsApp reply.
 *
 * Implementation lives in whatsapp-reply-engine.js; this file is a stable,
 * named export specifically for the auto-reply path
 * (/api/alex-webhook + lib/whatsapp/send-alex-reply.js).
 *
 * Contract:
 *   generateWhatsAppAlexReply({ inboundText, customerPhone, conversationHistory, serviceContext })
 *     → { ok, replyText, source: 'model'|'fallback', model, safetyFlags, reason }
 *
 * The function ALWAYS returns ok:true with replyText set — never throws,
 * never returns an empty replyText. If the model fails or the model output
 * fails the safety validator, replyText is set to SAFE_FALLBACK and source
 * becomes 'fallback'. Callers must still verify safetyFlags before sending.
 */
const { generateAlexWhatsAppReply, SAFE_FALLBACK } = require('./whatsapp-reply-engine.js');

async function generateWhatsAppAlexReply(params) {
  const r = await generateAlexWhatsAppReply(params || {});
  return {
    ok: true,
    replyText: r.replyText || SAFE_FALLBACK,
    source: r.source || 'fallback',
    model: r.model || null,
    safetyFlags: Array.isArray(r.safetyFlags) ? r.safetyFlags : [],
    reason: r.reason || 'unknown',
  };
}

module.exports = { generateWhatsAppAlexReply, SAFE_FALLBACK };
