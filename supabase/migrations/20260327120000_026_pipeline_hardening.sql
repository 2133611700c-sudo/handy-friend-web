-- Migration 026 — Pipeline Hardening
-- Adds: dedupe_key, source_message_id, pipeline_version, last_owner_alert_at,
--       attribution fields, messenger_psid, telegram_user_id, last_transition_at
--       outbound_jobs table, ai_conversations.lead_id
-- Author: auto / 2026-03-27

-- ─── 1. New columns on leads ─────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_message_id   text,
  ADD COLUMN IF NOT EXISTS dedupe_key          text,
  ADD COLUMN IF NOT EXISTS pipeline_version    text,
  ADD COLUMN IF NOT EXISTS last_transition_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_owner_alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS attribution_source  text,
  ADD COLUMN IF NOT EXISTS utm_source          text,
  ADD COLUMN IF NOT EXISTS utm_medium          text,
  ADD COLUMN IF NOT EXISTS utm_campaign        text,
  ADD COLUMN IF NOT EXISTS gclid               text,
  ADD COLUMN IF NOT EXISTS conversion_value    numeric,
  ADD COLUMN IF NOT EXISTS messenger_psid      text,
  ADD COLUMN IF NOT EXISTS telegram_user_id    bigint;

-- Unique index on dedupe_key (partial — only when dedupe_key is set)
-- ON CONFLICT (dedupe_key) can be used for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedupe_key
  ON leads (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Index for fast duplicate phone+service lookups (date range handled by query WHERE clause)
CREATE INDEX IF NOT EXISTS idx_leads_phone_service_date
  ON leads (phone, service_type, created_at DESC)
  WHERE phone IS NOT NULL;

-- Index for owner alert throttle
CREATE INDEX IF NOT EXISTS idx_leads_last_owner_alert
  ON leads (last_owner_alert_at)
  WHERE last_owner_alert_at IS NOT NULL;

-- ─── 2. ai_conversations.lead_id ─────────────────────────────────────────────

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS lead_id text REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conv_lead_id
  ON ai_conversations (lead_id)
  WHERE lead_id IS NOT NULL;

-- ─── 3. outbound_jobs table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outbound_jobs (
  id           text PRIMARY KEY,
  lead_id      text REFERENCES leads(id) ON DELETE SET NULL,
  job_type     text NOT NULL,
  -- job_type values: 'telegram_owner' | 'resend_owner' | 'resend_customer' | 'ga4_event'
  payload      jsonb NOT NULL DEFAULT '{}',
  status       text NOT NULL DEFAULT 'pending',
  -- status values: 'pending' | 'sent' | 'failed' | 'skipped'
  attempts     int  NOT NULL DEFAULT 0,
  last_error   text,
  idempotency_key text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_jobs_idempotency
  ON outbound_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbound_jobs_pending
  ON outbound_jobs (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbound_jobs_lead
  ON outbound_jobs (lead_id)
  WHERE lead_id IS NOT NULL;

-- ─── 4. RLS for new tables ───────────────────────────────────────────────────

ALTER TABLE outbound_jobs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (default Supabase behaviour)
-- No anon access to outbound_jobs
CREATE POLICY "outbound_jobs_service_only"
  ON outbound_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Business invariant health-check view ─────────────────────────────────

CREATE OR REPLACE VIEW v_pipeline_invariants AS

  -- Лид без единого lead_event (pipeline не дошёл)
  SELECT
    'lead_without_event' AS invariant,
    id                   AS entity_id,
    created_at           AS detected_at,
    'lead created but no lead_events found within 1h' AS detail
  FROM leads
  WHERE
    created_at > now() - interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM lead_events le WHERE le.lead_id = leads.id
    )

  UNION ALL

  -- Orphan lead_event (нет лида)
  SELECT
    'orphan_lead_event'  AS invariant,
    lead_id              AS entity_id,
    MAX(created_at)      AS detected_at,
    'lead_event references non-existent lead' AS detail
  FROM lead_events
  WHERE
    lead_id IS NOT NULL
    AND created_at > now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM leads l WHERE l.id = lead_events.lead_id
    )
  GROUP BY lead_id

  UNION ALL

  -- Лид без owner alert (contacted but Sergii not notified)
  SELECT
    'lead_without_owner_alert' AS invariant,
    id                         AS entity_id,
    created_at                 AS detected_at,
    'lead stage > new but last_owner_alert_at is NULL after 3h' AS detail
  FROM leads
  WHERE
    stage IS DISTINCT FROM 'new'
    AND last_owner_alert_at IS NULL
    AND created_at > now() - interval '3 hours'
    AND is_test IS NOT TRUE

  UNION ALL

  -- GA4 events failed
  SELECT
    'ga4_event_failed'   AS invariant,
    lead_id              AS entity_id,
    MAX(created_at)      AS detected_at,
    'GA4 conversion event failed to send' AS detail
  FROM lead_events
  WHERE
    event_type = 'ga4_event_failed'
    AND created_at > now() - interval '24 hours'
  GROUP BY lead_id

  UNION ALL

  -- Outbound jobs stuck (3 failures)
  SELECT
    'outbound_job_stuck' AS invariant,
    id                   AS entity_id,
    created_at           AS detected_at,
    'outbound job failed after 3 attempts: ' || job_type AS detail
  FROM outbound_jobs
  WHERE
    status = 'failed'
    AND attempts >= 3
    AND created_at > now() - interval '24 hours';

-- ─── 6. Backfill: set last_transition_at for existing leads ──────────────────

UPDATE leads
SET last_transition_at = COALESCE(
  closed_at, quoted_at, qualified_at, contacted_at, updated_at
)
WHERE last_transition_at IS NULL;

-- ─── 7. Backfill: set pipeline_version for existing leads ────────────────────

UPDATE leads
SET pipeline_version = '2026.03.25'
WHERE pipeline_version IS NULL;
