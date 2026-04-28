const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';
process.env.TELEGRAM_BOT_TOKEN = 'tg-test';
process.env.TELEGRAM_CHAT_ID = '12345';

function withFetch(mock, fn) {
  const saved = global.fetch;
  global.fetch = mock;
  return fn().finally(() => { global.fetch = saved; });
}

test('alertOwnerMissedReply sends Telegram message with masked phone', async () => {
  let capturedBody = null;
  await withFetch(async (url, opts) => {
    if (String(url).includes('telegram')) {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({}) };
  }, async () => {
    const { alertOwnerMissedReply } = require('../lib/whatsapp/reply-watchdog.js');
    await alertOwnerMissedReply({
      inboundWamid: 'wamid.test123',
      customerPhone: '12135551234',
      inboundText: 'Hello',
      reason: 'no_outbound_within_60s',
    });
    assert.ok(capturedBody, 'Telegram message must be sent');
    assert.match(capturedBody.text, /WA AUTO-REPLY FAILED/);
    assert.match(capturedBody.text, /no_outbound_within_60s/);
    // Phone must be masked
    assert.doesNotMatch(capturedBody.text, /12135551234/);
  });
});

test('scheduleReplyCheck exists and is a function', () => {
  const { scheduleReplyCheck } = require('../lib/whatsapp/reply-watchdog.js');
  assert.equal(typeof scheduleReplyCheck, 'function');
});

test('logMissedReplyEvent does not throw even if Supabase fails', async () => {
  await withFetch(async () => {
    throw new Error('network error');
  }, async () => {
    const { logMissedReplyEvent } = require('../lib/whatsapp/reply-watchdog.js');
    // Should not throw
    await assert.doesNotReject(() => logMissedReplyEvent({
      inboundWamid: 'wamid.test',
      customerPhone: '1234',
      reason: 'test',
    }));
  });
});
