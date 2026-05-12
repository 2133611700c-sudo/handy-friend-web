-- Stale Leads SLA Query — Handy & Friend
-- Purpose: identify leads stuck in new status without contacted/booked proof.
-- Run in Supabase SQL editor or a secure server-side ops job.
-- Adjust view/table names if the project uses a different canonical lead view.

select
  id,
  coalesce(lead_source, source) as source,
  service_type,
  zip,
  stage,
  lead_detected_at,
  round((extract(epoch from (now() - lead_detected_at)) / 60)::numeric, 1) as age_minutes,
  contacted_at,
  booked_at
from lead_operational_view
where lead_detected_at >= now() - interval '7 days'
  and coalesce(stage, '') in ('new', 'New')
  and contacted_at is null
  and booked_at is null
  and lead_detected_at < now() - interval '20 minutes'
order by lead_detected_at asc;

-- Severity guide:
-- P0: google_ads_search / google_lsa stale > 20 minutes
-- P1: website_form / website_chat / whatsapp stale > 30 minutes
-- P2: low-confidence monitored/social stale > 60 minutes
