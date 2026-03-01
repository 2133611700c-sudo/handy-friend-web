-- Enable RLS and enforce server-only writes for CRM tables.
-- Service role bypasses RLS automatically; anon/authenticated get no access unless explicitly added.

alter table public.leads enable row level security;
alter table public.lead_photos enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.lead_events enable row level security;

-- Remove legacy permissive policies if any exist.
drop policy if exists leads_anon_read on public.leads;
drop policy if exists leads_anon_insert on public.leads;
drop policy if exists lead_photos_anon_read on public.lead_photos;
drop policy if exists lead_photos_anon_insert on public.lead_photos;
drop policy if exists ai_conversations_anon_read on public.ai_conversations;
drop policy if exists ai_conversations_anon_insert on public.ai_conversations;
drop policy if exists lead_events_anon_read on public.lead_events;
drop policy if exists lead_events_anon_insert on public.lead_events;

-- Optional internal read-only dashboard policy template (disabled by default).
-- create policy leads_authenticated_read
-- on public.leads
-- for select
-- to authenticated
-- using (auth.jwt() ->> 'app_role' = 'crm_viewer');
