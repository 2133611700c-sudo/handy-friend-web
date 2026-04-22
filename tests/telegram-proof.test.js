const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  isOwnerDeliveryProof,
  isOwnerDeliveryEvent,
  computeDigestHash,
  hasRecentDigest,
  getLosAngelesDayKey,
  hasRecentReportDay,
  buildOwnerProofCounts
} = require('../lib/telegram-proof.js');

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

test('isOwnerDeliveryEvent accepts telegram_sent with message_id evidence', () => {
  const ok = isOwnerDeliveryEvent({
    lead_id: 'lead_abc',
    event_type: 'telegram_sent',
    event_data: { message_id: 4546 }
  });
  assert.equal(ok, true);
});

test('isOwnerDeliveryEvent rejects watchdog/system rows', () => {
  const no = isOwnerDeliveryEvent({
    lead_id: 'watchdog_system',
    event_type: 'telegram_sent',
    event_data: { message_id: 1 }
  });
  assert.equal(no, false);
});

test('getLosAngelesDayKey returns YYYY-MM-DD', () => {
  const key = getLosAngelesDayKey(Date.UTC(2026, 3, 22, 18, 0, 0));
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('hasRecentReportDay blocks repeated same-day daily_digest sends', () => {
  const dayKey = '2026-04-22';
  const rows = [
    {
      source: 'process_outbox',
      ok: true,
      extra: { category: 'daily_digest', report_day_key: dayKey }
    }
  ];
  assert.equal(hasRecentReportDay(rows, 'daily_digest', dayKey), true);
});

test('buildOwnerProofCounts treats telegram_sent lead_events as valid proof', () => {
  const sends = [];
  const events = [
    {
      lead_id: 'lead_event_only',
      event_type: 'telegram_sent',
      event_data: { message_id: 777 }
    }
  ];
  const counts = buildOwnerProofCounts(sends, events);
  assert.equal(counts.get('lead_event_only'), 1);
});

test('process-outbox daily_report path uses deterministic day-key idempotency', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'process-outbox.js'), 'utf8');
  assert.ok(src.includes('getLosAngelesDayKey'), 'must compute PT day key');
  assert.ok(src.includes('hasRecentReportDay'), 'must use day-key helper for dedup');
  assert.ok(src.includes("reason: 'already_sent_today'"), 'must return deterministic skip reason');
  assert.ok(src.includes('report_day_key: payload?.report_day_key'), 'must persist day-key in telegram_sends.extra');
});
