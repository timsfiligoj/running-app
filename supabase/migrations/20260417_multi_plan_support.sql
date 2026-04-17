-- Multi-plan support: scope workout_progress and week_overrides by plan_id
-- Existing rows belong to the Istrski polmaraton 2026 plan.

ALTER TABLE workout_progress
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'istrski-2026';

ALTER TABLE workout_progress DROP CONSTRAINT IF EXISTS workout_progress_pkey;
ALTER TABLE workout_progress ADD PRIMARY KEY (plan_id, id);

ALTER TABLE week_overrides
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'istrski-2026';

ALTER TABLE week_overrides DROP CONSTRAINT IF EXISTS week_overrides_pkey;
ALTER TABLE week_overrides ADD PRIMARY KEY (plan_id, week_num);

-- Seed: Tek trojk plan Week 1 recovery runs already completed
-- Week 1 Day 1 = Tuesday 14. apr (10 km easy), Day 4 = Friday 17. apr (8 km easy)
INSERT INTO workout_progress (id, plan_id, completed, skipped, actual_workout, activity_type, run_type, distance_km, comment, updated_at)
VALUES
  ('1-1', 'tek-trojk-2026', true, false, NULL, 'run', 'easy', 10, 'Prvi regeneracijski tek po Istrskem polmaratonu', NOW()),
  ('1-4', 'tek-trojk-2026', true, false, NULL, 'run', 'easy', 8, NULL, NOW())
ON CONFLICT (plan_id, id) DO NOTHING;
