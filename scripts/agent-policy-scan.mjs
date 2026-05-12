#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanExt = new Set(['.html', '.js']);
const ignoredDirs = new Set(['.git', 'node_modules', 'ops', 'docs', '.github']);
const ignoredFiles = new Set(['package-lock.json']);
const patterns = [
  { id: 'legacy_contact_email', re: /hello@handyandfriend\.com/i, severity: 'warn' },
  { id: 'old_7pm_hours', re: /8\s?(AM|am|a\.m\.)?[–\- ]?7\s?(PM|pm|p\.m\.)?/i, severity: 'warn' },
  { id: 'old_close_1900', re: /19:00/i, severity: 'warn' },
  { id: 'rating_claim', re: /5\.0\s*rated|customer rating|5\s*star/i, severity: 'warn' },
  { id: 'best_or_number_one_claim', re: /best\s+in\s+la|#1\s+handyman/i, severity: 'warn' },
  { id: 'license_or_bond_claim', re: /licensed\s+(and\s+bonded|contractor)|insured\s+and\s+bonded|certified/i, severity: 'warn' },
];

function shouldSkip(fullPath, entryName) {
  if (ignoredFiles.has(entryName)) return true;
  const relParts = path.relative(root, fullPath).split(path.sep);
  return relParts.some((part) => ignoredDirs.has(part));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldSkip(full, entry.name)) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (scanExt.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const files = walk(root);
const findings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const p of patterns) {
      if (p.re.test(lines[i])) findings.push({ file: rel, line: i + 1, id: p.id, severity: p.severity });
    }
  }
}

fs.mkdirSync('ops/agent-control/reports', { recursive: true });
const report = {
  generated_at: new Date().toISOString(),
  files_scanned: files.length,
  findings,
  summary: {
    total: findings.length,
    warnings: findings.length,
    errors: 0,
  },
};
fs.writeFileSync('ops/agent-control/reports/policy-scan-latest.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
for (const f of findings.slice(0, 80)) console.log(`${f.severity.toUpperCase()} ${f.id} ${f.file}:${f.line}`);
console.log('Policy scanner is warn-only. Validate does not fail on drift until cleanup is complete.');
