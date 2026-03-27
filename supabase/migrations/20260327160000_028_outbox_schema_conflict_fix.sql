-- Migration 028 — Outbox Schema Conflict Fix
-- Resolves conflict between migrations 027a (143000) and 027b (150000):
--   1. Drops the NARROW status constraint from 143000 (blocks queued/retry_scheduled/failed_dlq)
--   2. Drops the state-machine TRIGGER from 143000 (blocks processing→retry_scheduled/failed_dlq)
--   3. Drops the old attempts_nonnegative constraint (replaced by attempt_count in 027b)
--   4. Grants execute on new stored functions to service_role
-- After this migration:
--   • Status constraint = chk_outbound_jobs_status (from 027b): full set
--   • State machine enforced by stored functions: outbox_complete_job, outbox_fail_job
--   • Claim function: outbox_claim_batch (from 027b) — replaces claim_outbound_jobs
-- Author: auto / 2026-03-27

-- ─── 1. Remove narrow status constraint (from 143000) ─────────────────────────
-- This constraint blocks queued, retry_scheduled, failed_dlq statuses from 027b
ALTER TABLE outbound_jobs
  DROP CONSTRAINT IF EXISTS outbound_jobs_status_check;

-- ─── 2. Remove state machine trigger (from 143000) ────────────────────────────
-- Trigger blocks processing→retry_scheduled and processing→failed_dlq transitions
-- State machine is now enforced by outbox_complete_job / outbox_fail_job stored functions
DROP TRIGGER IF EXISTS trg_outbound_jobs_validate_transition ON outbound_jobs;
DROP FUNCTION IF EXISTS outbound_jobs_validate_transition();

-- ─── 3. Remove legacy non-negative constraint on attempts ─────────────────────
-- Column 'attempts' is superseded by 'attempt_count' (added in 027b)
-- Constraint is no longer needed and would conflict with attempt_count workflow
ALTER TABLE outbound_jobs
  DROP CONSTRAINT IF EXISTS outbound_jobs_attempts_nonnegative;

-- ─── 4. Verify chk_outbound_jobs_status (from 027b) covers all needed values ──
-- The constraint from 027b already exists; this is a no-op if correct.
-- Values: queued | pending | processing | retry_scheduled | sent | failed_dlq | failed | skipped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_outbound_jobs_status'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE outbound_jobs
      ADD CONSTRAINT chk_outbound_jobs_status
      CHECK (status IN ('queued', 'pending', 'processing', 'retry_scheduled', 'sent', 'failed_dlq', 'failed', 'skipped'));
  END IF;
END $$;

-- ─── 5. Grant execute on all outbox stored functions ─────────────────────────
GRANT EXECUTE ON FUNCTION outbox_claim_batch(text, int, int)    TO service_role;
GRANT EXECUTE ON FUNCTION outbox_complete_job(text, text)       TO service_role;
GRANT EXECUTE ON FUNCTION outbox_fail_job(text, text, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION outbox_replay_dlq(text, text)         TO service_role;

-- ─── 6. Backfill: set attempt_count from attempts for existing rows ────────────
UPDATE outbound_jobs
SET attempt_count = COALESCE(attempts, 0)
WHERE attempt_count = 0 AND attempts > 0;

-- ─── 7. Normalize queued status: pending rows that aren't locked → queued ──────
UPDATE outbound_jobs
SET status = 'queued', next_attempt_at = COALESCE(scheduled_at, now())
WHERE status = 'pending' AND locked_at IS NULL;
