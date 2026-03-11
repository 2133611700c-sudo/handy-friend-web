-- ============================================================
-- 014_rollback.sql
-- ROLLBACK for migration 014
--
-- Restores: leads, jobs from snapshot tables.
-- Drops: phone_normalize(), advance_lead_stage() (new in 014),
--         v_pipeline_monitoring, snapshot tables.
-- Reverts: dashboard_stats() to pre-014 version (no is_test filter).
--
-- SAFE: Only runs if snapshot tables exist.
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  1. RESTORE LEADS from snapshot                          │
-- └─────────────────────────────────────────────────────────┘

-- Restore lead_id on jobs (set all back to snapshot state)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = '_snapshot_014_jobs') then
    update public.jobs j
    set lead_id = s.lead_id
    from public._snapshot_014_jobs s
    where j.id = s.id;
    raise notice 'ROLLBACK: jobs.lead_id restored from snapshot';
  else
    raise notice 'ROLLBACK: _snapshot_014_jobs not found, skipping jobs restore';
  end if;
end $$;

-- Restore lead fields (stage, outcome, won_amount, closed_at)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = '_snapshot_014_leads') then
    update public.leads l
    set
      stage = s.stage,
      outcome = s.outcome,
      won_amount = s.won_amount,
      closed_at = s.closed_at,
      updated_at = s.updated_at
    from public._snapshot_014_leads s
    where l.id = s.id;
    raise notice 'ROLLBACK: leads restored from snapshot';
  else
    raise notice 'ROLLBACK: _snapshot_014_leads not found, skipping leads restore';
  end if;
end $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  2. REMOVE events added by migration                     │
-- └─────────────────────────────────────────────────────────┘

delete from public.lead_events
where event_type in ('job_linked', 'stage_change')
  and (event_payload->>'migration')::text = '014_confirm';

-- ┌─────────────────────────────────────────────────────────┐
-- │  3. REVERT dashboard_stats() to pre-014 (no is_test)     │
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
    'leads_total', (select count(*) from leads where created_at >= since),
    'leads_prev', (select count(*) from leads where created_at >= prev_since and created_at < since),
    'leads_by_source', (
      select jsonb_object_agg(coalesce(nullif(source,''),'unknown'), cnt)
      from (select source, count(*) as cnt from leads where created_at >= since group by source) s
    ),
    'leads_by_service', (
      select jsonb_object_agg(coalesce(nullif(service_type,''),'unknown'), cnt)
      from (select service_type, count(*) as cnt from leads where created_at >= since group by service_type) s
    ),
    'leads_by_stage', (
      select jsonb_object_agg(stage, cnt)
      from (select stage, count(*) as cnt from leads where created_at >= since group by stage) s
    ),
    'revenue', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= since), 0),
    'revenue_prev', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= prev_since and closed_at < since), 0),
    'avg_deal_size', (select round(avg(won_amount),2) from leads where outcome = 'won' and closed_at >= since),
    'pipeline_value', coalesce((select sum(quoted_amount) from leads where stage in ('quoted','qualified') and quoted_amount > 0), 0),
    'jobs_completed', (select count(*) from jobs where status = 'completed' and completed_date >= since::date),
    'jobs_revenue', coalesce((select sum(total_amount) from jobs where status = 'completed' and completed_date >= since::date), 0),
    'jobs_scheduled', (select count(*) from jobs where status = 'scheduled' and scheduled_date >= current_date),
    'avg_job_rating', (select round(avg(rating)::numeric,2) from jobs where rating is not null and completed_date >= since::date),
    'avg_response_min', (select round(avg(response_time_min)::numeric,0) from leads where response_time_min > 0 and created_at >= since),
    'conversion_rate', (
      select round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1)
      from leads where created_at >= since
    ),
    'chat_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since),
    'chat_messages', (select count(*) from ai_conversations where created_at >= since and message_role = 'user'),
    'fb_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since and session_id like 'fb_%'),
    'reviews_total', (select count(*) from reviews where created_at >= since),
    'reviews_avg_rating', (select round(avg(rating)::numeric,2) from reviews where created_at >= since),
    'expenses_total', coalesce((select sum(amount) from expenses where created_at >= since), 0),
    'profit', coalesce((select sum(total_amount) from jobs where status='completed' and completed_date >= since::date),0)
              - coalesce((select sum(amount) from expenses where created_at >= since),0),
    'stale_leads', (select count(*) from leads where stage = 'new' and created_at < now() - interval '24 hours'),
    'unresponded_reviews', (select count(*) from reviews where not responded),
    'overdue_jobs', (select count(*) from jobs where status = 'scheduled' and scheduled_date < current_date)
  ) into result;
  return result;
end;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  4. DROP new objects from 014                            │
-- └─────────────────────────────────────────────────────────┘

drop view if exists public.v_pipeline_monitoring;
drop function if exists public.advance_lead_stage(text, text, jsonb);
drop function if exists public.phone_normalize(text);

-- ┌─────────────────────────────────────────────────────────┐
-- │  5. CLEANUP snapshot tables                              │
-- └─────────────────────────────────────────────────────────┘

drop table if exists public._snapshot_014_leads;
drop table if exists public._snapshot_014_jobs;
drop table if exists public._snapshot_014_lead_events;

select '=== ROLLBACK COMPLETE ===' as status;
select dashboard_stats(30);
