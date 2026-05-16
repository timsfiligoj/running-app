export interface Day {
  day: string;
  type: string;
  workout: string;
}

export interface Week {
  week: number;
  title: string;
  phase: string;
  focus: string;
  days: Day[];
  startDate: string; // YYYY-MM-DD format
}

export interface PacingSection {
  section: string;
  instruction: string;
}

export interface NutritionItem {
  when: string;
  what: string;
}

export interface RaceStrategy {
  pacing: PacingSection[];
  nutrition: NutritionItem[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  raceDate: string; // YYYY-MM-DD
  raceLocation?: string;
  raceUrl?: string;
  targetPace?: string;
  athlete: string;
  goal: string;
  weeks: Week[];
  raceStrategy: RaceStrategy;
  hrZones: Record<string, { range: string; purpose: string }>;
  paceZones: Record<string, string>;
}

// Activity type that user can select
export type ActivityType = 'run' | 'strength' | 'bike' | 'rest' | 'other';

// Run type for running activities
export type RunType = 'easy' | 'tempo' | 'intervals' | 'long' | 'hills' | 'test' | 'race';

export interface WorkoutProgress {
  sessionIndex: number; // 0 = planned slot, 1+ = additional sessions
  completed: boolean;
  skipped?: boolean;
  actualWorkout?: string;
  activityType?: ActivityType;
  runType?: RunType;
  distanceKm?: number;
  durationSeconds?: number;
  elevationMeters?: number;
  avgHeartRate?: number;
  comment?: string;
  stravaUrl?: string;
  stravaActivityId?: number;
}

// Keyed by `${weekNum}-${dayIndex}`. Sessions sorted ascending by sessionIndex.
export type ProgressData = Record<string, WorkoutProgress[]>;

export const dayKey = (weekNum: number, dayIndex: number) => `${weekNum}-${dayIndex}`;

// ============================================================
// Running App v2 — activity-first model types
// ============================================================

export type MovementPattern =
  | 'squat_bilateral'
  | 'squat_unilateral'
  | 'hinge_bilateral'
  | 'hinge_unilateral'
  | 'hinge_unilateral_eccentric'
  | 'lunge'
  | 'calf_gastroc'
  | 'calf_soleus'
  | 'foot_ankle'
  | 'hip_extension'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'plyo_horizontal'
  | 'plyo_vertical'
  | 'plyo_reactive'
  | 'anti_rotation'
  | 'anti_extension'
  | 'anti_lateral_flexion'
  | 'posterior_chain_pull';

export type Muscle =
  | 'quads'
  | 'hamstrings_prox'
  | 'hamstrings_distal'
  | 'hamstrings'
  | 'glute_max'
  | 'glute_med'
  | 'glute_min'
  | 'adductors'
  | 'hip_flexors'
  | 'gastrocnemius'
  | 'soleus'
  | 'tibialis_anterior'
  | 'tibialis_posterior'
  | 'peroneals'
  | 'foot_intrinsics'
  | 'erector_spinae'
  | 'multifidus'
  | 'core_anterior'
  | 'core_lateral'
  | 'core_rotational'
  | 'lats'
  | 'mid_back'
  | 'rear_delts'
  | 'grip'
  | 'obliques';

export type Tendon =
  | 'achilles'
  | 'patellar'
  | 'plantar_fascia'
  | 'hamstring_origin'
  | 'gluteal'
  | 'peroneal'
  | 'posterior_tibial';

export type Equipment =
  | 'bodyweight'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'band'
  | 'cable'
  | 'box'
  | 'wall'
  | 'bench'
  | 'partner';

export type ExerciseCategory =
  | 'compound'
  | 'accessory'
  | 'core'
  | 'plyo'
  | 'tendon'
  | 'mobility';

export type WorkoutType =
  | 'easy'
  | 'tempo'
  | 'interval'
  | 'long'
  | 'race'
  | 'recovery'
  | 'hill';

export type WorkoutSubtype =
  | 'recovery_easy'
  | 'general_aerobic'
  | 'continuous_tempo'
  | 'cruise_intervals'
  | 'progression'
  | 'hm_pace'
  | 'vo2max'
  | 'threshold_reps'
  | 'speed'
  | 'hill_repeats'
  | 'fartlek'
  | 'easy_long'
  | 'progressive_long'
  | 'hm_pace_embedded'
  | 'marathon_pace_embedded'
  | 'hill_repeats_short'
  | 'hill_repeats_long'
  | 'hill_sprints'
  | '5k'
  | '10k'
  | 'hm'
  | 'marathon'
  | 'other';

export interface RunSplit {
  km: number;
  pace_seconds: number;
  hr?: number;
  elevation?: number;
}

export interface RunLap {
  lap: number;
  distance_m: number;
  duration_seconds: number;
  pace_seconds: number;
  hr?: number;
  type?: 'work' | 'recovery';
}

export interface Run {
  id: string;
  strava_id: number;
  strava_url?: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_seconds?: number;
  avg_hr?: number;
  max_hr?: number;
  elevation_gain_m?: number;
  temperature_c?: number;
  hr_drift_bpm?: number;
  gap_pace_seconds?: number;
  effort_score?: number;
  workout_type: WorkoutType;
  workout_subtype?: WorkoutSubtype;
  phase?: string;
  classification_confidence?: number;
  classification_overridden?: boolean;
  splits?: RunSplit[];
  laps?: RunLap[];
  planned_pace_target_seconds?: number;
  planned_workout_id?: string;
  linked_progress_id?: string;
  notes?: string;
  analysis_result?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface Exercise {
  id: string;
  name_en: string;
  name_sl?: string;
  category: ExerciseCategory;
  movement_patterns: MovementPattern[];
  primary_muscles: Muscle[];
  secondary_muscles?: Muscle[];
  tendons?: Tendon[];
  is_unilateral: boolean;
  equipment: Equipment[];
  is_bodyweight_only: boolean;
  is_time_based: boolean;
  intrinsic_difficulty: 1 | 2 | 3 | 4 | 5;
  is_big_three: boolean;
  default_sets_min?: number;
  default_sets_max?: number;
  default_reps_min?: number;
  default_reps_max?: number;
  default_duration_seconds_min?: number;
  default_duration_seconds_max?: number;
  default_rir_min?: number;
  default_rir_max?: number;
  max_per_week?: number;
  injury_risk_notes?: string;
  technique_notes?: string;
  video_url?: string;
  alternatives?: string[];
}

export interface StrengthExerciseEntry {
  exercise_id: string;
  name_sl: string;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rir?: number;
  actual_sets?: number;
  actual_reps?: number[];
  actual_weight_kg?: number;
  notes?: string;
}

export interface StrengthSession {
  id: string;
  date: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  duration_min?: number;
  phase?: string;
  session_type?: 'light' | 'maintenance' | 'medium' | 'heavy' | 'explosive';
  exercises: StrengthExerciseEntry[];
  suggested_by_id?: string;
  notes?: string;
  analysis_result?: unknown;
  created_at?: string;
}

export interface PhaseConfig {
  id?: string;
  phase_code: string;
  start_date: string;
  end_date: string;
  easy_hr_max?: number;
  threshold_pace_seconds?: number;
  vo2max_pace_seconds?: number;
  hm_pace_seconds?: number;
  mp_pace_seconds?: number;
  weekly_volume_target_km?: number;
  strength_frequency?: number;
  key_race?: string;
  emphasis_notes?: string;
}

export interface WorkoutSuggestion {
  id: string;
  date_generated: string;
  suggester_type: 'running' | 'strength';
  input_params: Record<string, unknown>;
  output_workout: Record<string, unknown>;
  rationale: string;
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired';
  actual_session_id?: string;
  modifications?: Record<string, unknown>;
  feedback_notes?: string;
}

// Helpers for pace conversions
export function paceSecondsToString(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function paceStringToSeconds(str: string): number | null {
  if (!str) return null;
  const match = str.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

// Helper to calculate pace from distance and duration
export function calculatePace(distanceKm: number, durationSeconds: number): string {
  if (!distanceKm || !durationSeconds || distanceKm <= 0) return '-';
  const paceSeconds = durationSeconds / distanceKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

// Helper to format duration
export function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to parse duration string to seconds
export function parseDuration(str: string): number {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Helper to get date for a specific day in a week
export function getDateForDay(weekStartDate: string, dayIndex: number): Date {
  const start = new Date(weekStartDate);
  const date = new Date(start);
  date.setDate(start.getDate() + dayIndex);
  return date;
}

// Format date as "27. jan"
export function formatDateShort(date: Date): string {
  const day = date.getDate();
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  return `${day}. ${months[date.getMonth()]}`;
}

// YYYY-MM-DD in local time
export function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
