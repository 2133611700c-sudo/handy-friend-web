-- Source Attribution Gap Report — Handy & Friend
-- Purpose: identify leads/events with missing or weak source attribution.
-- Run in Supabase SQL editor or secure server-side ops job.

select
  id,
  coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) as lead_detected_at,
  coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') as source,
  service_type,
  zip,
  stage,
  to_jsonb(lead_operational_view)->>'source_details' as source_details,
  case
    when coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') is null then 'missing_source'
    when coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') in ('unknown','direct') and source_details is not null then 'weak_source_with_details'
    when coalesce(to_jsonb(lead_operational_view)->>'source_details', '') ilike '%gclid%' and coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') <> 'google_ads_search' then 'gclid_not_mapped_to_google_ads_search'
    when coalesce(to_jsonb(lead_operational_view)->>'source_details', '') ilike '%utm_source%google%' and coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') is null then 'google_utm_missing_source'
    else 'ok_or_review'
  end as attribution_status
from lead_operational_view
where coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) >= now() - interval '30 days'
  and (
    coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') is null
    or coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') in ('unknown','direct')
    or coalesce(to_jsonb(lead_operational_view)->>'source_details', '') ilike '%gclid%'
    or coalesce(to_jsonb(lead_operational_view)->>'source_details', '') ilike '%utm_source%'
  )
order by lead_detected_at desc;

-- Control:
-- Any gclid must map to google_ads_search.
-- Paid traffic without source attribution blocks reliable Ads optimization.
