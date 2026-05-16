-- Multi-session per day + Strava activity ID for auto-sync idempotency.
-- Before: PK was (plan_id, id) where id = "${week}-${dayIndex}" → one row per day.
-- After: PK is (plan_id, id, session_index) → many rows per day.
-- Existing rows are treated as session_index = 0.

ALTER TABLE workout_progress
  ADD COLUMN IF NOT EXISTS session_index INT NOT NULL DEFAULT 0;

ALTER TABLE workout_progress
  ADD COLUMN IF NOT EXISTS strava_activity_id BIGINT;

-- Idempotency: a given Strava activity can only be attached once across the app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_progress_strava_activity_id
  ON workout_progress(strava_activity_id)
  WHERE strava_activity_id IS NOT NULL;

ALTER TABLE workout_progress DROP CONSTRAINT IF EXISTS workout_progress_pkey;
ALTER TABLE workout_progress ADD PRIMARY KEY (plan_id, id, session_index);
