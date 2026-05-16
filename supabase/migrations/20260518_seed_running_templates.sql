-- Seed ~64 running workout templates per HANDOFF dodatek sekcija 5.9.
-- Structure JSON uses pace_ref strings resolved at suggester runtime from phase_config.

-- ============================================================
-- 5.9.1 Easy / recovery (phase-agnostic)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('any_easy_short', 'Lahek tek 45 min', 'any', ARRAY['general','hm_pb','marathon_base','5k_pb','10k_pb'], 'easy', 'recovery_easy', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","duration_min":45,"pace_ref":"easy"}]}'::jsonb,
  8.5, 45, 1),
('any_easy_medium', 'Lahek tek 60-70 min', 'any', ARRAY['general','hm_pb','marathon_base','5k_pb','10k_pb'], 'easy', 'general_aerobic', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","duration_min":65,"pace_ref":"easy"}]}'::jsonb,
  12.5, 65, 2),
('any_easy_long_finish', 'Lahek tek 60 min z moderate finish', 'any', ARRAY['general','hm_pb','marathon_base'], 'easy', 'general_aerobic', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","duration_min":50,"pace_ref":"easy"},{"phase":"main","type":"continuous","duration_min":10,"pace_ref":"hm_pace"}]}'::jsonb,
  12, 60, 2)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.2 F1 recovery
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F1_recovery_short', 'Recovery 35 min', 'F1', ARRAY['general'], 'recovery', 'recovery_easy', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","duration_min":35,"pace_ref":"easy"}]}'::jsonb,
  6.5, 35, 1),
('F1_long_easy_18k', 'Lahek long 18km', 'F1', ARRAY['general'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":18,"pace_ref":"easy"}]}'::jsonb,
  18, 95, 2)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.3 F2 aerobic base + intro VO2max (goal: hm_pb, marathon_base)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F2_int_vo2_3min', '5×3min @ vo2max, 2min jog', 'F2', ARRAY['hm_pb','marathon_base'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":5,"work_duration_seconds":180,"work_pace_ref":"vo2max_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  9, 50, 3),
('F2_int_800_5k', '6×800m @ 5K pace, 90s jog', 'F2', ARRAY['hm_pb','marathon_base'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":6,"work_distance_m":800,"work_pace_ref":"5k_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  10, 55, 3),
('F2_int_hill_90s', '8×90s up hill, jog down', 'F2', ARRAY['hm_pb','marathon_base'], 'hill', 'hill_repeats_long', 'hill',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":8,"work_duration_seconds":90,"work_pace_ref":"vo2max_pace","rest_description":"jog down","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  9, 55, 4),
('F2_tempo_cont_25', 'Continuous tempo 25min', 'F2', ARRAY['hm_pb','marathon_base'], 'tempo', 'continuous_tempo', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","duration_min":25,"pace_ref":"threshold_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 55, 3),
('F2_tempo_cruise_3x8', '3×8min @ threshold, 2min jog', 'F2', ARRAY['hm_pb','marathon_base'], 'tempo', 'cruise_intervals', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_duration_seconds":480,"work_pace_ref":"threshold_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11.5, 55, 3),
('F2_long_easy_22k', 'Lahek long 22km', 'F2', ARRAY['hm_pb','marathon_base'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":22,"pace_ref":"easy"}]}'::jsonb,
  22, 115, 2),
('F2_long_progr_24k', 'Long 24km z moderate finish', 'F2', ARRAY['hm_pb','marathon_base'], 'long', 'progressive_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":18,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":6,"pace_ref":"hm_pace"}]}'::jsonb,
  24, 125, 3),
('F2_long_hilly_22k', 'Hilly long 22km', 'F2', ARRAY['hm_pb','marathon_base'], 'long', 'easy_long', 'hill',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":22,"pace_ref":"easy","notes":"hilly ~400m gain"}]}'::jsonb,
  22, 125, 4)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.4 F3 4:00/km specificity (goal: hm_pb)
-- progression chain: 5x1000 → 4x1500 → 3x2000 → 2x3000
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty, notes) VALUES
('F3_int_5x1000', '5×1000m @ 4:00, 90s jog', 'F3', ARRAY['hm_pb'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":5,"work_distance_m":1000,"work_pace_ref":"vo2max_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11, 60, 3, 'progression chain step 1'),
('F3_int_4x1500', '4×1500m @ 4:00, 2min jog', 'F3', ARRAY['hm_pb'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":1500,"work_pace_ref":"vo2max_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 62, 4, 'progression chain step 2'),
('F3_int_3x2000', '3×2000m @ 4:00, 2-3min jog', 'F3', ARRAY['hm_pb'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_distance_m":2000,"work_pace_ref":"vo2max_pace","rest_duration_seconds":150,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12.5, 65, 4, 'progression chain step 3'),
('F3_int_2x3000', '2×3000m @ 4:00, 3-4min jog', 'F3', ARRAY['hm_pb'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":2,"work_distance_m":3000,"work_pace_ref":"vo2max_pace","rest_duration_seconds":210,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12.5, 65, 5, 'progression chain step 4 (peak)'),
('F3_int_8x600_5k', '8×600m @ 5K pace, 90s jog', 'F3', ARRAY['hm_pb','5k_pb'], 'interval', 'vo2max', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":8,"work_distance_m":600,"work_pace_ref":"5k_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11.5, 58, 3, NULL),
('F3_int_hill_60_90', '10×60-90s steep hills', 'F3', ARRAY['hm_pb'], 'hill', 'hill_repeats_short', 'hill',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":10,"work_duration_seconds":75,"work_pace_ref":"vo2max_pace","rest_description":"walk down","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  10, 55, 4, NULL),
('F3_tempo_cruise_4x8', '4×8min @ threshold', 'F3', ARRAY['hm_pb'], 'tempo', 'cruise_intervals', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_duration_seconds":480,"work_pace_ref":"threshold_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  13, 60, 3, NULL),
('F3_tempo_cruise_3x10', '3×10min @ threshold', 'F3', ARRAY['hm_pb'], 'tempo', 'cruise_intervals', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_duration_seconds":600,"work_pace_ref":"threshold_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  13.5, 62, 4, NULL),
('F3_tempo_cont_25', 'Continuous 25min @ threshold', 'F3', ARRAY['hm_pb'], 'tempo', 'continuous_tempo', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","duration_min":25,"pace_ref":"threshold_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12.5, 55, 3, NULL),
('F3_long_easy_24k', 'Lahek long 24km', 'F3', ARRAY['hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":24,"pace_ref":"easy"}]}'::jsonb,
  24, 125, 2, NULL),
('F3_long_progr_28k', '28km z final 8km @ MP-HM', 'F3', ARRAY['hm_pb','marathon_base'], 'long', 'progressive_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":20,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"hm_pace"}]}'::jsonb,
  28, 145, 5, NULL),
('F3_long_hilly_24k', 'Hilly long 24km', 'F3', ARRAY['hm_pb'], 'long', 'easy_long', 'hill',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":24,"pace_ref":"easy","notes":"hilly ~500m gain"}]}'::jsonb,
  24, 135, 4, NULL)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.5 F4 peak speed (goal: 5k_pb, 10k_pb, hm_pb)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F4_int_10x400_3k', '10×400m @ 3K pace, 60s jog', 'F4', ARRAY['5k_pb','10k_pb','hm_pb'], 'interval', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":10,"work_distance_m":400,"work_pace_ref":"3k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  9.5, 50, 4),
('F4_int_8x600_3k', '8×600m @ 3K pace, 75s jog', 'F4', ARRAY['5k_pb','10k_pb'], 'interval', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":8,"work_distance_m":600,"work_pace_ref":"3k_pace","rest_duration_seconds":75,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  10, 52, 4),
('F4_int_6x1000_10k', '6×1000m @ 10K pace, 75s jog', 'F4', ARRAY['10k_pb','hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":6,"work_distance_m":1000,"work_pace_ref":"10k_pace","rest_duration_seconds":75,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 60, 3),
('F4_int_4x1500_10k', '4×1500m @ 10K pace, 2min jog', 'F4', ARRAY['10k_pb','hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":1500,"work_pace_ref":"10k_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 60, 4),
('F4_int_hill_sprints', '12×15s hill sprints, full rec', 'F4', ARRAY['5k_pb','10k_pb','hm_pb'], 'hill', 'hill_sprints', 'hill',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":12,"work_duration_seconds":15,"work_pace_ref":"3k_pace","rest_description":"walk down full recovery","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  7, 50, 5),
('F4_tempo_15_thresh', '15min @ threshold', 'F4', ARRAY['5k_pb','10k_pb','hm_pb'], 'tempo', 'continuous_tempo', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","duration_min":15,"pace_ref":"threshold_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11, 50, 3),
('F4_tempo_3x2k_10k', '3×2km @ 10K pace, 90s jog', 'F4', ARRAY['10k_pb','hm_pb'], 'tempo', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_distance_m":2000,"work_pace_ref":"10k_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  13, 62, 4),
('F4_long_maintain_22k', 'Volume maintenance long 22km', 'F4', ARRAY['5k_pb','10k_pb','hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":22,"pace_ref":"easy"}]}'::jsonb,
  22, 115, 2),
('F4_long_24k_strides', '24km easy + 6×100m strides', 'F4', ARRAY['5k_pb','10k_pb','hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":22,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":6,"work_distance_m":100,"work_pace_ref":"5k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy","notes":"strides v zadnji tretjini"},{"phase":"main","type":"continuous","distance_km":1.5,"pace_ref":"easy"}]}'::jsonb,
  24.5, 125, 3)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.6 F5a HM specific build (goal: hm_pb)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F5a_int_3x2k_thresh', '3×2km @ threshold, 90s jog', 'F5a', ARRAY['hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_distance_m":2000,"work_pace_ref":"threshold_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 58, 3),
('F5a_int_4x2k_thresh', '4×2km @ threshold, 90s jog', 'F5a', ARRAY['hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":2000,"work_pace_ref":"threshold_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  14, 65, 4),
('F5a_int_5x1k_hmpace', '5×1000m @ HM pace, 60s jog', 'F5a', ARRAY['hm_pb'], 'interval', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":5,"work_distance_m":1000,"work_pace_ref":"hm_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11, 55, 3),
('F5a_int_6x1k_hmpace', '6×1000m @ HM pace, 60s jog', 'F5a', ARRAY['hm_pb'], 'interval', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":6,"work_distance_m":1000,"work_pace_ref":"hm_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 60, 4),
('F5a_int_4x1600_thresh', '4×1600m @ threshold', 'F5a', ARRAY['hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":1600,"work_pace_ref":"threshold_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  12, 60, 4),
('F5a_int_speed_reminder', '10×400m @ 3K pace, 60s jog', 'F5a', ARRAY['hm_pb'], 'interval', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":10,"work_distance_m":400,"work_pace_ref":"3k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  9.5, 50, 3),
('F5a_tempo_cont_8k', '8km @ HM pace continuous', 'F5a', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"hm_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  13, 60, 3),
('F5a_tempo_cont_10k', '10km @ HM pace continuous', 'F5a', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":10,"pace_ref":"hm_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  15, 70, 4),
('F5a_tempo_2x4k_hm', '2×4km @ HM pace, 3min easy', 'F5a', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":2,"work_distance_m":4000,"work_pace_ref":"hm_pace","rest_duration_seconds":180,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  14, 65, 4),
('F5a_tempo_3x3k_hm', '3×3km @ HM pace, 2min jog', 'F5a', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_distance_m":3000,"work_pace_ref":"hm_pace","rest_duration_seconds":120,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  14, 65, 4),
('F5a_long_22k_2x4hm', '22km z 2×4km HM pace', 'F5a', ARRAY['hm_pb'], 'long', 'hm_pace_embedded', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":2,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"easy"}]}'::jsonb,
  22, 110, 4),
('F5a_long_25k_hm_cont', '25km z 12km HM pace mid', 'F5a', ARRAY['hm_pb'], 'long', 'hm_pace_embedded', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":12,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":5,"pace_ref":"easy"}]}'::jsonb,
  25, 125, 5),
('F5a_long_28k_hm_cont', '28km z 15km HM pace', 'F5a', ARRAY['hm_pb'], 'long', 'hm_pace_embedded', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":15,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":5,"pace_ref":"easy"}]}'::jsonb,
  28, 140, 5),
('F5a_long_peak_30k', 'Peak 30km z final 6km HM', 'F5a', ARRAY['hm_pb'], 'long', 'progressive_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":24,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":6,"pace_ref":"hm_pace"}]}'::jsonb,
  30, 150, 5),
('F5a_long_recovery_22k', 'Easy recovery long 22km', 'F5a', ARRAY['hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":22,"pace_ref":"easy"}]}'::jsonb,
  22, 115, 2)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.7 F5b-LJ taper (race week)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F5bLJ_int_5x400_hmpace', '5×400m @ HM pace, full rec', 'F5b-LJ', ARRAY['hm_pb'], 'interval', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":5,"work_distance_m":400,"work_pace_ref":"hm_pace","rest_duration_seconds":120,"rest_pace_ref":"easy","rest_description":"walk-jog"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  7.5, 45, 2),
('F5bLJ_tempo_3k_hm', '3km @ HM pace', 'F5b-LJ', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":3,"pace_ref":"hm_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  8.5, 40, 2),
('F5bLJ_long_16k_6d_out', '16km easy (6 dni pred)', 'F5b-LJ', ARRAY['hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":16,"pace_ref":"easy"}]}'::jsonb,
  16, 85, 2),
('F5bLJ_easy_pre_race', '10km easy + strides (2-3 dni pred)', 'F5b-LJ', ARRAY['hm_pb'], 'easy', 'recovery_easy', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":10,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":100,"work_pace_ref":"5k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"}]}'::jsonb,
  10.5, 55, 1)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.8 F5c between races (post-LJ → pre-Palmanova)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F5c_int_4x2k_thresh', '4×2km @ threshold', 'F5c', ARRAY['hm_pb'], 'interval', 'threshold_reps', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":2000,"work_pace_ref":"threshold_pace","rest_duration_seconds":90,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  14, 65, 4),
('F5c_int_5x1k_hmpace', '5×1000m @ HM pace', 'F5c', ARRAY['hm_pb'], 'interval', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":5,"work_distance_m":1000,"work_pace_ref":"hm_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  11, 55, 3),
('F5c_tempo_2x4k_hm', '2×4km @ HM pace', 'F5c', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":2,"work_distance_m":4000,"work_pace_ref":"hm_pace","rest_duration_seconds":180,"rest_pace_ref":"easy"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  14, 65, 4),
('F5c_tempo_cont_10k', '10km @ HM pace', 'F5c', ARRAY['hm_pb'], 'tempo', 'hm_pace', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":10,"pace_ref":"hm_pace"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  15, 70, 4),
('F5c_long_recovery_18k', 'Recovery long 18km (1. teden po LJ)', 'F5c', ARRAY['hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":18,"pace_ref":"easy"}]}'::jsonb,
  18, 95, 2),
('F5c_long_consolidation_24k', '24km z 6km HM pace', 'F5c', ARRAY['hm_pb'], 'long', 'hm_pace_embedded', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":14,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":6,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"easy"}]}'::jsonb,
  24, 120, 4),
('F5c_long_sharpening_22k', '22km z 2×3km HM', 'F5c', ARRAY['hm_pb'], 'long', 'hm_pace_embedded', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":3,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"easy"},{"phase":"main","type":"continuous","distance_km":3,"pace_ref":"hm_pace"},{"phase":"main","type":"continuous","distance_km":4,"pace_ref":"easy"}]}'::jsonb,
  22, 110, 4)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 5.9.9 F5d-Palmanova taper (race week)
-- ============================================================
INSERT INTO running_workout_templates (template_code, display_name_sl, phase, goal_compat, category, subtype, terrain, structure, estimated_distance_km, estimated_duration_min, intra_category_difficulty) VALUES
('F5dPalm_int_4x400_hmpace', '4×400m @ HM pace pace-feel', 'F5d-Palmanova', ARRAY['hm_pb'], 'interval', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":15,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":4,"work_distance_m":400,"work_pace_ref":"hm_pace","rest_duration_seconds":90,"rest_pace_ref":"easy","rest_description":"walk-jog"},{"phase":"cooldown","type":"continuous","duration_min":10,"pace_ref":"easy"}]}'::jsonb,
  7, 40, 2),
('F5dPalm_tempo_strides', '6×100m strides @ 5K pace', 'F5d-Palmanova', ARRAY['hm_pb'], 'tempo', 'speed', 'flat',
  '{"segments":[{"phase":"warmup","type":"continuous","duration_min":12,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":6,"work_distance_m":100,"work_pace_ref":"5k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy","rest_description":"100m walk"},{"phase":"cooldown","type":"continuous","duration_min":8,"pace_ref":"easy"}]}'::jsonb,
  6, 35, 1),
('F5dPalm_long_12k_6d_out', '12km easy (6 dni pred Palmanova)', 'F5d-Palmanova', ARRAY['hm_pb'], 'long', 'easy_long', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":12,"pace_ref":"easy"}]}'::jsonb,
  12, 65, 2),
('F5dPalm_easy_8k_2d_out', '8km easy + strides (2 dni pred)', 'F5d-Palmanova', ARRAY['hm_pb'], 'easy', 'recovery_easy', 'flat',
  '{"segments":[{"phase":"main","type":"continuous","distance_km":8,"pace_ref":"easy"},{"phase":"main","type":"reps","reps":3,"work_distance_m":100,"work_pace_ref":"5k_pace","rest_duration_seconds":60,"rest_pace_ref":"easy"}]}'::jsonb,
  8.5, 45, 1)
ON CONFLICT (template_code) DO NOTHING;
