-- ============================================================
-- 015_pipeline_enforcement.sql
-- Handy & Friend — Critical pipeline hardening
--
-- Goals:
--   1) Auto-link new jobs -> leads by normalized phone
--   2) Block NEW completed jobs without lead_id
--   3) Sync lead stage/outcome when a job is completed
--
-- Safe/idempotent: can be re-run.
-- ============================================================

-- Phone normalize helper (same behavior as 014)
create or replace function public.phone_normalize(raw_phone text)
returns text language sql immutable as $$
  select case
    when raw_phone is null then null
    else right(regexp_replace(raw_phone, '[^0-9]', '', 'g'), 10)
  end
$$;

-- ------------------------------------------------------------
-- A) BEFORE trigger: auto-link jobs by customer_phone
-- ------------------------------------------------------------
create or replace function public.jobs_autolink_lead()
returns trigger
language plpgsql
as $$
declare
  norm_phone text;
  matched_lead_id text;
begin
  -- If lead already assigned, keep it.
  if new.lead_id is not null then
    return new;
  end if;

  norm_phone := public.phone_normalize(new.customer_phone);

  if coalesce(norm_phone, '') <> '' then
    select l.id
      into matched_lead_id
    from public.leads l
    where coalesce(l.is_test, false) = false
      and public.phone_normalize(l.phone) = norm_phone
    order by l.updated_at desc nulls last, l.created_at desc
    limit 1;

    if matched_lead_id is not null then
      new.lead_id := matched_lead_id;
    end if;
  end if;

  -- Enforce for new writes: completed jobs must have lead_id.
  if new.status = 'completed' and new.lead_id is null then
    raise exception 'jobs.completed requires lead_id (autolink failed, provide lead_id explicitly)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobs_autolink_lead on public.jobs;
create trigger trg_jobs_autolink_lead
before insert or update of customer_phone, lead_id, status
on public.jobs
for each row
execute function public.jobs_autolink_lead();

-- ------------------------------------------------------------
-- B) AFTER trigger: sync lead stage after job completion
-- ------------------------------------------------------------
create or replace function public.jobs_sync_lead_stage()
returns trigger
language plpgsql
as $$
begin
  if new.lead_id is null then
    return new;
  end if;

  -- Keep a durable link event for audit trail.
  insert into public.lead_events (lead_id, event_type, event_payload)
  select
    new.lead_id,
    'job_linked',
    jsonb_build_object(
      'job_id', new.id,
      'job_status', new.status,
      'job_amount', new.total_amount,
      'source', 'jobs_trigger_015',
      'linked_at', now()
    )
  where not exists (
    select 1
    from public.lead_events le
    where le.lead_id = new.lead_id
      and le.event_type = 'job_linked'
      and coalesce(le.event_payload->>'job_id', '') = new.id::text
  );

  -- On completed jobs, force lead -> closed/won for clean ROI accounting.
  if new.status = 'completed' then
    update public.leads l
    set
      stage = 'closed',
      outcome = coalesce(l.outcome, 'won'),
      won_amount = case
        when coalesce(l.won_amount, 0) > 0 then l.won_amount
        else coalesce(new.total_amount, l.won_amount)
      end,
      closed_at = coalesce(l.closed_at, now()),
      updated_at = now()
    where l.id = new.lead_id
      and (
        l.stage is distinct from 'closed'
        or l.outcome is distinct from 'won'
        or l.closed_at is null
      );

    insert into public.lead_events (lead_id, event_type, event_payload)
    values (
      new.lead_id,
      'stage_change',
      jsonb_build_object(
        'from', 'auto',
        'to', 'closed',
        'outcome', 'won',
        'job_id', new.id,
        'source', 'jobs_trigger_015',
        'changed_at', now()
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobs_sync_lead_stage on public.jobs;
create trigger trg_jobs_sync_lead_stage
after insert or update of status, lead_id, total_amount
on public.jobs
for each row
execute function public.jobs_sync_lead_stage();

-- ------------------------------------------------------------
-- C) Guard rail constraint for new writes
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_completed_requires_lead_id'
  ) then
    alter table public.jobs
      add constraint jobs_completed_requires_lead_id
      check (status <> 'completed' or lead_id is not null)
      not valid;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Verification helpers
-- ------------------------------------------------------------
select
  count(*) as total_jobs,
  count(*) filter (where status = 'completed') as completed_jobs,
  count(*) filter (where status = 'completed' and lead_id is null) as completed_without_lead,
  count(*) filter (where lead_id is not null) as linked_jobs
from public.jobs;
