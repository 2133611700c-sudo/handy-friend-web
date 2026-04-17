/**
 * Unified Telegram Sender — single path for ALL Telegram outbound calls.
 *
 * Purpose:
 *   Previously, Telegram was sent from 6+ places with inconsistent logging,
 *   timeouts, and error handling. This led to "Telegram may or may not have
 *   been delivered" scenarios where leads went to owner without proof.
 *
 *   This module is the ONLY legitimate path for Telegram sends from Node
 *   runtime (api/*, lib/*). It guarantees:
 *     - Every attempt is logged to public.telegram_sends with message_id.
 *     - Timeouts are enforced (Vercel functions have ~10s budget).
 *     - Error codes + descriptions are captured verbatim.
 *     - Callers get {ok, message_id, error} structured result.
 *
 *   Usage:
 *     const { sendTelegramMessage } = require('../lib/telegram/send.js');
 *     const r = await sendTelegramMessage({
 *       source: 'ai_chat',
 *       leadId: 'lead_xxx',
 *       sessionId: 'abc',
 *       text: '🚨 New Lead ...',
 *       replyMarkup: { inline_keyboard: [...] },  // optional
 *       chatId: undefined,  // defaults to TELEGRAM_CHAT_ID env
 *       timeoutMs: 4000
 *     });
 *     // r = { ok: true, messageId: 1234, telegramSendId: 42 }
 *     // or { ok: false, errorCode: '429', errorDescription: '...', telegramSendId: 42 }
 *
 *   Photo send is a separate helper (sendTelegramPhoto) — same logging.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TG_API_BASE = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Send a Telegram text message and durably log the attempt.
 *
 * @param {object} params
 * @param {string} params.source           REQUIRED. e.g. 'ai_chat', 'submit_lead', 'notify', 'alex_webhook', 'ai_intake', 'process_outbox', 'telegram_webhook', 'manual'
 * @param {string} [params.leadId]         Optional lead_id (text or uuid).
 * @param {string} [params.sessionId]      Optional ai_chat session id.
 * @param {string} params.text             REQUIRED. Message body (HTML parse_mode).
 * @param {object} [params.replyMarkup]    Optional inline_keyboard markup.
 * @param {string} [params.chatId]         Override chat id. Default: env TELEGRAM_CHAT_ID.
 * @param {string} [params.token]          Override bot token. Default: env TELEGRAM_BOT_TOKEN.
 * @param {number} [params.timeoutMs]      Default 4000ms.
 * @param {boolean} [params.disableWebPreview] Default true.
 * @param {string} [params.parseMode]      Default 'HTML'.
 * @param {object} [params.extra]          Optional metadata stored on the log row.
 * @returns {Promise<{ok:boolean, messageId:number|null, errorCode:string|null, errorDescription:string|null, telegramSendId:number|null}>}
 */
async function sendTelegramMessage(params) {
  const source = String(params.source || 'unknown');
  const leadId = params.leadId ? String(params.leadId) : null;
  const sessionId = params.sessionId ? String(params.sessionId) : null;
  const text = String(params.text || '');
  const replyMarkup = params.replyMarkup || undefined;
  const token = params.token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = params.chatId || process.env.TELEGRAM_CHAT_ID || '';
  const timeoutMs = Number.isFinite(params.timeoutMs) ? params.timeoutMs : DEFAULT_TIMEOUT_MS;
  const parseMode = params.parseMode || 'HTML';
  const disableWebPreview = params.disableWebPreview !== false;
  const extra = params.extra && typeof params.extra === 'object' ? params.extra : {};

  if (!token || !chatId) {
    await logSendAttempt({
      source, leadId, sessionId, chatId: chatId || null, ok: false,
      messageId: null, errorCode: 'env_missing',
      errorDescription: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set',
      requestExcerpt: text.slice(0, 200), extra
    });
    return { ok: false, messageId: null, errorCode: 'env_missing', errorDescription: 'env not configured', telegramSendId: null };
  }

  if (!text) {
    // P1 fix (Codex-audit follow-up): early-return on empty_text was
    // silently dropping the audit row — no way to diagnose from
    // telegram_sends why the caller never delivered.
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId: chatId || null, ok: false,
      messageId: null, errorCode: 'empty_text', errorDescription: 'text is empty',
      requestExcerpt: '', extra
    });
    return { ok: false, messageId: null, errorCode: 'empty_text', errorDescription: 'text is empty', telegramSendId: logId };
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  let resp;
  let data = {};
  let networkError = null;

  try {
    resp = await fetch(`${TG_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPreview,
        reply_markup: replyMarkup
      }),
      signal: ctl.signal
    });
    data = await resp.json().catch(() => ({}));
  } catch (err) {
    networkError = err;
  } finally {
    clearTimeout(timer);
  }

  if (networkError) {
    const ec = networkError?.name === 'AbortError' ? 'timeout' : 'network';
    const ed = String(networkError?.message || networkError).slice(0, 300);
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId, ok: false, messageId: null,
      errorCode: ec, errorDescription: ed,
      requestExcerpt: text.slice(0, 200), extra
    });
    return { ok: false, messageId: null, errorCode: ec, errorDescription: ed, telegramSendId: logId };
  }

  const httpOk = resp && resp.ok;
  const apiOk = data && data.ok === true;
  const messageId = (apiOk && data.result && Number(data.result.message_id)) || null;

  if (httpOk && apiOk && messageId) {
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId, ok: true, messageId,
      errorCode: null, errorDescription: null,
      requestExcerpt: text.slice(0, 200), extra
    });
    return { ok: true, messageId, errorCode: null, errorDescription: null, telegramSendId: logId };
  }

  const ec = resp ? String(resp.status) : 'unknown_status';
  const ed = String(data?.description || 'unknown_telegram_error').slice(0, 300);
  const logId = await logSendAttempt({
    source, leadId, sessionId, chatId, ok: false, messageId: null,
    errorCode: ec, errorDescription: ed,
    requestExcerpt: text.slice(0, 200), extra
  });
  return { ok: false, messageId: null, errorCode: ec, errorDescription: ed, telegramSendId: logId };
}

/**
 * Durably log a send attempt to public.telegram_sends.
 * Best-effort: if Supabase is unreachable the function returns null.
 * Never throws.
 *
 * @returns {Promise<number|null>} id of the inserted telegram_sends row, or null.
 */
async function logSendAttempt(row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const payload = {
    source: row.source,
    lead_id: row.leadId || null,
    session_id: row.sessionId || null,
    chat_id: row.chatId ? String(row.chatId) : null,
    ok: !!row.ok,
    telegram_message_id: Number.isFinite(row.messageId) ? row.messageId : null,
    error_code: row.errorCode || null,
    error_description: row.errorDescription || null,
    request_excerpt: typeof row.requestExcerpt === 'string' ? row.requestExcerpt.slice(0, 200) : null,
    extra: row.extra || {}
  };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/telegram_sends`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return Array.isArray(j) && j[0] && Number(j[0].id) ? Number(j[0].id) : null;
  } catch (_err) {
    return null;
  }
}

/**
 * Send a Telegram photo and log the attempt.
 *
 * Accepts THREE input shapes via params.photo:
 *  - string URL or file_id → JSON body to Telegram API
 *  - { dataUrl: 'data:image/...;base64,...', name?, mimeType? } → multipart upload
 *  - Buffer → direct multipart upload (mimeType from params.mimeType)
 *
 * Rejects buffers > 8 MiB (Telegram Bot API photo limit).
 * Sanitizes filename to alphanumeric + ._-.
 */
async function sendTelegramPhoto(params) {
  const source = String(params.source || 'unknown');
  const leadId = params.leadId ? String(params.leadId) : null;
  const sessionId = params.sessionId ? String(params.sessionId) : null;
  const caption = String(params.caption || '');
  const photo = params.photo;
  const token = params.token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = params.chatId || process.env.TELEGRAM_CHAT_ID || '';
  const timeoutMs = Number.isFinite(params.timeoutMs) ? params.timeoutMs : DEFAULT_TIMEOUT_MS;
  const extra = params.extra && typeof params.extra === 'object' ? params.extra : {};

  if (!token || !chatId || !photo) {
    // P1 fix (Codex-audit follow-up): durable audit row even on bad_args.
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId: chatId || null, ok: false,
      messageId: null, errorCode: 'bad_args',
      errorDescription: 'missing token/chatId/photo',
      requestExcerpt: `PHOTO: ${String(params.caption || '').slice(0, 150)}`,
      extra: { ...extra, method: 'sendPhoto' }
    });
    return { ok: false, messageId: null, errorCode: 'bad_args', errorDescription: 'missing token/chatId/photo', telegramSendId: logId };
  }

  // Classify input
  const multipartBuffer = coerceToBuffer(photo, params.mimeType);
  const isMultipart = Boolean(multipartBuffer);

  // P1 fix (Codex-audit follow-up): if caller passed an object-shaped photo
  // (dataUrl/Buffer) but coerceToBuffer couldn't parse it, the old code
  // silently fell through to the JSON path which would forward a JS object
  // as `photo` — Telegram rejects, but we wouldn't know from telegram_sends.
  // Now we log explicitly and fail early.
  if (!isMultipart && photo && typeof photo === 'object') {
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId, ok: false, messageId: null,
      errorCode: 'invalid_data_url',
      errorDescription: 'photo object could not be coerced (bad dataUrl or unsupported MIME)',
      requestExcerpt: `PHOTO: ${caption.slice(0, 150)}`,
      extra: { ...extra, method: 'sendPhoto', mode: 'multipart' }
    });
    return { ok: false, messageId: null, errorCode: 'invalid_data_url', errorDescription: 'invalid photo input', telegramSendId: logId };
  }

  if (isMultipart && multipartBuffer.buffer.length > 8 * 1024 * 1024) {
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId, ok: false, messageId: null,
      errorCode: 'photo_too_large',
      errorDescription: `photo buffer ${multipartBuffer.buffer.length} bytes > 8 MiB`,
      requestExcerpt: `PHOTO: ${caption.slice(0, 150)}`,
      extra: { ...extra, method: 'sendPhoto', multipart: true }
    });
    return { ok: false, messageId: null, errorCode: 'photo_too_large', errorDescription: 'photo exceeds 8 MiB', telegramSendId: logId };
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let resp;
    if (isMultipart) {
      const form = new FormData();
      form.append('chat_id', chatId);
      if (caption) form.append('caption', caption.slice(0, 1024));
      form.append('parse_mode', 'HTML');
      form.append(
        'photo',
        new Blob([multipartBuffer.buffer], { type: multipartBuffer.mimeType }),
        sanitizePhotoName(multipartBuffer.name)
      );
      resp = await fetch(`${TG_API_BASE}/bot${token}/sendPhoto`, {
        method: 'POST',
        body: form,
        signal: ctl.signal
      });
    } else {
      resp = await fetch(`${TG_API_BASE}/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo, caption: caption.slice(0, 1024), parse_mode: 'HTML' }),
        signal: ctl.signal
      });
    }
    const data = await resp.json().catch(() => ({}));
    const messageId = data?.result?.message_id || null;
    const ok = resp.ok && data?.ok === true && Boolean(messageId);

    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId,
      ok, messageId,
      errorCode: ok ? null : String(resp.status),
      errorDescription: ok ? null : String(data?.description || 'photo_send_failed').slice(0, 300),
      requestExcerpt: `PHOTO: ${caption.slice(0, 150)}`,
      extra: { ...extra, method: 'sendPhoto', multipart: isMultipart }
    });
    return { ok, messageId, errorCode: ok ? null : String(resp.status), errorDescription: ok ? null : String(data?.description || 'photo_send_failed'), telegramSendId: logId };
  } catch (err) {
    const ec = err?.name === 'AbortError' ? 'timeout' : 'network';
    const logId = await logSendAttempt({
      source, leadId, sessionId, chatId, ok: false, messageId: null,
      errorCode: ec, errorDescription: String(err?.message || 'photo_error').slice(0, 300),
      requestExcerpt: `PHOTO: ${caption.slice(0, 150)}`, extra: { method: 'sendPhoto' }
    });
    return { ok: false, messageId: null, errorCode: ec, errorDescription: String(err?.message || 'photo_error'), telegramSendId: logId };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convert various photo input shapes into { buffer, mimeType, name }
 * for multipart upload. Returns null if input is a URL/file_id (caller
 * should use the JSON path instead).
 */
function coerceToBuffer(photo, explicitMime) {
  if (!photo) return null;

  // Buffer
  if (Buffer.isBuffer(photo)) {
    return {
      buffer: photo,
      mimeType: String(explicitMime || 'image/jpeg').toLowerCase(),
      name: 'photo.jpg'
    };
  }

  // {dataUrl, name, mimeType}
  if (typeof photo === 'object' && typeof photo.dataUrl === 'string') {
    const parts = photo.dataUrl.split(',');
    if (parts.length !== 2) return null;
    const meta = parts[0] || '';
    const b64 = parts[1] || '';
    const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64$/i.exec(meta);
    if (!mimeMatch) return null;
    const mimeType = String(photo.mimeType || mimeMatch[1] || 'image/jpeg').toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return null;
    let buffer;
    try {
      buffer = Buffer.from(b64, 'base64');
    } catch (_) {
      return null;
    }
    if (!buffer || !buffer.length) return null;
    const name = typeof photo.name === 'string' && photo.name.trim() ? photo.name : 'photo.jpg';
    return { buffer, mimeType, name };
  }

  // string — treated as URL or file_id (JSON path)
  return null;
}

function sanitizePhotoName(name) {
  const clean = String(name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'photo.jpg';
}

module.exports = {
  sendTelegramMessage,
  sendTelegramPhoto,
  _logSendAttempt: logSendAttempt,  // exported for tests
  _coerceToBuffer: coerceToBuffer,
  _sanitizePhotoName: sanitizePhotoName
};
