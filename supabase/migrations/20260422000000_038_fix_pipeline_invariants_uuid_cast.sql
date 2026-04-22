-- ============================================================
-- Migration 038: Fix v_pipeline_invariants uuid/text type mismatch
-- Date: 2026-04-22
-- Problem:
--   leads.id is uuid; lead_events.lead_id is text (confirmed in migration 030).
--   Migration 026 defined the NOT EXISTS check as:
--     WHERE le.lead_id = leads.id
--   PostgreSQL does NOT implicitly cast uuid to text in = comparison,
--   so NOT EXISTS always returns true → every lead created in the last
--   2 hours appears as lead_without_event (false positive).
--   Same issue in orphan_lead_event check: l.id = lead_events.lead_id
-- Fix:
--   Cast leads.id to text: leads.id::text
--   All other views (v_response_sla, v_leads_without_telegram,
--   calc_real_response_min) already apply this cast — aligning here.
-- Evidence:
--   lead_1776895433583_0jssf2 had lead_events row 93 (event_type=telegram_sent)
--   yet was flagged lead_without_event. After this migration it will not be.
-- ============================================================

BEGIN;

CREATE OR REPLACE VIEW v_pipeline_invariants AS

  -- Lead with no lead_events (pipeline stalled)
  SELECT
    'lead_without_event' AS invariant,
    id                   AS entity_id,
    created_at           AS detected_at,
    'lead created but no lead_events found within 1h' AS detail
  FROM leads
  WHERE
    created_at > now() - interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM lead_events le WHERE le.lead_id = leads.id::text
    )

  UNION ALL

  -- Orphan lead_event (references a non-existent lead)
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
      SELECT 1 FROM leads l WHERE l.id::text = lead_events.lead_id
    )
  GROUP BY lead_id

  UNION ALL

  -- Lead without owner alert (stage advanced but Sergii not notified)
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

  -- GA4 events that failed to send
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

  -- Outbound jobs stuck after 3 failures
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

COMMIT;
