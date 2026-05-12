#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanDirs = ['.', 'assets', 'docs', 'api', 'lib', 'scripts'];
const skipParts = new Set(['.git', 'node_modules', '.vercel']);
const riskyClientFiles = [/^index\.html$/, /^assets\//, /^public\//];

const hardSecretPatterns = [
  { name: 'supabase_service_role_literal', re: /SUPABASE_SERVICE_ROLE_KEY|service_role/ },
  { name: 'telegram_token_literal', re: /TELEGRAM_BOT_TOKEN|bot\d{6,}:[A-Za-z0-9_-]{20,}/ },
  { name: 'deepseek_key_literal', re: /DEEPSEEK_API_KEY|sk-[A-Za-z0-9]{20,}/ },
  { name: 'facebook_page_token_literal', re: /FB_PAGE_ACCESS_TOKEN|EA[A-Za-z0-9]{80,}/ },
];

const findings = [];

for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (shouldSkip(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of hardSecretPatterns) {
    if (!pattern.re.test(text)) continue;
    const isClientSurface = riskyClientFiles.some((re) => re.test(rel));
    findings.push({ file: rel, pattern: pattern.name, client_surface: isClientSurface });
  }
}

const blocking = findings.filter((f) => f.client_surface);
const report = {
  ok: blocking.length === 0,
  blocking_count: blocking.length,
  findings_count: findings.length,
  findings,
  note: 'Literal env variable names in server-side files may be acceptable; client_surface findings are blocking.'
};

console.log(JSON.stringify(report, null, 2));
if (blocking.length > 0) process.exit(1);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipParts.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && isTextFile(entry.name)) yield full;
  }
}

function isTextFile(name) {
  return /\.(js|mjs|cjs|html|css|json|md|txt|yml|yaml)$/.test(name);
}

function shouldSkip(rel) {
  if (rel.includes('/node_modules/')) return true;
  if (rel.includes('/.git/')) return true;
  if (rel === 'package-lock.json') return true;
  return false;
}
