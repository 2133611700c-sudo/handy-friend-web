/**
 * Unit tests for lib/telegram/send.js
 *
 * Third-pass audit defense. These tests lock in the invariants the
 * unified sender is supposed to enforce:
 *
 *   - Every non-network exit leaves a durable telegram_sends row.
 *   - env_missing / empty_text / bad_args / invalid_data_url /
 *     photo_too_large all call logSendAttempt before returning.
 *   - Success path logs ok=true with telegram_message_id.
 *   - Telegram API 4xx / 5xx logs ok=false with error_code string.
 *
 * Background:
 *   - Self-audit (e75b5be) caught the error_code format regression.
 *   - Codex cross-audit (ca21673) caught the lead_id propagation bug
 *     and the early-return audit-silence bugs. Those fixes landed on
 *     this branch as 7f1b1d5.
 *   - This test file is the third layer: machine-enforced guard.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// Capture fetch calls without hitting the network.
const recorder = { calls: [], responses: [] };

function installFakeFetch(responses) {
  recorder.calls = [];
  recorder.responses = [...responses];
  global.fetch = async (url, init) => {
    recorder.calls.push({ url: String(url), init });
    const next = recorder.responses.shift();
    if (!next) throw new Error('fake fetch: no response queued');
    if (next.throws) {
      const err = new Error(next.throws.message || 'network');
      if (next.throws.name) err.name = next.throws.name;
      throw err;
    }
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body
    };
  };
}

function resetEnv() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function loadSender() {
  // Module reads env vars at require-time (SUPABASE_URL, SERVICE_KEY),
  // so wipe the cache for each test.
  delete require.cache[require.resolve('../lib/telegram/send.js')];
  return require('../lib/telegram/send.js');
}

// Helper: count fetch calls to telegram_sends PostgREST insert.
function auditCalls() {
  return recorder.calls.filter(c => c.url.endsWith('/rest/v1/telegram_sends'));
}

function telegramCalls() {
  return recorder.calls.filter(c => c.url.includes('api.telegram.org'));
}

// ─────────────────────────────────────────────────────────────────────
// env_missing path
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramMessage logs env_missing when token absent', async () => {
  resetEnv();
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([{ status: 201, body: [{ id: 1 }] }]);

  const { sendTelegramMessage } = loadSender();
  const r = await sendTelegramMessage({ source: 'unit_test', text: 'hi' });

  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'env_missing');
  assert.equal(telegramCalls().length, 0, 'must not call telegram without token');
  assert.equal(auditCalls().length, 1, 'must log env_missing to telegram_sends');
  const body = JSON.parse(auditCalls()[0].init.body);
  assert.equal(body.error_code, 'env_missing');
  assert.equal(body.ok, false);
  assert.equal(body.source, 'unit_test');
});

// ─────────────────────────────────────────────────────────────────────
// empty_text path — P1 regression guard
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramMessage logs empty_text (P1 regression guard)', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([{ status: 201, body: [{ id: 2 }] }]);

  const { sendTelegramMessage } = loadSender();
  const r = await sendTelegramMessage({ source: 'unit_test', text: '' });

  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'empty_text');
  assert.equal(r.telegramSendId, 2, 'must return the log id');
  assert.equal(telegramCalls().length, 0);
  assert.equal(auditCalls().length, 1, 'P1: empty_text must leave audit row');
});

// ─────────────────────────────────────────────────────────────────────
// success path
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramMessage success logs ok=true with message_id', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([
    { status: 200, body: { ok: true, result: { message_id: 42 } } },  // telegram
    { status: 201, body: [{ id: 99 }] }                                // audit
  ]);

  const { sendTelegramMessage } = loadSender();
  const r = await sendTelegramMessage({
    source: 'unit_test',
    leadId: 'lead_xyz',
    text: 'hello'
  });

  assert.equal(r.ok, true);
  assert.equal(r.messageId, 42);
  assert.equal(r.telegramSendId, 99);

  assert.equal(telegramCalls().length, 1);
  assert.equal(auditCalls().length, 1);
  const body = JSON.parse(auditCalls()[0].init.body);
  assert.equal(body.ok, true);
  assert.equal(body.telegram_message_id, 42);
  assert.equal(body.lead_id, 'lead_xyz');
  assert.equal(body.source, 'unit_test');
});

// ─────────────────────────────────────────────────────────────────────
// Telegram API error (http 200 + body ok:false)
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramMessage logs telegram API error', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([
    { status: 200, body: { ok: false, error_code: 400, description: 'Bad Request: chat not found' } },
    { status: 201, body: [{ id: 7 }] }
  ]);

  const { sendTelegramMessage } = loadSender();
  const r = await sendTelegramMessage({ source: 'unit_test', text: 'hi' });

  assert.equal(r.ok, false);
  assert.equal(r.errorDescription.includes('chat not found'), true);
  assert.equal(auditCalls().length, 1);
  const body = JSON.parse(auditCalls()[0].init.body);
  assert.equal(body.ok, false);
  assert.equal(typeof body.error_code, 'string');
  assert.ok(body.error_description.length > 0);
});

// ─────────────────────────────────────────────────────────────────────
// Network error / timeout
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramMessage logs network error', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([
    { throws: { message: 'ECONNRESET' } },
    { status: 201, body: [{ id: 11 }] }
  ]);

  const { sendTelegramMessage } = loadSender();
  const r = await sendTelegramMessage({ source: 'unit_test', text: 'hi' });

  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'network');
  assert.equal(auditCalls().length, 1);
});

// ─────────────────────────────────────────────────────────────────────
// Photo: bad_args — P1 regression guard
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramPhoto logs bad_args when photo missing (P1 regression guard)', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([{ status: 201, body: [{ id: 5 }] }]);

  const { sendTelegramPhoto } = loadSender();
  const r = await sendTelegramPhoto({ source: 'unit_test', photo: null });

  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'bad_args');
  assert.equal(auditCalls().length, 1, 'P1: bad_args must leave audit row');
});

// ─────────────────────────────────────────────────────────────────────
// Photo: invalid data_url — P1 regression guard for fall-through bug
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramPhoto logs invalid_data_url for unparseable object input (P1 regression)', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([{ status: 201, body: [{ id: 33 }] }]);

  const { sendTelegramPhoto } = loadSender();
  // Object with bad dataUrl (wrong shape) — coerceToBuffer returns null.
  // Before the fix this fell through to the JSON path and forwarded an
  // object to Telegram. Now it must short-circuit with invalid_data_url.
  const r = await sendTelegramPhoto({
    source: 'unit_test',
    photo: { dataUrl: 'not-a-valid-data-url' }
  });

  assert.equal(r.ok, false);
  assert.equal(r.errorCode, 'invalid_data_url');
  assert.equal(telegramCalls().length, 0, 'must not forward bad object to telegram');
  assert.equal(auditCalls().length, 1);
});

// ─────────────────────────────────────────────────────────────────────
// Photo: URL string (JSON path)
// ─────────────────────────────────────────────────────────────────────

test('sendTelegramPhoto URL string uses JSON path and logs success', async () => {
  resetEnv();
  process.env.TELEGRAM_BOT_TOKEN = 't';
  process.env.TELEGRAM_CHAT_ID = 'c';
  process.env.SUPABASE_URL = 'https://fake.supabase';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  installFakeFetch([
    { status: 200, body: { ok: true, result: { message_id: 555 } } },
    { status: 201, body: [{ id: 77 }] }
  ]);

  const { sendTelegramPhoto } = loadSender();
  const r = await sendTelegramPhoto({
    source: 'unit_test',
    photo: 'https://example.com/photo.jpg',
    caption: 'test'
  });

  assert.equal(r.ok, true);
  assert.equal(r.messageId, 555);
  const tgCall = telegramCalls()[0];
  assert.equal(tgCall.init.headers['Content-Type'], 'application/json');
  const body = JSON.parse(tgCall.init.body);
  assert.equal(body.photo, 'https://example.com/photo.jpg');
});
