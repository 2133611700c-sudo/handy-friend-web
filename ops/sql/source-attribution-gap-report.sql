-- Source Attribution Gap Report — Handy & Friend
-- Purpose: identify leads/events with missing or weak source attribution.
-- Run in Supabase SQL editor or secure server-side ops job.

select
  id,
  lead_detected_at,
  coalesce(lead_source, source) as source,
  service_type,
  zip,
  stage,
  source_details,
  case
    when coalesce(lead_source, source) is null then 'missing_source'
    when coalesce(lead_source, source) in ('unknown','direct') and source_details is not null then 'weak_source_with_details'
    when source_details::text ilike '%gclid%' and coalesce(lead_source, source) <> 'google_ads_search' then 'gclid_not_mapped_to_google_ads_search'
    when source_details::text ilike '%utm_source%google%' and coalesce(lead_source, source) is null then 'google_utm_missing_source'
    else 'ok_or_review'
  end as attribution_status
from lead_operational_view
where lead_detected_at >= now() - interval '30 days'
  and (
    coalesce(lead_source, source) is null
    or coalesce(lead_source, source) in ('unknown','direct')
    or source_details::text ilike '%gclid%'
    or source_details::text ilike '%utm_source%'
  )
order by lead_detected_at desc;

-- Control:
-- Any gclid must map to google_ads_search.
-- Paid traffic without source attribution blocks reliable Ads optimization.
