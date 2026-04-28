/**
 * P0-D: WA Watchdog behavior tests.
 *
 * Tests target lib/whatsapp/wa-watchdog.js (CJS) directly — not api/health.js
 * which uses export default (ESM) and cannot be require()'d in plain Node.
 *
 * Five P0 behaviors covered:
 *   1. Missed inbound (no outbound) → missed >= 1 in dry_run mode
 *   2. Linked outbound present → missed = 0
 *   3. watchdog_alerted=true row is skipped → missed = 0
 *   4. Unauthorized request (CRON_SECRET set, no header/secret) → 401
 *   5. dry_run does NOT send Telegram or write Supabase side effects
 *   + Bonus: live mode DOES call Telegram (confirms the dry_run gate works both ways)
 */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL              = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-srk';
process.env.TELEGRAM_BOT_TOKEN        = 'test-bot-token';
process.env.TELEGRAM_CHAT_ID          = '12345';

// ── Shared helpers ────────────────────────────────────────────────────────────

function mockRes() {
  const r = {
    statusCode: 200,
    payload: null,
    status(c)   { r.statusCode = c; return r; },
    json(o)     { r.payload = o;    return r; },
    send(b)     { r.payload = b;    return r; },
    end()       { return r; },
    setHeader() { return r; },
  };
  return r;
}

function makeReq({ dry_run, secret, isCron = false } = {}) {
  const query = { type: 'wa_watchdog' };
  if (dry_run) query.dry_run = dry_run;
  if (secret)  query.secret  = secret;
  return {
    method: 'GET',
    query,
    headers: isCron ? { 'x-vercel-cron': '1' } : {},
  };
}

/** Build a fetch mock that simulates Supabase + Telegram responses. */
function makeFetch({ inboundRows = [], outboundRows = [], telegramCalls = [], sbSideCalls = [] } = {}) {
  return async (url, opts) => {
    const u = String(url);
    if (u.includes('/whatsapp_messages') && u.includes('direction=eq.in')) {
      return { ok: true, status: 200, json: async () => inboundRows };
    }
    if (u.includes('/whatsapp_messages') && u.includes('direction=eq.out') && u.includes('in_reply_to_wamid')) {
      return { ok: true, status: 200, json: async () => outboundRows };
    }
    if (u.includes('/whatsapp_messages') && opts?.method === 'PATCH') {
      sbSideCalls.push({ kind: 'patch', url: u });
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (u.includes('/lead_events') && opts?.method === 'POST') {
      sbSideCalls.push({ kind: 'lead_event', url: u });
      return { ok: true, status: 201, json: async () => ({}) };
    }
    if (u.includes('api.telegram.org')) {
      telegramCalls.push(JSON.parse(opts?.body || '{}'));
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
}

// A representative inbound row (5 minutes old, not yet alerted).
const INBOUND_ROW = {
  id: 1,
  wamid: 'wamid.WATCHDOG.IN',
  customer_phone: '12135551234',
  body: 'I need TV mounting',
  raw: {},
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

// ── Test 1: dry_run — missed inbound counted, no side effects ─────────────────
test('wa_watchdog dry_run: missed inbound → missed=1, dry_run=true, no Telegram, no Supabase writes', async () => {
  const { runWaWatchdog } = require('../lib/whatsapp/wa-watchdog.js');
  const telegramCalls = [], sbSide = [];
  const req = makeReq({ dry_run: '1', isCron: true });
  const res = mockRes();

  await runWaWatchdog(req, res, {
    fetchFn: makeFetch({ inboundRows: [INBOUND_ROW], outboundRows: [], telegramCalls, sbSideCalls: sbSide }),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.dry_run, true,  'dry_run field must be true');
  assert.ok(res.payload.missed >= 1,        'missed must be >= 1 for unmatched inbound');
  assert.equal(telegramCalls.length, 0,     'Telegram must NOT be called in dry_run');
  assert.equal(sbSide.length, 0,            'Supabase PATCH/lead_event must NOT be called in dry_run');
});

// ── Test 2: linked outbound suppresses missed ─────────────────────────────────
test('wa_watchdog dry_run: linked outbound present → missed=0', async () => {
  const { runWaWatchdog } = require('../lib/whatsapp/wa-watchdog.js');
  const req = makeReq({ dry_run: '1', isCron: true });
  const res = mockRes();

  await runWaWatchdog(req, res, {
    fetchFn: makeFetch({
      inboundRows: [INBOUND_ROW],
      outboundRows: [{ id: 99, wamid: 'wamid.WATCHDOG.OUT' }],
    }),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.missed, 0, 'linked outbound → missed must be 0');
});

// ── Test 3: already-alerted row is skipped ────────────────────────────────────
test('wa_watchdog: watchdog_alerted=true row is skipped, missed=0', async () => {
  const { runWaWatchdog } = require('../lib/whatsapp/wa-watchdog.js');
  const alreadyAlerted = { ...INBOUND_ROW, raw: { watchdog_alerted: true } };
  const req = makeReq({ dry_run: '1', isCron: true });
  const res = mockRes();

  await runWaWatchdog(req, res, {
    fetchFn: makeFetch({ inboundRows: [alreadyAlerted], outboundRows: [] }),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.missed, 0, 'already-alerted rows must be skipped');
});

// ── Test 4: unauthorized request returns 401 ──────────────────────────────────
test('wa_watchdog: missing secret returns 401 when CRON_SECRET is configured', async () => {
  const { runWaWatchdog } = require('../lib/whatsapp/wa-watchdog.js');
  const savedSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'super-secret-xyz';

  const req = makeReq({ isCron: false }); // no cron header, no secret
  const res = mockRes();

  await runWaWatchdog(req, res, {
    fetchFn: makeFetch({ inboundRows: [] }),
  });

  process.env.CRON_SECRET = savedSecret || '';

  assert.equal(res.statusCode, 401, 'unauthorized request must return 401');
  assert.ok(res.payload?.error, 'error field must be present in 401 body');
});

// ── Test 5: live mode DOES call Telegram + Supabase (confirms gate works) ─────
test('wa_watchdog live mode: missed inbound → Telegram alert + Supabase writes fired', async () => {
  const { runWaWatchdog } = require('../lib/whatsapp/wa-watchdog.js');
  const telegramCalls = [], sbSide = [];
  const req = makeReq({ isCron: true }); // NO dry_run
  const res = mockRes();

  await runWaWatchdog(req, res, {
    fetchFn: makeFetch({ inboundRows: [INBOUND_ROW], outboundRows: [], telegramCalls, sbSideCalls: sbSide }),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.dry_run, false,            'dry_run must be false in live mode');
  assert.ok(res.payload.missed >= 1,                  'missed must be >= 1');
  assert.ok(telegramCalls.length >= 1,                'Telegram MUST be called in live mode');
  assert.ok(sbSide.some(c => c.kind === 'patch'),      'PATCH watchdog_alerted must fire');
  assert.ok(sbSide.some(c => c.kind === 'lead_event'), 'lead_event insert must fire');
});
