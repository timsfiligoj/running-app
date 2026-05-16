-- Running workout templates table (per HANDOFF dodatek sekcija 4 + 5.9).
-- DB-backed template library that replaces hardcoded template logic in the suggester.
-- pace_ref strings ("hm_pace", "vo2max_pace") in structure JSON are resolved at runtime
-- from phase_config, so templates auto-adapt when Tim edits pace targets in the UI.

CREATE TABLE IF NOT EXISTS running_workout_templates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code            TEXT UNIQUE NOT NULL,
  display_name_sl          TEXT NOT NULL,

  phase                    TEXT NOT NULL,        -- F1..F5d-Palmanova | any
  goal_compat              TEXT[] NOT NULL,
  category                 TEXT NOT NULL,        -- interval | tempo | long | easy | hill | recovery
  subtype                  TEXT,
  terrain                  TEXT NOT NULL DEFAULT 'flat',

  -- Normalized structure:
  -- { "segments": [
  --     { "phase": "warmup", "type": "continuous", "duration_min": 15, "pace_ref": "easy" },
  --     { "phase": "main", "type": "reps", "reps": 5,
  --       "work_distance_m": 1000, "work_pace_ref": "vo2max_pace",
  --       "rest_duration_seconds": 90, "rest_pace_ref": "easy" },
  --     { "phase": "cooldown", "type": "continuous", "duration_min": 10, "pace_ref": "easy" }
  -- ] }
  structure                JSONB NOT NULL,

  estimated_distance_km    NUMERIC(5,2),
  estimated_duration_min   INT,
  intra_category_difficulty INT CHECK (intra_category_difficulty BETWEEN 1 AND 5),
  max_per_2weeks           INT DEFAULT 2,

  description              TEXT,
  notes                    TEXT,

  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_phase ON running_workout_templates(phase);
CREATE INDEX IF NOT EXISTS idx_templates_category ON running_workout_templates(category);

ALTER TABLE running_workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON running_workout_templates FOR ALL USING (true);

-- Track which template a workout_suggestion came from (for variety filter).
ALTER TABLE workout_suggestions
  ADD COLUMN IF NOT EXISTS template_id UUID;
CREATE INDEX IF NOT EXISTS idx_suggestions_template_id ON workout_suggestions(template_id);
