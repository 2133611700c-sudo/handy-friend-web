-- Duplicate Leads / Dedupe Report — Handy & Friend
-- Purpose: find likely duplicate leads across site, WhatsApp, Facebook, and monitored sources.
-- Run in Supabase SQL editor or secure server-side ops job.

with base as (
  select
    id,
    coalesce(lead_source, source) as source,
    service_type,
    zip,
    stage,
    lead_detected_at,
    coalesce(phone, customer_phone) as phone_key,
    lower(trim(coalesce(message, summary, service_type, ''))) as text_key
  from lead_operational_view
  where lead_detected_at >= now() - interval '30 days'
), grouped as (
  select
    coalesce(phone_key, '') as phone_key,
    coalesce(zip, '') as zip_key,
    coalesce(service_type, '') as service_key,
    date_trunc('day', lead_detected_at) as lead_day,
    count(*) as lead_count,
    array_agg(id order by lead_detected_at desc) as lead_ids,
    array_agg(source order by lead_detected_at desc) as sources,
    min(lead_detected_at) as first_seen_at,
    max(lead_detected_at) as last_seen_at
  from base
  group by coalesce(phone_key, ''), coalesce(zip, ''), coalesce(service_type, ''), date_trunc('day', lead_detected_at)
)
select
  phone_key,
  zip_key,
  service_key,
  lead_day,
  lead_count,
  lead_ids,
  sources,
  first_seen_at,
  last_seen_at
from grouped
where lead_count > 1
order by lead_count desc, last_seen_at desc;

-- Control:
-- Duplicate leads should be merged or linked instead of triggering duplicate owner alerts.
