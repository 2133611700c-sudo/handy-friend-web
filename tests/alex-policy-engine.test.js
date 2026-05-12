const test = require('node:test');
const assert = require('node:assert/strict');

const {
  detectPhone,
  inferServiceType,
  isStandaloneService,
  appendCrossSellNudge,
  stripDollarAmounts,
  hasCrossSellNudge
} = require('../lib/alex-policy-engine.js');

test('detectPhone recognizes common US phone formats', () => {
  assert.equal(detectPhone('(213) 361-1700'), true);
  assert.equal(detectPhone('213-361-1700'), true);
  assert.equal(detectPhone('+1 213 361 1700'), true);
  assert.equal(detectPhone('no phone yet'), false);
});

test('inferServiceType handles high-intent English service requests', () => {
  assert.equal(inferServiceType('I need to mount a TV on the wall').serviceId, 'tv_mounting');
  assert.equal(inferServiceType('Can you assemble IKEA furniture?').serviceId, 'furniture_assembly');
  assert.equal(inferServiceType('Small drywall hole repair').serviceId, 'drywall');
  assert.equal(inferServiceType('Replace a faucet in the bathroom').serviceId, 'plumbing');
  assert.equal(inferServiceType('Install a light fixture').serviceId, 'electrical');
});

test('inferServiceType handles RU/UK/ES core service phrases', () => {
  assert.equal(inferServiceType('повесить телевизор на стену').serviceId, 'tv_mounting');
  assert.equal(inferServiceType('збирання меблів ikea').serviceId, 'furniture_assembly');
  assert.equal(inferServiceType('pintar pared interior').serviceId, 'interior_painting');
  assert.equal(inferServiceType('instalar piso laminado').serviceId, 'flooring');
  assert.equal(inferServiceType('montar tv en pared').serviceId, 'tv_mounting');
});

test('plumbing and electrical are standalone services with no cross-sell', () => {
  assert.equal(isStandaloneService('plumbing'), true);
  assert.equal(isStandaloneService('electrical'), true);
  assert.equal(isStandaloneService('tv_mounting'), false);

  assert.equal(
    appendCrossSellNudge({ reply: 'We can help with the faucet.', lang: 'en', serviceId: 'plumbing' }),
    'We can help with the faucet.'
  );
  assert.equal(
    appendCrossSellNudge({ reply: 'We can help with the outlet.', lang: 'en', serviceId: 'electrical' }),
    'We can help with the outlet.'
  );
});

test('cross-sell is added once for eligible services', () => {
  const reply = appendCrossSellNudge({
    reply: 'TV mounting is a standard eligible small job.',
    lang: 'en',
    serviceId: 'tv_mounting'
  });
  assert.match(reply, /same visit/i);
  assert.equal(hasCrossSellNudge(reply), true);

  const twice = appendCrossSellNudge({ reply, lang: 'en', serviceId: 'tv_mounting' });
  assert.equal(twice, reply);
});

test('stripDollarAmounts removes single prices and ranges', () => {
  const scrubbed = stripDollarAmounts('Old price $105, new estimate $150, range $95-$185.');
  assert.doesNotMatch(scrubbed, /\$\s*\d/);
  assert.match(scrubbed, /pricing/);
});

test('unknown or empty service request returns empty service id', () => {
  assert.equal(inferServiceType('').serviceId, '');
  assert.equal(inferServiceType('hello, are you available?').serviceId, '');
});
