-- Migration: WhatsApp Cloud API messages table
-- Run via Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id            BIGSERIAL PRIMARY KEY,
  wamid         TEXT UNIQUE,
  direction     TEXT NOT NULL CHECK (direction IN ('in','out')),
  phone_number  TEXT,
  thread_id     TEXT,
  body          TEXT,
  media         JSONB,
  status        TEXT,           -- received|sent|delivered|read|failed|rejected|approved|pending
  draft_text    TEXT,
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  failed_reason TEXT,
  raw           JSONB
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_thread ON public.whatsapp_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);

COMMENT ON TABLE public.whatsapp_messages IS 'WhatsApp Cloud API message log — inbound/outbound, dedupe via wamid UNIQUE';
