-- Migration 031: Create missing runtime tables for live-hf-runtime scripts
-- Apply via: Supabase Dashboard > SQL Editor

-- quotes_drafts: operator-approved quote templates sent to leads
CREATE TABLE IF NOT EXISTS public.quotes_drafts (
  id          uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     text       NOT NULL,
  service_type text      NOT NULL CHECK (service_type IN ('tv_mounting','drywall','furniture')),
  price_low   integer    NOT NULL,
  price_high  integer    NOT NULL,
  inclusions  text,
  exclusions  text,
  next_step   text,
  full_text   text       NOT NULL,
  status      text       NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','rejected')),
  approved_by text,
  approved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- followups_log: records of follow-up SMS entries (sent via Telegram review)
CREATE TABLE IF NOT EXISTS public.followups_log (
  id          uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     text       NOT NULL,
  day_number  integer    NOT NULL CHECK (day_number IN (1,3,7)),
  channel     text       NOT NULL DEFAULT 'sms',
  template_id text       NOT NULL,
  message_sent text      NOT NULL,
  status      text       NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS followups_log_lead_day_uidx
  ON public.followups_log (lead_id, day_number);

-- content_drafts: generated content waiting for human approval
CREATE TABLE IF NOT EXISTS public.content_drafts (
  id          uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text,
  service_type text,
  platform    text       CHECK (platform IN ('nextdoor','facebook','craigslist','gbp','sms')),
  draft_text  text       NOT NULL,
  status      text       NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','published')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: service role can do everything; anon cannot touch these tables
ALTER TABLE public.quotes_drafts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts  ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to avoid duplicate policy errors
DROP POLICY IF EXISTS service_all_quotes_drafts  ON public.quotes_drafts;
DROP POLICY IF EXISTS service_all_followups_log  ON public.followups_log;
DROP POLICY IF EXISTS service_all_content_drafts ON public.content_drafts;

CREATE POLICY service_all_quotes_drafts  ON public.quotes_drafts  FOR ALL TO service_role USING (true);
CREATE POLICY service_all_followups_log  ON public.followups_log  FOR ALL TO service_role USING (true);
CREATE POLICY service_all_content_drafts ON public.content_drafts FOR ALL TO service_role USING (true);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('quotes_drafts','followups_log','content_drafts')
ORDER BY table_name;
