-- Supabase RLS Audit — Handy & Friend
-- Purpose: verify exposed/public lead-related tables have RLS enabled.
-- Run in Supabase SQL editor with sufficient privileges.
-- Source of truth: Supabase docs say service keys bypass RLS and must never be used in browser/customer context.

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  c.relkind as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public')
  and c.relkind in ('r', 'p')
  and (
    c.relname ilike '%lead%'
    or c.relname ilike '%conversation%'
    or c.relname ilike '%telegram%'
    or c.relname ilike '%outbox%'
    or c.relname ilike '%followup%'
    or c.relname ilike '%audit%'
  )
order by n.nspname, c.relname;

-- Policy inventory for the same surface.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public')
  and (
    tablename ilike '%lead%'
    or tablename ilike '%conversation%'
    or tablename ilike '%telegram%'
    or tablename ilike '%outbox%'
    or tablename ilike '%followup%'
    or tablename ilike '%audit%'
  )
order by schemaname, tablename, policyname;

-- Expected result:
-- 1. Lead/CRM/customer-message tables should have rls_enabled = true when exposed in public schema.
-- 2. Policies should be least-privilege.
-- 3. Server-side service role jobs may bypass RLS, but service keys must never appear in client bundles.
