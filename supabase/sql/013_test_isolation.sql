-- ============================================================
-- 013_test_isolation.sql
-- Handy & Friend — Test/Prod Isolation + Data Quality
--
-- Adds:
--   A. is_test / test_reason / test_actor columns on leads
--   B. Backfill existing test leads
--   C. DB trigger for auto-detection on INSERT/UPDATE
--   D. Views: v_leads_prod, v_leads_test
--
-- Idempotent: safe to run multiple times.
-- Run in Supabase SQL Editor → New Query → Run
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  A. ADD TEST ISOLATION COLUMNS                          │
-- └─────────────────────────────────────────────────────────┘

alter table public.leads add column if not exists is_test boolean not null default false;
alter table public.leads add column if not exists test_reason text;
alter table public.leads add column if not exists test_actor text;

create index if not exists leads_is_test_idx on public.leads (is_test);

-- ┌─────────────────────────────────────────────────────────┐
-- │  B. BACKFILL EXISTING TEST LEADS                        │
-- └─────────────────────────────────────────────────────────┘

-- Rule 1: Phone contains 555 (fake US phone pattern)
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, '555_phone'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and phone is not null
  and phone like '%555%';

-- Rule 2: Business phone number
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, 'business_phone'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and phone is not null
  and replace(replace(replace(replace(phone, '-', ''), ' ', ''), '(', ''), ')', '') like '%2133611700%';

-- Rule 3: Name contains test/audit/probe/smoke/debug
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, 'test_name'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and full_name is not null
  and (
    lower(full_name) ~ '(test|audit|probe|smoke|debug|migr)'
  );

-- Rule 4: Email contains test/smoke
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, 'test_email'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and email is not null
  and (
    lower(email) ~ '(test|smoke|debug|probe)'
  );

-- Rule 5: service_type = 'test'
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, 'test_service'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and lower(service_type) = 'test';

-- Rule 6: Phone pattern 111-1111 or 000-0000 (repetitive fake)
update public.leads
set is_test = true,
    test_reason = coalesce(test_reason, 'repetitive_phone'),
    test_actor = coalesce(test_actor, 'backfill_013')
where is_test = false
  and phone is not null
  and replace(replace(replace(replace(phone, '-', ''), ' ', ''), '(', ''), ')', '') ~ '(1111111|0000000|9990000)';

-- ┌─────────────────────────────────────────────────────────┐
-- │  C. AUTO-DETECT TRIGGER ON INSERT/UPDATE                │
-- └─────────────────────────────────────────────────────────┘

create or replace function public.auto_detect_test_lead()
returns trigger language plpgsql as $$
declare
  phone_digits text;
begin
  -- Skip if already manually flagged as test
  if new.is_test = true then
    return new;
  end if;

  -- Normalize phone to digits only
  phone_digits := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');

  -- Rule 1: 555 in phone
  if new.phone is not null and position('555' in new.phone) > 0 then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, '555_phone');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  -- Rule 2: Business phone
  if phone_digits like '%2133611700%' then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, 'business_phone');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  -- Rule 3: Repetitive phone patterns
  if phone_digits ~ '(1111111|0000000|9990000)' then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, 'repetitive_phone');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  -- Rule 4: Name contains test keywords
  if new.full_name is not null
    and lower(new.full_name) ~ '(test|audit|probe|smoke|debug|migr)'
  then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, 'test_name');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  -- Rule 5: Email contains test keywords
  if new.email is not null
    and lower(new.email) ~ '(test|smoke|debug|probe)'
  then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, 'test_email');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  -- Rule 6: service_type = 'test'
  if lower(coalesce(new.service_type, '')) = 'test' then
    new.is_test := true;
    new.test_reason := coalesce(new.test_reason, 'test_service');
    new.test_actor := coalesce(new.test_actor, 'trigger_auto');
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_detect_test on public.leads;
create trigger trg_auto_detect_test
  before insert or update on public.leads
  for each row execute function public.auto_detect_test_lead();

-- ┌─────────────────────────────────────────────────────────┐
-- │  D. VIEWS: v_leads_prod / v_leads_test                  │
-- └─────────────────────────────────────────────────────────┘

create or replace view public.v_leads_prod as
select * from public.leads where is_test = false;

create or replace view public.v_leads_test as
select * from public.leads where is_test = true;

-- Update existing funnel view to use prod-only data
create or replace view public.v_lead_funnel as
select
  stage,
  count(*) as cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.leads
where is_test = false
group by stage
order by array_position(array['new','contacted','qualified','quoted','closed'], stage);

-- ┌─────────────────────────────────────────────────────────┐
-- │  VERIFICATION                                            │
-- └─────────────────────────────────────────────────────────┘

select
  count(*) as total,
  count(*) filter (where is_test = true) as test_leads,
  count(*) filter (where is_test = false) as prod_leads
from public.leads;
