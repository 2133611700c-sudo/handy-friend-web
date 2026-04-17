-- Migration 037: Channel-source taxonomy for ai_conversations + real-leads reporting view
-- Date: 2026-04-17
-- Owner: Agent B (Codex)

BEGIN;

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS channel_source TEXT;

COMMENT ON COLUMN public.ai_conversations.channel_source IS
'Expected values: real_website_chat, fb_messenger, test, probe, cron, e2e, internal_admin';

CREATE INDEX IF NOT EXISTS idx_ai_conversations_channel_source
  ON public.ai_conversations(channel_source);

-- Backfill ai_conversations.channel_source from available source/session patterns.
UPDATE public.ai_conversations
SET channel_source = CASE
  WHEN session_id LIKE 'fb_%' THEN 'fb_messenger'
  WHEN session_id LIKE 'probe_%' OR session_id LIKE 'audit_%' OR LOWER(COALESCE(message_text, '')) LIKE '%material_probe%' THEN 'probe'
  WHEN session_id LIKE 'e2e_%' OR session_id LIKE 'reg-%' OR session_id LIKE 'test_%' OR LOWER(COALESCE(message_text, '')) LIKE '%e2e%' THEN 'e2e'
  WHEN session_id LIKE 'cron_%' THEN 'cron'
  WHEN session_id LIKE 'admin_%' THEN 'internal_admin'
  ELSE 'real_website_chat'
END
WHERE channel_source IS NULL OR BTRIM(channel_source) = '';

-- Backfill leads.traffic_source where missing (column added in migration 036).
UPDATE public.leads
SET traffic_source = CASE
  WHEN COALESCE(source, '') IN ('messenger', 'facebook_messenger') OR session_id LIKE 'fb_%' THEN 'fb_messenger'
  WHEN COALESCE(source, '') IN ('cron', 'scheduler') THEN 'cron'
  WHEN COALESCE(source, '') IN ('internal_admin', 'admin') THEN 'internal_admin'
  WHEN COALESCE(source, '') IN ('test', 'synthetic') THEN 'test'
  ELSE 'real_website_chat'
END
WHERE traffic_source IS NULL OR BTRIM(traffic_source) = '';

CREATE OR REPLACE VIEW public.v_real_leads_7d AS
SELECT
  l.id,
  l.created_at,
  l.source,
  l.traffic_source,
  l.service_type,
  l.stage,
  l.status,
  l.full_name,
  l.phone
FROM public.leads l
WHERE l.created_at >= NOW() - INTERVAL '7 days'
  AND COALESCE(l.is_test, false) = false
  AND COALESCE(l.traffic_source, 'real_website_chat') IN ('real_website_chat', 'fb_messenger')
ORDER BY l.created_at DESC;

COMMENT ON VIEW public.v_real_leads_7d IS
'Real customer leads for last 7 days (excludes is_test and non-customer channels).';

COMMIT;
