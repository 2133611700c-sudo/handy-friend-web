#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanExt = new Set(['.html', '.js', '.md']);
const ignoreParts = new Set(['.git', 'node_modules', 'package-lock.json']);
const patterns = [
  { id: 'legacy_contact_email', re: /hello@handyandfriend\.com/i, severity: 'warn' },
  { id: 'old_7pm_hours', re: /8\s?(AM|am|a\.m\.)?[–\- ]?7\s?(PM|pm|p\.m\.)?/i, severity: 'warn' },
  { id: 'old_close_1900', re: /19:00/i, severity: 'warn' },
  { id: 'rating_claim', re: /5\.0\s*rated|customer rating|5\s*star/i, severity: 'warn' },
  { id: 'forbidden_best_claim', re: /best\s+in\s+la|#1\s+handyman/i, severity: 'error' },
  { id: 'forbidden_license_claim', re: /licensed\s+(and\s+bonded|contractor)|insured\s+and\s+bonded|certified/i, severity: 'error' },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreParts.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (scanExt.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const findings = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const p of patterns) {
      if (p.re.test(lines[i])) {
        findings.push({ file: rel, line: i + 1, id: p.id, severity: p.severity });
      }
    }
  }
}

fs.mkdirSync('ops/agent-control/reports', { recursive: true });
const report = {
  generated_at: new Date().toISOString(),
  files_scanned: walk(root).length,
  findings,
  summary: {
    total: findings.length,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warn').length,
  },
};
fs.writeFileSync('ops/agent-control/reports/policy-scan-latest.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
for (const f of findings.slice(0, 50)) {
  console.log(`${f.severity.toUpperCase()} ${f.id} ${f.file}:${f.line}`);
}
if (report.summary.errors > 0) process.exit(1);
