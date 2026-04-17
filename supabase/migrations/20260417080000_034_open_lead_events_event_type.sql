-- ============================================================
-- Migration 034: Drop overly-restrictive lead_events.event_type
--                check constraint
-- Date: 2026-04-17
-- Context:
--   `lead_events_event_type_check` only allowed 3 values
--   (lead_detected, lead_locked, lead_unlocked).
--   Application code emits many more (telegram_sent, telegram_failed,
--   ai_chat_capture, owner_email_sent, status_contacted, ...). Every
--   such insert silently failed with 23514.
--   pipelineLogEvent has .catch(()=>{}) which swallowed the error.
--   Proved live: forensic_fix_verified + telegram_sent both fail.
-- Fix:
--   Drop the constraint. event_type is now free text. Callers are
--   responsible for using consistent values. SLA queries already
--   filter by specific event_type IN (...) — no constraint needed.
-- ============================================================

BEGIN;

ALTER TABLE public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_event_type_check;

COMMENT ON COLUMN public.lead_events.event_type IS
  'Free-text event type. Common values: form_submit, messenger_capture, telegram_capture, lead_created, lead_detected, lead_locked, lead_unlocked, telegram_sent, telegram_failed, ai_chat_capture, owner_email_sent, status_contacted, stage_contacted, policy_violation, cross_sell_policy_violation.';

COMMIT;
