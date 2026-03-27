-- Migration 029 — Unified Lead System v3
-- Adds: leads lifecycle columns, lead_events.source_user_id,
--       hunter_scans + hunter_posts tables, lead_operational_view
-- Author: unified-lead-system-v3 / 2026-03-27

-- ─── 1. leads — lifecycle & intent columns ────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS sources           TEXT[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_inbound_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outbound_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ai_reply_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intent_level      TEXT         CHECK (intent_level IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS needs_owner_now   BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_best_action  TEXT,
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS budget_signal     TEXT,
  ADD COLUMN IF NOT EXISTS urgency_signal    TEXT,
  ADD COLUMN IF NOT EXISTS has_photos        BOOLEAN      DEFAULT false;

-- ─── 2. lead_events — add source_user_id for multi-key dedupe ─────────────────

ALTER TABLE lead_events
  ADD COLUMN IF NOT EXISTS source_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_events_source_user
  ON lead_events (source_user_id, event_type)
  WHERE source_user_id IS NOT NULL;

-- ─── 3. hunter_scans — scan session metadata ──────────────────────────────────

CREATE TABLE IF NOT EXISTS hunter_scans (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  platform        TEXT         NOT NULL,
  scan_time       TIMESTAMPTZ  DEFAULT NOW(),
  posts_found     INT          DEFAULT 0,
  posts_responded INT          DEFAULT 0,
  posts_skipped   INT          DEFAULT 0,
  skip_reasons    JSONB        DEFAULT '{}',
  errors          TEXT[],
  tokens_used     NUMERIC(10,4) DEFAULT 0,
  scan_duration_sec INT
);

-- ─── 4. hunter_posts — individual posts found/responded ───────────────────────
-- Note: leads.id is TEXT (not UUID) — foreign key uses TEXT

CREATE TABLE IF NOT EXISTS hunter_posts (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id           UUID         REFERENCES hunter_scans(id),
  platform          TEXT         NOT NULL,
  post_url          TEXT         UNIQUE NOT NULL,
  author_name       TEXT,
  author_area       TEXT,
  post_text         TEXT,
  post_date         TIMESTAMPTZ,
  service_detected  TEXT,
  scope             TEXT         NOT NULL,        -- 'green'|'yellow'|'red'
  priority          TEXT,                         -- 'hot'|'warm'|'cool'
  comments_count    INT,
  our_response      TEXT,
  response_template INT,
  responded_at      TIMESTAMPTZ,
  status            TEXT         DEFAULT 'found', -- 'found'|'responded'|'converted'|'skipped'
  lead_id           TEXT         REFERENCES leads(id),
  reaction_likes    INT          DEFAULT 0,
  reaction_replies  JSONB        DEFAULT '[]',
  checked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hunter_posts_url ON hunter_posts(post_url);
CREATE INDEX IF NOT EXISTS idx_hunter_posts_lead_id ON hunter_posts(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hunter_posts_platform_status ON hunter_posts(platform, status, created_at DESC);

-- ─── 5. RLS for new tables ────────────────────────────────────────────────────

ALTER TABLE hunter_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunter_posts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_hunter_scans" ON hunter_scans;
CREATE POLICY "service_role_hunter_scans" ON hunter_scans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_hunter_posts" ON hunter_posts;
CREATE POLICY "service_role_hunter_posts" ON hunter_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. Index on leads.phone for multi-key dedupe ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leads_phone_norm ON leads (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email) WHERE email IS NOT NULL;

-- ─── 7. lead_operational_view ─────────────────────────────────────────────────

DROP VIEW IF EXISTS lead_operational_view;
CREATE VIEW lead_operational_view AS
SELECT
  l.id,
  l.full_name                                                    AS name,
  l.phone,
  l.email,
  l.status,
  l.stage,
  l.sources,
  l.service_type,
  l.intent_level,
  l.needs_owner_now,
  l.next_best_action,
  l.conversation_summary,
  l.urgency_signal,
  l.budget_signal,
  l.has_photos,
  l.last_inbound_at,
  l.last_outbound_at,
  l.last_owner_alert_at,
  l.created_at,
  l.source                                                        AS lead_source,
  -- Last event type
  (SELECT event_type FROM lead_events
   WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1)        AS last_event,
  -- Days since last inbound
  EXTRACT(DAY FROM NOW() - COALESCE(l.last_inbound_at, l.created_at))::int AS days_inactive,
  -- Hunter attribution
  (SELECT hp.post_url FROM hunter_posts hp
   WHERE hp.lead_id = l.id LIMIT 1)                              AS hunter_post_url,
  -- Open outbound jobs count
  (SELECT COUNT(*) FROM outbound_jobs oj
   WHERE oj.lead_id = l.id
     AND oj.status IN ('queued','retry_scheduled')
   )                                                              AS pending_jobs
FROM leads l
ORDER BY
  l.needs_owner_now DESC,
  l.last_inbound_at DESC NULLS LAST;

-- ─── 8. Backfill last_inbound_at for existing leads ───────────────────────────

UPDATE leads l
SET last_inbound_at = (
  SELECT MAX(created_at)
  FROM lead_events
  WHERE lead_id = l.id
    AND event_type IN ('form_submit','messenger_capture','telegram_capture','lead_created')
)
WHERE last_inbound_at IS NULL;

-- Fallback: use created_at if no events
UPDATE leads
SET last_inbound_at = created_at
WHERE last_inbound_at IS NULL;
