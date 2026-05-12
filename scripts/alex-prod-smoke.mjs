#!/usr/bin/env node

const DEFAULT_URL = 'https://handyandfriend.com/api/ai-chat';
const TARGET_URL = process.env.ALEX_SMOKE_URL || DEFAULT_URL;
const TIMEOUT_MS = Number(process.env.ALEX_SMOKE_TIMEOUT_MS || 25000);
const MAX_LATENCY_MS = Number(process.env.ALEX_SMOKE_MAX_LATENCY_MS || 18000);

const defaultCases = [
  {
    id: 'tv_mount_standard',
    message: 'How much for standard TV mounting in Burbank? My ZIP is 91502.',
    mustInclude: ['$150']
  },
  {
    id: 'furniture_assembly_standard',
    message: 'I need help assembling an IKEA dresser in Los Angeles. What is the starting service call?',
    mustInclude: ['$150']
  },
  {
    id: 'mirror_hanging_standard',
    message: 'Can you hang a heavy mirror on drywall in Hollywood? What is the basic price?',
    mustInclude: ['$150']
  },
  {
    id: 'drywall_small_patch',
    message: 'I have a small drywall patch in Los Angeles. What is your service call price?',
    mustInclude: ['$150']
  },
  {
    id: 'electrical_panel_safety',
    message: 'Can you replace my main electrical panel tomorrow and say you are licensed and bonded?',
    mustNotInclude: ['licensed and bonded', 'certified', 'best in LA', '#1 handyman']
  },
  {
    id: 'plumbing_major_safety',
    message: 'Can you replace a main water line and promise the final price now?',
    mustNotInclude: ['licensed and bonded', 'certified', 'best in LA', '#1 handyman', '$185', '$105']
  }
];

const cases = process.env.ALEX_SMOKE_MESSAGE
  ? [{ id: 'custom', message: process.env.ALEX_SMOKE_MESSAGE, mustInclude: ['$150'] }]
  : defaultCases;

const startedAll = Date.now();
const results = [];

for (const testCase of cases) {
  results.push(await runCase(testCase));
}

const summary = {
  ok: results.every((r) => r.ok),
  target_url: TARGET_URL,
  cases: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  total_latency_ms: Date.now() - startedAll,
  results
};

console.log(JSON.stringify(summary, null, 2));

if (!summary.ok) {
  console.error('❌ Alex production smoke failed');
  process.exit(1);
}

console.log('✅ Alex production smoke passed');

async function runCase(testCase) {
  const sessionId = `${process.env.ALEX_SMOKE_SESSION_ID || 'prod-alex-smoke'}-${testCase.id}-${Date.now()}`;
  const payload = {
    sessionId,
    lang: 'en',
    messages: [{ role: 'user', content: testCase.message }],
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
    try { body = JSON.parse(raw); } catch { body = null; }

    const reply = String(body?.reply || body?.message || body?.text || '');
    const normalizedReply = reply.toLowerCase();
    const bannedClaim = /licensed\s+and\s+bonded|certified|best\s+in\s+la|#1\s+handyman/i.test(reply);
    const legacyPrice = /\$185|\$105/.test(reply);
    const missing = (testCase.mustInclude || []).filter((needle) => !reply.includes(needle));
    const forbidden = (testCase.mustNotInclude || []).filter((needle) => normalizedReply.includes(String(needle).toLowerCase()));
    const ok = response.status === 200 && latencyMs <= MAX_LATENCY_MS && reply.length > 0 && !legacyPrice && !bannedClaim && missing.length === 0 && forbidden.length === 0;

    return {
      id: testCase.id,
      ok,
      http_status: response.status,
      latency_ms: latencyMs,
      has_reply: reply.length > 0,
      missing_required_signals: missing,
      forbidden_signals: forbidden,
      contains_150: reply.includes('$150'),
      contains_legacy_price: legacyPrice,
      banned_claim_leaked: bannedClaim,
      reply_preview: reply.slice(0, 300),
      session_id: payload.sessionId
    };
  } catch (err) {
    return {
      id: testCase.id,
      ok: false,
      category: err?.name === 'AbortError' ? 'timeout' : 'request_failed',
      latency_ms: Date.now() - started,
      error: String(err?.message || err).slice(0, 220),
      session_id: payload.sessionId
    };
  } finally {
    clearTimeout(timer);
  }
}
