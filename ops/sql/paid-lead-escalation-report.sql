-- Paid Lead Escalation Report — Handy & Friend
-- Purpose: find paid-source leads that require urgent owner action.

select
  id,
  coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') as source,
  service_type,
  zip,
  stage,
  coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) as lead_detected_at,
  contacted_at,
  booked_at,
  round((extract(epoch from (now() - lead_detected_at)) / 60)::numeric, 1) as age_minutes,
  case
    when coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') in ('google_ads_search','google_lsa')
      and coalesce(stage, '') in ('new','New')
      and lead_detected_at < now() - interval '20 minutes'
      then 'P0_paid_new_sla_breach'
    when source_details::text ilike '%gclid%'
      and coalesce(stage, '') in ('new','New')
      and lead_detected_at < now() - interval '20 minutes'
      then 'P0_gclid_new_sla_breach'
    when coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') in ('google_ads_search','google_lsa')
      and contacted_at is not null
      and booked_at is null
      and contacted_at < now() - interval '4 hours'
      then 'P1_paid_followup_due'
    else 'review'
  end as escalation_reason
from lead_operational_view
where coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) >= now() - interval '14 days'
  and (
    coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') in ('google_ads_search','google_lsa')
    or source_details::text ilike '%gclid%'
  )
  and booked_at is null
order by
  case
    when coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes' then 0
    when contacted_at is not null and contacted_at < now() - interval '4 hours' then 1
    else 2
  end,
  lead_detected_at asc;
