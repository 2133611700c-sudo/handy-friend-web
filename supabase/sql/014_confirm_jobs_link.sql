-- ============================================================
-- 014_confirm_jobs_link.sql
-- CONFIRM RUN: Apply jobs→leads linking
--
-- PREREQUISITE: Run 014_fix_dashboard_and_jobs_link.sql first!
-- That script creates: phone_normalize(), snapshots, and DRY RUN preview.
-- Only run THIS script after reviewing the DRY RUN output.
--
-- Idempotent: safe to run multiple times (only updates unlinked jobs).
-- ============================================================

-- Safety check: ensure phone_normalize exists
do $$
begin
  perform phone_normalize('2135551234');
exception when undefined_function then
  raise exception 'phone_normalize() not found. Run 014_fix_dashboard_and_jobs_link.sql first!';
end $$;

-- Safety check: ensure snapshot exists
do $$
begin
  if (select count(*) from public._snapshot_014_jobs) = 0 then
    raise exception 'Snapshot table _snapshot_014_jobs is empty. Run 014_fix_dashboard_and_jobs_link.sql first!';
  end if;
end $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  F. CONFIRM: Link jobs → leads using phone_normalize()   │
-- └─────────────────────────────────────────────────────────┘

-- Step 1: Link jobs to leads by normalized phone match
update public.jobs j
set lead_id = matched.lead_id
from (
  select distinct on (j2.id)
    j2.id as job_id,
    l.id as lead_id
  from public.jobs j2
  join public.leads l on
    phone_normalize(j2.customer_phone) = phone_normalize(l.phone)
    and phone_normalize(l.phone) is not null
    and l.is_test = false
  where j2.lead_id is null
    and j2.customer_phone is not null
    and l.phone is not null
    and j2.scheduled_date is not null
    and j2.scheduled_date between (l.created_at::date - 7) and (l.created_at::date + 30)
  order by j2.id, abs(j2.scheduled_date - l.created_at::date) asc
) matched
where j.id = matched.job_id;

-- Step 2: Update linked leads to closed/won status
update public.leads l
set
  stage = 'closed',
  outcome = 'won',
  closed_at = coalesce(l.closed_at, j.completed_date::timestamptz),
  won_amount = coalesce(l.won_amount, j.total_amount),
  updated_at = now()
from public.jobs j
where j.lead_id = l.id
  and j.status = 'completed'
  and l.stage in ('new', 'contacted', 'qualified', 'quoted')
  and l.is_test = false;

-- Step 3: Log linking events
insert into public.lead_events (lead_id, event_type, event_payload)
select
  j.lead_id,
  'job_linked',
  jsonb_build_object(
    'job_id', j.id,
    'service_type', j.service_type,
    'total_amount', j.total_amount,
    'completed_date', j.completed_date,
    'migration', '014_confirm',
    'timestamp', now()
  )
from public.jobs j
where j.lead_id is not null
  and not exists (
    select 1 from public.lead_events le
    where le.lead_id = j.lead_id
      and le.event_type = 'job_linked'
      and (le.event_payload->>'job_id')::text = j.id::text
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │  VERIFICATION                                            │
-- └─────────────────────────────────────────────────────────┘

select '=== CONFIRM RUN RESULTS ===' as status;

-- Jobs linkage summary
select
  count(*) as total_jobs,
  count(*) filter (where lead_id is not null) as linked,
  count(*) filter (where lead_id is null) as unlinked,
  coalesce(sum(total_amount) filter (where lead_id is not null), 0) as linked_revenue,
  coalesce(sum(total_amount) filter (where lead_id is null), 0) as unlinked_revenue
from public.jobs;

-- Pipeline stages after update
select stage, outcome, count(*) as cnt
from public.leads
where is_test = false
group by stage, outcome
order by stage;

-- Compare with snapshot
select
  'DIFF' as check_type,
  (select count(*) from jobs where lead_id is not null)
    - (select count(*) from _snapshot_014_jobs where lead_id is not null) as jobs_newly_linked,
  (select count(*) from leads where stage != 'new' and is_test = false)
    - (select count(*) from _snapshot_014_leads where stage != 'new' and is_test = false) as leads_stage_changed;

-- Full monitoring view
select * from v_pipeline_monitoring;

-- Updated dashboard
select dashboard_stats(30);
