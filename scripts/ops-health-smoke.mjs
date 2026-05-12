#!/usr/bin/env node

const BASE_URL = process.env.HF_BASE_URL || 'https://handyandfriend.com';
const TIMEOUT_MS = Number(process.env.HF_HEALTH_TIMEOUT_MS || 15000);

const checks = [
  { name: 'homepage', url: `${BASE_URL}/`, expectJson: false },
  { name: 'api_health', url: `${BASE_URL}/api/health`, expectJson: true },
  { name: 'telegram_health', url: `${BASE_URL}/api/health?type=telegram`, expectJson: true, optional: true },
  { name: 'attribution_health', url: `${BASE_URL}/api/health?type=attribution&hours=720`, expectJson: true, optional: true },
  { name: 'outbox_health', url: `${BASE_URL}/api/health?type=outbox`, expectJson: true, optional: true }
];

const results = [];
let failed = false;

for (const check of checks) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(check.url, { method: 'GET', signal: controller.signal });
    const text = await res.text();
    let json = null;
    if (check.expectJson) {
      try { json = JSON.parse(text); } catch {}
    }

    const latencyMs = Date.now() - started;
    const ok = res.status === 200 && (!check.expectJson || json?.ok !== false);
    const item = {
      name: check.name,
      ok,
      optional: !!check.optional,
      http_status: res.status,
      latency_ms: latencyMs,
      url: check.url,
      summary: summarize(check.name, json, text)
    };
    results.push(item);
    if (!ok && !check.optional) failed = true;
  } catch (err) {
    const item = {
      name: check.name,
      ok: false,
      optional: !!check.optional,
      http_status: null,
      latency_ms: Date.now() - started,
      url: check.url,
      error: String(err?.message || err)
    };
    results.push(item);
    if (!check.optional) failed = true;
  } finally {
    clearTimeout(timer);
  }
}

const report = {
  ok: !failed,
  base_url: BASE_URL,
  timestamp: new Date().toISOString(),
  results
};

console.log(JSON.stringify(report, null, 2));
if (failed) process.exit(1);

function summarize(name, json, text) {
  if (!json) return String(text || '').slice(0, 120).replace(/\s+/g, ' ');
  if (name === 'api_health') {
    return {
      status: json.status,
      env: json.runtime?.env,
      supabase: !!json.checks?.supabase_service_role_key,
      telegram: !!json.checks?.telegram_bot_token,
      deepseek: !!json.checks?.deepseek_api_key
    };
  }
  if (name === 'telegram_health') {
    return {
      pending_update_count: json.pending_update_count,
      failures_24h: json.failures_24h,
      leads_without_telegram_proof_7d: json.leads_without_telegram_proof_7d
    };
  }
  if (name === 'attribution_health') {
    return {
      status: json.status || json.attribution_integrity,
      missing_source: json.missing_source,
      google_ads_search: json.sources?.google_ads_search
    };
  }
  if (name === 'outbox_health') {
    return {
      queue_depth: json.queue_depth,
      dlq_total: json.dlq_total,
      slo_breached: json.slo_breached
    };
  }
  return json.status || json.ok || null;
}
