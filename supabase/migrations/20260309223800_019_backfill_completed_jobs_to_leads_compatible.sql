-- Backfill legacy completed jobs that still have lead_id null.
-- Compatible with current production constraints:
--   leads.status allows: new, contacted, quoted, booked, completed, lost, partial, spam
--   leads.stage allows: new, contacted, qualified, quoted, closed

with src as (
  select
    j.id as job_id,
    ('jobbackfill_' || replace(j.id::text, '-', ''))::text as backfill_lead_id,
    coalesce(j.completed_date::timestamptz, j.created_at, now()) as closed_ts,
    j.customer_name,
    j.customer_phone,
    j.customer_email,
    j.city,
    j.zip,
    j.service_type,
    j.total_amount,
    j.notes
  from public.jobs j
  where j.status = 'completed'
    and j.lead_id is null
), ins as (
  insert into public.leads (
    id, created_at, updated_at,
    source, status,
    full_name, phone, email, city, zip,
    service_type, problem_description,
    stage, outcome,
    contacted_at, qualified_at, quoted_at, closed_at,
    quoted_amount, won_amount,
    source_details, is_test
  )
  select
    s.backfill_lead_id,
    s.closed_ts,
    now(),
    'backfill_jobs',
    'completed',
    coalesce(nullif(s.customer_name, ''), 'Backfilled Customer'),
    s.customer_phone,
    s.customer_email,
    s.city,
    s.zip,
    s.service_type,
    coalesce(nullif(s.notes, ''), 'Backfilled from completed job ' || s.job_id::text),
    'closed',
    'won',
    s.closed_ts,
    s.closed_ts,
    s.closed_ts,
    s.closed_ts,
    coalesce(s.total_amount, 0),
    coalesce(s.total_amount, 0),
    jsonb_build_object('source', '019_backfill_completed_jobs', 'job_id', s.job_id::text),
    false
  from src s
  where not exists (
    select 1 from public.leads l where l.id = s.backfill_lead_id
  )
  returning id
)
update public.jobs j
set lead_id = ('jobbackfill_' || replace(j.id::text, '-', ''))::text
where j.status = 'completed'
  and j.lead_id is null
  and exists (
    select 1
    from public.leads l
    where l.id = ('jobbackfill_' || replace(j.id::text, '-', ''))::text
  );

insert into public.lead_events (lead_id, event_type, event_payload)
select
  ('jobbackfill_' || replace(j.id::text, '-', ''))::text as lead_id,
  'job_linked',
  jsonb_build_object(
    'job_id', j.id::text,
    'job_status', j.status,
    'job_amount', j.total_amount,
    'source', '019_backfill_completed_jobs',
    'linked_at', now()
  )
from public.jobs j
where j.status = 'completed'
  and j.lead_id = ('jobbackfill_' || replace(j.id::text, '-', ''))::text
  and not exists (
    select 1
    from public.lead_events le
    where le.lead_id = ('jobbackfill_' || replace(j.id::text, '-', ''))::text
      and le.event_type = 'job_linked'
      and coalesce(le.event_payload->>'job_id', '') = j.id::text
  );
