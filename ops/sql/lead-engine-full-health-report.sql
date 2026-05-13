-- Full Lead Engine Health Report — Handy & Friend
-- Purpose: one SQL report for lead engine health.
-- Run in Supabase SQL editor or secure server-side ops job.

with leads as (
  select
    id,
    coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') as source,
    service_type,
    zip,
    stage,
    coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) as lead_detected_at,
    contacted_at,
    booked_at,
    completed_at,
    to_jsonb(lead_operational_view)->>'source_details' as source_details,
    coalesce(completed_amount, booked_amount, quoted_amount, 0) as amount
  from lead_operational_view
  where coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) >= now() - interval '30 days'
), core as (
  select
    count(*) as leads_30d,
    count(*) filter (where lead_detected_at >= now() - interval '7 days') as leads_7d,
    count(*) filter (where coalesce(stage, '') in ('new','New')) as new_leads,
    count(*) filter (where coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes') as stale_new_leads,
    count(*) filter (where coalesce(source, '') in ('google_ads_search','google_lsa') and coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes') as stale_paid_leads,
    count(*) filter (where source is null or source in ('unknown','direct')) as attribution_gaps,
    count(*) filter (where coalesce(source_details, '') ilike '%gclid%' and source <> 'google_ads_search') as gclid_mapping_gaps,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed,
    sum(amount) as attributed_amount
  from leads
), by_source as (
  select
    source,
    count(*) as leads,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed,
    sum(amount) as amount
  from leads
  group by source
)
select
  'core' as section,
  null::text as source,
  leads_30d,
  leads_7d,
  new_leads,
  stale_new_leads,
  stale_paid_leads,
  attribution_gaps,
  gclid_mapping_gaps,
  booked,
  completed,
  attributed_amount
from core
union all
select
  'source' as section,
  source,
  leads as leads_30d,
  null::bigint as leads_7d,
  null::bigint as new_leads,
  null::bigint as stale_new_leads,
  null::bigint as stale_paid_leads,
  null::bigint as attribution_gaps,
  null::bigint as gclid_mapping_gaps,
  booked,
  completed,
  amount as attributed_amount
from by_source
order by section, attributed_amount desc nulls last, leads_30d desc;
