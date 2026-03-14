-- Fix UUID/text compare bug introduced in 015 jobs trigger
create or replace function public.jobs_sync_lead_stage()
returns trigger
language plpgsql
as $$
begin
  if new.lead_id is null then
    return new;
  end if;

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
