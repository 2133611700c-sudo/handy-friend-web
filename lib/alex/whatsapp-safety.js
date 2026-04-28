/**
 * WhatsApp safety validator — re-export of the canonical safety functions.
 * Single import path that tests/agents/scripts can use without coupling to
 * the engine implementation file.
 */
const engine = require('./whatsapp-reply-engine.js');
module.exports = {
  detectSafetyFlags: engine.detectSafetyFlags,
  isSafeForCustomer: engine.isSafeForCustomer,
  SAFE_FALLBACK: engine.SAFE_FALLBACK,
  BANNED_PHRASES: engine.BANNED_PHRASES,
};
