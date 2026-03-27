-- Migration 027 — Outbound jobs atomic claim + strict state machine
-- Author: codex / 2026-03-27

-- 1) Harden outbound_jobs schema with lock + retry metadata.
alter table public.outbound_jobs
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists max_attempts int not null default 3,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure status domain supports processing state required for atomic workers.
alter table public.outbound_jobs
  drop constraint if exists outbound_jobs_status_check;

alter table public.outbound_jobs
  add constraint outbound_jobs_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

-- Ensure attempts cannot go negative.
alter table public.outbound_jobs
  drop constraint if exists outbound_jobs_attempts_nonnegative;

alter table public.outbound_jobs
  add constraint outbound_jobs_attempts_nonnegative
  check (attempts >= 0);

-- Keep updated_at fresh.
create or replace function public.outbound_jobs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_outbound_jobs_set_updated_at on public.outbound_jobs;
create trigger trg_outbound_jobs_set_updated_at
before update on public.outbound_jobs
for each row
execute function public.outbound_jobs_set_updated_at();

-- 2) Strict state machine for status transitions.
create or replace function public.outbound_jobs_validate_transition()
returns trigger
language plpgsql
as $$
begin
  -- immutable terminal states
  if old.status in ('sent', 'failed', 'skipped') and new.status <> old.status then
    raise exception 'outbound_jobs terminal state violation: % -> %', old.status, new.status;
  end if;

  -- allowed transitions
  if old.status = 'pending' and new.status not in ('pending', 'processing', 'skipped') then
    raise exception 'outbound_jobs transition violation: pending -> %', new.status;
  end if;

  if old.status = 'processing' and new.status not in ('processing', 'pending', 'sent', 'failed') then
    raise exception 'outbound_jobs transition violation: processing -> %', new.status;
  end if;

  -- lock invariants
  if new.status = 'processing' then
    if new.locked_at is null or coalesce(new.locked_by, '') = '' then
      raise exception 'outbound_jobs processing requires locked_at + locked_by';
    end if;
  else
    if new.locked_at is not null or new.locked_by is not null then
      raise exception 'outbound_jobs non-processing rows must have null lock fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_outbound_jobs_validate_transition on public.outbound_jobs;
create trigger trg_outbound_jobs_validate_transition
before update on public.outbound_jobs
for each row
execute function public.outbound_jobs_validate_transition();

-- 3) Atomic claim function for workers with SKIP LOCKED and lock recovery.
create or replace function public.claim_outbound_jobs(
  p_batch_size int default 20,
  p_worker_id text default 'worker',
  p_lock_ttl_seconds int default 300
)
returns setof public.outbound_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.outbound_jobs j
    where
      (
        j.status = 'pending'
        and j.scheduled_at <= now()
      )
      or
      (
        j.status = 'processing'
        and j.locked_at is not null
        and j.locked_at < now() - make_interval(secs => greatest(1, p_lock_ttl_seconds))
      )
    order by j.scheduled_at asc, j.created_at asc
    limit greatest(1, p_batch_size)
    for update skip locked
  )
  update public.outbound_jobs j
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

grant execute on function public.claim_outbound_jobs(int, text, int) to service_role;

-- 4) Indexes for atomic claim path.
create index if not exists idx_outbound_jobs_claim_pending
  on public.outbound_jobs (scheduled_at, created_at)
  where status = 'pending';

create index if not exists idx_outbound_jobs_claim_processing_lock
  on public.outbound_jobs (locked_at, scheduled_at)
  where status = 'processing';

