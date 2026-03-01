-- Patch ai_conversations to support chat sessions without a lead yet.
-- Run AFTER 001_leads_core.sql.

-- 1. Make lead_id nullable (conversation can start before lead is created)
alter table public.ai_conversations
  alter column lead_id drop not null;

-- 2. Add session_id for tracking anonymous chat sessions
alter table public.ai_conversations
  add column if not exists session_id text;

-- 3. Add tokens_used for cost tracking
alter table public.ai_conversations
  add column if not exists tokens_used int not null default 0;

-- 4. Index for fast session lookups
create index if not exists ai_conversations_session_id_idx
  on public.ai_conversations (session_id);

-- 5. Allow anon INSERT for chat messages (frontend sends chat turns)
create policy if not exists "ai_conversations anon insert"
  on public.ai_conversations
  for insert
  to anon
  with check (true);

-- 6. Allow anon to SELECT their own session (by session_id, no lead_id leak)
create policy if not exists "ai_conversations anon session read"
  on public.ai_conversations
  for select
  to anon
  using (session_id = current_setting('request.headers', true)::json->>'x-session-id');
