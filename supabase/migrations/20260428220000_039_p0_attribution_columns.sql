-- 039_p0_attribution_columns.sql
-- P0: Add missing attribution columns so Google Ads gclid/gbraid/wbraid + UTM
-- content/term + landing_page + lead_type can persist on leads. Idempotent;
-- additive only. Required for closing the loop on Ads conversion attribution
-- (see fix/p0-whatsapp-audit-watchdog-from-8bb2b96 branch).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gbraid       text,
  ADD COLUMN IF NOT EXISTS wbraid       text,
  ADD COLUMN IF NOT EXISTS fbclid       text,
  ADD COLUMN IF NOT EXISTS msclkid      text,
  ADD COLUMN IF NOT EXISTS utm_content  text,
  ADD COLUMN IF NOT EXISTS utm_term     text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS lead_type    text;

CREATE INDEX IF NOT EXISTS leads_gclid_idx
  ON public.leads(gclid)  WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_gbraid_idx
  ON public.leads(gbraid) WHERE gbraid IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_wbraid_idx
  ON public.leads(wbraid) WHERE wbraid IS NOT NULL;
