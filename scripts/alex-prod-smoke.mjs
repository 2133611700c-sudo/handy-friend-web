#!/usr/bin/env node

const DEFAULT_URL = 'https://handyandfriend.com/api/ai-chat';
const TARGET_URL = process.env.ALEX_SMOKE_URL || DEFAULT_URL;
const TIMEOUT_MS = Number(process.env.ALEX_SMOKE_TIMEOUT_MS || 20000);
const MAX_LATENCY_MS = Number(process.env.ALEX_SMOKE_MAX_LATENCY_MS || 15000);

const payload = {
  sessionId: process.env.ALEX_SMOKE_SESSION_ID || `prod-alex-smoke-${Date.now()}`,
  lang: 'en',
  messages: [
    {
      role: 'user',
      content: process.env.ALEX_SMOKE_MESSAGE || 'How much for standard TV mounting in Burbank? My ZIP is 91502.'
    }
  ],
  attribution: {
    utm_source: process.env.ALEX_SMOKE_UTM_SOURCE || 'smoke',
    utm_medium: process.env.ALEX_SMOKE_UTM_MEDIUM || 'ci',
    utm_campaign: process.env.ALEX_SMOKE_UTM_CAMPAIGN || 'alex_prod_smoke'
  }
};

const started = Date.now();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

try {
  const response = await fetch(TARGET_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  const latencyMs = Date.now() - started;
  const raw = await response.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }

  const reply = String(body?.reply || body?.message || body?.text || '');
  const result = {
    ok: response.ok,
    http_status: response.status,
    latency_ms: latencyMs,
    has_reply: reply.length > 0,
    contains_150: reply.includes('$150'),
    contains_legacy_price: reply.includes('$185') || reply.includes('$105'),
    reply_preview: reply.slice(0, 300),
    target_url: TARGET_URL,
    session_id: payload.sessionId
  };

  console.log(JSON.stringify(result, null, 2));

  if (response.status !== 200) fail(`expected HTTP 200, got ${response.status}`);
  if (latencyMs > MAX_LATENCY_MS) fail(`expected latency <=${MAX_LATENCY_MS}ms, got ${latencyMs}ms`);
  if (!reply) fail('missing reply');
  if (!reply.includes('$150')) fail('missing $150 pricing signal');
  if (reply.includes('$185') || reply.includes('$105')) fail('legacy price leaked');
  if (/licensed|bonded|certified|best in LA/i.test(reply)) fail('banned business claim leaked');

  console.log('✅ Alex production smoke passed');
} catch (err) {
  const latencyMs = Date.now() - started;
  const category = err?.name === 'AbortError' ? 'timeout' : 'request_failed';
  console.error(JSON.stringify({
    ok: false,
    category,
    latency_ms: latencyMs,
    error: String(err?.message || err),
    target_url: TARGET_URL,
    session_id: payload.sessionId
  }, null, 2));
  process.exit(1);
} finally {
  clearTimeout(timer);
}

function fail(message) {
  console.error(`❌ Alex production smoke failed: ${message}`);
  process.exit(1);
}
