-- ============================================================
-- 014_fix_dashboard_and_jobs_link.sql
-- Handy & Friend — Fix Dashboard Stats + Link Jobs to Leads
--
-- Sections:
--   A. Snapshot key tables (backup before changes)
--   B. phone_normalize() utility function
--   C. dashboard_stats() — exclude test leads, add monitoring
--   D. advance_lead_stage() — safe pipeline transitions
--   E. DRY RUN: jobs→leads matching preview (SELECT only)
--   F. CONFIRM RUN: jobs→leads linking (UPDATE) — run ONLY after DRY RUN review
--   G. Monitoring metrics view
--   H. Verification queries
--
-- Rollback: see 014_rollback.sql
-- Idempotent: all CREATE OR REPLACE, safe to run multiple times.
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  A. SNAPSHOT — backup key tables before changes          │
-- └─────────────────────────────────────────────────────────┘

-- Snapshot tables: drop-if-exists + create-as-select (idempotent)
drop table if exists public._snapshot_014_leads;
create table public._snapshot_014_leads as
  select id, full_name, phone, email, service_type, stage, outcome,
         is_test, won_amount, closed_at, created_at, updated_at
  from public.leads;

drop table if exists public._snapshot_014_jobs;
create table public._snapshot_014_jobs as
  select id, lead_id, status, service_type, customer_phone, customer_name,
         total_amount, completed_date, scheduled_date
  from public.jobs;

drop table if exists public._snapshot_014_lead_events;
create table public._snapshot_014_lead_events as
  select id, lead_id, event_type, created_at
  from public.lead_events;

-- Tag snapshot
do $$ begin
  raise notice 'SNAPSHOT CREATED: _snapshot_014_leads (% rows), _snapshot_014_jobs (% rows), _snapshot_014_lead_events (% rows)',
    (select count(*) from public._snapshot_014_leads),
    (select count(*) from public._snapshot_014_jobs),
    (select count(*) from public._snapshot_014_lead_events);
end $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  B. phone_normalize() — canonical phone normalization    │
-- └─────────────────────────────────────────────────────────┘

create or replace function public.phone_normalize(raw_phone text)
returns text
language plpgsql immutable strict
as $$
declare
  digits text;
begin
  if raw_phone is null or raw_phone = '' then
    return null;
  end if;

  -- Strip everything except digits
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  -- If starts with 1 and is 11 digits (US country code), strip leading 1
  if length(digits) = 11 and left(digits, 1) = '1' then
    digits := substring(digits from 2);
  end if;

  -- Must be at least 10 digits to be valid US phone
  if length(digits) < 10 then
    return null;
  end if;

  -- Return last 10 digits (handles intl prefixes)
  return right(digits, 10);
end;
$$;

comment on function public.phone_normalize(text) is
  'Normalize phone to 10-digit US format. Strips formatting, country code. Returns NULL if < 10 digits.';

-- ┌─────────────────────────────────────────────────────────┐
-- │  C. dashboard_stats() — exclude test leads + monitoring  │
-- └─────────────────────────────────────────────────────────┘

create or replace function public.dashboard_stats(
  p_days integer default 30
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  result jsonb;
  since timestamptz := now() - (p_days || ' days')::interval;
  prev_since timestamptz := since - (p_days || ' days')::interval;
begin
  select jsonb_build_object(
    'period_days', p_days,
    'generated_at', now(),

    -- Leads (PROD only — excludes is_test=true)
    'leads_total', (select count(*) from leads where created_at >= since and is_test = false),
    'leads_prev', (select count(*) from leads where created_at >= prev_since and created_at < since and is_test = false),
    'leads_by_source', (
      select coalesce(jsonb_object_agg(coalesce(nullif(source,''),'unknown'), cnt), '{}'::jsonb)
      from (select source, count(*) as cnt from leads where created_at >= since and is_test = false group by source) s
    ),
    'leads_by_service', (
      select coalesce(jsonb_object_agg(coalesce(nullif(service_type,''),'unknown'), cnt), '{}'::jsonb)
      from (select service_type, count(*) as cnt from leads where created_at >= since and is_test = false group by service_type) s
    ),
    'leads_by_stage', (
      select coalesce(jsonb_object_agg(coalesce(stage, 'unknown'), cnt), '{}'::jsonb)
      from (select stage, count(*) as cnt from leads where created_at >= since and is_test = false group by stage) s
    ),

    -- Revenue (from leads pipeline)
    'revenue', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= since and is_test = false), 0),
    'revenue_prev', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= prev_since and closed_at < since and is_test = false), 0),
    'avg_deal_size', (select round(avg(won_amount),2) from leads where outcome = 'won' and closed_at >= since and is_test = false),
    'pipeline_value', coalesce((select sum(quoted_amount) from leads where stage in ('quoted','qualified') and quoted_amount > 0 and is_test = false), 0),

    -- Jobs (independent tracking — always real)
    'jobs_completed', (select count(*) from jobs where status = 'completed' and completed_date >= since::date),
    'jobs_revenue', coalesce((select sum(total_amount) from jobs where status = 'completed' and completed_date >= since::date), 0),
    'jobs_scheduled', (select count(*) from jobs where status = 'scheduled' and scheduled_date >= current_date),
    'avg_job_rating', (select round(avg(rating)::numeric,2) from jobs where rating is not null and completed_date >= since::date),

    -- Performance (PROD only)
    'avg_response_min', (select round(avg(response_time_min)::numeric,0) from leads where response_time_min > 0 and created_at >= since and is_test = false),
    'conversion_rate', (
      select round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1)
      from leads where created_at >= since and is_test = false
    ),

    -- Chat
    'chat_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since),
    'chat_messages', (select count(*) from ai_conversations where created_at >= since and message_role = 'user'),
    'fb_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since and session_id like 'fb_%'),

    -- Reviews
    'reviews_total', (select count(*) from reviews where created_at >= since),
    'reviews_avg_rating', (select round(avg(rating)::numeric,2) from reviews where created_at >= since),

    -- Expenses
    'expenses_total', coalesce((select sum(amount) from expenses where created_at >= since), 0),
    'profit', coalesce((select sum(total_amount) from jobs where status='completed' and completed_date >= since::date),0)
              - coalesce((select sum(amount) from expenses where created_at >= since),0),

    -- Alerts (PROD only)
    'stale_leads', (select count(*) from leads where stage = 'new' and created_at < now() - interval '24 hours' and is_test = false),
    'unresponded_reviews', (select count(*) from reviews where not responded),
    'overdue_jobs', (select count(*) from jobs where status = 'scheduled' and scheduled_date < current_date),

    -- Diagnostic
    'leads_total_all', (select count(*) from leads where created_at >= since),
    'test_leads_count', (select count(*) from leads where created_at >= since and is_test = true),

    -- Monitoring metrics (new in 014)
    'duplicate_leads_blocked', (
      select count(*) from lead_events
      where event_type = 'merge' and created_at >= since
    ),
    'unmatched_jobs_count', (
      select count(*) from jobs where lead_id is null
    ),
    'pipeline_progress_24h', (
      select count(*) from lead_events
      where event_type = 'stage_change' and created_at >= now() - interval '24 hours'
    ),
    'jobs_linked_count', (
      select count(*) from jobs where lead_id is not null
    )
  ) into result;

  return result;
end;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  D. advance_lead_stage() — safe pipeline transitions     │
-- └─────────────────────────────────────────────────────────┘

create or replace function public.advance_lead_stage(
  p_lead_id text,
  p_new_stage text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  current_stage text;
  stages text[] := array['new', 'contacted', 'qualified', 'quoted', 'closed'];
  current_idx int;
  new_idx int;
begin
  select stage into current_stage from leads where id = p_lead_id;
  if current_stage is null then
    return jsonb_build_object('ok', false, 'error', 'lead_not_found');
  end if;

  current_idx := array_position(stages, coalesce(current_stage, 'new'));
  new_idx := array_position(stages, p_new_stage);

  if current_idx is null then current_idx := 1; end if;
  if new_idx is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_stage', 'valid', to_jsonb(stages));
  end if;

  if new_idx < current_idx then
    return jsonb_build_object('ok', false, 'error', 'cannot_go_backward',
      'current', current_stage, 'requested', p_new_stage);
  end if;

  if new_idx = current_idx then
    return jsonb_build_object('ok', true, 'stage', current_stage, 'note', 'no_change');
  end if;

  update leads set
    stage = p_new_stage,
    contacted_at = case when p_new_stage = 'contacted' and contacted_at is null then now() else contacted_at end,
    qualified_at = case when p_new_stage = 'qualified' and qualified_at is null then now() else qualified_at end,
    quoted_at    = case when p_new_stage = 'quoted'    and quoted_at is null    then now() else quoted_at end,
    closed_at    = case when p_new_stage = 'closed'    and closed_at is null    then now() else closed_at end,
    updated_at = now()
  where id = p_lead_id;

  insert into lead_events (lead_id, event_type, event_payload)
  values (p_lead_id, 'stage_change', jsonb_build_object(
    'from', current_stage,
    'to', p_new_stage,
    'metadata', p_metadata,
    'timestamp', now()
  ));

  return jsonb_build_object('ok', true, 'from', current_stage, 'to', p_new_stage);
end;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  E. DRY RUN — preview jobs→leads matching (SELECT only)  │
-- └─────────────────────────────────────────────────────────┘
-- Run this FIRST. Review the output. If correct, proceed to section F.

select
  '=== DRY RUN: Jobs → Leads Phone Match ===' as info;

select
  j.id as job_id,
  j.customer_name,
  j.customer_phone,
  phone_normalize(j.customer_phone) as job_phone_norm,
  j.service_type as job_service,
  j.status as job_status,
  j.total_amount,
  j.completed_date,
  j.scheduled_date,
  l.id as matched_lead_id,
  l.full_name as lead_name,
  l.phone as lead_phone,
  phone_normalize(l.phone) as lead_phone_norm,
  l.service_type as lead_service,
  l.is_test,
  l.stage as lead_stage,
  abs(j.scheduled_date - l.created_at::date) as days_apart
from public.jobs j
left join lateral (
  select l2.*
  from public.leads l2
  where phone_normalize(l2.phone) = phone_normalize(j.customer_phone)
    and phone_normalize(l2.phone) is not null
    and l2.is_test = false
    and j.scheduled_date is not null
    and j.scheduled_date between (l2.created_at::date - 7) and (l2.created_at::date + 30)
  order by abs(j.scheduled_date - l2.created_at::date) asc
  limit 1
) l on true
order by j.completed_date desc nulls last;

select
  '=== DRY RUN SUMMARY ===' as info,
  count(*) as total_jobs,
  count(*) filter (where lead_id is not null) as already_linked,
  count(*) filter (where lead_id is null) as unlinked
from public.jobs;

-- ┌─────────────────────────────────────────────────────────┐
-- │  G. MONITORING VIEW — v_pipeline_monitoring              │
-- └─────────────────────────────────────────────────────────┘

create or replace view public.v_pipeline_monitoring as
select
  -- Dedup metrics
  (select count(*) from lead_events where event_type = 'merge'
    and created_at >= now() - interval '24 hours') as duplicate_leads_blocked_24h,
  (select count(*) from lead_events where event_type = 'merge'
    and created_at >= now() - interval '7 days') as duplicate_leads_blocked_7d,

  -- Jobs linkage
  (select count(*) from jobs where lead_id is null) as unmatched_jobs_count,
  (select count(*) from jobs where lead_id is not null) as matched_jobs_count,

  -- Pipeline progress
  (select count(*) from lead_events where event_type = 'stage_change'
    and created_at >= now() - interval '24 hours') as pipeline_progress_24h,
  (select count(*) from lead_events where event_type = 'stage_change'
    and created_at >= now() - interval '7 days') as pipeline_progress_7d,

  -- Lead health
  (select count(*) from leads where is_test = false) as prod_leads_total,
  (select count(*) from leads where is_test = true) as test_leads_total,
  (select count(*) from leads where stage = 'new' and is_test = false
    and created_at < now() - interval '24 hours') as stale_leads,

  -- Snapshot verification
  (select count(*) from _snapshot_014_leads) as snapshot_leads_count,
  (select count(*) from _snapshot_014_jobs) as snapshot_jobs_count;

-- ┌─────────────────────────────────────────────────────────┐
-- │  H. VERIFICATION                                         │
-- └─────────────────────────────────────────────────────────┘

select '=== SECTION A-D+G COMPLETE. Review DRY RUN results above. ===' as status;
select '=== To apply jobs linking, run 014_confirm_jobs_link.sql ===' as next_step;
