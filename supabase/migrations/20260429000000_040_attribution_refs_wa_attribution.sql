-- Migration 040: attribution_refs table + whatsapp_messages attribution columns
-- Enables full WhatsApp attribution chain: gclid → hf_ref → inbound message → lead

CREATE TABLE IF NOT EXISTS public.attribution_refs (
  hf_ref        text PRIMARY KEY,
  gclid         text,
  gbraid        text,
  wbraid        text,
  fbclid        text,
  msclkid       text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  landing_page  text,
  page_path     text,
  referrer      text,
  user_agent    text,
  source_widget text,
  service_slug  text,
  raw           jsonb,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  used_by_phone text
);

CREATE INDEX IF NOT EXISTS attribution_refs_gclid_idx ON public.attribution_refs(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS attribution_refs_created_idx ON public.attribution_refs(created_at DESC);

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS hf_ref       text,
  ADD COLUMN IF NOT EXISTS gclid        text,
  ADD COLUMN IF NOT EXISTS gbraid       text,
  ADD COLUMN IF NOT EXISTS wbraid       text,
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS attribution  jsonb;

CREATE INDEX IF NOT EXISTS wam_hf_ref_idx ON public.whatsapp_messages(hf_ref) WHERE hf_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS wam_gclid_idx  ON public.whatsapp_messages(gclid)  WHERE gclid  IS NOT NULL;

NOTIFY pgrst, 'reload schema';
