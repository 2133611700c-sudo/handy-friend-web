do $$
declare
  v_status text;
  v_stage text;
  v_outcome text;
begin
  select pg_get_constraintdef(oid) into v_status
  from pg_constraint
  where conname = 'leads_status_check'
  limit 1;

  select pg_get_constraintdef(oid) into v_stage
  from pg_constraint
  where conname = 'chk_stage'
  limit 1;

  select pg_get_constraintdef(oid) into v_outcome
  from pg_constraint
  where conname = 'chk_outcome_consistency'
  limit 1;

  raise notice 'leads_status_check=%', coalesce(v_status, '<missing>');
  raise notice 'chk_stage=%', coalesce(v_stage, '<missing>');
  raise notice 'chk_outcome_consistency=%', coalesce(v_outcome, '<missing>');
end $$;
