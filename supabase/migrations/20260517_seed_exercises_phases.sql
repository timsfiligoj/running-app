-- Seed data: 29 exercises (HANDOFF sekcija 5) + 8 phases (HANDOFF sekcija 3)
-- Idempotent via ON CONFLICT (name_en) and (phase_code).

-- ============================================================
-- Phases (8 rows)
-- Pace values in seconds per km. Source: HANDOFF sekcija 3.
-- ============================================================

INSERT INTO phase_config (phase_code, start_date, end_date, easy_hr_max, threshold_pace_seconds, vo2max_pace_seconds, hm_pace_seconds, weekly_volume_target_km, strength_frequency, key_race, emphasis_notes) VALUES
  ('F1', '2026-05-10', '2026-05-23', 145, NULL, NULL, NULL, 35, 2, 'recovery post-Istrski', 'Recovery + easy aerobic baza po Istrskem polmaratonu'),
  ('F2', '2026-05-24', '2026-06-14', 145, 255, 240, 260, 55, 3, NULL, 'Base building, tendon adaptation focus, hill power'),
  ('F3', '2026-06-15', '2026-07-12', 145, 250, 240, 255, 60, 3, NULL, 'Volume + threshold progression, intro plyo'),
  ('F4', '2026-07-13', '2026-08-09', 145, 245, 235, 250, 55, 2, '5K/10K PB attempts', 'Peak speed, VO2max focus, 5K/10K PB poskusi'),
  ('F5a', '2026-08-10', '2026-10-18', 145, 255, 240, 255, 65, 3, NULL, 'HM specificity build, embedded HM pace v long runs'),
  ('F5b-LJ', '2026-10-19', '2026-10-25', 145, 255, NULL, 255, 45, 2, 'LJ HM 25.10. (B-race)', 'Taper week za LJ HM B-race'),
  ('F5c', '2026-10-26', '2026-11-22', 145, 255, 240, 254, 60, 3, NULL, 'Re-build za Palmanova A-race'),
  ('F5d-Palmanova', '2026-11-23', '2026-11-29', 145, 255, NULL, 254, 40, 1, 'Palmanova HM 29.11. (A-race, sub-1:30)', 'Final taper for A-race, sub-1:30 cilj')
ON CONFLICT (phase_code) DO NOTHING;

-- ============================================================
-- Exercises (29 rows)
-- ============================================================

-- 5.1 BIG3
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, is_unilateral, equipment, intrinsic_difficulty, is_big_three, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Bulgarian split squat', 'Bolgarski počep', 'compound', ARRAY['squat_unilateral'], ARRAY['quads','glute_max'], ARRAY['hamstrings','glute_med','core_lateral'], ARRAY['patellar'], TRUE, ARRAY['bodyweight','dumbbell','barbell'], 3, TRUE, 2, 4, 6, 10, 3),
  ('Single-leg RDL', 'Enonožni RDL', 'compound', ARRAY['hinge_unilateral'], ARRAY['hamstrings_prox','glute_max'], ARRAY['erector_spinae','core_rotational'], ARRAY['hamstring_origin','achilles'], TRUE, ARRAY['bodyweight','dumbbell','kettlebell'], 4, TRUE, 2, 4, 6, 10, 3),
  ('Calf raise soleus bent-knee single-leg', 'Dvigi na soleus (skrčeno koleno, enonožno)', 'compound', ARRAY['calf_soleus'], ARRAY['soleus'], ARRAY['foot_intrinsics'], ARRAY['achilles'], TRUE, ARRAY['bodyweight','dumbbell','barbell'], 2, TRUE, 2, 4, 8, 15, 3)
ON CONFLICT (name_en) DO NOTHING;

-- 5.2 Unilateral lower body (accessory)
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, is_unilateral, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Step-up', 'Step-up', 'accessory', ARRAY['squat_unilateral'], ARRAY['quads','glute_max'], ARRAY['glute_med','hamstrings'], ARRAY['patellar'], TRUE, ARRAY['bodyweight','dumbbell','box'], 2, 2, 4, 8, 12, 2),
  ('Walking lunges', 'Hojni izpadi', 'accessory', ARRAY['lunge'], ARRAY['quads','glute_max'], ARRAY['hamstrings','adductors'], ARRAY['patellar'], TRUE, ARRAY['bodyweight','dumbbell'], 2, 2, 4, 10, 16, 2),
  ('Front lunges', 'Sprednji izpadi', 'accessory', ARRAY['lunge'], ARRAY['quads','glute_max'], ARRAY['hamstrings'], ARRAY['patellar'], TRUE, ARRAY['bodyweight','dumbbell'], 2, 2, 4, 8, 12, 2),
  ('Back lunges', 'Zadnji izpadi', 'accessory', ARRAY['lunge'], ARRAY['glute_max','hamstrings'], ARRAY['quads','core_lateral'], ARRAY['hamstring_origin'], TRUE, ARRAY['bodyweight','dumbbell'], 2, 2, 4, 8, 12, 2),
  ('Cossack squat', 'Cossack počep', 'accessory', ARRAY['squat_unilateral','hip_adduction'], ARRAY['adductors','glute_med','quads'], ARRAY['glute_max','hip_flexors'], NULL, TRUE, ARRAY['bodyweight','dumbbell','kettlebell'], 3, 2, 4, 6, 10, 2)
ON CONFLICT (name_en) DO NOTHING;

-- 5.3 Bilateral lower body
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Goblet squat', 'Goblet počep', 'compound', ARRAY['squat_bilateral'], ARRAY['quads','glute_max'], ARRAY['adductors','core_anterior'], ARRAY['patellar'], ARRAY['dumbbell','kettlebell'], 2, 2, 4, 8, 12, 2),
  ('Glute bridge', 'Glute most', 'accessory', ARRAY['hip_extension'], ARRAY['glute_max','hamstrings_prox'], ARRAY['core_anterior'], ARRAY['gluteal'], ARRAY['bodyweight','barbell'], 1, 2, 4, 10, 15, 2),
  ('Hip thrust', 'Hip thrust', 'compound', ARRAY['hip_extension'], ARRAY['glute_max','hamstrings_prox'], ARRAY['core_anterior','adductors'], ARRAY['gluteal'], ARRAY['bodyweight','barbell','dumbbell'], 2, 2, 4, 8, 12, 2),
  ('Single-leg glute bridge', 'Enonožni glute most', 'accessory', ARRAY['hip_extension'], ARRAY['glute_max','hamstrings_prox','glute_med'], ARRAY['core_lateral'], ARRAY['gluteal'], ARRAY['bodyweight'], 2, 2, 4, 8, 12, 2)
ON CONFLICT (name_en) DO NOTHING;

-- Update is_unilateral for the unilateral bilateral-section exercise
UPDATE exercises SET is_unilateral = TRUE WHERE name_en = 'Single-leg glute bridge';

-- 5.4 Posterior chain eccentric (kritično)
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Nordic curl', 'Nordijski upogib', 'compound', ARRAY['hinge_unilateral_eccentric'], ARRAY['hamstrings_distal'], ARRAY['glute_max','core_anterior'], ARRAY['hamstring_origin'], ARRAY['bodyweight','partner','band'], 4, 2, 4, 3, 8, 2)
ON CONFLICT (name_en) DO NOTHING;

-- 5.5 Calves + foot/ankle
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Calf raise gastroc straight-knee', 'Dvigi na meča (ravno koleno)', 'accessory', ARRAY['calf_gastroc'], ARRAY['gastrocnemius'], ARRAY['soleus','foot_intrinsics'], ARRAY['achilles'], ARRAY['bodyweight','dumbbell','barbell'], 1, 2, 4, 10, 15, 2),
  ('Tibialis raises', 'Dvigi tibialisa', 'tendon', ARRAY['foot_ankle'], ARRAY['tibialis_anterior'], NULL, NULL, ARRAY['bodyweight','band','wall'], 1, 2, 4, 12, 20, 3)
ON CONFLICT (name_en) DO NOTHING;

-- 5.6 Plyometrics
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week, default_rir_min, default_rir_max) VALUES
  ('Pogo jumps', 'Pogo skoki', 'plyo', ARRAY['plyo_reactive','calf_gastroc'], ARRAY['gastrocnemius','soleus','foot_intrinsics'], ARRAY['quads','core_anterior'], ARRAY['achilles','plantar_fascia'], ARRAY['bodyweight'], 2, 2, 4, 20, 40, 2, 3, 5),
  ('Side-to-side jumps', 'Stranski skoki', 'plyo', ARRAY['plyo_horizontal','hip_abduction'], ARRAY['glute_med','adductors','quads'], ARRAY['core_lateral'], NULL, ARRAY['bodyweight'], 2, 2, 4, 10, 20, 2, 3, 5),
  ('Side skates', 'Drsalni skoki', 'plyo', ARRAY['plyo_horizontal','hip_abduction'], ARRAY['glute_med','glute_max','adductors'], ARRAY['quads','core_lateral'], NULL, ARRAY['bodyweight'], 2, 2, 4, 10, 20, 2, 3, 5),
  ('Lunge to high knees', 'Izpad v dvignjeno koleno', 'plyo', ARRAY['plyo_horizontal','lunge'], ARRAY['quads','hip_flexors','glute_max'], ARRAY['hamstrings','core_anterior'], NULL, ARRAY['bodyweight'], 2, 2, 4, 8, 12, 2, 3, 5),
  ('Lunge jumps', 'Skočni izpadi', 'plyo', ARRAY['plyo_vertical','lunge'], ARRAY['quads','glute_max','hamstrings'], ARRAY['adductors','core_lateral'], ARRAY['patellar'], ARRAY['bodyweight'], 3, 2, 4, 6, 12, 1, 3, 5),
  ('Box jumps', 'Skoki na škatlo', 'plyo', ARRAY['plyo_vertical'], ARRAY['quads','glute_max','gastrocnemius'], ARRAY['hamstrings','core_anterior'], ARRAY['achilles','patellar'], ARRAY['box','bodyweight'], 3, 2, 4, 5, 10, 1, 3, 5),
  ('Broad jumps', 'Dolgi skoki', 'plyo', ARRAY['plyo_horizontal'], ARRAY['glute_max','hamstrings','quads'], ARRAY['gastrocnemius','core_anterior'], ARRAY['achilles'], ARRAY['bodyweight'], 3, 2, 4, 5, 10, 1, 3, 5)
ON CONFLICT (name_en) DO NOTHING;

-- 5.7 Core anti-X
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, tendons, is_time_based, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_duration_seconds_min, default_duration_seconds_max, max_per_week) VALUES
  ('Copenhagen isometric', 'Copenhagen plank', 'core', ARRAY['hip_adduction','anti_lateral_flexion'], ARRAY['adductors','core_lateral'], ARRAY['glute_med','obliques'], NULL, TRUE, ARRAY['bodyweight','bench'], 3, 2, 3, 20, 60, 2),
  ('Suitcase carry', 'Suitcase carry', 'core', ARRAY['anti_lateral_flexion'], ARRAY['core_lateral','grip'], ARRAY['glute_med','obliques'], NULL, TRUE, ARRAY['dumbbell','kettlebell'], 2, 2, 3, 20, 40, 2)
ON CONFLICT (name_en) DO NOTHING;

INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Dead bug', 'Dead bug', 'core', ARRAY['anti_extension'], ARRAY['core_anterior','hip_flexors'], ARRAY['erector_spinae'], ARRAY['bodyweight'], 1, 2, 3, 8, 12, 3),
  ('Side plank with hip lift', 'Stranski plank z dvigi bokov', 'core', ARRAY['hip_abduction','anti_lateral_flexion'], ARRAY['glute_med','core_lateral'], ARRAY['obliques','glute_max'], ARRAY['bodyweight'], 2, 2, 3, 8, 15, 3),
  ('Pallof press', 'Pallof press', 'core', ARRAY['anti_rotation'], ARRAY['core_rotational'], ARRAY['core_anterior','glute_med'], ARRAY['band','cable'], 2, 2, 3, 8, 12, 3),
  ('Bird dog', 'Bird dog', 'core', ARRAY['anti_rotation','anti_extension'], ARRAY['core_anterior','core_rotational','erector_spinae'], ARRAY['glute_max','mid_back'], ARRAY['bodyweight'], 1, 2, 3, 8, 12, 3)
ON CONFLICT (name_en) DO NOTHING;

-- 5.8 Hip stability
INSERT INTO exercises (name_en, name_sl, category, movement_patterns, primary_muscles, secondary_muscles, equipment, intrinsic_difficulty, default_sets_min, default_sets_max, default_reps_min, default_reps_max, max_per_week) VALUES
  ('Banded clamshell', 'Clamshell s trakom', 'mobility', ARRAY['hip_abduction'], ARRAY['glute_med','glute_min'], ARRAY['glute_max'], ARRAY['band','bodyweight'], 1, 2, 3, 12, 20, 3)
ON CONFLICT (name_en) DO NOTHING;
