/**
 * HMAC X-Hub-Signature-256 verification for Meta WhatsApp webhooks.
 * Uses timing-safe comparison. Requires raw body BEFORE JSON parse.
 */
const crypto = require('crypto');

const APP_SECRET = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || process.env.FB_APP_SECRET || '').trim();

function verifyWebhookSignature(rawBody, headerValue) {
  if (!APP_SECRET) {
    console.warn(JSON.stringify({ component: 'signature-verify', warn: 'APP_SECRET not configured — rejecting' }));
    return false;
  }
  if (!rawBody || !headerValue) return false;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(buf).digest('hex');
  const sigBuf = Buffer.from(String(headerValue));
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  try {
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

function isConfigured() {
  return !!APP_SECRET;
}

module.exports = { verifyWebhookSignature, isConfigured };
