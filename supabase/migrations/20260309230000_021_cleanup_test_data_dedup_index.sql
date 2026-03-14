-- Migration 021: Cleanup test data, normalize service types, add race condition dedup index
-- Applied: 2026-03-09 via Supabase SQL Editor
-- Changes:
--   1. Converted 3 test leads linked to real jobs → is_test=false
--   2. Deleted 79 test leads + their lead_events
--   3. Deleted 3 Sandra Kirby race condition duplicates (kept closed one)
--   4. Fixed Sandra Kirby status=new → status=completed (stage=closed sync)
--   5. Normalized service_type: "cabinet painting" → "cabinet_painting"
--   6. Created immutable_date() helper function
--   7. Created unique partial index idx_leads_phone_date_source_dedup
--   8. Re-linked orphaned completed jobs, re-added CHECK constraint

-- Immutable helper for dedup index (timestamptz::date is not immutable)
CREATE OR REPLACE FUNCTION public.immutable_date(ts timestamptz)
RETURNS date AS $$ SELECT (ts AT TIME ZONE 'UTC')::date; $$ LANGUAGE sql IMMUTABLE;

-- Unique partial index: prevents race condition duplicates
-- Same phone + same source + same day = blocked
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_date_source_dedup
ON leads (phone, immutable_date(created_at), source)
WHERE is_test = false AND phone IS NOT NULL AND phone != '';
