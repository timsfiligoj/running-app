-- Table for caching Garmin OAuth tokens
CREATE TABLE IF NOT EXISTS garmin_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  oauth1_tokens JSONB,
  oauth2_tokens JSONB,
  oauth2_expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE garmin_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON garmin_tokens FOR ALL USING (true);
