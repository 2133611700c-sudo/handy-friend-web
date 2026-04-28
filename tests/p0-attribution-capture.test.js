/**
 * P0 regression: Google Ads attribution must persist end-to-end.
 *
 * Bug history: api/submit-lead.js previously read `normalizedAttribution.gclid`
 * which is always undefined because normalizeAttribution() returns gclid inside
 * `clickId.gclid`. Result: 0 conversions in Ads despite gclid arriving on the
 * landing page. This test locks the contract.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { normalizeAttribution, classifyAttributionChannel } = require('../lib/attribution.js');

test('normalizeAttribution exposes gclid via clickId.gclid (not top-level)', () => {
  const a = normalizeAttribution({ clickId: { gclid: 'TEST_GCLID_001', gbraid: 'TEST_GBRAID_001' } });
  assert.equal(a.clickId.gclid, 'TEST_GCLID_001');
  assert.equal(a.clickId.gbraid, 'TEST_GBRAID_001');
  assert.equal(a.gclid, undefined, 'normalizeAttribution must NOT put gclid at top-level — submit-lead must read clickId.gclid');
});

test('classifyAttributionChannel returns google_ads_search when gclid present', () => {
  const a = normalizeAttribution({
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'la-search-core-services',
    clickId: { gclid: 'P0_TEST_GCLID' }
  });
  assert.equal(a.channel, 'google_ads_search');
  assert.equal(classifyAttributionChannel(a), 'google_ads_search');
});

test('submit-lead.js envelope.attribution wires gclid/gbraid/wbraid from clickId', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../api/submit-lead.js'), 'utf8');
  // Guard against regression to broken `normalizedAttribution.gclid`
  assert.ok(
    src.includes('normalizedAttribution.clickId?.gclid'),
    'submit-lead.js must read gclid from normalizedAttribution.clickId.gclid'
  );
  assert.ok(
    src.includes('normalizedAttribution.clickId?.gbraid'),
    'submit-lead.js must read gbraid from clickId'
  );
  assert.ok(
    src.includes('normalizedAttribution.clickId?.wbraid'),
    'submit-lead.js must read wbraid from clickId'
  );
  assert.ok(
    src.includes('landing_page:'),
    'submit-lead.js envelope must include landing_page'
  );
  // The previous-bug pattern: `gclid: normalizedAttribution.gclid,` — must be gone.
  assert.ok(
    !/gclid:\s*normalizedAttribution\.gclid\b/.test(src),
    'legacy broken `gclid: normalizedAttribution.gclid` pattern still present'
  );
});

test('lead-pipeline persists gclid/gbraid/wbraid/utm_content/utm_term/landing_page', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../lib/lead-pipeline.js'), 'utf8');
  assert.ok(src.includes('insertPayload.gbraid'),       'lead-pipeline must persist gbraid');
  assert.ok(src.includes('insertPayload.wbraid'),       'lead-pipeline must persist wbraid');
  assert.ok(src.includes('insertPayload.utm_content'),  'lead-pipeline must persist utm_content');
  assert.ok(src.includes('insertPayload.utm_term'),     'lead-pipeline must persist utm_term');
  assert.ok(src.includes('insertPayload.landing_page'), 'lead-pipeline must persist landing_page');
  assert.ok(src.includes('insertPayload.lead_type'),    'lead-pipeline must persist lead_type');
  // Schema-fallback whitelist must include new optional columns.
  assert.ok(/'gbraid',?\s*'wbraid'/.test(src),     'OPTIONAL_LEAD_COLUMNS must include gbraid+wbraid');
  assert.ok(src.includes("'landing_page'"),        'OPTIONAL_LEAD_COLUMNS must include landing_page');
});

test('migration 039 adds attribution columns idempotently', () => {
  const file = path.resolve(__dirname, '../supabase/migrations/20260428220000_039_p0_attribution_columns.sql');
  assert.ok(fs.existsSync(file), 'migration 039_p0_attribution_columns.sql must exist');
  const sql = fs.readFileSync(file, 'utf8');
  for (const col of ['gbraid', 'wbraid', 'utm_content', 'utm_term', 'landing_page', 'lead_type']) {
    assert.ok(
      new RegExp(`ADD COLUMN IF NOT EXISTS\\s+${col}\\b`, 'i').test(sql),
      `migration must ADD COLUMN IF NOT EXISTS ${col}`
    );
  }
  assert.ok(/CREATE INDEX IF NOT EXISTS leads_gclid_idx/i.test(sql),  'migration must index gclid');
  assert.ok(/CREATE INDEX IF NOT EXISTS leads_gbraid_idx/i.test(sql), 'migration must index gbraid');
});

test('whatsapp_click fires Google Ads conversion in index.html and shared.js', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const shared = fs.readFileSync(path.resolve(__dirname, '../assets/js/shared.js'), 'utf8');
  // index.html: whatsapp branch must include the gtag conversion fire with /whatsapp_lead
  const htmlWa = html.indexOf("'whatsapp_click'") > -1 && html.indexOf("'/whatsapp_lead'") > -1;
  assert.ok(htmlWa || /whatsapp_lead/.test(html), 'index.html must fire Ads conversion on whatsapp_click');
  assert.ok(/whatsapp_lead/.test(shared), 'shared.js must fire Ads conversion on whatsapp_click');
});

test('submit-lead envelope.source uses classified channel (not hardcoded "website")', () => {
  // Regression for P0 Tail 1: prior to fix, leads with gclid landed with source='other'
  // because envelope.source was hardcoded 'website' (downgraded to 'other' by normalizeSource).
  const src = fs.readFileSync(path.resolve(__dirname, '../api/submit-lead.js'), 'utf8');
  assert.ok(
    /createEnvelope\(\{[\s\S]*?source:\s*classifiedSource/m.test(src),
    'submit-lead.js createEnvelope must pass classified channel as source, not hardcoded "website"'
  );
  assert.ok(
    !/createEnvelope\(\{[\s\S]{0,200}source:\s*['"]website['"]\s*,/m.test(src),
    'legacy hardcoded `source: "website"` must not appear in createEnvelope call'
  );
  assert.ok(
    src.includes('source_details:    leadData.sourceDetails'),
    'submit-lead.js must propagate source_details into envelope.attribution'
  );
  assert.ok(
    src.includes('attribution_source: classifiedSource'),
    'submit-lead.js must propagate attribution_source into envelope.attribution'
  );
});

test('lead-pipeline processInbound forwards source_details + attribution_source from envelope', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../lib/lead-pipeline.js'), 'utf8');
  assert.ok(
    /attribution_source:\s*envelope\.attribution\?\.attribution_source/.test(src),
    'processInbound must read attribution_source from envelope.attribution.attribution_source'
  );
  assert.ok(
    /source_details:\s*envelope\.attribution\?\.source_details/.test(src),
    'processInbound must forward envelope.attribution.source_details into createOrMergeLead'
  );
});

test('postCtaEvent payload includes gclid/utm/landing_page in metadata', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const shared = fs.readFileSync(path.resolve(__dirname, '../assets/js/shared.js'), 'utf8');
  for (const fragment of ['buildAttrMeta', "pick('gclid')", "pick('utm_source')"]) {
    assert.ok(html.includes(fragment),   `index.html missing ${fragment}`);
    assert.ok(shared.includes(fragment), `shared.js missing ${fragment}`);
  }
});
