-- Add elevation_meters column to workout_progress table
ALTER TABLE workout_progress
ADD COLUMN IF NOT EXISTS elevation_meters INTEGER;
