#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const target = process.env.TARGET_ORIGIN || 'https://handyandfriend.com';
const routes = (process.env.ROUTES || '/,/book,/pricing,/services,/messenger').split(',').map((x) => x.trim()).filter(Boolean);
const outDir = process.env.OUT_DIR || `ops/openclaw/reports/virtual-browser-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!/analytics|googletagmanager|facebook|doubleclick/i.test(url)) {
      requestFailures.push({ url: url.slice(0, 250), failure: request.failure()?.errorText || 'unknown' });
    }
  });

  for (const route of routes) {
    const url = new URL(route, target).toString();
    const started = Date.now();
    const record = { viewport: viewport.name, route, url, ok: false };

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      const status = response?.status() || null;
      const title = await page.title().catch(() => '');
      const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      const links = await page.locator('a').evaluateAll((els) => els.map((a) => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.href })).slice(0, 120)).catch(() => []);
      const buttons = await page.locator('button').evaluateAll((els) => els.map((b) => (b.innerText || '').trim().slice(0, 80)).filter(Boolean).slice(0, 80)).catch(() => []);
      const safeRoute = route === '/' ? 'home' : route.replaceAll('/', '_').replace(/^_/, '');
      const screenshotName = `${viewport.name}-${safeRoute}.png`;
      const screenshotPath = path.join(outDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const lowerText = bodyText.toLowerCase();
      const phoneLinks = links.filter((l) => l.href.includes('tel:') || l.href.includes('2133611700'));
      const whatsappLinks = links.filter((l) => /wa\.me|whatsapp/i.test(l.href));
      const messengerLinks = links.filter((l) => /m\.me|messenger/i.test(l.href));
      const pricingClaims = [...bodyText.matchAll(/\$\s?\d{2,4}/g)].map((m) => m[0]);
      const badClaims = ['licensed', 'bonded', 'certified', '#1', 'best in la', 'best handyman'].filter((claim) => lowerText.includes(claim));
      const brandErrors = ['handy and fiend', 'handy & fiend', 'handy fiend'].filter((claim) => lowerText.includes(claim));

      Object.assign(record, {
        ok: Boolean(status && status >= 200 && status < 400),
        status,
        ms: Date.now() - started,
        title,
        phone_links: phoneLinks,
        whatsapp_links: whatsappLinks,
        messenger_links: messengerLinks,
        buttons,
        pricing_claims: [...new Set(pricingClaims)].slice(0, 50),
        bad_claims: badClaims,
        brand_errors: brandErrors,
        console_errors: [...consoleErrors],
        request_failures: [...requestFailures],
        screenshot: screenshotPath,
      });
    } catch (error) {
      Object.assign(record, {
        ok: false,
        error: error?.message || String(error),
        ms: Date.now() - started,
        console_errors: [...consoleErrors],
        request_failures: [...requestFailures],
      });
    }

    results.push(record);
  }

  await context.close();
}

await browser.close();

const summary = {
  ok: results.every((r) => r.ok && r.bad_claims.length === 0 && r.brand_errors.length === 0),
  target,
  generated_at: new Date().toISOString(),
  pages_checked: results.length,
  failed_pages: results.filter((r) => !r.ok).map((r) => ({ viewport: r.viewport, route: r.route, status: r.status, error: r.error })),
  bad_claims: results.filter((r) => r.bad_claims.length).map((r) => ({ viewport: r.viewport, route: r.route, bad_claims: r.bad_claims })),
  brand_errors: results.filter((r) => r.brand_errors.length).map((r) => ({ viewport: r.viewport, route: r.route, brand_errors: r.brand_errors })),
  missing_phone_links: results.filter((r) => r.ok && (!r.phone_links || r.phone_links.length === 0)).map((r) => ({ viewport: r.viewport, route: r.route })),
  missing_whatsapp_links: results.filter((r) => r.ok && (!r.whatsapp_links || r.whatsapp_links.length === 0)).map((r) => ({ viewport: r.viewport, route: r.route })),
  missing_messenger_links: results.filter((r) => r.ok && (!r.messenger_links || r.messenger_links.length === 0)).map((r) => ({ viewport: r.viewport, route: r.route })),
};

await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ summary, results }, null, 2));
const md = [
  `# OpenClaw Virtual Browser Audit — ${new Date().toISOString()}`,
  '',
  `Target: ${target}`,
  '',
  '## Summary',
  '',
  '```json',
  JSON.stringify(summary, null, 2),
  '```',
  '',
  '## Results',
  '',
  '| viewport | route | status | ok | ms | phone | whatsapp | messenger | bad claims | brand errors | screenshot |',
  '|---|---|---:|---:|---:|---:|---:|---:|---|---|---|',
  ...results.map((r) => `| ${r.viewport} | ${r.route} | ${r.status || ''} | ${r.ok ? 'yes' : 'no'} | ${r.ms || ''} | ${r.phone_links?.length || 0} | ${r.whatsapp_links?.length || 0} | ${r.messenger_links?.length || 0} | ${(r.bad_claims || []).join(', ')} | ${(r.brand_errors || []).join(', ')} | ${r.screenshot || ''} |`),
  '',
  '## Risks and control',
  '',
  '- This is a GitHub-hosted virtual browser audit, not the Dell OpenClaw local runtime.',
  '- It must not send real customer messages, post to social networks, or submit real forms.',
  '- It collects screenshots and DOM-derived evidence only.',
].join('\n');
await fs.writeFile(path.join(outDir, 'report.md'), md);
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
