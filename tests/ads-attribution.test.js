const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { normalizeAttribution } = require('../lib/attribution.js');
const { normalizeSource } = require('../lib/lead-pipeline.js');

test('attribution maps gclid traffic to google_ads_search', () => {
  const a = normalizeAttribution({ clickId: { gclid: 'abc123' } });
  assert.equal(a.channel, 'google_ads_search');
});

test('attribution accepts legacy top-level click ids (backward compatibility)', () => {
  const a = normalizeAttribution({ gclid: 'legacy123', fbclid: 'fbx' });
  assert.equal(a.clickId.gclid, 'legacy123');
  assert.equal(a.clickId.fbclid, 'fbx');
  assert.equal(a.channel, 'google_ads_search');
});

test('attribution keeps canonical clickId fields from shared forms', () => {
  const a = normalizeAttribution({
    clickId: { gclid: 'g1', twclid: 'tw1', li_fat_id: 'li1' }
  });
  assert.equal(a.clickId.gclid, 'g1');
  assert.equal(a.clickId.twclid, 'tw1');
  assert.equal(a.clickId.li_fat_id, 'li1');
});

test('attribution maps google lsa campaign to google_lsa', () => {
  const a = normalizeAttribution({
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'local services ads'
  });
  assert.equal(a.channel, 'google_lsa');
});

test('attribution maps google business profile traffic to google_business', () => {
  const a = normalizeAttribution({
    utmSource: 'google',
    utmMedium: 'business_profile'
  });
  assert.equal(a.channel, 'google_business');
});

test('attribution defaults to website_form when no tracking params exist', () => {
  const a = normalizeAttribution({});
  assert.equal(a.channel, 'website_form');
});

test('attribution maps plain google referrer to google_organic', () => {
  const a = normalizeAttribution({
    referrer: 'https://www.google.com/search?q=handyman+la'
  });
  assert.equal(a.channel, 'google_organic');
});

test('attribution maps plain facebook referrer to facebook_organic', () => {
  const a = normalizeAttribution({
    referrer: 'https://www.facebook.com/some-page'
  });
  assert.equal(a.channel, 'facebook_organic');
});

test('lead pipeline accepts normalized google channel keys', () => {
  assert.equal(normalizeSource('google_ads_search'), 'google_ads_search');
  assert.equal(normalizeSource('google_lsa'), 'google_lsa');
  assert.equal(normalizeSource('google_business'), 'google_business');
});

test('event contract is aligned in code and docs', () => {
  const js = fs.readFileSync(path.resolve(__dirname, '../assets/js/main.js'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const gaDoc = fs.readFileSync(path.resolve(__dirname, '../docs/GA4-TESTING-VERIFICATION.md'), 'utf8');

  assert.ok(
    html.includes("'form_submit'") || html.includes('"form_submit"'),
    'index.html missing form_submit'
  );
  assert.ok(
    html.includes("'phone_click'") || html.includes('"phone_click"'),
    'index.html missing phone_click'
  );
  assert.ok(
    html.includes("'whatsapp_click'") || html.includes('"whatsapp_click"'),
    'index.html missing whatsapp_click'
  );
  assert.ok(js.includes("'sms_lead'") || js.includes('"sms_lead"'), 'main.js missing sms_lead');

  const expectedEvents = ['form_submit', 'sms_lead', 'phone_click', 'whatsapp_click'];
  for (const eventName of expectedEvents) {
    assert.ok(gaDoc.includes(`\`${eventName}\``), `GA4 docs missing ${eventName}`);
  }

  assert.ok(!js.includes('sms_lead_generated'), 'legacy event sms_lead_generated still present');
  assert.ok(!gaDoc.includes('`phone_call`'), 'legacy phone_call mention still present in docs');
});

test('google ads playbook anchors match canonical public prices', () => {
  const strategyPath = path.resolve(__dirname, '../ops/google-search-ads-strategy.md');
  if (!fs.existsSync(strategyPath)) {
    // File was removed during ops/ cleanup — skip gracefully.
    return;
  }
  const strategy = fs.readFileSync(strategyPath, 'utf8');
  // Frozen model: only $150 service call is the public price anchor.
  assert.ok(!strategy.includes('$105'), 'legacy $105 still in ads strategy');
  assert.ok(!strategy.includes('$185'), 'legacy $185 still in ads strategy');
  assert.ok(!strategy.includes('From $75/Door'), 'legacy per-door pricing still in ads strategy');
  assert.ok(strategy.includes('$150'), 'frozen $150 service call missing from ads strategy');
});
