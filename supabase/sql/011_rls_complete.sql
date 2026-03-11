-- ============================================================
-- 011_rls_complete.sql — Handy & Friend TOP RLS Configuration
-- Run in Supabase SQL Editor → New Query → Run
-- Idempotent: безопасно запускать повторно
-- ============================================================
--
-- МАТРИЦА ДОСТУПА:
--
--  Роль              │ leads │ ai_conv │ photos │ events
--  ──────────────────┼───────┼─────────┼────────┼────────
--  service_role      │  ALL  │   ALL   │  ALL   │  ALL   ← bypasses RLS
--  crm_admin (auth)  │  ALL  │   ALL   │  ALL   │  READ
--  anon              │  ✗    │  INSERT + SELECT own session  │  ✗  │  ✗
--  authenticated     │  ✗    │   ✗     │  ✗     │  ✗
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. RLS ВКЛЮЧЁН (idempotent)
-- ──────────────────────────────────────────────────────────────
alter table public.leads              enable row level security;
alter table public.lead_photos        enable row level security;
alter table public.ai_conversations   enable row level security;
alter table public.lead_events        enable row level security;

-- ──────────────────────────────────────────────────────────────
-- 2. ХЕЛПЕР: is_crm_admin()
-- Проверяет JWT claim app_role = 'crm_admin'
-- Используется для будущего CRM-дашборда
-- ──────────────────────────────────────────────────────────────
create or replace function public.is_crm_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'app_role') = 'crm_admin', false);
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. ОЧИЩАЕМ ВСЕ СТАРЫЕ ПОЛИТИКИ (идемпотентно)
-- ──────────────────────────────────────────────────────────────
do $$ declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('leads','lead_photos','ai_conversations','lead_events')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────
-- 4. LEADS — только server (service_role) + crm_admin
-- ──────────────────────────────────────────────────────────────
create policy "leads_admin_all"
  on public.leads
  for all
  to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- ──────────────────────────────────────────────────────────────
-- 5. AI_CONVERSATIONS — анон чат + crm_admin
-- ──────────────────────────────────────────────────────────────

-- CRM admin: всё
create policy "ai_conv_admin_all"
  on public.ai_conversations
  for all
  to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- Анон: INSERT (сохранение сообщений чата)
create policy "ai_conv_anon_insert"
  on public.ai_conversations
  for insert
  to anon
  with check (
    message_role in ('user', 'assistant')
    and length(message_text) <= 10000
  );

-- Анон: SELECT только своей сессии (по x-session-id заголовку)
create policy "ai_conv_anon_own_session"
  on public.ai_conversations
  for select
  to anon
  using (
    session_id is not null
    and session_id = coalesce(
      current_setting('request.headers', true)::json ->> 'x-session-id',
      ''
    )
    and session_id <> ''
  );

-- ──────────────────────────────────────────────────────────────
-- 6. LEAD_PHOTOS — только server + crm_admin
-- ──────────────────────────────────────────────────────────────
create policy "lead_photos_admin_all"
  on public.lead_photos
  for all
  to authenticated
  using (public.is_crm_admin())
  with check (public.is_crm_admin());

-- ──────────────────────────────────────────────────────────────
-- 7. LEAD_EVENTS — только crm_admin read (audit log)
-- ──────────────────────────────────────────────────────────────
create policy "lead_events_admin_read"
  on public.lead_events
  for select
  to authenticated
  using (public.is_crm_admin());

-- ──────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET — lead-photos приватный
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos', 'lead-photos', false,
  10485760,  -- 10MB
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies (via storage.objects RLS)
-- Note: storage.policies table doesn't exist in current Supabase versions
drop policy if exists "lead_photos_admin_select" on storage.objects;
drop policy if exists "lead_photos_admin_insert" on storage.objects;
drop policy if exists "lead_photos_admin_delete" on storage.objects;

create policy "lead_photos_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'lead-photos' and (auth.jwt() ->> 'app_role') = 'crm_admin');

create policy "lead_photos_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'lead-photos' and (auth.jwt() ->> 'app_role') = 'crm_admin');

create policy "lead_photos_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lead-photos' and (auth.jwt() ->> 'app_role') = 'crm_admin');

-- ──────────────────────────────────────────────────────────────
-- 9. VIEWS — управляются 012_ultimate_analytics.sql
-- revoke + admin views создаются там
-- ──────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- 10. ВЕРИФИКАЦИЯ — запустить после для проверки
-- ──────────────────────────────────────────────────────────────
select
  t.tablename,
  t.rowsecurity                                          as rls_on,
  count(p.policyname)                                    as policies,
  string_agg(p.policyname || ' (' || p.cmd || '/' || p.roles::text || ')', E'\n    ' order by p.policyname) as details
from pg_tables t
left join pg_policies p
  on p.tablename = t.tablename and p.schemaname = 'public'
where t.schemaname = 'public'
  and t.tablename in ('leads','lead_photos','ai_conversations','lead_events')
group by t.tablename, t.rowsecurity
order by t.tablename;

-- Ожидаемый результат:
-- ai_conversations │ true │ 3 │ ai_conv_admin_all, ai_conv_anon_insert, ai_conv_anon_own_session
-- lead_events      │ true │ 1 │ lead_events_admin_read
-- lead_photos      │ true │ 1 │ lead_photos_admin_all
-- leads            │ true │ 1 │ leads_admin_all
