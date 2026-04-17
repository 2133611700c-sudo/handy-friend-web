-- Migration 038: Chat funnel instrumentation table + 7d rollup view
-- Date: 2026-04-17
-- Owner: Agent B (Codex)

BEGIN;

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_path TEXT,
  metadata JSONB,
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  channel_source TEXT NOT NULL DEFAULT 'real_website_chat'
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session
  ON public.funnel_events(session_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_funnel_events_name
  ON public.funnel_events(event_name, occurred_at);

CREATE INDEX IF NOT EXISTS idx_funnel_events_channel
  ON public.funnel_events(channel_source, occurred_at);

COMMENT ON TABLE public.funnel_events IS
'Client-side funnel telemetry for chat conversion diagnostics (no PII payloads).';

COMMENT ON COLUMN public.funnel_events.channel_source IS
'Expected values: real_website_chat, fb_messenger, test, probe, cron, e2e, internal_admin';

CREATE OR REPLACE VIEW public.v_chat_funnel_7d AS
SELECT
  COALESCE(NULLIF(page_path, ''), '/') AS page_path,
  COUNT(*) FILTER (WHERE event_name = 'page_view') AS views,
  COUNT(*) FILTER (WHERE event_name = 'widget_seen') AS seen,
  COUNT(*) FILTER (WHERE event_name = 'widget_open') AS opened,
  COUNT(*) FILTER (WHERE event_name = 'chat_first_message') AS engaged,
  COUNT(*) FILTER (WHERE event_name = 'phone_captured') AS captured
FROM public.funnel_events
WHERE occurred_at > NOW() - INTERVAL '7 days'
  AND is_test = FALSE
  AND channel_source IN ('real_website_chat', 'fb_messenger')
GROUP BY COALESCE(NULLIF(page_path, ''), '/')
ORDER BY page_path ASC;

COMMENT ON VIEW public.v_chat_funnel_7d IS
'7-day chat funnel rollup by page_path (real customer channels only).';

COMMIT;
