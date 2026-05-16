-- Running App v2: activity-first model
-- Coexists with workout_progress (plan-based). New tables for:
--   runs              : every Strava activity, with auto-classification
--   exercises         : strength exercise library (28 seeded in companion migration)
--   strength_sessions : logged strength sessions (manual + suggester output)
--   phase_config      : F1-F5d phase definitions (8 seeded in companion migration)
--   workout_suggestions: suggester outputs + acceptance tracking
-- Also extends athlete_profile with available_dumbbells + available_equipment.

-- ============================================================
-- runs
-- ============================================================
CREATE TABLE IF NOT EXISTS runs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id                BIGINT UNIQUE NOT NULL,
  strava_url               TEXT,
  date                     DATE NOT NULL,

  -- core metrics from Strava
  distance_km              NUMERIC(6,3) NOT NULL,
  duration_seconds         INT NOT NULL,
  avg_pace_seconds         NUMERIC(6,2),
  avg_hr                   INT,
  max_hr                   INT,
  elevation_gain_m         INT,
  temperature_c            INT,

  -- derived metrics
  hr_drift_bpm             INT,
  gap_pace_seconds         NUMERIC(6,2),
  effort_score             INT,

  -- classification
  workout_type             TEXT NOT NULL,
  workout_subtype          TEXT,
  phase                    TEXT,
  classification_confidence NUMERIC(3,2),
  classification_overridden BOOLEAN DEFAULT FALSE,

  -- detail
  splits                   JSONB,
  laps                     JSONB,

  -- planning + analysis
  planned_pace_target_seconds NUMERIC(6,2),
  planned_workout_id       UUID,
  linked_progress_id       TEXT,
  notes                    TEXT,
  analysis_result          JSONB,

  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_date ON runs(date DESC);
CREATE INDEX IF NOT EXISTS idx_runs_phase ON runs(phase);
CREATE INDEX IF NOT EXISTS idx_runs_type ON runs(workout_type);
CREATE INDEX IF NOT EXISTS idx_runs_strava_id ON runs(strava_id);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON runs FOR ALL USING (true);

-- ============================================================
-- exercises
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en                  TEXT NOT NULL UNIQUE,
  name_sl                  TEXT,

  category                 TEXT NOT NULL,

  -- anatomical metadata
  movement_patterns        TEXT[] NOT NULL,
  primary_muscles          TEXT[] NOT NULL,
  secondary_muscles        TEXT[],
  tendons                  TEXT[],

  -- pragmatics
  is_unilateral            BOOLEAN DEFAULT FALSE,
  equipment                TEXT[] NOT NULL,
  is_bodyweight_only       BOOLEAN DEFAULT FALSE,
  is_time_based            BOOLEAN DEFAULT FALSE,
  intrinsic_difficulty     INT NOT NULL CHECK (intrinsic_difficulty BETWEEN 1 AND 5),
  is_big_three             BOOLEAN DEFAULT FALSE,

  -- default parameters
  default_sets_min         INT DEFAULT 2,
  default_sets_max         INT DEFAULT 4,
  default_reps_min         INT,
  default_reps_max         INT,
  default_duration_seconds_min INT,
  default_duration_seconds_max INT,
  default_rir_min          INT DEFAULT 2,
  default_rir_max          INT DEFAULT 4,

  max_per_week             INT DEFAULT 2,

  injury_risk_notes        TEXT,
  technique_notes          TEXT,
  video_url                TEXT,
  alternatives             UUID[],

  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_big3 ON exercises(is_big_three) WHERE is_big_three = TRUE;

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON exercises FOR ALL USING (true);

-- ============================================================
-- strength_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS strength_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                     DATE NOT NULL,
  difficulty               INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  duration_min             INT,
  phase                    TEXT,
  session_type             TEXT,

  exercises                JSONB NOT NULL,

  suggested_by_id          UUID,
  notes                    TEXT,
  analysis_result          JSONB,

  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strength_date ON strength_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_strength_phase ON strength_sessions(phase);

ALTER TABLE strength_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON strength_sessions FOR ALL USING (true);

-- ============================================================
-- phase_config
-- ============================================================
CREATE TABLE IF NOT EXISTS phase_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_code               TEXT UNIQUE NOT NULL,
  start_date               DATE NOT NULL,
  end_date                 DATE NOT NULL,

  easy_hr_max              INT,
  threshold_pace_seconds   NUMERIC(6,2),
  vo2max_pace_seconds      NUMERIC(6,2),
  hm_pace_seconds          NUMERIC(6,2),
  mp_pace_seconds          NUMERIC(6,2),

  weekly_volume_target_km  INT,
  strength_frequency       INT,

  key_race                 TEXT,
  emphasis_notes           TEXT,

  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE phase_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON phase_config FOR ALL USING (true);

-- ============================================================
-- workout_suggestions
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_suggestions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_generated           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  suggester_type           TEXT NOT NULL,

  input_params             JSONB NOT NULL,
  output_workout           JSONB NOT NULL,
  rationale                TEXT NOT NULL,

  status                   TEXT DEFAULT 'pending',
  actual_session_id        UUID,
  modifications            JSONB,
  feedback_notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_suggestions_date ON workout_suggestions(date_generated DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON workout_suggestions(status);

ALTER TABLE workout_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON workout_suggestions FOR ALL USING (true);

-- ============================================================
-- athlete_profile extensions
-- ============================================================
ALTER TABLE athlete_profile
  ADD COLUMN IF NOT EXISTS available_dumbbells NUMERIC[] DEFAULT ARRAY[2.0, 3.0, 4.0, 6.0, 7.5];

ALTER TABLE athlete_profile
  ADD COLUMN IF NOT EXISTS available_equipment TEXT[] DEFAULT ARRAY['bodyweight', 'dumbbell', 'band', 'wall'];
