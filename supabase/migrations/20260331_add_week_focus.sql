-- Store week focus overrides
CREATE TABLE IF NOT EXISTS week_overrides (
  week_num INTEGER PRIMARY KEY,
  focus TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE week_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON week_overrides FOR ALL USING (true);
