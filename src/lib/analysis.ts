import { supabase } from './supabase';

export interface AnalysisResult {
  analysis: string;
  sources: {
    strava: boolean;
    garmin: boolean;
    garminActivity: boolean;
    garminDailyStats: boolean;
  };
}

export interface WorkoutContext {
  plannedWorkout?: string;
  runType?: string;
  comment?: string;
  weekNumber?: number;
  phase?: string;
  focus?: string;
}

export interface AnalyzeRunResult {
  data: AnalysisResult | null;
  error: string | null;
}

/**
 * Analyze a run using Strava + Garmin data via Claude AI
 */
export async function analyzeRun(
  stravaUrl: string | undefined,
  date: string | undefined,
  workoutContext: WorkoutContext,
): Promise<AnalyzeRunResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-run', {
      body: { stravaUrl, date, workoutContext },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return { data: null, error: 'Napaka pri analizi teka' };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Analyze run error:', err);
    return { data: null, error: 'Napaka pri povezavi s strežnikom' };
  }
}
