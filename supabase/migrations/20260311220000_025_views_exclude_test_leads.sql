-- Migration 025: Add is_test=false filter to ALL analytics views
-- Bug: 11 views query public.leads without filtering is_test
-- Impact: test/E2E leads pollute channel ROI, service performance, funnel, trends
-- dashboard_stats() was fixed in migration 022 but views were missed

-- 1. Lead Funnel
drop view if exists public.v_lead_funnel;
create view public.v_lead_funnel as
select
  stage,
  count(*) as cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.leads
where is_test = false
group by stage
order by array_position(array['new','contacted','qualified','quoted','closed'], stage);

-- 2. Conversion Rates
drop view if exists public.v_conversion_rates;
create view public.v_conversion_rates as
with totals as (
  select
    count(*) as total,
    count(*) filter (where stage != 'new') as contacted,
    count(*) filter (where stage in ('qualified','quoted','closed')) as qualified,
    count(*) filter (where stage in ('quoted','closed')) as quoted,
    count(*) filter (where stage = 'closed' and outcome = 'won') as won,
    count(*) filter (where stage = 'closed' and outcome = 'lost') as lost
  from public.leads
  where is_test = false
)
select
  total as total_leads,
  contacted,
  round(100.0 * contacted / nullif(total,0), 1) as contact_rate,
  qualified,
  round(100.0 * qualified / nullif(contacted,0), 1) as qualify_rate,
  quoted,
  round(100.0 * quoted / nullif(qualified,0), 1) as quote_rate,
  won,
  round(100.0 * won / nullif(quoted,0), 1) as close_rate,
  round(100.0 * won / nullif(total,0), 1) as overall_win_rate,
  lost,
  round(100.0 * lost / nullif(quoted + lost,0), 1) as loss_rate
from totals;

-- 3. Channel ROI
drop view if exists public.v_channel_roi;
create view public.v_channel_roi as
select
  coalesce(nullif(source,''), 'unknown') as channel,
  count(*) as leads,
  count(*) filter (where stage = 'closed' and outcome = 'won') as won,
  round(100.0 * count(*) filter (where stage = 'closed' and outcome = 'won') / nullif(count(*),0), 1) as win_rate,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(avg(response_time_min) filter (where response_time_min is not null), 0) as avg_response_min
from public.leads
where is_test = false
group by 1
order by revenue desc;

-- 4. Service Performance
drop view if exists public.v_service_performance;
create view public.v_service_performance as
select
  coalesce(nullif(l.service_type,''), 'unknown') as service,
  count(distinct l.id) as leads,
  count(distinct l.id) filter (where l.outcome = 'won') as won,
  coalesce(sum(l.won_amount) filter (where l.outcome = 'won'), 0) as revenue,
  round(avg(j.total_amount) filter (where j.status = 'completed'), 2) as avg_job_value,
  round(avg(j.duration_hours) filter (where j.status = 'completed'), 1) as avg_hours,
  round(avg(j.rating) filter (where j.rating is not null), 1) as avg_rating,
  count(distinct j.id) filter (where j.status = 'completed') as jobs_completed
from public.leads l
left join public.jobs j on j.lead_id = l.id
where l.is_test = false
group by 1
order by revenue desc;

-- 5. Geographic Heatmap
drop view if exists public.v_geo_heatmap;
create view public.v_geo_heatmap as
select
  coalesce(nullif(zip,''), 'unknown') as zip,
  count(*) as leads,
  count(*) filter (where outcome = 'won') as won,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1) as win_rate
from public.leads
where zip is not null and zip != '' and is_test = false
group by 1
order by revenue desc;

-- 6. Daily Trends
drop view if exists public.v_daily_trends;
create view public.v_daily_trends as
select
  d.dt::date as day,
  coalesce(l.new_leads, 0) as new_leads,
  coalesce(l.won_leads, 0) as won_leads,
  coalesce(l.revenue, 0) as revenue,
  coalesce(c.sessions, 0) as chat_sessions,
  coalesce(c.messages, 0) as chat_messages,
  coalesce(j.completed, 0) as jobs_done,
  coalesce(j.job_revenue, 0) as job_revenue
from generate_series(
  current_date - interval '30 days',
  current_date,
  interval '1 day'
) d(dt)
left join lateral (
  select
    count(*) as new_leads,
    count(*) filter (where outcome = 'won') as won_leads,
    coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue
  from public.leads
  where created_at::date = d.dt::date and is_test = false
) l on true
left join lateral (
  select
    count(distinct session_id) as sessions,
    count(*) as messages
  from public.ai_conversations
  where created_at::date = d.dt::date and message_role = 'user'
) c on true
left join lateral (
  select
    count(*) as completed,
    coalesce(sum(total_amount), 0) as job_revenue
  from public.jobs
  where completed_date = d.dt::date and status = 'completed'
) j on true
order by day desc;

-- 7. Weekly Summary
drop view if exists public.v_weekly_summary;
create view public.v_weekly_summary as
select
  date_trunc('week', created_at)::date as week_start,
  count(*) as leads,
  count(*) filter (where stage = 'closed' and outcome = 'won') as won,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(avg(response_time_min) filter (where response_time_min > 0), 0) as avg_response_min,
  round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1) as win_rate
from public.leads
where is_test = false
group by 1
order by 1 desc;

-- 8. Response Time Distribution
drop view if exists public.v_response_time_dist;
create view public.v_response_time_dist as
select
  case
    when response_time_min <= 5 then '0-5 min'
    when response_time_min <= 15 then '5-15 min'
    when response_time_min <= 30 then '15-30 min'
    when response_time_min <= 60 then '30-60 min'
    when response_time_min <= 240 then '1-4 hours'
    else '4+ hours'
  end as bucket,
  count(*) as cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.leads
where response_time_min is not null and response_time_min > 0 and is_test = false
group by 1
order by min(response_time_min);

-- 9. Chat Analytics (uses ai_conversations, not leads directly — but check converted_to_lead)
drop view if exists public.v_chat_analytics;
create view public.v_chat_analytics as
select
  session_id,
  min(created_at) as started_at,
  max(created_at) as last_msg_at,
  count(*) as total_messages,
  count(*) filter (where message_role = 'user') as user_messages,
  extract(epoch from (max(created_at) - min(created_at))) / 60 as duration_min,
  case
    when exists (
      select 1 from public.leads l where l.session_id = ac.session_id and l.is_test = false
    ) then true else false
  end as converted_to_lead,
  case when session_id like 'fb_%' then 'facebook' else 'website' end as channel
from public.ai_conversations ac
where session_id is not null
group by session_id;

-- 10. Loss Reasons (already filters outcome='lost', but add is_test for safety)
drop view if exists public.v_loss_reasons;
create view public.v_loss_reasons as
select
  lost_reason,
  case lost_reason
    when 'L1' then 'Price too high'
    when 'L2' then 'Chose competitor'
    when 'L3' then 'Changed mind / postponed'
    when 'L4' then 'No response'
    when 'L5' then 'Out of service area'
    when 'L6' then 'Other'
  end as reason_label,
  count(*) as cnt,
  coalesce(sum(quoted_amount), 0) as lost_revenue
from public.leads
where outcome = 'lost' and lost_reason is not null and is_test = false
group by 1
order by cnt desc;

-- 11. Repeat Customers (queries jobs, not leads — no change needed, but add safety)
-- v_repeat_customers, v_reviews_summary, v_capacity, v_monthly_pl do not query leads — no change needed
