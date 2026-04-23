const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-for-tests';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-for-tests';
process.env.WHATSAPP_VERIFY_TOKEN = 'wa-verify-token-test';

const handler = require('../api/alex-webhook.js');

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

test('GET webhook verification accepts WHATSAPP_VERIFY_TOKEN', async () => {
  const result = await invoke({
    method: 'GET',
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wa-verify-token-test',
      'hub.challenge': '12345'
    },
    url: '/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=wa-verify-token-test&hub.challenge=12345'
  });

  assert.equal(result.status, 200);
  assert.equal(String(result.payload), '12345');
});

test('POST webhook dedupes same wa_message_id', async () => {
  const messageId = `wamid.dedup.${Date.now()}`;
  const payload = {
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid' },
            contacts: [{ profile: { name: 'QA Bot' } }],
            messages: [{
              id: messageId,
              from: '12135550000',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text',
              text: { body: 'e2e synthetic probe ignore this test' }
            }]
          }
        }]
      }]
    }
  };

  const first = await invoke(payload);
  const second = await invoke(payload);

  assert.equal(first.status, 200);
  assert.equal(first.payload.ok, true);
  assert.equal(first.payload.processed_messages, 1);
  assert.equal(first.payload.synthetic_messages, 1);

  assert.equal(second.status, 200);
  assert.equal(second.payload.ok, true);
  assert.equal(second.payload.duplicate_messages, 1);
  assert.equal(second.payload.processed_messages, 0);
});

test('POST webhook accepts WhatsApp status callbacks', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';

  const result = await invoke({
    method: 'POST',
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'pnid' },
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
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.processed_statuses, 1);
});

