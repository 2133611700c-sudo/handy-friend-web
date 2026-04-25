const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  PRICING_SOURCE_VERSION,
  SERVICE_CATEGORY,
  getCanonicalPriceMatrix,
  getService,
  getServiceCategory,
  listServicesByCategory,
  getServiceCall,
  getMaterialsPolicy,
  getProjectEstimates,
  getAlexPricingCatalogLines,
  getMessengerPostbackTexts,
  getPricingSourceVersion
} = require('../lib/price-registry.js');
const { getGuardMode, GUARD_MODES } = require('../lib/alex-one-truth.js');
const { buildSystemPrompt } = require('../lib/alex-one-truth.js');
const { analyzeMessengerPricingPolicy } = require('../lib/pricing-policy.js');
const {
  inferServiceType,
  appendCrossSellNudge,
  stripDollarAmounts
} = require('../lib/alex-policy-engine.js');

// ---------------------------------------------------------------------------
// Frozen public model — Service Call $150, 2h included, $75/hr after.
// ---------------------------------------------------------------------------

test('service call constants are frozen at public model', () => {
  const sc = getServiceCall();
  assert.equal(sc.price, 150);
  assert.equal(sc.included_hours, 2);
  assert.equal(sc.hourly_after, 75);
  assert.equal(sc.currency, 'USD');
});

test('materials policy is the canonical written-before-work phrase', () => {
  const policy = getMaterialsPolicy();
  assert.match(policy, /extra only when stated in writing before work starts/i);
});

test('project estimate exposes paint and flooring at $3/sf labor only', () => {
  const pe = getProjectEstimates();
  assert.equal(pe.interior_painting.labor_per_sf, 3.0);
  assert.equal(pe.flooring.labor_per_sf, 3.0);
});

test('pricing source version is set for one-price-150 refactor', () => {
  assert.match(getPricingSourceVersion(), /one-price/);
  assert.equal(PRICING_SOURCE_VERSION, getPricingSourceVersion());
});

// ---------------------------------------------------------------------------
// Canonical matrix — numbers for service-call + project-estimate,
// null for quote-only (forces "Quote after photos" copy downstream).
// ---------------------------------------------------------------------------

test('price matrix reflects one-price-150 public model', () => {
  const m = getCanonicalPriceMatrix();

  // Service call — all $150
  assert.equal(m.tv_mounting, 150);
  assert.equal(m.furniture_assembly, 150);
  assert.equal(m.art_mirrors, 150);
  assert.equal(m.plumbing, 150);
  assert.equal(m.electrical, 150);
  assert.equal(m.drywall, 150);
  assert.equal(m.door_minor, 150);

  // Project estimate — $3/sf labor
  assert.equal(m.interior_painting, 3.0);
  assert.equal(m.flooring, 3.0);

  // Quote-only — null, no public price
  assert.equal(m.door_installation, null);
  assert.equal(m.vanity_installation, null);
  assert.equal(m.backsplash, null);
  assert.equal(m.kitchen_cabinet_painting, null);
  assert.equal(m.furniture_painting, null);
});

test('service categories partition correctly', () => {
  const serviceCall = listServicesByCategory(SERVICE_CATEGORY.SERVICE_CALL);
  const quoteOnly = listServicesByCategory(SERVICE_CATEGORY.QUOTE_ONLY);
  const project = listServicesByCategory(SERVICE_CATEGORY.PROJECT_ESTIMATE);

  assert.equal(serviceCall.length, 7);
  assert.equal(quoteOnly.length, 5);
  assert.equal(project.length, 2);

  for (const id of serviceCall) {
    assert.equal(getServiceCategory(id), SERVICE_CATEGORY.SERVICE_CALL);
  }
  for (const id of quoteOnly) {
    assert.equal(getServiceCategory(id), SERVICE_CATEGORY.QUOTE_ONLY);
  }
});

// ---------------------------------------------------------------------------
// Alex pricing catalog — only 150, 75, and 3 are allowed dollar tokens.
// No legacy service-specific prices may leak into the LLM prompt.
// ---------------------------------------------------------------------------

test('Alex catalog only contains allowed dollar tokens (150, 75, 3.00)', () => {
  const joined = getAlexPricingCatalogLines().join('\n');
  const tokens = [...joined.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const allowed = new Set([150, 75, 3, 3.0]);
  const leaked = tokens.filter((n) => !allowed.has(n));
  assert.deepEqual(leaked, [], `Alex catalog leaked legacy price tokens: ${leaked.join(', ')}`);
});

test('Alex catalog asserts core model phrases', () => {
  const joined = getAlexPricingCatalogLines().join('\n');
  assert.match(joined, /Service Call: \$150/);
  assert.match(joined, /up to 2 hours/i);
  assert.match(joined, /\$75\/hour/);
  assert.match(joined, /approved in writing/i);
  assert.match(joined, /materials.*in writing before work starts/i);
  assert.match(joined, /Quote after photos/i);
});

test('Alex catalog bans legacy service-specific anchors', () => {
  const joined = getAlexPricingCatalogLines().join('\n');
  assert.doesNotMatch(joined, /\$105\b/);
  assert.doesNotMatch(joined, /\$185\b/);
  assert.doesNotMatch(joined, /\$120\b/);
  assert.doesNotMatch(joined, /\$140\b/);
  assert.doesNotMatch(joined, /\$195\b/);
  assert.doesNotMatch(joined, /\$280\b/);
  assert.doesNotMatch(joined, /\$60\b/);
  assert.doesNotMatch(joined, /\$40\b/);
  assert.doesNotMatch(joined, /\$200\b/);
  assert.doesNotMatch(joined, /\$275\b/);
  assert.doesNotMatch(joined, /\$295\b/);
  assert.doesNotMatch(joined, /\$95\b/);
  assert.doesNotMatch(joined, /\$115\b/);
  assert.doesNotMatch(joined, /\$165\b/);
});

// ---------------------------------------------------------------------------
// Messenger postbacks — phone-gated, zero dollar amounts.
// ---------------------------------------------------------------------------

test('messenger postbacks are phone-gated and do not leak any prices', () => {
  const text = Object.values(getMessengerPostbackTexts()).join('\n');
  assert.match(text, /phone/i);
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

// ---------------------------------------------------------------------------
// Interior painting project keys stay stable for /pricing hydration.
// (Will be revisited in Phase 2 when /pricing is rewritten.)
// ---------------------------------------------------------------------------

test('canonical interior trim keys are explicit and stable', () => {
  const interior = getService('interior_painting')?.base_prices || {};
  assert.equal(interior.crown_ornate, 3.75);
  assert.equal(interior.door_casing_side, 30);
});

test('guard mode is contact-based (phone OR email)', () => {
  assert.equal(getGuardMode({ hasContact: false, hasPhone: true }), GUARD_MODES.PRE_CONTACT_RANGE);
  assert.equal(getGuardMode({ hasContact: true, hasPhone: false }), GUARD_MODES.POST_CONTACT_EXACT);
});

// ---------------------------------------------------------------------------
// Browser registry generation — deterministic, numeric-only, no combos.
// ---------------------------------------------------------------------------

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

test('browser registry contains frozen model and no legacy numbers', () => {
  const registryPath = path.resolve(__dirname, '../assets/js/price-registry.browser.js');
  const src = fs.readFileSync(registryPath, 'utf8');
  assert.match(src, /"price":\s*150/);
  assert.match(src, /"included_hours":\s*2/);
  assert.match(src, /"hourly_after":\s*75/);
  assert.match(src, /"labor_per_sf":\s*3/);
  assert.match(src, /"service_call":\s*\[/);
  assert.match(src, /"quote_only":\s*\[/);
  assert.match(src, /"project_estimate":\s*\[/);

  // Legacy numbers must not appear anywhere in the generated bundle.
  assert.doesNotMatch(src, /"standard":\s*105\b/);
  assert.doesNotMatch(src, /"hidden_wire":/);
  assert.doesNotMatch(src, /"bed_frame":/);
  assert.doesNotMatch(src, /"dresser":\s*200/);
  assert.doesNotMatch(src, /"small_patch":\s*120/);
  assert.doesNotMatch(src, /"faucet":\s*115/);
  assert.doesNotMatch(src, /"light_fixture":\s*95/);
  assert.doesNotMatch(src, /"combos"/);
  assert.doesNotMatch(src, /"Save \$/);
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

// ---------------------------------------------------------------------------
// Public-file denylist — legacy prices must not appear in customer-facing code.
// These tests catch regressions in main.js, index.html, and the Alex files.
// ---------------------------------------------------------------------------

const PUBLIC_FILES = {
  'assets/js/main.js':        path.resolve(__dirname, '../assets/js/main.js'),
  'index.html':               path.resolve(__dirname, '../index.html'),
  'lib/alex-one-truth.js':    path.resolve(__dirname, '../lib/alex-one-truth.js'),
  'lib/alex-policy-engine.js':path.resolve(__dirname, '../lib/alex-policy-engine.js'),
  'api/ai-intake.js':         path.resolve(__dirname, '../api/ai-intake.js'),
  'api/alex-webhook.js':      path.resolve(__dirname, '../api/alex-webhook.js'),
  'api/telegram-webhook.js':  path.resolve(__dirname, '../api/telegram-webhook.js'),
  'api/health.js':            path.resolve(__dirname, '../api/health.js'),
  'lib/ai-fallback.js':       path.resolve(__dirname, '../lib/ai-fallback.js'),
};

// Tokens that must never appear in any customer-facing file.
// Exact word-boundary match (\b) prevents false positives like $1500 or $750.
const DENYLIST_PATTERNS = [
  { label: '$105',  re: /\$105\b/ },
  { label: '$95',   re: /\$95\b/ },
  { label: '$115',  re: /\$115\b/ },
  { label: '$120',  re: /\$120\b/ },
  { label: '$140',  re: /\$140\b/ },
  { label: '$165',  re: /\$165\b/ },
  { label: '$185',  re: /\$185\b/ },
  { label: '$200',  re: /\$200\b/ },
  { label: '$275',  re: /\$275\b/ },
  { label: '$195',  re: /\$195\b/ },
  { label: '$280',  re: /\$280\b/ },
  { label: '$295',  re: /\$295\b/ },
  { label: '$60 (legacy service price)', re: /\$60\b/ },
  { label: '$65 (legacy door price)',    re: /\$65\b/ },
  { label: '$70/door',  re: /\$70\/door/ },
  { label: '$75/door',  re: /\$75\/door/ },
  { label: '$40/door',  re: /\$40\/door/ },
  { label: '$7.25',     re: /\$7\.25/ },
  { label: 'Starts-at', re: /Starts-at/i },
  { label: 'service minimum', re: /service minimum/i },
  { label: 'minimum service call', re: /minimum service call/i },
  { label: 'service call starts', re: /service call starts/i },
  { label: 'from $<digit> (starts-at framing)', re: /from \$[0-9]/i },
  { label: 'schema price 120', re: /"price"\s*:\s*"120"/ },
  { label: 'schema minPrice 120', re: /"minPrice"\s*:\s*"120"/ },
  { label: 'schema price 140', re: /"price"\s*:\s*"140"/ },
  { label: 'schema minPrice 140', re: /"minPrice"\s*:\s*"140"/ },
  { label: 'schema price 195', re: /"price"\s*:\s*"195"/ },
  { label: 'schema minPrice 195', re: /"minPrice"\s*:\s*"195"/ },
  { label: 'schema price 20 for quote-only tile', re: /"price"\s*:\s*"20"/ },
  { label: 'cabinet base old price', re: /cabinets\s*:\s*"\$75"/ },
  { label: 'furniture painting base old price', re: /furnpaint\s*:\s*"\$40"/ },
  { label: '$2.50/lf (home-page surface)', re: /\$2\.50\/lf/ },
  { label: '$2.00/lf (home-page surface)', re: /\$2\.00\/lf/ },
  { label: '$30/side',  re: /\$30\/side/ },
  { label: '$30/door',  re: /\$30\/door/ },
  { label: '$30/piece', re: /\$30\/piece/ },
  { label: 'show price ranges', re: /show price ranges/i },
  { label: 'published range', re: /published range/i },
  { label: 'exact line-item estimates', re: /exact line-item estimates/i },
  { label: 'per-unit prices', re: /per-unit prices/i },
  { label: 'cabinet materials included', re: /cabinet painting[^.\n]*(premium paint|primer|degreasing|prep)[^.\n]*included/i },
  { label: 'customer provides tools', re: /you(?:'d)? provide (?:the )?tools/i },
];

// Phrases that must remain present in customer-facing surfaces.
const REQUIRED_PATTERNS = [
  { label: 'Service Call $150 copy exists', re: /\$150/ },
];
const REQUIRED_PRICING_MODEL_FILES = new Set([
  'assets/js/main.js',
  'index.html',
  'lib/alex-one-truth.js',
  'lib/alex-policy-engine.js',
  'api/ai-intake.js',
  'api/telegram-webhook.js',
  'api/health.js',
  'lib/ai-fallback.js',
]);

for (const [fileName, filePath] of Object.entries(PUBLIC_FILES)) {
  const src = fs.readFileSync(filePath, 'utf8');

  for (const { label, re } of DENYLIST_PATTERNS) {
    test(`public-file denylist [${fileName}]: no "${label}"`, () => {
      assert.doesNotMatch(src, re,
        `LEAK: "${label}" found in ${fileName} — remove before shipping`);
    });
  }

  if (REQUIRED_PRICING_MODEL_FILES.has(fileName)) {
    for (const { label, re } of REQUIRED_PATTERNS) {
      test(`public-file required [${fileName}]: "${label}"`, () => {
        assert.match(src, re,
          `MISSING: "${label}" not found in ${fileName}`);
      });
    }
  }
}

// ─── Extended denylist: blog/, la-neighborhoods/, gallery ────────────────────

const EXTENDED_DIRS = [
  path.resolve(__dirname, '../api'),
  path.resolve(__dirname, '../blog'),
  path.resolve(__dirname, '../gallery'),
  path.resolve(__dirname, '../la-neighborhoods'),
  path.resolve(__dirname, '../pricing'),
  path.resolve(__dirname, '../services'),
  path.resolve(__dirname, '../tv-mounting'),
  path.resolve(__dirname, '../drywall'),
  path.resolve(__dirname, '../furniture-assembly'),
  path.resolve(__dirname, '../art-hanging'),
  path.resolve(__dirname, '../plumbing'),
  path.resolve(__dirname, '../electrical'),
  path.resolve(__dirname, '../door-installation'),
  path.resolve(__dirname, '../interior-painting'),
  path.resolve(__dirname, '../flooring'),
  path.resolve(__dirname, '../cabinet-painting'),
  path.resolve(__dirname, '../furniture-painting'),
  path.resolve(__dirname, '../vanity-installation'),
  path.resolve(__dirname, '../backsplash'),
  path.resolve(__dirname, '../book'),
];
const GALLERY_FILE = path.resolve(__dirname, '../assets/images/marketing/2026-03-30/gallery.html');
const TERMS_FILE = path.resolve(__dirname, '../terms.html');

const extendedFiles = [];
for (const dir of EXTENDED_DIRS) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.html') || f.endsWith('.js')) extendedFiles.push([`${path.basename(dir)}/${f}`, path.join(dir, f)]);
    }
  }
}
if (fs.existsSync(GALLERY_FILE)) {
  extendedFiles.push(['assets/images/marketing/2026-03-30/gallery.html', GALLERY_FILE]);
}
if (fs.existsSync(TERMS_FILE)) {
  extendedFiles.push(['terms.html', TERMS_FILE]);
}

// Active marketing scripts (public-facing Nextdoor posts)
const NEXTDOOR_SCRIPTS = [
  'post_nextdoor_all.js',
  'post_nextdoor_cdp.js',
];
for (const f of NEXTDOOR_SCRIPTS) {
  const p = path.resolve(__dirname, '..', f);
  if (fs.existsSync(p)) extendedFiles.push([f, p]);
}

for (const [fileName, filePath] of extendedFiles) {
  const src = fs.readFileSync(filePath, 'utf8');
  for (const { label, re } of DENYLIST_PATTERNS) {
    test(`extended denylist [${fileName}]: no "${label}"`, () => {
      assert.doesNotMatch(src, re,
        `LEAK: "${label}" found in ${fileName} — remove before shipping`);
    });
  }
}

test('pricing page exposes crawlable one-price model before React renders', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../pricing/index.html'), 'utf8');
  assert.match(src, /Service Call \$150/i);
  assert.match(src, /includes up to 2 hours/i);
  assert.match(src, /\$75\/hour/i);
  assert.match(src, /materials, parking, disposal/i);
});

test('blog and neighborhood landing pages include Google tracking bootstrap', () => {
  const dirs = ['blog', 'la-neighborhoods'];
  for (const dir of dirs) {
    const absDir = path.resolve(__dirname, '..', dir);
    for (const file of fs.readdirSync(absDir)) {
      if (!file.endsWith('.html')) continue;
      const filePath = path.join(absDir, file);
      const src = fs.readFileSync(filePath, 'utf8');
      assert.match(src, /G-Z05XJ8E281|\/assets\/js\/shared\.js/,
        `MISSING: Google tracking bootstrap not found in ${dir}/${file}`);
    }
  }
});

test('Alex full system prompt contains no legacy pricing instructions', () => {
  const prompt = buildSystemPrompt({ guardMode: GUARD_MODES.PRE_CONTACT_RANGE });
  assert.match(prompt, /Service Call: \$150/i);
  assert.match(prompt, /up to 2 hours/i);
  assert.match(prompt, /\$75\/hour/i);
  assert.match(prompt, /Quote after photos/i);
  for (const { label, re } of DENYLIST_PATTERNS) {
    assert.doesNotMatch(prompt, re, `LEAK: "${label}" found in Alex system prompt`);
  }
});

test('AI intake prompt source covers all languages with frozen pricing', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../api/ai-intake.js'), 'utf8');
  assert.match(src, /buildPricingSafeSystemMessage/);
  assert.match(src, /Service Call \$150/);
  assert.match(src, /\$75\/hour/);
  assert.match(src, /\$3\/sf labor estimate/);
  assert.match(src, /Never quote old prices/);
});

test('AI chat enforces quote-only pricing guardrails server-side', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../api/ai-chat.js'), 'utf8');
  assert.match(src, /function isQuoteOnlyPricingIntent/);
  assert.match(src, /function buildQuoteOnlyPricingReply/);
  assert.match(src, /function enforceCanonicalPricingPhrases/);
  assert.match(src, /hidden-wire TV mounting/);
  assert.match(src, /vanity installation/);
  assert.match(src, /cabinet painting/);
  assert.match(src, /bathroom vanity/);
  assert.match(src, /tile backsplash/);
  assert.match(src, /door installation/);
  assert.match(src, /Quote after photos|quote after photos/);
  assert.match(src, /Additional time is \$75\/hour after the included 2 hours/);
  assert.match(src, /\$3\/sf labor estimate/);
  assert.doesNotMatch(src, /premium paint, primer, degreasing, and prep are included/i);
});

test('AI chat strips customer-provides-tools wording', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../api/ai-chat.js'), 'utf8');
  assert.match(src, /function enforceToolPolicy/);
  assert.match(src, /we bring our tools/);
});
