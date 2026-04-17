-- Migration 036: Add is_test + traffic_source taxonomy for durable audit separation
-- Date: 2026-04-17
-- Owner: Agent B (Codex)

BEGIN;

ALTER TABLE public.telegram_sends
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.telegram_sends
  ADD COLUMN IF NOT EXISTS traffic_source TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS traffic_source TEXT;

CREATE INDEX IF NOT EXISTS idx_telegram_sends_is_test
  ON public.telegram_sends(is_test);

CREATE INDEX IF NOT EXISTS idx_telegram_sends_traffic_source
  ON public.telegram_sends(traffic_source);

CREATE INDEX IF NOT EXISTS idx_leads_traffic_source
  ON public.leads(traffic_source);

COMMENT ON COLUMN public.telegram_sends.traffic_source IS
'Expected values: real_website_chat, fb_messenger, test, probe, cron, e2e, internal_admin';

COMMENT ON COLUMN public.leads.traffic_source IS
'Expected values: real_website_chat, fb_messenger, test, probe, cron, e2e, internal_admin';

COMMIT;
