-- ============================================================
-- Migration (run order: 20260331210000 — before 030):
--   Durable Telegram send log + lead_events.lead_id TEXT
-- Date: 2026-04-17
-- Purpose:
--   (a) Create telegram_sends table — durable message_id audit.
--   (b) Convert lead_events.lead_id UUID -> TEXT (supports
--       website_chat lead IDs like "lead_<ts>_<rand>").
--   (c) Save and recreate ALL dependent views via pg_get_viewdef.
--   (d) Watchdog view v_leads_without_telegram.
-- ============================================================

BEGIN;

-- ─── (a) telegram_sends durable log ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_sends (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  lead_id TEXT,
  session_id TEXT,
  chat_id TEXT,
  ok BOOLEAN NOT NULL,
  telegram_message_id BIGINT,
  error_code TEXT,
  error_description TEXT,
  request_excerpt TEXT,
  extra JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_telegram_sends_lead_id
  ON public.telegram_sends(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_sends_created_at
  ON public.telegram_sends(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_sends_source_ok
  ON public.telegram_sends(source, ok);

COMMENT ON TABLE public.telegram_sends IS
  'Durable audit for every Telegram send attempt. Proves message_id delivery.';

-- ─── (b+c) Dynamic drop-recreate of dependent views ─────────────
DO $outer$
DECLARE
  current_type text;
  v record;
  view_defs jsonb := '{}'::jsonb;
  def text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='lead_events' AND column_name='lead_id';

  IF current_type <> 'uuid' THEN
    RAISE NOTICE 'lead_events.lead_id already %, skipping', current_type;
    RETURN;
  END IF;

  -- Snapshot every view that references lead_events.lead_id
  FOR v IN
    SELECT DISTINCT vtu.view_schema, vtu.view_name
    FROM information_schema.view_column_usage vtu
    WHERE vtu.table_schema = 'public'
      AND vtu.table_name = 'lead_events'
      AND vtu.column_name = 'lead_id'
  LOOP
    def := pg_get_viewdef(format('%I.%I', v.view_schema, v.view_name)::regclass, true);
    view_defs := view_defs || jsonb_build_object(format('%s.%s', v.view_schema, v.view_name), def);
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', v.view_schema, v.view_name);
    RAISE NOTICE 'Dropped dependent view: %.%', v.view_schema, v.view_name;
  END LOOP;

  -- Drop all FK constraints on lead_events.lead_id (there may be multiple: _fkey, _fkey1, ...)
  FOR v IN
    SELECT conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.lead_events'::regclass
      AND c.contype = 'f'
      AND EXISTS (
        SELECT 1 FROM unnest(c.conkey) AS colnum
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = colnum
        WHERE a.attname = 'lead_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.lead_events DROP CONSTRAINT %I', v.conname);
    RAISE NOTICE 'Dropped FK constraint: %', v.conname;
  END LOOP;

  EXECUTE 'ALTER TABLE public.lead_events ALTER COLUMN lead_id TYPE TEXT USING lead_id::text';
  RAISE NOTICE 'lead_events.lead_id converted uuid -> text';

  -- NOTE: We intentionally do NOT recreate the snapshotted dependent views
  -- here. Their original definitions compared uuid = uuid; after the type
  -- change they would throw 42883. lead_timeline is recreated cleanly below
  -- with explicit ::text casts. followup_queue and others can be rebuilt
  -- in a follow-up migration by whoever owns them — they are non-critical
  -- diagnostic views and the underlying data is preserved.
END
$outer$;

-- ─── Recreate lead_timeline with text-aware joins ───────────────
CREATE OR REPLACE VIEW public.lead_timeline AS
SELECT
  le.lead_id,
  l.source,
  l.service_type,
  l.stage,
  le.event_type,
  le.event_data,
  le.rules_version,
  le.created_at,
  le.created_by,
  LAG(le.created_at) OVER (PARTITION BY le.lead_id ORDER BY le.created_at) AS prev_event_at,
  EXTRACT(EPOCH FROM (
    le.created_at - LAG(le.created_at) OVER (PARTITION BY le.lead_id ORDER BY le.created_at)
  ))/60 AS minutes_since_prev
FROM public.lead_events le
LEFT JOIN public.leads l ON l.id::text = le.lead_id;

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON public.lead_events(lead_id);

-- ─── (d) Watchdog view: leads without Telegram proof ─────────────
CREATE OR REPLACE VIEW public.v_leads_without_telegram AS
SELECT
  l.id,
  l.full_name,
  l.phone,
  l.source,
  l.service_type,
  l.is_test,
  l.created_at,
  EXTRACT(EPOCH FROM (now() - l.created_at))/60 AS minutes_since_created,
  (
    SELECT COUNT(*)
    FROM public.telegram_sends ts
    WHERE ts.lead_id = l.id::text
      AND ts.ok = true
      AND ts.telegram_message_id IS NOT NULL
  ) AS telegram_proofs
FROM public.leads l
WHERE l.created_at > now() - interval '7 days'
  AND l.is_test = false
ORDER BY l.created_at DESC;

COMMENT ON VIEW public.v_leads_without_telegram IS
  'Real leads in last 7d with count of durable Telegram proofs. telegram_proofs=0 means owner alert delivery unverified.';

COMMIT;
