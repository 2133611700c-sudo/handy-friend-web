const test = require('node:test');
const assert = require('node:assert/strict');

const { isOwnerDeliveryProof, computeDigestHash, hasRecentDigest } = require('../lib/telegram-proof.js');

test('isOwnerDeliveryProof accepts process_outbox telegram_owner sends', () => {
  const ok = isOwnerDeliveryProof({
    lead_id: 'lead_123',
    source: 'process_outbox',
    ok: true,
    telegram_message_id: 111,
    extra: { job_type: 'telegram_owner', category: 'hunter_signal' }
  });
  assert.equal(ok, true);
});

test('isOwnerDeliveryProof rejects non-owner categories for proof', () => {
  const no = isOwnerDeliveryProof({
    lead_id: 'lead_123',
    source: 'process_outbox',
    ok: true,
    telegram_message_id: 222,
    extra: { category: 'daily_digest' }
  });
  assert.equal(no, false);
});

test('computeDigestHash is stable', () => {
  const a = computeDigestHash('daily digest body');
  const b = computeDigestHash('daily digest body');
  assert.equal(a, b);
  assert.equal(a.length, 24);
});

test('hasRecentDigest detects duplicate digest within window', () => {
  const now = Date.now();
  const digest = computeDigestHash('same content');
  const rows = [
    {
      source: 'process_outbox',
      ok: true,
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      extra: { category: 'daily_digest', digest_hash: digest }
    }
  ];
  assert.equal(hasRecentDigest(rows, 'daily_digest', digest, now, 20 * 60 * 60 * 1000), true);
});

