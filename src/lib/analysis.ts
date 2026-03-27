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
  cached: boolean;
}

/**
 * Load cached analysis from Supabase
 */
export async function getCachedAnalysis(workoutKey: string): Promise<AnalysisResult | null> {
  const { data } = await supabase
    .from('workout_progress')
    .select('analysis_text, analysis_sources, analysis_at')
    .eq('id', workoutKey)
    .single();

  if (data?.analysis_text) {
    return {
      analysis: data.analysis_text,
      sources: data.analysis_sources || { strava: false, garmin: false, garminActivity: false, garminDailyStats: false },
    };
  }
  return null;
}

/**
 * Save analysis to cache in Supabase
 */
export async function cacheAnalysis(workoutKey: string, result: AnalysisResult): Promise<void> {
  await supabase
    .from('workout_progress')
    .update({
      analysis_text: result.analysis,
      analysis_sources: result.sources,
      analysis_at: new Date().toISOString(),
    })
    .eq('id', workoutKey);
}

/**
 * Analyze a run using Strava + Garmin data via Claude AI
 * Returns cached result if available, unless forceRefresh is true
 */
export async function analyzeRun(
  stravaUrl: string | undefined,
  date: string | undefined,
  workoutContext: WorkoutContext,
  workoutKey?: string,
  forceRefresh = false,
): Promise<AnalyzeRunResult> {
  // Check cache first
  if (workoutKey && !forceRefresh) {
    const cached = await getCachedAnalysis(workoutKey);
    if (cached) {
      return { data: cached, error: null, cached: true };
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('analyze-run', {
      body: { stravaUrl, date, workoutContext },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return { data: null, error: 'Napaka pri analizi teka', cached: false };
    }

    if (data?.error) {
      return { data: null, error: data.error, cached: false };
    }

    // Cache the result
    if (workoutKey && data) {
      await cacheAnalysis(workoutKey, data);
    }

    return { data, error: null, cached: false };
  } catch (err) {
    console.error('Analyze run error:', err);
    return { data: null, error: 'Napaka pri povezavi s strežnikom', cached: false };
  }
}
