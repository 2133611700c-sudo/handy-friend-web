-- Migration 030: Social Leads table for Facebook/Nextdoor/Craigslist hunter
-- Separate from main leads table — raw social discovery pipeline

CREATE TABLE IF NOT EXISTS social_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('facebook','craigslist','nextdoor')),
  group_name text,
  group_url text,
  author_name text,
  post_text text,
  post_url text,
  post_date timestamptz,
  lead_hash text UNIQUE,
  keywords_matched text[],
  service_type text,
  zip text,
  language text DEFAULT 'en',
  intent_score int DEFAULT 0,
  status text DEFAULT 'new' CHECK (status IN ('new','reviewed','contacted','ignored')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_leads_service ON social_leads FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_social_leads_hash ON social_leads(lead_hash);
CREATE INDEX IF NOT EXISTS idx_social_leads_status ON social_leads(status);
CREATE INDEX IF NOT EXISTS idx_social_leads_platform ON social_leads(platform);
