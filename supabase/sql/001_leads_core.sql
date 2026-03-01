-- Handy & Friend CRM core schema for Supabase
-- Execute in Supabase SQL editor as project owner

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'direct',
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost', 'spam', 'partial')),
  full_name text not null,
  phone text,
  email text,
  address text,
  city text,
  zip text,
  service_type text,
  problem_description text,
  budget_range text,
  preferred_date text,
  lead_score int not null default 0,
  ai_summary_short text,
  ai_summary_full text,
  assigned_to text,
  next_action_at timestamptz,
  last_contact_at timestamptz,
  source_details jsonb not null default '{}'::jsonb
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_city_idx on public.leads (city);
create index if not exists leads_zip_idx on public.leads (zip);
create index if not exists leads_service_type_idx on public.leads (service_type);

create table if not exists public.lead_photos (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  uploaded_at timestamptz not null default now()
);

create index if not exists lead_photos_lead_id_idx on public.lead_photos (lead_id);
create index if not exists lead_photos_uploaded_at_idx on public.lead_photos (uploaded_at desc);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  message_role text not null check (message_role in ('system', 'assistant', 'user', 'tool')),
  message_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_lead_id_idx on public.ai_conversations (lead_id);
create index if not exists ai_conversations_created_at_idx on public.ai_conversations (created_at desc);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id text references public.leads(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_id_idx on public.lead_events (lead_id);
create index if not exists lead_events_type_idx on public.lead_events (event_type);
create index if not exists lead_events_created_at_idx on public.lead_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_leads on public.leads;
create trigger set_updated_at_on_leads
before update on public.leads
for each row
execute function public.set_updated_at();
