#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanExt = new Set(['.html', '.js', '.md']);
const skip = new Set(['.git', 'node_modules', 'package-lock.json']);

const checks = [
  { id: 'service_call_150_missing_risk', re: /service call[^\n]{0,80}\$?(120|125|130|140)\b/i, severity: 'warn' },
  { id: 'old_drywall_120_surface', re: /drywall[^\n]{0,80}\$120\b/i, severity: 'warn' },
  { id: 'old_tv_noncanonical_surface', re: /tv[^\n]{0,80}\$?(99|100|120|125|130|140)\b/i, severity: 'warn' },
  { id: 'old_hourly_rate_surface', re: /\$\s?(50|60|65|70)\s?\/\s?(hr|hour)/i, severity: 'warn' },
  { id: 'noncanonical_response_30min', re: /30\s*minutes/i, severity: 'warn' },
  { id: 'two_minute_quote_claim', re: /2\s*min|2\s*minutes/i, severity: 'warn' },
  { id: 'old_7pm_hours', re: /8\s?(AM|am)?[–\- ]?7\s?(PM|pm)?/i, severity: 'warn' },
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (scanExt.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

const files = walk(root);
const findings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    for (const check of checks) {
      if (check.re.test(line)) findings.push({ file: rel, line: idx + 1, id: check.id, severity: check.severity });
    }
  }
}

const report = {
  generated_at: new Date().toISOString(),
  files_scanned: files.length,
  findings,
  summary: {
    total: findings.length,
    warnings: findings.filter(f => f.severity === 'warn').length,
    errors: findings.filter(f => f.severity === 'error').length,
  },
};

fs.mkdirSync('ops/agent-control/reports', { recursive: true });
fs.writeFileSync('ops/agent-control/reports/pricing-scan-latest.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
for (const f of findings.slice(0, 80)) console.log(`${f.severity.toUpperCase()} ${f.id} ${f.file}:${f.line}`);
if (report.summary.errors > 0) process.exit(1);
