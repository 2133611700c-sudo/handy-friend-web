#!/usr/bin/env node
/**
 * Backfill legacy lead source values to canonical channel keys.
 *
 * Usage:
 *   node scripts/backfill-lead-sources.mjs            # dry-run
 *   node scripts/backfill-lead-sources.mjs --apply    # write updates
 *   node scripts/backfill-lead-sources.mjs --hours=720 --apply
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeAttribution } = require('../lib/attribution.js');

const VALID_SOURCES = new Set([
  'website_chat', 'website_form', 'exit_intent', 'calculator',
  'facebook', 'instagram', 'whatsapp', 'phone', 'referral',
  'nextdoor', 'craigslist', 'thumbtack', 'google_business', 'google_organic',
  'google_lsa', 'google_ads_search', 'google_ads_display', 'google_ads_pmax',
  'facebook_ads', 'facebook_organic', 'instagram_ads', 'instagram_organic',
  'yelp', 'other'
]);

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const hoursArg = [...args].find((a) => a.startsWith('--hours='));
const windowHours = Number(hoursArg ? hoursArg.split('=')[1] : 24 * 30);

const projectUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

if (!projectUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
const query = new URLSearchParams({
  select: 'id,source,source_details,created_at',
  created_at: `gte.${sinceIso}`,
  order: 'created_at.desc',
  limit: '5000'
});

const resp = await fetch(`${projectUrl}/rest/v1/leads?${query}`, {
  method: 'GET',
  headers
});

if (!resp.ok) {
  const body = await resp.text().catch(() => '');
  console.error('Failed to load leads:', resp.status, body.slice(0, 500));
  process.exit(1);
}

const leads = await resp.json().catch(() => []);
if (!Array.isArray(leads)) {
  console.error('Unexpected leads payload');
  process.exit(1);
}

const updates = [];
for (const lead of leads) {
  const raw = String(lead?.source || '').trim();
  const currentSource = raw || 'other';
  if (VALID_SOURCES.has(currentSource)) continue;

  const inferred = normalizeLegacySource(currentSource, lead?.source_details);
  if (!inferred.channel) continue;
  if (inferred.channel === currentSource) continue;

  updates.push({
    id: lead.id,
    from: currentSource,
    to: inferred.channel,
    source_details: inferred.sourceDetails
  });
}

const summary = updates.reduce((acc, row) => {
  const key = `${row.from} -> ${row.to}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  window_hours: windowHours,
  scanned: leads.length,
  to_update: updates.length,
  transitions: summary
}, null, 2));

if (!apply || updates.length === 0) {
  process.exit(0);
}

let okCount = 0;
let failCount = 0;

for (const row of updates) {
  const patchResp = await fetch(`${projectUrl}/rest/v1/leads?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      source: row.to,
      source_details: row.source_details,
      updated_at: new Date().toISOString()
    })
  });

  if (patchResp.ok) okCount += 1;
  else failCount += 1;
}

console.log(JSON.stringify({
  applied: true,
  updated: okCount,
  failed: failCount
}, null, 2));

function normalizeLegacySource(rawSource, rawDetails) {
  const source = String(rawSource || '').trim();
  const lower = source.toLowerCase();
  const details = rawDetails && typeof rawDetails === 'object' ? { ...rawDetails } : {};

  if (lower === 'ai_chat') {
    return buildResult('website_chat', { ...details, backfill_from: source });
  }
  if (lower === 'direct') {
    return buildResult('website_form', { ...details, backfill_from: source });
  }

  if (source.startsWith('ref=')) {
    const refValue = decodeURIComponent(source.slice(4));
    const normalized = normalizeAttribution({ referrer: refValue });
    return buildResult(normalized.channel || 'other', {
      ...details,
      backfill_from: source,
      backfill_referrer: refValue,
      attribution: normalized
    });
  }

  if (source.includes('src=') || source.includes('med=') || source.includes('cmp=')) {
    const parsed = parseSummaryTokens(source);
    const normalized = normalizeAttribution(parsed);
    return buildResult(normalized.channel || 'other', {
      ...details,
      backfill_from: source,
      attribution: normalized
    });
  }

  if (/^https?:\/\//i.test(source)) {
    const normalized = normalizeAttribution({ referrer: source });
    return buildResult(normalized.channel || 'other', {
      ...details,
      backfill_from: source,
      attribution: normalized
    });
  }

  return buildResult('other', { ...details, backfill_from: source });
}

function parseSummaryTokens(summary) {
  const out = {};
  const parts = String(summary || '').split('|').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    const value = rest.join('=').trim();
    const key = String(k || '').trim();
    if (!key) continue;
    if (key === 'src') out.utmSource = value;
    if (key === 'med') out.utmMedium = value;
    if (key === 'cmp') out.utmCampaign = value;
    if (key === 'plc') out.placementId = value;
    if (key === 'ref') out.referrer = value;
    if (key === 'click') {
      const labels = value.split(',').map((v) => v.trim().toLowerCase());
      const clickId = {};
      if (labels.includes('gclid')) clickId.gclid = 'legacy';
      if (labels.includes('gbraid')) clickId.gbraid = 'legacy';
      if (labels.includes('wbraid')) clickId.wbraid = 'legacy';
      if (labels.includes('fbclid')) clickId.fbclid = 'legacy';
      if (labels.includes('msclkid')) clickId.msclkid = 'legacy';
      if (labels.includes('ttclid')) clickId.ttclid = 'legacy';
      out.clickId = clickId;
    }
  }
  return out;
}

function buildResult(channel, sourceDetails) {
  return {
    channel: VALID_SOURCES.has(channel) ? channel : 'other',
    sourceDetails: {
      ...(sourceDetails || {}),
      backfill_version: '2026.03.06-v1'
    }
  };
}
