-- Ensure completed jobs are linked to deterministic backfill leads created in 019.

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
    'source', '020_link_completed_jobs',
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
