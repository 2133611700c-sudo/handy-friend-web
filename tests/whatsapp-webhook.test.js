const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-for-tests';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-for-tests';
process.env.WHATSAPP_VERIFY_TOKEN = 'wa-verify-token-test';
process.env.FB_VERIFY_TOKEN = 'fb-verify-token-test';
process.env.TELEGRAM_BOT_TOKEN = '';
process.env.TELEGRAM_CHAT_ID = '';
process.env.WHATSAPP_ACCESS_TOKEN = '';
process.env.WHATSAPP_PHONE_NUMBER_ID = '';

const handler = require('../api/alex-webhook.js');

// Stub global.fetch for all tests (avoids real network calls to Supabase/DeepSeek/Meta/Telegram)
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
  const u = String(url || '');
  // Supabase REST → return empty OK
  if (u.includes('supabase.co')) return { ok: true, status: 200, json: async () => [], text: async () => '' };
  // DeepSeek → return static fallback trigger (404 to exhaust retries fast)
  if (u.includes('deepseek.com')) return { ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) };
  // Telegram → return ok
  if (u.includes('telegram.org')) return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  // Meta Graph → 401 (no real token in tests, but should be caught internally)
  return { ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ error: { code: 401, message: 'Unauthorized' } }), text: async () => 'Unauthorized' };
};

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.payload = obj; return this; },
    send(body) { this.payload = body; return this; },
    end() { return this; }
  };
}

async function invoke(req) {
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload };
}

// ── GET: webhook verification ───────────────────────────────────────────────

test('GET webhook verification accepts WHATSAPP_VERIFY_TOKEN', async () => {
  const result = await invoke({
    method: 'GET',
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wa-verify-token-test',
      'hub.challenge': '12345'
    },
    url: '/api/alex-webhook?hub.mode=subscribe&hub.verify_token=wa-verify-token-test&hub.challenge=12345'
  });

  assert.equal(result.status, 200);
  assert.equal(String(result.payload), '12345');
});

test('GET webhook verification accepts FB_VERIFY_TOKEN', async () => {
  const result = await invoke({
    method: 'GET',
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'fb-verify-token-test',
      'hub.challenge': 'fb-challenge-abc'
    },
    url: '/api/alex-webhook?hub.mode=subscribe&hub.verify_token=fb-verify-token-test&hub.challenge=fb-challenge-abc'
  });

  assert.equal(result.status, 200);
  assert.equal(String(result.payload), 'fb-challenge-abc');
});

test('GET webhook verification rejects wrong token', async () => {
  const result = await invoke({
    method: 'GET',
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': '99999'
    },
    url: '/api/alex-webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=99999'
  });

  assert.equal(result.status, 403);
});

// ── POST: WhatsApp status callback ──────────────────────────────────────────

test('POST webhook status-only payload returns 200 EVENT_RECEIVED', async () => {
  const result = await invoke({
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid123' },
            statuses: [{
              id: `wamid.out.${Date.now()}`,
              recipient_id: '12135551234',
              status: 'delivered',
              timestamp: String(Math.floor(Date.now() / 1000))
            }]
          }
        }]
      }]
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload, 'EVENT_RECEIVED');
});

// ── POST: WhatsApp inbound message ──────────────────────────────────────────

test('POST synthetic WA message returns 200 EVENT_RECEIVED (no reply sent)', async () => {
  // Synthetic detection: text contains 'e2e synthetic probe' OR from matches 2130000xxx
  const result = await invoke({
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid123' },
            contacts: [{ profile: { name: 'QA Bot' } }],
            messages: [{
              id: `wamid.synth.${Date.now()}`,
              from: '12130000001',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text',
              text: { body: 'e2e synthetic probe ignore this' }
            }]
          }
        }]
      }]
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload, 'EVENT_RECEIVED');
});

test('POST WA inbound text message returns 200 EVENT_RECEIVED', async () => {
  const result = await invoke({
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid123' },
            contacts: [{ profile: { name: 'Real Customer' } }],
            messages: [{
              id: `wamid.real.${Date.now()}`,
              from: '12135559876',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text',
              text: { body: 'Hi, I need TV mounting, how much?' }
            }]
          }
        }]
      }]
    }
  });

  // Meta always gets 200 regardless of internal processing
  assert.equal(result.status, 200);
  assert.equal(result.payload, 'EVENT_RECEIVED');
});

test('POST duplicate WA message_id is idempotent — both return 200', async () => {
  const messageId = `wamid.dedup.${Date.now()}`;
  const payload = {
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid123' },
            contacts: [{ profile: { name: 'Dedup Test' } }],
            messages: [{
              id: messageId,
              from: '12135550099',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text',
              text: { body: 'Need drywall repair quote' }
            }]
          }
        }]
      }]
    }
  };

  const first = await invoke(payload);
  const second = await invoke(payload);

  assert.equal(first.status, 200);
  assert.equal(first.payload, 'EVENT_RECEIVED');
  assert.equal(second.status, 200);
  assert.equal(second.payload, 'EVENT_RECEIVED');
});

test('POST unsupported object returns 404', async () => {
  const result = await invoke({
    method: 'POST',
    body: { object: 'unknown_object', entry: [] }
  });
  assert.equal(result.status, 404);
});

// ── logLeadEvent(null) guard ─────────────────────────────────────────────────

test('logLeadEvent with null lead_id skips DB insert and returns ok:skipped', async () => {
  const { logLeadEvent } = require('../api/_lib/supabase-admin.js');
  const result = await logLeadEvent(null, 'test_event', { foo: 'bar' });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'no_lead_id');
});

test('logLeadEvent with valid lead_id calls Supabase (REST insert)', async () => {
  let insertCalled = false;
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes('lead_events')) {
      insertCalled = true;
      return { ok: true, status: 204, json: async () => null, text: async () => '' };
    }
    return savedFetch(url, opts);
  };
  const { logLeadEvent } = require('../api/_lib/supabase-admin.js');
  const result = await logLeadEvent('lead_abc123', 'test_event', { source: 'test' });
  global.fetch = savedFetch;
  assert.equal(insertCalled, true, 'Supabase REST insert was called');
  assert.equal(result.ok, true);
});
