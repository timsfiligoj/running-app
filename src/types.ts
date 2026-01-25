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

export interface WorkoutProgress {
  completed: boolean;
  actualWorkout: string;
}

export type ProgressData = Record<string, WorkoutProgress>;
