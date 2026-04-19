-- Migration 037: Funnel events for CTA + chat-dropoff observability
-- Purpose:
--   Store lightweight funnel events (no PII) from website interactions,
--   especially call/whatsapp/email/messenger CTA clicks.

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  channel_source TEXT NOT NULL DEFAULT 'real_website_chat'
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session
  ON public.funnel_events(session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name
  ON public.funnel_events(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_page
  ON public.funnel_events(page_path, occurred_at DESC);

CREATE OR REPLACE VIEW public.v_chat_funnel_7d AS
SELECT
  COALESCE(NULLIF(page_path, ''), '/') AS page_path,
  COUNT(*) FILTER (WHERE event_name = 'widget_seen') AS seen,
  COUNT(*) FILTER (WHERE event_name = 'widget_open') AS opened,
  COUNT(*) FILTER (WHERE event_name = 'chat_first_message') AS engaged,
  COUNT(*) FILTER (WHERE event_name = 'phone_captured') AS captured,
  COUNT(*) FILTER (WHERE event_name = 'phone_click') AS phone_clicks,
  COUNT(*) FILTER (WHERE event_name = 'whatsapp_click') AS whatsapp_clicks,
  COUNT(*) FILTER (WHERE event_name = 'email_click') AS email_clicks,
  COUNT(*) FILTER (WHERE event_name = 'messenger_click') AS messenger_clicks
FROM public.funnel_events
WHERE is_test = FALSE
  AND occurred_at > NOW() - INTERVAL '7 days'
GROUP BY COALESCE(NULLIF(page_path, ''), '/');
