-- ============================================================
-- Migration 024: Supabase Security Advisor Fixes
-- Fixes: 0011 (search_path mutable), 0013 (RLS disabled),
--        0014 (extensions in public)
-- Date: 2026-03-11
--
-- SAFETY: Function bodies are EXACT copies from production
-- (migrations 012, 013, 021). ONLY change: adding
-- SET search_path = public to each function.
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  Part 1: Fix search_path on public functions             │
-- │  Check 0011: Function search path mutable                │
-- │                                                          │
-- │  Functions already having search_path (NOT touched):     │
-- │   - dashboard_stats() — from 023                         │
-- │   - refresh_daily_stats() — from 023                     │
-- │   - calc_real_response_min() — from 023                  │
-- │   - is_crm_admin() — from 012                            │
-- └─────────────────────────────────────────────────────────┘

-- 1a. calc_response_time() — trigger: leads before insert/update
-- Source: migration 012 (lines 94-105), EXACT body
CREATE OR REPLACE FUNCTION public.calc_response_time()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  if new.contacted_at is not null
    and (old is null or old.contacted_at is null)
  then
    new.response_time_min = extract(epoch from (new.contacted_at - new.created_at)) / 60;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- 1b. audit_stage_change() — trigger: leads after update
-- Source: migration 012 (lines 112-133), EXACT body
CREATE OR REPLACE FUNCTION public.audit_stage_change()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  if old.stage is distinct from new.stage then
    insert into public.lead_events (lead_id, event_type, event_payload)
    values (new.id, 'stage_change', jsonb_build_object(
      'from', old.stage, 'to', new.stage,
      'at', now()::text
    ));
  end if;
  if new.outcome is not null and old.outcome is distinct from new.outcome then
    insert into public.lead_events (lead_id, event_type, event_payload)
    values (new.id, 'outcome_set', jsonb_build_object(
      'outcome', new.outcome,
      'won_amount', new.won_amount,
      'lost_reason', new.lost_reason,
      'at', now()::text
    ));
  end if;
  return new;
end;
$$;

-- 1c. calc_job_total() — trigger: jobs before insert/update
-- Source: migration 012 (lines 182-196), EXACT body
CREATE OR REPLACE FUNCTION public.calc_job_total()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.total_amount = coalesce(new.labor_amount,0) + coalesce(new.material_amount,0);
  -- Check repeat customer
  if new.customer_phone is not null then
    new.is_repeat_customer = exists(
      select 1 from public.jobs
      where customer_phone = new.customer_phone
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
  end if;
  return new;
end;
$$;

-- 1d. auto_detect_test_lead() — trigger: leads before insert/update
-- Source: migration 013 (lines 90-157), EXACT body
CREATE OR REPLACE FUNCTION public.auto_detect_test_lead()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
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

-- 1e. immutable_date() — helper for dedup index
-- Source: migration 021, EXACT body
CREATE OR REPLACE FUNCTION public.immutable_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT (ts AT TIME ZONE 'UTC')::date; $$;


-- ┌─────────────────────────────────────────────────────────┐
-- │  Part 2: Move extensions out of public schema            │
-- │  Check 0014: Extension in public                         │
-- └─────────────────────────────────────────────────────────┘

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions to extensions schema (safe — Supabase recommends this)
-- Note: ALTER EXTENSION SET SCHEMA only works if no objects depend on the extension
-- in the public schema. If it fails, we skip — the extension stays in public.
DO $$
BEGIN
  -- Try to move pgcrypto
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'pgcrypto' AND n.nspname = 'public') THEN
    BEGIN
      ALTER EXTENSION pgcrypto SET SCHEMA extensions;
      RAISE NOTICE 'pgcrypto moved to extensions schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgcrypto could not be moved: %', SQLERRM;
    END;
  END IF;

  -- Try to move uuid-ossp
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public') THEN
    BEGIN
      ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
      RAISE NOTICE 'uuid-ossp moved to extensions schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'uuid-ossp could not be moved: %', SQLERRM;
    END;
  END IF;

  -- Try to move pg_graphql if in public
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'pg_graphql' AND n.nspname = 'public') THEN
    BEGIN
      ALTER EXTENSION pg_graphql SET SCHEMA extensions;
      RAISE NOTICE 'pg_graphql moved to extensions schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_graphql could not be moved: %', SQLERRM;
    END;
  END IF;

  -- Try to move pgjwt if in public
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE e.extname = 'pgjwt' AND n.nspname = 'public') THEN
    BEGIN
      ALTER EXTENSION pgjwt SET SCHEMA extensions;
      RAISE NOTICE 'pgjwt moved to extensions schema';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgjwt could not be moved: %', SQLERRM;
    END;
  END IF;
END $$;


-- ┌─────────────────────────────────────────────────────────┐
-- │  Part 3: Ensure RLS on ALL public tables                 │
-- │  Check 0013: RLS disabled in public                      │
-- └─────────────────────────────────────────────────────────┘

-- Enable RLS on any table that might have been missed
-- (idempotent — ALTER TABLE ENABLE ROW LEVEL SECURITY is safe to re-run)
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'         -- regular tables only
      AND NOT c.relrowsecurity    -- RLS not yet enabled
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.relname);
    RAISE NOTICE 'Enabled RLS on: %', tbl.relname;
  END LOOP;
END $$;


-- ┌─────────────────────────────────────────────────────────┐
-- │  Part 4: Verify — diagnostic queries                     │
-- │  Run after migration to confirm fixes                    │
-- └─────────────────────────────────────────────────────────┘

-- Diagnostic: functions without search_path (should return 0 rows after fix)
-- SELECT p.proname, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prokind = 'f'
--   AND (p.proconfig IS NULL OR NOT array_to_string(p.proconfig, ',') LIKE '%search_path%');

-- Diagnostic: tables without RLS (should return 0 rows after fix)
-- SELECT c.relname
-- FROM pg_class c
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- Diagnostic: extensions in public (should return 0 rows after fix)
-- SELECT e.extname
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE n.nspname = 'public';
