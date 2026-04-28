/**
 * WhatsApp Cloud API Client — pure Cloud API, NO bridge fallback.
 *
 * Responsibilities:
 * - Send text and template messages
 * - Mark messages read
 * - Read phone object state
 * - Registration flow: request_code, verify_code, register
 * - Subscribe app to WABA
 *
 * All methods return JSON or throw CloudApiError(code, subcode, fbtraceId, message).
 */

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const PHONE_NUMBER_ID = (process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '920678054472684').trim();
const WABA_ID = (process.env.META_WABA_ID || '1577856530133515').trim();
const ACCESS_TOKEN = (process.env.META_SYSTEM_USER_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

class CloudApiError extends Error {
  constructor({ httpStatus, code, subcode, fbtraceId, message, raw }) {
    super(message || `Cloud API error ${code}`);
    this.name = 'CloudApiError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.subcode = subcode;
    this.fbtraceId = fbtraceId;
    this.raw = raw;
  }
}

const RETRYABLE_HTTP = new Set([500, 502, 503, 504]);
const RETRYABLE_CODES = new Set([80007, 130429, 131056]);

async function request(path, { method = 'GET', body = null, retries = 3 } = {}) {
  if (!ACCESS_TOKEN) throw new CloudApiError({ httpStatus: 0, code: 'NO_TOKEN', message: 'META_SYSTEM_USER_TOKEN not configured' });
  const url = `https://graph.facebook.com/${META_API_VERSION}${path.startsWith('/') ? '' : '/'}${path}`;
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await resp.text();
      let json = null;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
      if (!resp.ok || json?.error) {
        const err = json?.error || {};
        const e = new CloudApiError({
          httpStatus: resp.status,
          code: err.code,
          subcode: err.error_subcode,
          fbtraceId: err.fbtrace_id,
          message: err.message || `HTTP ${resp.status}`,
          raw: json,
        });
        const retry = RETRYABLE_HTTP.has(resp.status) || RETRYABLE_CODES.has(err.code);
        if (retry && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          lastErr = e;
          continue;
        }
        throw e;
      }
      return json;
    } catch (e) {
      if (e instanceof CloudApiError) throw e;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function logCall(method, path, status, extra = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    component: 'cloud-api-client',
    method,
    path,
    status,
    ...extra,
  }));
}

async function sendTextMessage(to, body, contextWamid = null) {
  const cleanTo = String(to).replace(/^\+/, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: { body: String(body || '').slice(0, 4096), preview_url: false },
  };
  if (contextWamid) payload.context = { message_id: contextWamid };
  try {
    const r = await request(`/${PHONE_NUMBER_ID}/messages`, { method: 'POST', body: payload });
    const wamid = r?.messages?.[0]?.id;
    logCall('POST', `/${PHONE_NUMBER_ID}/messages`, 'ok', { wamid, to: cleanTo });
    return { ok: true, wamid, raw: r };
  } catch (e) {
    logCall('POST', `/${PHONE_NUMBER_ID}/messages`, 'error', { code: e.code, message: e.message });
    throw e;
  }
}

async function sendTemplateMessage(to, templateName, langCode, components = []) {
  const cleanTo = String(to).replace(/^\+/, '');
  const payload = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'template',
    template: { name: templateName, language: { code: langCode }, components },
  };
  const r = await request(`/${PHONE_NUMBER_ID}/messages`, { method: 'POST', body: payload });
  return { ok: true, wamid: r?.messages?.[0]?.id, raw: r };
}

async function markAsRead(messageId) {
  return request(`/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    body: { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
  });
}

async function getPhoneObject(fields = 'id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,status,throughput,name_status,account_mode,is_official_business_account') {
  return request(`/${PHONE_NUMBER_ID}?fields=${encodeURIComponent(fields)}`);
}

async function requestCode(method = 'SMS', language = 'en_US') {
  return request(`/${PHONE_NUMBER_ID}/request_code`, {
    method: 'POST',
    body: { code_method: method, language },
  });
}

async function verifyCode(code) {
  return request(`/${PHONE_NUMBER_ID}/verify_code`, {
    method: 'POST',
    body: { code: String(code) },
  });
}

async function register(pin) {
  return request(`/${PHONE_NUMBER_ID}/register`, {
    method: 'POST',
    body: { messaging_product: 'whatsapp', pin: String(pin) },
  });
}

async function subscribeApp() {
  return request(`/${WABA_ID}/subscribed_apps`, { method: 'POST' });
}

async function listSubscribedApps() {
  return request(`/${WABA_ID}/subscribed_apps`);
}

module.exports = {
  CloudApiError,
  sendTextMessage,
  sendTemplateMessage,
  markAsRead,
  getPhoneObject,
  requestCode,
  verifyCode,
  register,
  subscribeApp,
  listSubscribedApps,
  PHONE_NUMBER_ID,
  WABA_ID,
};
