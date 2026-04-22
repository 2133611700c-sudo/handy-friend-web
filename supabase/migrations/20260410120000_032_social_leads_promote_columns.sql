-- Migration 032: Add missing columns to social_leads for promote_social_leads.py
-- source_post_id: platform-native post ID used for deduplication
-- source: raw source label (mirrors platform, used by promoter)
-- promoted_to_leads: flag set when row is promoted to leads table
-- promoted_lead_id: FK reference to the created leads.id

ALTER TABLE public.social_leads
  ADD COLUMN IF NOT EXISTS source_post_id text,
  ADD COLUMN IF NOT EXISTS source         text,
  ADD COLUMN IF NOT EXISTS promoted_to_leads   boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS promoted_lead_id    text;

-- Index for quick "already promoted?" checks
CREATE INDEX IF NOT EXISTS idx_social_leads_promoted
  ON public.social_leads (promoted_to_leads)
  WHERE promoted_to_leads = true;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'social_leads'
  AND column_name  IN ('source_post_id','source','promoted_to_leads','promoted_lead_id')
ORDER BY column_name;
