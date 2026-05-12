-- Executive Dashboard Summary — Handy & Friend
-- Purpose: one SQL result set for owner-facing operational dashboard.
-- Run in Supabase SQL editor or secure server-side ops job.

with leads_30d as (
  select
    id,
    coalesce(lead_source, source) as source,
    service_type,
    stage,
    lead_detected_at,
    contacted_at,
    booked_at,
    completed_at,
    coalesce(completed_amount, booked_amount, quoted_amount, 0) as amount
  from lead_operational_view
  where lead_detected_at >= now() - interval '30 days'
), summary as (
  select
    count(*) as total_leads_30d,
    count(*) filter (where lead_detected_at >= now() - interval '7 days') as total_leads_7d,
    count(*) filter (where coalesce(stage, '') in ('new','New')) as new_leads_30d,
    count(*) filter (where coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes') as stale_new_leads,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked_30d,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed_30d,
    sum(amount) as attributed_amount_30d
  from leads_30d
), by_source as (
  select
    source,
    count(*) as leads,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed,
    sum(amount) as amount
  from leads_30d
  group by source
)
select
  'summary' as row_type,
  null::text as source,
  total_leads_30d as leads,
  total_leads_7d,
  new_leads_30d,
  stale_new_leads,
  booked_30d as booked,
  completed_30d as completed,
  attributed_amount_30d as amount
from summary
union all
select
  'source' as row_type,
  source,
  leads,
  null::bigint as total_leads_7d,
  null::bigint as new_leads_30d,
  null::bigint as stale_new_leads,
  booked,
  completed,
  amount
from by_source
order by row_type, amount desc nulls last, leads desc;

-- Control:
-- Dashboard is not operationally useful unless booked/completed outcomes are visible by source.
