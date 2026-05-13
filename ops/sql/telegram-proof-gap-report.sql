-- Telegram Proof Gap Report — Handy & Friend
-- Purpose: find recent leads/events without durable Telegram owner proof.
-- Run in Supabase SQL editor or secure server-side ops job.
-- Adjust table/view names to the actual CRM schema if needed.

with recent_leads as (
  select
    id,
    coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') as source,
    service_type,
    zip,
    stage,
    lead_detected_at
  from lead_operational_view
  where coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) >= now() - interval '7 days'
), telegram_proofs as (
  select
    lead_id,
    max(created_at) as last_telegram_at,
    count(*) as telegram_events
  from lead_events
  where created_at >= now() - interval '7 days'
    and (
      event_type in ('telegram_sent','telegram_alert_sent','sla_escalation_sent')
      or coalesce(event_data::text, '') ilike '%telegram%'
    )
  group by lead_id
)
select
  l.id,
  l.source,
  l.service_type,
  l.zip,
  l.stage,
  l.lead_detected_at,
  round((extract(epoch from (now() - l.lead_detected_at)) / 60)::numeric, 1) as age_minutes,
  coalesce(p.telegram_events, 0) as telegram_events,
  p.last_telegram_at,
  case
    when p.lead_id is null then 'missing_telegram_proof'
    else 'proof_present'
  end as proof_status
from recent_leads l
left join telegram_proofs p on p.lead_id = l.id
where p.lead_id is null
order by l.lead_detected_at desc;

-- Expected control:
-- Paid or high-score leads without Telegram proof should be treated as P0/P1 operations failure.
