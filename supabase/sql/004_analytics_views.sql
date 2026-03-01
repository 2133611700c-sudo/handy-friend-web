-- Analytics-ready views

create or replace view public.v_lead_funnel as
select
  status,
  count(*)::bigint as lead_count
from public.leads
group by status;

create or replace view public.v_top_services as
select
  coalesce(nullif(service_type, ''), 'unknown') as service_type,
  count(*)::bigint as lead_count
from public.leads
group by 1
order by lead_count desc;

create or replace view public.v_top_zips as
select
  coalesce(nullif(zip, ''), 'unknown') as zip,
  count(*)::bigint as lead_count
from public.leads
group by 1
order by lead_count desc;

create or replace view public.v_photo_upload_rate as
select
  date_trunc('day', l.created_at) as day,
  count(*) filter (where p.lead_id is not null)::bigint as leads_with_photos,
  count(*)::bigint as total_leads,
  round(100.0 * count(*) filter (where p.lead_id is not null) / nullif(count(*), 0), 2) as pct_with_photos
from public.leads l
left join (
  select distinct lead_id from public.lead_photos
) p on p.lead_id = l.id
group by 1
order by day desc;

create or replace view public.v_partial_lead_rate as
select
  date_trunc('day', created_at) as day,
  count(*) filter (where status = 'partial')::bigint as partial_leads,
  count(*)::bigint as total_leads,
  round(100.0 * count(*) filter (where status = 'partial') / nullif(count(*), 0), 2) as pct_partial
from public.leads
group by 1
order by day desc;

create or replace view public.v_response_time as
with first_contact as (
  select
    lead_id,
    min(created_at) filter (where event_type in ('status_changed', 'telegram_sent')) as first_action_at
  from public.lead_events
  group by lead_id
)
select
  l.id as lead_id,
  l.created_at,
  fc.first_action_at,
  extract(epoch from (fc.first_action_at - l.created_at))/60.0 as response_minutes
from public.leads l
left join first_contact fc on fc.lead_id = l.id;
