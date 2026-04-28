/**
 * Auto-reply mode regression tests.
 *
 * Owner directive: real customer messaging +1 213 361 1700 must receive an
 * automatic English Alex reply through WhatsApp Cloud API, without a Telegram
 * approval gate. Telegram is proof only.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'srv';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'tg-test';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '12345';
process.env.WHATSAPP_VERIFY_TOKEN = 'wa-verify-token-test';
process.env.FB_VERIFY_TOKEN = 'fb-verify-token-test';
process.env.META_SYSTEM_USER_TOKEN = 'meta-test-token';
process.env.META_PHONE_NUMBER_ID = '1085039581359097';
process.env.META_WABA_ID = '825762536760123';
process.env.DEEPSEEK_API_KEY = 'deepseek-test';
process.env.WHATSAPP_REPLY_MODE = 'auto';

function reset() {
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/lib/') || k.includes('/api/')) delete require.cache[k];
  }
}

function mockRes() {
  return { statusCode: 200, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.payload = o; return this; },
    send(b) { this.payload = b; return this; },
    end() { return this; } };
}

function streamReq(overrides = {}) {
  const { body, ...rest } = overrides;
  const raw = body ? Buffer.from(JSON.stringify(body), 'utf8') : Buffer.alloc(0);
  const listeners = {};
  const req = {
    ...rest, headers: rest.headers || {},
    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      if (event === 'end') {
        setImmediate(() => {
          (listeners['data'] || []).forEach(fn => fn(raw));
          (listeners['end'] || []).forEach(fn => fn());
        });
      }
      return req;
    },
  };
  return req;
}

function inboundPayload({ wamid, from = '12135551234', text = 'Hi, I need help with TV mounting' }) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: process.env.META_PHONE_NUMBER_ID },
      contacts: [{ profile: { name: 'Live Customer' }, wa_id: from }],
      messages: [{
        id: wamid, from, timestamp: String(Math.floor(Date.now()/1000)),
        type: 'text', text: { body: text },
      }],
    } }] }],
  };
}

// ── Module presence ────────────────────────────────────────────────────────

test('lib/alex/whatsapp-agent.js exports generateWhatsAppAlexReply', () => {
  reset();
  const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
  assert.equal(typeof generateWhatsAppAlexReply, 'function');
});

test('lib/whatsapp/send-alex-reply.js exports sendAlexReply', () => {
  reset();
  const { sendAlexReply } = require('../lib/whatsapp/send-alex-reply.js');
  assert.equal(typeof sendAlexReply, 'function');
});

test('lib/alex/whatsapp-safety.js exports detectSafetyFlags', () => {
  reset();
  const { detectSafetyFlags } = require('../lib/alex/whatsapp-safety.js');
  assert.equal(typeof detectSafetyFlags, 'function');
  assert.deepEqual(detectSafetyFlags('hi there'), []);
});

// ── Alex agent return contract ─────────────────────────────────────────────

test('generateWhatsAppAlexReply returns English reply for English inbound', async () => {
  reset();
  const saved = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Hi! Yes, we can help with TV mounting. What size TV and your ZIP code?' } }] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
  const r = await generateWhatsAppAlexReply({ inboundText: 'I need TV mounting', customerPhone: '12135551234' });
  global.fetch = saved;
  assert.equal(r.ok, true);
  assert.equal(r.source, 'model');
  assert.deepEqual(r.safetyFlags, []);
  assert.match(r.replyText, /TV/i);
});

test('Russian inbound still produces English reply', async () => {
  reset();
  const saved = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Hello! How can I help with your project? Please share your ZIP code and a few photos.' } }] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
  const r = await generateWhatsAppAlexReply({ inboundText: 'Привет', customerPhone: '12135551234' });
  global.fetch = saved;
  assert.equal(r.source, 'model');
  assert.doesNotMatch(r.replyText, /[Ѐ-ӿ]/, 'reply must not contain Cyrillic');
});

test('price question gets safe intake reply, not a fake final quote', async () => {
  reset();
  const saved = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Thanks for reaching out. Pricing depends on the size and condition. Could you share photos, ZIP code, and timing?' } }] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
  const r = await generateWhatsAppAlexReply({ inboundText: 'How much to paint exterior?', customerPhone: '12135551234' });
  global.fetch = saved;
  assert.match(r.replyText, /photos|ZIP|timing/i);
  assert.doesNotMatch(r.replyText, /\$\d/, 'must not include a $ amount');
});

// ── sendAlexReply: hard idempotency + Cloud API + outbound row ────────────

test('sendAlexReply sends Cloud API + records outbound row', async () => {
  reset();
  const sent = [], outbound = [];
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/whatsapp_messages?direction=eq.out') && u.includes('in_reply_to_wamid')) {
      return { ok: true, status: 200, json: async () => [] }; // no prior outbound
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      sent.push(JSON.parse(opts.body));
      const r = JSON.stringify({ messages: [{ id: 'wamid.OUT.AUTO' }] });
      return { ok: true, status: 200, text: async () => r, json: async () => JSON.parse(r) };
    }
    if (u.includes('/whatsapp_messages') && opts?.method === 'POST') {
      const parsed = JSON.parse(opts.body);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      outbound.push(...rows);
      return { ok: true, status: 201, json: async () => rows, text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const { sendAlexReply } = require('../lib/whatsapp/send-alex-reply.js');
  const r = await sendAlexReply({
    inboundWamid: 'wamid.IN.AUTO', customerPhone: '12135551234', customerName: 'Live',
    customerMessage: 'I need TV mounting', replyText: 'Hi! Yes, we can help. Please share TV size and ZIP code.',
    source: 'model', model: 'deepseek',
  });
  global.fetch = saved;

  assert.equal(r.ok, true);
  assert.equal(r.outboundWamid, 'wamid.OUT.AUTO');
  assert.equal(r.alreadySent, false);
  assert.equal(sent.length, 1, 'Cloud API send called once');
  assert.equal(sent[0].text.body, 'Hi! Yes, we can help. Please share TV size and ZIP code.');
  assert.equal(outbound.length >= 1, true, 'outbound row inserted');
  const row = outbound.find(o => o.direction === 'out');
  assert.ok(row, 'direction=out row present');
  assert.equal(row.wamid, 'wamid.OUT.AUTO');
  assert.equal(row.raw.in_reply_to_wamid, 'wamid.IN.AUTO');
  assert.equal(row.raw.alex_source, 'model');
});

test('sendAlexReply is idempotent — duplicate inbound does not re-send', async () => {
  reset();
  const sent = [];
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/whatsapp_messages?direction=eq.out') && u.includes('in_reply_to_wamid')) {
      // Prior outbound EXISTS for this inbound wamid
      return { ok: true, status: 200, json: async () => [{ wamid: 'wamid.OUT.PRIOR', phone_number: '12135551234', body: 'Hi prior', created_at: new Date().toISOString() }] };
    }
    if (u.includes('graph.facebook.com')) {
      sent.push(JSON.parse(opts.body));
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const { sendAlexReply } = require('../lib/whatsapp/send-alex-reply.js');
  const r = await sendAlexReply({
    inboundWamid: 'wamid.IN.DUP', customerPhone: '12135551234',
    customerMessage: 'hi', replyText: 'Hi! How can I help.',
  });
  global.fetch = saved;
  assert.equal(r.ok, true);
  assert.equal(r.alreadySent, true);
  assert.equal(r.outboundWamid, 'wamid.OUT.PRIOR');
  assert.equal(sent.length, 0, 'Cloud API must NOT be called on duplicate');
});

test('sendAlexReply REFUSES unsafe (Cyrillic) reply text', async () => {
  reset();
  const sent = [];
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).includes('graph.facebook.com')) {
      sent.push(JSON.parse(opts.body));
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const { sendAlexReply } = require('../lib/whatsapp/send-alex-reply.js');
  const r = await sendAlexReply({ inboundWamid: 'w', customerPhone: '12135551234', replyText: 'Привет!' });
  global.fetch = saved;
  assert.equal(r.ok, false);
  assert.equal(r.error, 'unsafe_reply');
  assert.ok(r.safetyFlags.includes('cyrillic'));
  assert.equal(sent.length, 0);
});

test('sendAlexReply Cloud API failure → ok:false with errorCode + Telegram alert', async () => {
  reset();
  const sent = [], tg = [];
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/whatsapp_messages?direction=eq.out') && u.includes('in_reply_to_wamid')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      sent.push(1);
      // Cloud API client retries 3x on 500 — fail all 3 by returning 500 with retryable code each time.
      return { ok: false, status: 500, statusText: 'Server Error', text: async () => JSON.stringify({ error: { code: 131000, message: 'Internal' } }), json: async () => ({ error: { code: 131000, message: 'Internal' } }) };
    }
    if (u.includes('api.telegram.org/bot') && u.includes('sendMessage')) {
      tg.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 1 } }) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const { sendAlexReply } = require('../lib/whatsapp/send-alex-reply.js');
  const r = await sendAlexReply({
    inboundWamid: 'wamid.FAIL', customerPhone: '12135551234',
    replyText: 'Hi! How can we help?', source: 'model', model: 'deepseek',
  });
  global.fetch = saved;
  assert.equal(r.ok, false);
  assert.equal(r.error, 'cloud_api_failed');
  // Cloud API client retries 3× on 5xx → at least 1 attempt was made.
  assert.ok(sent.length >= 1, 'Cloud API was attempted');
  assert.ok(tg.length >= 1, 'Telegram failure alert was sent');
  assert.match(tg[0].text, /AUTO-REPLY FAILED/);
});

// ── /api/alex-webhook AUTO mode wiring ─────────────────────────────────────

test('AUTO mode: inbound webhook calls Alex AND sends Cloud API outbound', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'auto';
  const calls = { deepseek: 0, sendCloud: [], outboundInsert: [], tgProof: [] };
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('deepseek.com')) {
      calls.deepseek++;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Hi! Yes, we can help with TV mounting and shelves. Please share TV size, wall type, your ZIP code and a few photos.' } }] }) };
    }
    if (u.includes('/whatsapp_messages?direction=eq.out') && u.includes('in_reply_to_wamid')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendCloud.push(JSON.parse(opts.body));
      const r = JSON.stringify({ messages: [{ id: 'wamid.OUT.E2E' }] });
      return { ok: true, status: 200, text: async () => r, json: async () => JSON.parse(r) };
    }
    if (u.includes('/whatsapp_messages') && opts?.method === 'POST') {
      const parsed = JSON.parse(opts.body);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      calls.outboundInsert.push(...rows);
      return { ok: true, status: 201, json: async () => rows, text: async () => '' };
    }
    if (u.includes('api.telegram.org')) {
      calls.tgProof.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 999 } }) };
    }
    // any other Supabase call
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  const handler = require('../api/alex-webhook.js');
  const req = streamReq({ method: 'POST', body: inboundPayload({ wamid: 'wamid.IN.AUTOWEBHOOK', text: 'Hi, I need TV mounting and shelves' }) });
  const res = mockRes();
  await handler(req, res);
  global.fetch = saved;
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload, 'EVENT_RECEIVED');
  assert.ok(calls.deepseek >= 1, 'Alex (DeepSeek) was called');
  assert.equal(calls.sendCloud.length, 1, 'Cloud API send was called exactly once');
  assert.ok(calls.sendCloud[0].text.body.length > 0);
  const outRow = calls.outboundInsert.find(o => o.direction === 'out');
  assert.ok(outRow, 'outbound row inserted with direction=out');
  assert.equal(outRow.raw.in_reply_to_wamid, 'wamid.IN.AUTOWEBHOOK');
  assert.ok(calls.tgProof.length >= 1, 'Telegram proof was sent');
  assert.match(calls.tgProof[0].text, /WHATSAPP AUTO-REPLY SENT/);
});

test('AUTO mode: duplicate inbound webhook does NOT send second Cloud API call', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'auto';
  const sentCount = { n: 0 };
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('deepseek.com')) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Hi! Please share TV size and ZIP code.' } }] }) };
    }
    if (u.includes('/whatsapp_messages?direction=eq.out') && u.includes('in_reply_to_wamid')) {
      // Prior outbound exists for this inbound
      return { ok: true, status: 200, json: async () => [{ wamid: 'wamid.OUT.PRIOR2', phone_number: '12135559999', body: 'Hi prior 2', created_at: new Date().toISOString() }] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      sentCount.n++;
      return { ok: true, status: 200, text: async () => JSON.stringify({ messages: [{ id: 'NEW' }] }), json: async () => ({ messages: [{ id: 'NEW' }] }) };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  const handler = require('../api/alex-webhook.js');
  const req = streamReq({ method: 'POST', body: inboundPayload({ wamid: 'wamid.IN.DUP2', from: '12135559999', text: 'Hi again' }) });
  await handler(req, mockRes());
  global.fetch = saved;
  assert.equal(sentCount.n, 0, 'Cloud API send must NOT fire on duplicate inbound (idempotency)');
});

test('APPROVAL mode: still sends Telegram approval (no auto Cloud API)', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'approval';
  const sent = { cloud: 0, tgApproval: 0 };
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('deepseek.com')) {
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Hi! Please share scope, ZIP, photos.' } }] }) };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) { sent.cloud++; return { ok: true, status: 200, text: async () => '', json: async () => ({}) }; }
    if (u.includes('api.telegram.org/bot') && u.includes('sendMessage')) {
      const body = JSON.parse(opts.body);
      if (body.reply_markup && body.reply_markup.inline_keyboard) sent.tgApproval++;
      return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 555 } }) };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  const handler = require('../api/alex-webhook.js');
  await handler(streamReq({ method: 'POST', body: inboundPayload({ wamid: 'wamid.IN.APPR' }) }), mockRes());
  global.fetch = saved;
  process.env.WHATSAPP_REPLY_MODE = 'auto'; // restore
  assert.equal(sent.cloud, 0, 'in approval mode Cloud API must NOT be called by webhook');
  assert.ok(sent.tgApproval >= 1, 'approval Telegram message was sent');
});

test('OFF mode: no Cloud API send, no approval, only an OFF-mode Telegram alert', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'off';
  const sent = { cloud: 0, tgOff: 0 };
  const saved = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) { sent.cloud++; return { ok: true, status: 200, text: async () => '', json: async () => ({}) }; }
    if (u.includes('api.telegram.org/bot') && u.includes('sendMessage')) {
      const body = JSON.parse(opts.body);
      if (/auto-reply OFF/i.test(body.text || '')) sent.tgOff++;
      return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 1 } }) };
    }
    return { ok: true, status: 200, json: async () => [], text: async () => '' };
  };
  const handler = require('../api/alex-webhook.js');
  await handler(streamReq({ method: 'POST', body: inboundPayload({ wamid: 'wamid.IN.OFF' }) }), mockRes());
  global.fetch = saved;
  process.env.WHATSAPP_REPLY_MODE = 'auto';
  assert.equal(sent.cloud, 0);
  assert.ok(sent.tgOff >= 1, 'OFF-mode owner alert was sent');
});

test('AUTO mode: bad HMAC still returns 403 (security unchanged)', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'auto';
  process.env.FB_APP_SECRET = 'test-secret-not-real';
  const handler = require('../api/alex-webhook.js');
  const req = streamReq({ method: 'POST', headers: { 'x-hub-signature-256': 'sha256=badbadbad' }, body: inboundPayload({ wamid: 'wamid.IN.HMAC' }) });
  const res = mockRes();
  await handler(req, res);
  delete process.env.FB_APP_SECRET;
  assert.equal(res.statusCode, 403);
});

test('AUTO mode: missing HMAC returns 403', async () => {
  reset();
  process.env.WHATSAPP_REPLY_MODE = 'auto';
  process.env.FB_APP_SECRET = 'test-secret-not-real';
  const handler = require('../api/alex-webhook.js');
  const req = streamReq({ method: 'POST', body: inboundPayload({ wamid: 'wamid.IN.NOHMAC' }) });
  const res = mockRes();
  await handler(req, res);
  delete process.env.FB_APP_SECRET;
  assert.equal(res.statusCode, 403);
});
