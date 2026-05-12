-- Booked Revenue Attribution Report — Handy & Friend
-- Purpose: connect marketing sources to booked/completed jobs and revenue.
-- Run in Supabase SQL editor or secure server-side ops job.
-- Adjust amount column names if the project uses different fields.

with base as (
  select
    id,
    coalesce(lead_source, source) as source,
    service_type,
    stage,
    lead_detected_at,
    contacted_at,
    booked_at,
    completed_at,
    quoted_amount,
    booked_amount,
    completed_amount
  from lead_operational_view
  where lead_detected_at >= now() - interval '30 days'
), agg as (
  select
    source,
    count(*) as leads,
    count(*) filter (where contacted_at is not null or stage = 'contacted') as contacted,
    count(*) filter (where quoted_amount is not null) as estimates,
    count(*) filter (where booked_at is not null or stage = 'booked') as booked,
    count(*) filter (where completed_at is not null or stage = 'completed') as completed,
    coalesce(sum(completed_amount), sum(booked_amount), sum(quoted_amount), 0) as attributed_amount
  from base
  group by source
)
select
  source,
  leads,
  contacted,
  estimates,
  booked,
  completed,
  attributed_amount,
  round((booked::numeric / nullif(leads, 0)) * 100, 1) as booked_rate_pct,
  round((completed::numeric / nullif(leads, 0)) * 100, 1) as completed_rate_pct,
  round((attributed_amount::numeric / nullif(completed, 0)), 2) as avg_completed_job_value
from agg
order by attributed_amount desc, booked desc, leads desc;

-- Interpretation:
-- leads > 0 and booked = 0: inspect SLA/follow-up/sales quality.
-- booked > 0 and source is null/unknown: fix attribution before scaling source.
-- paid source leads > 0 and conversions missing in Ads: inspect GA4/Ads import.
