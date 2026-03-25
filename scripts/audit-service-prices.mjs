#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const candidates = [
  'index.html',
  'services/index.html',
  'tv-mounting/index.html',
  'furniture-assembly/index.html',
  'art-hanging/index.html',
  'plumbing/index.html',
  'electrical/index.html',
  'drywall/index.html',
  'furniture-painting/index.html',
  'cabinet-painting/index.html',
  'interior-painting/index.html',
  'flooring/index.html',
  'door-installation/index.html',
  'vanity-installation/index.html',
  'backsplash/index.html'
].filter((p) => fs.existsSync(path.join(root, p)));

const issues = [];

function pushIssue(file, type, detail) {
  issues.push({ file, type, detail });
}

for (const rel of candidates) {
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, 'utf8');

  const fromFixed = [...text.matchAll(/From \$([0-9]+(?:\.[0-9]+)?)/gi)];
  for (const m of fromFixed) {
    const value = Number(m[1]);
    const end = m.index + m[0].length;
    const tail = text.slice(end).trimStart();
    const isPerUnit = tail.startsWith('/') || /^(per|a)\s+(square|sq|door|foot|ft|hour|hr)\b/i.test(tail);
    if (!isPerUnit && Number.isFinite(value) && value < 150) {
      pushIssue(rel, 'LOW_FIXED_FROM_PRICE', `${m[0]} (< $150 minimum)`);
    }
  }

  const hasPerUnitFrom = /From \$[0-9]+(?:\.[0-9]+)?\s*\/(sq\s*ft|door|sf|lf|lin\s*ft|section)/i.test(text);
  const hasMinimum = /Minimum service call:\s*\$150/i.test(text);
  if (hasPerUnitFrom && !hasMinimum) {
    pushIssue(rel, 'MISSING_MINIMUM_NOTE', 'Has per-unit pricing but missing "Minimum service call: $150"');
  }

  if (/(save|saved|off|ahorra|скидка|знижка)[^<\n]{0,30}20%|20%[^<\n]{0,30}(save|off|ahorra|скидка|знижка)/i.test(text)) {
    pushIssue(rel, 'DISCOUNT_CONFLICT', 'Contains 20% discount phrase');
  }
}

const outPath = path.join(root, 'output', 'price-audit-report.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const lines = [];
lines.push('# Service Price Audit');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push(`Files checked: ${candidates.length}`);
lines.push(`Issues found: ${issues.length}`);
lines.push('');

if (issues.length === 0) {
  lines.push('Status: PASS');
} else {
  lines.push('Status: FAIL');
  lines.push('');
  lines.push('| File | Type | Detail |');
  lines.push('|---|---|---|');
  for (const i of issues) {
    lines.push(`| ${i.file} | ${i.type} | ${i.detail.replace(/\|/g, '\\|')} |`);
  }
}

fs.writeFileSync(outPath, `${lines.join('\n')}\n`);

console.log(`Checked ${candidates.length} files.`);
console.log(`Issues: ${issues.length}`);
console.log(`Report: ${outPath}`);
if (issues.length) process.exit(2);
