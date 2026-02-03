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
  athlete: string;
  goal: string;
  weeks: Week[];
  raceStrategy: RaceStrategy;
  hrZones: Record<string, { range: string; purpose: string }>;
  paceZones: Record<string, string>;
}

// Activity type that user can select
export type ActivityType = 'run' | 'strength' | 'rest' | 'other';

// Run type for running activities
export type RunType = 'easy' | 'tempo' | 'intervals' | 'long' | 'hills' | 'test' | 'race';

export interface WorkoutProgress {
  completed: boolean;
  skipped?: boolean; // true = izpuščen trening (bolezen, poškodba, itd.)
  actualWorkout?: string; // undefined = use default, '' = explicitly cleared
  // New fields
  activityType?: ActivityType;
  runType?: RunType;
  distanceKm?: number;
  durationSeconds?: number; // stored as seconds for easier calculations
  elevationMeters?: number; // total elevation gain in meters
  avgHeartRate?: number;
  comment?: string;
  stravaUrl?: string;
}

export type ProgressData = Record<string, WorkoutProgress>;

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
