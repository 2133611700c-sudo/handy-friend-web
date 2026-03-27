-- Migration 027 — Outbox Hardening
-- Adds: atomic claim (SKIP LOCKED), strict state machine, per-channel retry policy,
--       dedup_key unique index, lock recovery, provider idempotency, DLQ operations
-- Depends on: 026_pipeline_hardening.sql (outbound_jobs table must exist)
-- Author: auto / 2026-03-27

-- ─── 1. New columns on outbound_jobs ─────────────────────────────────────────

ALTER TABLE outbound_jobs
  -- Atomic claim
  ADD COLUMN IF NOT EXISTS locked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by      text,           -- worker instance ID
  -- State machine (replaces simple 'status')
  ADD COLUMN IF NOT EXISTS attempt_count  int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts   int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_text text,
  ADD COLUMN IF NOT EXISTS dedup_key      text,           -- replaces old idempotency_key
  -- Provider idempotency
  ADD COLUMN IF NOT EXISTS provider_idempotency_key text,
  ADD COLUMN IF NOT EXISTS provider_message_id      text; -- TG msg_id / Resend email_id / GA4 batch_id

-- Rename: 'pending' → 'queued' for clarity (backward compat: keep both valid during rollout)
-- status values: queued | processing | sent | retry_scheduled | failed_dlq

-- Unique index on dedup_key (prevents enqueue duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_jobs_dedup_key
  ON outbound_jobs (dedup_key)
  WHERE dedup_key IS NOT NULL;

-- Index for SKIP LOCKED claim: ready-to-process jobs
CREATE INDEX IF NOT EXISTS idx_outbound_jobs_claim
  ON outbound_jobs (status, next_attempt_at NULLS FIRST)
  WHERE status IN ('queued', 'pending', 'retry_scheduled');

-- Index for lock recovery: stuck jobs
CREATE INDEX IF NOT EXISTS idx_outbound_jobs_lock_recovery
  ON outbound_jobs (locked_at)
  WHERE locked_at IS NOT NULL AND status = 'processing';

-- ─── 2. State machine check constraint ───────────────────────────────────────

ALTER TABLE outbound_jobs
  DROP CONSTRAINT IF EXISTS chk_outbound_jobs_status;

ALTER TABLE outbound_jobs
  ADD CONSTRAINT chk_outbound_jobs_status
  CHECK (status IN ('queued', 'pending', 'processing', 'retry_scheduled', 'sent', 'failed_dlq', 'failed', 'skipped'));

-- ─── 3. Atomic claim function (SKIP LOCKED) ──────────────────────────────────
-- Called by worker to atomically claim a batch. Prevents double-processing.

CREATE OR REPLACE FUNCTION outbox_claim_batch(
  p_worker_id text,
  p_batch_size int DEFAULT 10,
  p_lock_ttl_minutes int DEFAULT 5
)
RETURNS SETOF outbound_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  -- First: recover stuck jobs (locked_at > TTL → requeue)
  UPDATE outbound_jobs
  SET
    status = 'queued',
    locked_at = NULL,
    locked_by = NULL,
    next_attempt_at = now()
  WHERE
    status = 'processing'
    AND locked_at IS NOT NULL
    AND locked_at < now() - (p_lock_ttl_minutes || ' minutes')::interval;

  -- Then: claim batch with SKIP LOCKED
  RETURN QUERY
  UPDATE outbound_jobs
  SET
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = COALESCE(attempt_count, 0) + 1
  WHERE id IN (
    SELECT id FROM outbound_jobs
    WHERE
      status IN ('queued', 'pending', 'retry_scheduled')
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
    ORDER BY next_attempt_at NULLS FIRST, created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- ─── 4. Complete job function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION outbox_complete_job(
  p_job_id text,
  p_provider_message_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE outbound_jobs
  SET
    status = 'sent',
    locked_at = NULL,
    locked_by = NULL,
    sent_at = now(),
    provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
  WHERE id = p_job_id AND status = 'processing';
END;
$$;

-- ─── 5. Fail/retry job function ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION outbox_fail_job(
  p_job_id text,
  p_error_code text,
  p_error_text text,
  p_retry_backoff_seconds int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempt_count int;
  v_max_attempts  int;
BEGIN
  SELECT attempt_count, max_attempts
  INTO v_attempt_count, v_max_attempts
  FROM outbound_jobs WHERE id = p_job_id;

  IF v_attempt_count >= v_max_attempts THEN
    UPDATE outbound_jobs
    SET
      status = 'failed_dlq',
      locked_at = NULL,
      locked_by = NULL,
      last_error_code = p_error_code,
      last_error_text = left(p_error_text, 500)
    WHERE id = p_job_id;
  ELSE
    UPDATE outbound_jobs
    SET
      status = 'retry_scheduled',
      locked_at = NULL,
      locked_by = NULL,
      last_error_code = p_error_code,
      last_error_text = left(p_error_text, 500),
      next_attempt_at = now() + (p_retry_backoff_seconds || ' seconds')::interval
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- ─── 6. DLQ replay function ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION outbox_replay_dlq(
  p_job_id text,
  p_reason text DEFAULT 'manual_replay'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE outbound_jobs
  SET
    status = 'queued',
    attempt_count = 0,
    locked_at = NULL,
    locked_by = NULL,
    next_attempt_at = now(),
    last_error_code = NULL,
    last_error_text = p_reason
  WHERE id = p_job_id AND status = 'failed_dlq';
END;
$$;

-- ─── 7. Observability view ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_outbox_metrics AS
SELECT
  job_type,
  status,
  COUNT(*)                                    AS count,
  AVG(EXTRACT(EPOCH FROM (now() - created_at)))::int AS avg_age_sec,
  MAX(EXTRACT(EPOCH FROM (now() - created_at)))::int AS oldest_age_sec,
  AVG(attempt_count)::numeric(4,1)            AS avg_attempts,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)        AS sent_count,
  SUM(CASE WHEN status = 'failed_dlq' THEN 1 ELSE 0 END)  AS dlq_count,
  SUM(CASE WHEN status IN ('queued','pending','retry_scheduled') THEN 1 ELSE 0 END) AS pending_count
FROM outbound_jobs
WHERE created_at > now() - interval '24 hours'
GROUP BY job_type, status;

-- SLO summary: overall queue health
CREATE OR REPLACE VIEW v_outbox_slo AS
SELECT
  COUNT(*) FILTER (WHERE status IN ('queued','pending','retry_scheduled'))       AS queue_depth,
  COUNT(*) FILTER (WHERE status = 'processing')                                  AS in_flight,
  COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > now() - interval '1h')   AS sent_1h,
  COUNT(*) FILTER (WHERE status = 'failed_dlq')                                  AS dlq_total,
  (MAX(EXTRACT(EPOCH FROM (now() - created_at))) FILTER (WHERE status IN ('queued','pending','retry_scheduled')))::int AS oldest_pending_sec,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent' AND EXTRACT(EPOCH FROM (sent_at - created_at)) < 600)
    / NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0)
  , 1)                                                                           AS pct_sent_under_10min
FROM outbound_jobs
WHERE created_at > now() - interval '24 hours';

-- ─── 8. Backfill: normalize status for existing rows ─────────────────────────

UPDATE outbound_jobs
SET status = 'queued', next_attempt_at = now()
WHERE status = 'pending' AND locked_at IS NULL;
