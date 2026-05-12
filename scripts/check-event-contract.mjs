#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'index.html',
  'assets/js/main.js',
  'assets/js/shared.js',
  'docs/GA4-TESTING-VERIFICATION.md',
  'docs/contracts/event-attribution-contract.md'
];

const required = ['phone_click', 'whatsapp_click', 'form_submit'];
const stale = ['phone_call', 'sms_lead_generated'];
const compatibilityDebt = ['click_whatsapp'];

const report = {
  ok: true,
  required: {},
  stale: {},
  compatibility_debt: {},
};

for (const file of files) {
  const fp = path.join(root, file);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, 'utf8');
  for (const event of required) {
    report.required[event] = report.required[event] || [];
    if (text.includes(event)) report.required[event].push(file);
  }
  for (const event of stale) {
    report.stale[event] = report.stale[event] || [];
    if (text.includes(event)) {
      report.stale[event].push(file);
      report.ok = false;
    }
  }
  for (const event of compatibilityDebt) {
    report.compatibility_debt[event] = report.compatibility_debt[event] || [];
    if (text.includes(event)) report.compatibility_debt[event].push(file);
  }
}

for (const event of required) {
  if (!report.required[event] || report.required[event].length === 0) {
    report.ok = false;
    report.required[event] = [];
  }
}

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  process.exit(1);
}

if (Object.values(report.compatibility_debt).some((list) => list.length > 0)) {
  console.warn('⚠️ Compatibility debt found. Not failing release, but should be cleaned intentionally.');
}
