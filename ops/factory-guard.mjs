#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.HF_ROOT || path.resolve(scriptDir, '..');

const checks = [];

function pass(name, details = '') {
  checks.push({ name, ok: true, details });
}

function fail(name, details = '') {
  checks.push({ name, ok: false, details });
}

function checkExists(relPath) {
  const abs = path.join(root, relPath);
  if (fs.existsSync(abs)) {
    pass(`exists:${relPath}`);
    return abs;
  }
  fail(`exists:${relPath}`, 'missing file');
  return null;
}

function readIfExists(relPath) {
  const abs = checkExists(relPath);
  if (!abs) return '';
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch (err) {
    fail(`read:${relPath}`, err.message);
    return '';
  }
}

function assertContains(name, haystack, needle) {
  if (haystack.includes(needle)) {
    pass(name, `found: ${needle}`);
  } else {
    fail(name, `missing: ${needle}`);
  }
}

function parseCsv(csv) {
  const lines = String(csv || '').trim().split(/\r?\n/);
  if (!lines.length || !lines[0]) return [];
  const headers = lines.shift().split(',');
  return lines
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return row;
    });
}

const telegramRoute = readIfExists('api/send-telegram.js');
const uploadLeadPhotos = readIfExists('api/upload-lead-photos.js');
const submitLead = readIfExists('api/submit-lead.js');
const oneTap = readIfExists('r/one-tap/index.html');
const placementsCsv = readIfExists('docs/placements.csv');
const creativeAssets = readIfExists('docs/creative-assets.json');

assertContains('telegram_route_exists', telegramRoute, 'export default async function handler');
assertContains('upload_photos_route_exists', uploadLeadPhotos, 'export default async function handler');
assertContains('submit_lead_attachment_limit', submitLead, 'attachments.slice(0, 6)');
assertContains('submit_lead_source_tracking', submitLead, 'sourceDetails');
assertContains('submit_lead_schema_fallback', submitLead, 'insertLeadWithSchemaFallback');
assertContains('launcher_has_sms_ios', oneTap, 'Open SMS iPhone');
assertContains('launcher_has_sms_android', oneTap, 'Open SMS Android');
assertContains('launcher_has_whatsapp', oneTap, 'Open WhatsApp');
assertContains('launcher_has_call', oneTap, 'Open Call');

const rows = parseCsv(placementsCsv);
if (!rows.length) {
  fail('placements_rows', 'empty placements.csv');
} else {
  pass('placements_rows', `${rows.length} rows`);
}

if (rows.length) {
  const ids = rows.map((r) => r.placementId).filter(Boolean);
  const unique = new Set(ids);
  if (ids.length !== unique.size) {
    fail('placement_id_unique', `duplicates found (${ids.length - unique.size})`);
  } else {
    pass('placement_id_unique', `${unique.size} unique`);
  }
}

if (creativeAssets) {
  try {
    const parsed = JSON.parse(creativeAssets);
    const count = Number(parsed?.count || 0);
    if (count > 0 && Array.isArray(parsed.assets)) {
      pass('creative_assets_inventory', `${count} assets`);
    } else {
      fail('creative_assets_inventory', 'creative-assets.json has zero assets or bad schema');
    }
  } catch (err) {
    fail('creative_assets_inventory', err.message);
  }
}

const hardFailures = checks.filter((c) => !c.ok);
const summary = {
  generatedAt: new Date().toISOString(),
  root,
  passed: checks.length - hardFailures.length,
  failed: hardFailures.length,
  checks
};

console.log(JSON.stringify(summary, null, 2));
if (hardFailures.length) process.exit(1);
