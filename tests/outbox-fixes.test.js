/**
 * Regression tests for two bugs fixed on 2026-04-22:
 *
 * Fix 1 — Daily digest idempotency (api/process-outbox.js)
 *   Repeated same-day calls must not produce duplicate daily_digest sends.
 *   Mechanism: compute SHA-256 digest hash of message text, store in
 *   telegram_sends.extra.digest_hash; before sending, query recent sends
 *   and skip if matching (category + digest_hash) already exists in 20h window.
 *
 * Fix 2 — v_pipeline_invariants uuid/text cast (migration 038)
 *   leads.id is uuid; lead_events.lead_id is text.
 *   Missing ::text cast in NOT EXISTS caused all leads to appear as
 *   lead_without_event (false positive). Migration adds ::text cast.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// ─── Fix 1: Daily digest idempotency ────────────────────────────────────────

test('lib/telegram-proof.js: computeDigestHash is stable and non-empty', () => {
  const { computeDigestHash } = require(path.join(ROOT, 'lib/telegram-proof.js'));
  const text = 'ℹ️ <b>[P3 INFO] Daily Digest</b>\nLeads: 3, Revenue: $0';
  const h1 = computeDigestHash(text);
  const h2 = computeDigestHash(text);
  assert.equal(typeof h1, 'string', 'digest must be a string');
  assert.ok(h1.length >= 24, 'digest must be at least 24 chars');
  assert.equal(h1, h2, 'same input must produce same digest (deterministic)');
  assert.notEqual(computeDigestHash('other text'), h1, 'different inputs must produce different digests');
});

test('lib/telegram-proof.js: hasRecentDigest returns true when matching row exists', () => {
  const { computeDigestHash, hasRecentDigest } = require(path.join(ROOT, 'lib/telegram-proof.js'));
  const text = 'test daily digest content';
  const hash = computeDigestHash(text);
  const now  = Date.now();
  const rows = [
    {
      ok: true,
      source: 'process_outbox',
      created_at: new Date(now - 5 * 60 * 1000).toISOString(), // 5 min ago
      extra: { category: 'daily_digest', digest_hash: hash }
    }
  ];
  assert.ok(
    hasRecentDigest(rows, 'daily_digest', hash, now, 20 * 60 * 60 * 1000),
    'must return true when matching row found within window'
  );
});

test('lib/telegram-proof.js: hasRecentDigest returns false when outside window', () => {
  const { computeDigestHash, hasRecentDigest } = require(path.join(ROOT, 'lib/telegram-proof.js'));
  const text = 'test daily digest content';
  const hash = computeDigestHash(text);
  const now  = Date.now();
  const rows = [
    {
      ok: true,
      source: 'process_outbox',
      created_at: new Date(now - 22 * 60 * 60 * 1000).toISOString(), // 22 hours ago — outside 20h
      extra: { category: 'daily_digest', digest_hash: hash }
    }
  ];
  assert.ok(
    !hasRecentDigest(rows, 'daily_digest', hash, now, 20 * 60 * 60 * 1000),
    'must return false when matching row is older than window'
  );
});

test('lib/telegram-proof.js: hasRecentDigest returns false when digest_hash differs', () => {
  const { computeDigestHash, hasRecentDigest } = require(path.join(ROOT, 'lib/telegram-proof.js'));
  const hash = computeDigestHash('message A');
  const now  = Date.now();
  const rows = [
    {
      ok: true,
      source: 'process_outbox',
      created_at: new Date(now - 60_000).toISOString(),
      extra: { category: 'daily_digest', digest_hash: computeDigestHash('message B') } // different digest
    }
  ];
  assert.ok(
    !hasRecentDigest(rows, 'daily_digest', hash, now, 20 * 60 * 60 * 1000),
    'must return false when digest_hash does not match (different stats = new digest = new send allowed)'
  );
});

test('lib/telegram-proof.js: hasRecentDigest returns false when ok=false', () => {
  const { computeDigestHash, hasRecentDigest } = require(path.join(ROOT, 'lib/telegram-proof.js'));
  const hash = computeDigestHash('test');
  const now  = Date.now();
  const rows = [
    {
      ok: false, // failed send — must not block retry
      source: 'process_outbox',
      created_at: new Date(now - 60_000).toISOString(),
      extra: { category: 'daily_digest', digest_hash: hash }
    }
  ];
  assert.ok(
    !hasRecentDigest(rows, 'daily_digest', hash, now, 20 * 60 * 60 * 1000),
    'must return false for failed (ok=false) rows so retries are allowed'
  );
});

test('api/process-outbox.js: handleDailyReport uses digest_hash and 20h window', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/process-outbox.js'), 'utf8');

  assert.ok(src.includes('computeDigestHash'), 'must import and call computeDigestHash');
  assert.ok(src.includes('20 * 60 * 60 * 1000'), 'must use 20h lookback window');
  assert.ok(src.includes("category: 'daily_digest'"), 'must pass category=daily_digest to deliverTelegramOwner');
  assert.ok(src.includes('digest_hash: digestHash'), 'must pass digest_hash to deliverTelegramOwner');
  assert.ok(
    src.includes("skipped: true") && src.includes("reason:"),
    'handleDailyReport must return { skipped: true, reason: ... } on dedup'
  );
});

test('api/process-outbox.js: action=daily_report handler propagates skipped flag', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/process-outbox.js'), 'utf8');
  assert.ok(
    src.includes("r?.skipped ? { skipped: true, reason: r.reason }"),
    'HTTP handler for action=daily_report must forward skipped flag in response'
  );
});

test('api/process-outbox.js: deliverTelegramOwner stores digest_hash in extra', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/process-outbox.js'), 'utf8');
  assert.ok(
    src.includes('digest_hash: payload?.digest_hash'),
    'deliverTelegramOwner must forward digest_hash into telegram_sends.extra'
  );
});

// ─── Fix 2: v_pipeline_invariants uuid/text cast ────────────────────────────

test('migration 038 exists and contains CREATE OR REPLACE VIEW v_pipeline_invariants', () => {
  const migFile = path.join(ROOT, 'supabase/migrations/20260422000000_038_fix_pipeline_invariants_uuid_cast.sql');
  assert.ok(fs.existsSync(migFile), 'migration 038 file must exist');
  const sql = fs.readFileSync(migFile, 'utf8');
  assert.ok(sql.includes('CREATE OR REPLACE VIEW v_pipeline_invariants'), 'view must be recreated');
  assert.ok(sql.includes('BEGIN;') && sql.includes('COMMIT;'), 'must be wrapped in transaction');
});

test('migration 038: lead_without_event NOT EXISTS uses leads.id::text', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20260422000000_038_fix_pipeline_invariants_uuid_cast.sql'),
    'utf8'
  );
  assert.ok(sql.includes('le.lead_id = leads.id::text'), 'must cast leads.id to text in lead_without_event check');
  // Confirm no bare uuid comparison in executable SQL lines (comments may show old pattern for docs)
  const executableLines = sql.split('\n').filter(l => !l.trim().startsWith('--'));
  assert.ok(
    !executableLines.join('\n').match(/le\.lead_id\s*=\s*leads\.id(?!::)/),
    'executable SQL must not contain uncast le.lead_id = leads.id'
  );
});

test('migration 038: orphan_lead_event NOT EXISTS uses l.id::text', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20260422000000_038_fix_pipeline_invariants_uuid_cast.sql'),
    'utf8'
  );
  assert.ok(
    sql.includes('l.id::text = lead_events.lead_id'),
    'orphan_lead_event check must also cast l.id to text'
  );
});

test('migration 038: all 5 original invariant types are preserved', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20260422000000_038_fix_pipeline_invariants_uuid_cast.sql'),
    'utf8'
  );
  for (const name of ['lead_without_event', 'orphan_lead_event', 'lead_without_owner_alert', 'ga4_event_failed', 'outbound_job_stuck']) {
    assert.ok(sql.includes(`'${name}'`), `invariant '${name}' must be preserved in migration`);
  }
});

test('isOwnerDeliveryProof: accepts telegram_sent rows from process_outbox/ai_chat sources', () => {
  const { isOwnerDeliveryProof } = require(path.join(ROOT, 'lib/telegram-proof.js'));

  // Valid: process_outbox + telegram_owner job_type
  assert.ok(isOwnerDeliveryProof({
    ok: true,
    telegram_message_id: 4546,
    lead_id: 'lead_1776895433583_0jssf2',
    source: 'process_outbox',
    extra: { job_type: 'telegram_owner', category: 'daily_digest' }
  }), 'process_outbox+telegram_owner must be accepted as proof');

  // Valid: ai_chat + sales_card step
  assert.ok(isOwnerDeliveryProof({
    ok: true,
    telegram_message_id: 4500,
    lead_id: 'lead_xyz',
    source: 'ai_chat',
    extra: { step: 'sales_card' }
  }), 'ai_chat+sales_card must be accepted as proof');

  // Invalid: ok=false
  assert.ok(!isOwnerDeliveryProof({
    ok: false,
    telegram_message_id: 4547,
    lead_id: 'lead_xyz',
    source: 'process_outbox',
    extra: { job_type: 'telegram_owner' }
  }), 'ok=false must NOT be accepted as proof');

  // Invalid: no lead_id
  assert.ok(!isOwnerDeliveryProof({
    ok: true,
    telegram_message_id: 4548,
    lead_id: '',
    source: 'process_outbox',
    extra: { job_type: 'telegram_owner' }
  }), 'empty lead_id must NOT be accepted as proof');
});
