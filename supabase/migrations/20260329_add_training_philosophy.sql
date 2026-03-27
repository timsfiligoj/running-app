-- Add training philosophy fields to athlete profile
ALTER TABLE athlete_profile ADD COLUMN IF NOT EXISTS training_philosophy TEXT;
ALTER TABLE athlete_profile ADD COLUMN IF NOT EXISTS training_phase TEXT;
ALTER TABLE athlete_profile ADD COLUMN IF NOT EXISTS week_in_block TEXT;
ALTER TABLE athlete_profile ADD COLUMN IF NOT EXISTS race_elevation TEXT;
