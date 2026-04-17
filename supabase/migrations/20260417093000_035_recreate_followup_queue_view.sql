-- Migration 035: Recreate followup_queue view after accidental drop in 033
-- Date: 2026-04-17
-- Owner: Agent B (Codex)
-- Notes:
--   - Uses lead_events.event_data-era schema (no event_payload references)
--   - Keeps queue semantics: pending follow-ups only

BEGIN;

DROP VIEW IF EXISTS public.followup_queue CASCADE;

CREATE VIEW public.followup_queue AS
SELECT
  f.id,
  f.lead_id,
  f.day_number,
  f.channel,
  f.template_id,
  f.message_sent,
  f.status AS followup_status,
  f.created_at AS followup_created_at,
  l.source,
  l.service_type,
  l.full_name,
  l.phone,
  l.stage,
  l.status AS lead_status,
  COALESCE(l.is_test, false) AS is_test,
  l.created_at AS lead_created_at,
  (l.created_at + make_interval(days => f.day_number)) AS scheduled_for,
  (now() >= (l.created_at + make_interval(days => f.day_number))) AS is_due,
  COALESCE(ts.telegram_ok_count, 0) AS telegram_ok_count,
  ts.last_ok_telegram_at
FROM public.followups_log f
LEFT JOIN public.leads l
  ON l.id::text = f.lead_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE t.ok = true AND t.telegram_message_id IS NOT NULL) AS telegram_ok_count,
    MAX(t.created_at) FILTER (WHERE t.ok = true AND t.telegram_message_id IS NOT NULL) AS last_ok_telegram_at
  FROM public.telegram_sends t
  WHERE t.lead_id = f.lead_id
) ts ON true
WHERE f.status = 'pending'
ORDER BY scheduled_for ASC NULLS LAST, f.created_at ASC;

COMMENT ON VIEW public.followup_queue IS
'Recreated 2026-04-17 after accidental drop in 033. Queue of pending follow-ups enriched with lead and Telegram-proof context.';

COMMIT;
