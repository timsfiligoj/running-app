-- Athlete profile for personalized AI analysis context
CREATE TABLE IF NOT EXISTS athlete_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  race_name TEXT,
  race_date TEXT,
  target_time TEXT,
  target_pace TEXT,
  experience TEXT,
  max_hr INTEGER,
  weekly_volume TEXT,
  weaknesses TEXT,
  strengths TEXT,
  context TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE athlete_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON athlete_profile FOR ALL USING (true);

-- Seed with initial data
INSERT INTO athlete_profile (id, race_name, race_date, target_time, target_pace, experience, weekly_volume)
VALUES (
  'default',
  'Istrski polmaraton',
  '2026-04-12',
  'sub 1:35:00',
  '4:30 /km',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;
