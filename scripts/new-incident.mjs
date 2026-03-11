#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const incidentsDir = path.join(root, 'ops', 'incidents');

function getArg(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nextIncidentId() {
  const ymd = todayYmd();
  if (!fs.existsSync(incidentsDir)) return `INC-${ymd}-01`;

  const files = fs.readdirSync(incidentsDir)
    .filter((f) => /^INC-\d{8}-\d{2}\.md$/.test(f))
    .map((f) => f.replace('.md', ''));

  const today = files
    .filter((id) => id.startsWith(`INC-${ymd}-`))
    .map((id) => Number(id.split('-')[2]))
    .filter((n) => Number.isFinite(n));

  const next = today.length ? Math.max(...today) + 1 : 1;
  return `INC-${ymd}-${pad2(next)}`;
}

const id = getArg('--id', nextIncidentId());
const severity = getArg('--severity', 'SEV2');
const owner = getArg('--owner', 'operations');
const impact = getArg('--impact', 'TBD');
const servicesRaw = getArg('--services', 'website,api');
const services = servicesRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .join(', ');
const status = getArg('--status', 'open');
const startedAt = getArg('--started-at', nowIso());
const dryRun = hasFlag('--dry-run');

if (!/^INC-\d{8}-\d{2}$/.test(id)) {
  console.error(`Invalid --id format: ${id}. Expected INC-YYYYMMDD-NN`);
  process.exit(1);
}

if (!/^SEV[1-4]$/.test(severity)) {
  console.error(`Invalid --severity: ${severity}. Expected SEV1..SEV4`);
  process.exit(1);
}

if (!fs.existsSync(incidentsDir)) fs.mkdirSync(incidentsDir, { recursive: true });

const filePath = path.join(incidentsDir, `${id}.md`);
if (fs.existsSync(filePath)) {
  console.error(`Incident already exists: ${filePath}`);
  process.exit(1);
}

const content = `---
id: ${id}
severity: ${severity}
status: ${status}
started_at: ${startedAt}
resolved_at:
owner: ${owner}
services: [${services}]
impact: "${impact.replaceAll('"', '\\"')}"
root_cause: "TBD"
actions_taken:
  - "TBD"
prevention:
  - "TBD"
---

# Incident Summary

## What happened
- 

## User impact
- 

## Timeline
- ${startedAt} detected
- mitigation started
- restored

## Root cause
- 

## Corrective actions
- 

## Preventive actions
- 
`;

if (dryRun) {
  console.log(`[DRY RUN] Would create: ${filePath}`);
  console.log(content);
  process.exit(0);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Incident created: ${filePath}`);
