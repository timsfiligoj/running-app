-- Cache analysis results on workout_progress
ALTER TABLE workout_progress ADD COLUMN IF NOT EXISTS analysis_text TEXT;
ALTER TABLE workout_progress ADD COLUMN IF NOT EXISTS analysis_sources JSONB;
ALTER TABLE workout_progress ADD COLUMN IF NOT EXISTS analysis_at TIMESTAMP WITH TIME ZONE;
