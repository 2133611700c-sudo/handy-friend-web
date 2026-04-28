const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'tg-bot-test';
process.env.WHATSAPP_VERIFY_TOKEN = 'verify';
process.env.FB_VERIFY_TOKEN = 'fbverify';
process.env.META_SYSTEM_USER_TOKEN = 'metatok';
process.env.META_PHONE_NUMBER_ID = 'pnid123';

const { isWAApprovalCallback, FALLBACK_REPLY } = require('../lib/telegram/wa-approval-callback.js');

function mockRes() {
  return {
    statusCode: 200, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.payload = o; return this; },
    end() { return this; },
  };
}

// ── Detector ────────────────────────────────────────────────────────────────

test('isWAApprovalCallback recognises wa:approve / wa:reject / wa:edit', () => {
  for (const action of ['approve', 'reject', 'edit']) {
    const u = { callback_query: { data: `wa:${action}:abcd1234abcd1234` } };
    assert.equal(isWAApprovalCallback(u), true, `${action} should be recognised`);
  }
});

test('isWAApprovalCallback rejects non-wa callbacks and message updates', () => {
  assert.equal(isWAApprovalCallback({ callback_query: { data: 'other:foo:bar' } }), false);
  assert.equal(isWAApprovalCallback({ callback_query: { data: '' } }), false);
  assert.equal(isWAApprovalCallback({ callback_query: null }), false);
  assert.equal(isWAApprovalCallback({ message: { text: 'hi' } }), false);
  assert.equal(isWAApprovalCallback({}), false);
  assert.equal(isWAApprovalCallback(undefined), false);
});

// ── Approve happy path: sends Cloud API + records outbound ─────────────────

test('approve callback sends WhatsApp via Cloud API and records outbound', async () => {
  const calls = { sendText: [], outboundInsert: [], answerCallback: [] };
  const sentWamid = 'wamid.OUT.HAPPYPATH';
  const inboundWamid = 'wamid.IN.HAPPYPATH';
  const sid = 'aabbccddeeff0011';
  const draftText = 'Hi! What service do you need?';
  const customerPhone = '12135551234';

  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    // resolve short_id
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: { wamid: inboundWamid, wa_from: customerPhone, alex_draft: draftText, short_id: sid } }] };
    }
    // idempotency check — none exists
    if (u.includes('/whatsapp_messages?direction=eq.out')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    // outbound insert (dedup.recordOutbound)
    if (u.includes('/whatsapp_messages') && opts?.method === 'POST') {
      calls.outboundInsert.push(JSON.parse(opts.body));
      return { ok: true, status: 201, json: async () => [], text: async () => '' };
    }
    // Cloud API send
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      const body = JSON.parse(opts.body);
      calls.sendText.push(body);
      const respText = JSON.stringify({ messages: [{ id: sentWamid }] });
      return { ok: true, status: 200, text: async () => respText, json: async () => JSON.parse(respText) };
    }
    if (u.includes('answerCallbackQuery')) {
      calls.answerCallback.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  // Reload to pick up env vars
  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');

  const res = mockRes();
  const update = {
    update_id: 1,
    callback_query: { id: 'cq1', from: { id: 1, username: 'owner' }, data: `wa:approve:${sid}`, message: { message_id: 1, chat: { id: 1 } } },
  };
  await handleWAApprovalCallback(update, res);

  global.fetch = savedFetch;

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.action, 'approve');
  assert.equal(res.payload.result.sentWamid, sentWamid);
  assert.equal(calls.sendText.length, 1, 'Cloud API send was called once');
  assert.equal(calls.sendText[0].to, customerPhone);
  assert.equal(calls.sendText[0].text.body, draftText);
  assert.equal(calls.outboundInsert.length, 1, 'outbound row was inserted');
  assert.equal(calls.answerCallback.length, 1, 'Telegram callback was answered');
});

// ── Idempotency: duplicate approve does NOT send second WhatsApp ──────────

test('duplicate approve detects existing outbound and does not re-send', async () => {
  const calls = { sendText: [], outboundInsert: [] };
  const customerPhone = '12135559999';

  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: { wamid: 'wamid.IN.DUP', wa_from: customerPhone, alex_draft: 'Hi', short_id: 'dupdupdupdupdup1' } }] };
    }
    // idempotency check — outbound EXISTS within last 5 min
    if (u.includes('/whatsapp_messages?direction=eq.out')) {
      return { ok: true, status: 200, json: async () => [{ wamid: 'wamid.OUT.PRIOR', phone_number: customerPhone, body: 'Hi', created_at: new Date().toISOString() }] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendText.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'should_not_be_called' }] }), text: async () => '' };
    }
    if (u.includes('/whatsapp_messages') && opts?.method === 'POST') {
      calls.outboundInsert.push(JSON.parse(opts.body));
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');

  const res = mockRes();
  await handleWAApprovalCallback(
    { update_id: 2, callback_query: { id: 'cq2', from: { id: 1 }, data: 'wa:approve:dupdupdupdupdup1' } },
    res
  );

  global.fetch = savedFetch;

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.result.idempotent, true, 'must be marked idempotent');
  assert.equal(res.payload.result.sentWamid, 'wamid.OUT.PRIOR');
  assert.equal(calls.sendText.length, 0, 'Cloud API send must NOT be called twice');
  assert.equal(calls.outboundInsert.length, 0, 'no new outbound row inserted on duplicate');
});

// ── Fallback when Alex draft is empty ──────────────────────────────────────

test('approve with empty draft is BLOCKED (no silent substitution)', async () => {
  // STRICT MODE: empty stored draft → block, do not silently substitute.
  // Operator must regenerate. The exported FALLBACK_REPLY constant remains
  // available for the regen tooling but is NOT used by the callback handler.
  const calls = { sendText: [] };
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: { wamid: 'wamid.IN.NODRAFT', wa_from: '12135550000', alex_draft: '', short_id: 'fallback00000000' } }] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendText.push(JSON.parse(opts.body));
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');

  const res = mockRes();
  await handleWAApprovalCallback(
    { update_id: 3, callback_query: { id: 'cq3', from: { id: 1 }, data: 'wa:approve:fallback00000000' } },
    res
  );

  global.fetch = savedFetch;

  assert.equal(res.payload.result.ok, false, 'empty draft must NOT send');
  assert.equal(res.payload.result.error, 'unsafe_draft');
  assert.ok(res.payload.result.safetyFlags.includes('empty'));
  assert.equal(calls.sendText.length, 0, 'Cloud API must NOT be called for empty draft');
});

// ── /api/telegram-webhook routes wa:* callbacks (regression test for the bug) ─

test('/api/telegram-webhook routes wa:approve callback to shared handler', async () => {
  // We test by stubbing fetch and asserting the handler executes (resolveShortId is called).
  let resolveShortIdCalled = false;
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      resolveShortIdCalled = true;
      return { ok: true, status: 200, json: async () => [] };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  delete require.cache[require.resolve('../api/telegram-webhook.js')];
  const handler = require('../api/telegram-webhook.js');

  const req = {
    method: 'POST',
    headers: {},
    body: { update_id: 99, callback_query: { id: 'x', from: { id: 7 }, data: 'wa:approve:routedroutedroute' } },
  };
  const res = mockRes();
  await handler(req, res);

  global.fetch = savedFetch;

  assert.equal(res.statusCode, 200);
  assert.equal(resolveShortIdCalled, true, '/api/telegram-webhook must route wa:* callback to shared handler (regression)');
});

test('/api/telegram-webhook still ignores non-message non-callback updates', async () => {
  delete require.cache[require.resolve('../api/telegram-webhook.js')];
  const handler = require('../api/telegram-webhook.js');
  const req = { method: 'POST', headers: {}, body: { update_id: 100, channel_post: { text: 'hi' } } };
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
});
