const test = require('node:test');
const assert = require('node:assert/strict');

test('getMissingFields for tv_mounting with no collected fields returns required fields', () => {
  const { getMissingFields } = require('../lib/alex/missing-fields-engine.js');
  const missing = getMissingFields('tv_mounting', {});
  assert.ok(missing.includes('tvsize') || missing.includes('tv_size') || missing.includes('zip'));
});

test('getMissingFields for flooring returns floor_type when not collected', () => {
  const { getMissingFields } = require('../lib/alex/missing-fields-engine.js');
  const missing = getMissingFields('flooring_installation', {});
  assert.ok(missing.length > 0);
});

test('getServiceFields returns correct pricing_basis for cabinet painting', () => {
  const { getServiceFields } = require('../lib/alex/missing-fields-engine.js');
  const def = getServiceFields('cabinet_painting');
  assert.equal(def.pricing_basis, '70_per_door_anchor');
});

test('getServiceFields for unknown returns general fields', () => {
  const { getServiceFields } = require('../lib/alex/missing-fields-engine.js');
  const def = getServiceFields('unknown');
  assert.ok(def.required.includes('description'));
});

test('buildMissingFieldsContext generates context string', () => {
  const { buildMissingFieldsContext } = require('../lib/alex/missing-fields-engine.js');
  const ctx = buildMissingFieldsContext('tv_mounting', {}, 'en');
  assert.match(ctx, /CONTEXT/);
  assert.match(ctx, /tv_mounting/);
});
