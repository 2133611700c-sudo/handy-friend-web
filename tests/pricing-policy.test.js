const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  getCanonicalPriceMatrix,
  getService,
  getMessengerPostbackTexts,
  getPricingSourceVersion
} = require('../lib/price-registry.js');
const { analyzeMessengerPricingPolicy } = require('../lib/pricing-policy.js');
const {
  inferServiceType,
  appendCrossSellNudge,
  stripDollarAmounts
} = require('../lib/alex-policy-engine.js');

test('price matrix matches canonical 9-service baseline', () => {
  const matrix = getCanonicalPriceMatrix();
  assert.equal(matrix.tv_mounting, 105);
  assert.equal(matrix.furniture_assembly, 75);
  assert.equal(matrix.art_mirrors, 95);
  assert.equal(matrix.interior_painting, 3.0);
  assert.equal(matrix.flooring, 3.0);
  assert.equal(matrix.kitchen_cabinet_painting, 75);
  assert.equal(matrix.furniture_painting, 40);
  assert.equal(matrix.plumbing, 115);
  assert.equal(matrix.electrical, 95);
  assert.match(getPricingSourceVersion(), /^20\d{2}\./);
});

test('messenger postbacks are phone-gated and do not leak stale prices', () => {
  const text = Object.values(getMessengerPostbackTexts()).join('\n');
  assert.match(text, /phone/i);
  assert.doesNotMatch(text, /\$60|\$30/);
  assert.doesNotMatch(text, /\$\s*\d/);
});

test('pre-phone scrubber removes dollar amounts', () => {
  const scrubbed = stripDollarAmounts('Price is $115 and maybe $95-$185 today.');
  assert.doesNotMatch(scrubbed, /\$\s*\d/);
});

test('cross-sell is blocked for plumbing and electrical', () => {
  const plumbing = appendCrossSellNudge({
    reply: 'Plumbing service confirmed.',
    lang: 'en',
    serviceId: 'plumbing'
  });
  assert.equal(plumbing, 'Plumbing service confirmed.');

  const electrical = appendCrossSellNudge({
    reply: 'Electrical service confirmed.',
    lang: 'en',
    serviceId: 'electrical'
  });
  assert.equal(electrical, 'Electrical service confirmed.');
});

test('multilingual inference resolves core services', () => {
  assert.equal(inferServiceType('кухня 8 фасадов').serviceId, 'kitchen_cabinet_painting');
  assert.equal(inferServiceType('montaje tv en pared').serviceId, 'tv_mounting');
  assert.equal(inferServiceType('збирання меблів ikea').serviceId, 'furniture_assembly');
  assert.equal(inferServiceType('pintura interior 500 sf').serviceId, 'interior_painting');
});

test('pricing page avoids prohibited trust claims', () => {
  const pricingPath = path.resolve(__dirname, '../pricing/index.html');
  const html = fs.readFileSync(pricingPath, 'utf8');
  assert.doesNotMatch(html, /Fully licensed & insured/i);
  assert.doesNotMatch(html, /4\.9\s*·\s*500\+\s*(clients|clientes|клиентов|клієнтів)/i);
});

test('index JSON-LD pricing aligns with canonical plumbing/electrical values', () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /"name":"Plumbing"},"priceSpecification":\{"@type":"PriceSpecification","price":"115","priceCurrency":"USD","minPrice":"115"/);
  assert.match(html, /"name":"Electrical"},"priceSpecification":\{"@type":"PriceSpecification","price":"95","priceCurrency":"USD","minPrice":"95"/);
  assert.doesNotMatch(html, /"name":"Plumbing"},"priceSpecification":\{"@type":"PriceSpecification","price":"60"/);
  assert.doesNotMatch(html, /"name":"Electrical"},"priceSpecification":\{"@type":"PriceSpecification","price":"30"/);
});

test('canonical interior trim keys are explicit and stable', () => {
  const interior = getService('interior_painting')?.base_prices || {};
  assert.equal(interior.crown_ornate, 3.75);
  assert.equal(interior.door_casing_side, 30);
});

test('pricing hydration uses canonical trim keys (no formula mapping)', () => {
  const pricingPath = path.resolve(__dirname, '../pricing/index.html');
  const html = fs.readFileSync(pricingPath, 'utf8');
  assert.match(html, /d\.interior_painting\.crown_ornate/);
  assert.match(html, /d\.interior_painting\.door_casing_side/);
  assert.doesNotMatch(html, /door_slab\s*-\s*35/);
});

test('browser registry generation is deterministic', () => {
  const root = path.resolve(__dirname, '..');
  const registryPath = path.resolve(root, 'assets/js/price-registry.browser.js');
  execFileSync('node', ['scripts/build-browser-price-registry.mjs'], { cwd: root, stdio: 'pipe' });
  const first = fs.readFileSync(registryPath, 'utf8');
  execFileSync('node', ['scripts/build-browser-price-registry.mjs'], { cwd: root, stdio: 'pipe' });
  const second = fs.readFileSync(registryPath, 'utf8');
  assert.equal(first, second);
  assert.doesNotMatch(first, /generated_at/i);
});

test('messenger policy: gated passes, legacy pricing fails', () => {
  const matrix = getCanonicalPriceMatrix();
  const pass = analyzeMessengerPricingPolicy(getMessengerPostbackTexts(), matrix);
  assert.equal(pass.ok, true);
  assert.equal(pass.status, 'PASS_GATED');

  const fail = analyzeMessengerPricingPolicy({
    MENU_SERVICES: 'TV from $105, plumbing from $60, electrical from $30'
  }, matrix);
  assert.equal(fail.ok, false);
  assert.equal(fail.reason, 'legacy_price_leak');
});
