-- Weekly Ops Digest Report — Handy & Friend
-- Purpose: weekly owner digest for lead engine health.
-- Run in Supabase SQL editor or secure server-side ops job.

with leads_7d as (
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
  where lead_detected_at >= now() - interval '7 days'
), core as (
  select
    count(*) as total_leads,
    count(*) filter (where coalesce(stage, '') in ('new','New')) as new_leads,
    count(*) filter (where coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes') as stale_leads,
    count(*) filter (where contacted_at is not null or stage = 'contacted') as contacted,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed,
    sum(amount) as attributed_amount
  from leads_7d
), source_rows as (
  select
    source,
    count(*) as leads,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    sum(amount) as amount
  from leads_7d
  group by source
)
select
  'core' as section,
  null::text as source,
  total_leads as leads,
  new_leads,
  stale_leads,
  contacted,
  booked,
  completed,
  attributed_amount as amount
from core
union all
select
  'by_source' as section,
  source,
  leads,
  null::bigint as new_leads,
  null::bigint as stale_leads,
  null::bigint as contacted,
  booked,
  null::bigint as completed,
  amount
from source_rows
order by section, amount desc nulls last, leads desc;

-- Weekly digest must be combined with:
-- ops/sql/telegram-proof-gap-report.sql
-- ops/sql/source-attribution-gap-report.sql
-- ops/sql/duplicate-leads-dedupe-report.sql
-- ops/sql/paid-lead-escalation-report.sql
