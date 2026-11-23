-- D1 (SQLite) schema for the running app. Replaces the Supabase Postgres tables
-- the app still uses; the v2 tables (runs, exercises, …) live only in the
-- backup export, since nothing reads them.

CREATE TABLE IF NOT EXISTS workout_progress (
  plan_id            TEXT    NOT NULL DEFAULT 'istrski-2026',
  id                 TEXT    NOT NULL,            -- "${week}-${dayIndex}"
  session_index      INTEGER NOT NULL DEFAULT 0,
  completed          INTEGER NOT NULL DEFAULT 0,  -- 0/1
  skipped            INTEGER NOT NULL DEFAULT 0,  -- 0/1
  actual_workout     TEXT,
  activity_type      TEXT,
  run_type           TEXT,
  distance_km        REAL,
  duration_seconds   INTEGER,
  elevation_meters   INTEGER,
  avg_heart_rate     INTEGER,
  comment            TEXT,
  strava_url         TEXT,
  -- Text, not INTEGER: Strava ids go 64-bit after 1.6.2027 and JS numbers
  -- lose precision past 2^53 on the way out of the Worker.
  strava_activity_id TEXT,
  updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (plan_id, id, session_index)
);

-- A Strava activity can only be attached once across the app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_progress_strava_activity_id
  ON workout_progress (strava_activity_id)
  WHERE strava_activity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS week_overrides (
  plan_id    TEXT    NOT NULL DEFAULT 'istrski-2026',
  week_num   INTEGER NOT NULL,
  phase      TEXT,
  focus      TEXT,
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (plan_id, week_num)
);

-- One row (id = 'default'); the profile is free-form, so it is kept as JSON.
CREATE TABLE IF NOT EXISTS athlete_profile (
  id         TEXT PRIMARY KEY,
  profile    TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- AI run analyses, keyed "${planId}:${week}-${dayIndex}-${sessionIndex}".
CREATE TABLE IF NOT EXISTS analysis_cache (
  key        TEXT PRIMARY KEY,
  analysis   TEXT NOT NULL,
  sources    TEXT NOT NULL,  -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
