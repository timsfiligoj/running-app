import { api } from './api';

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
 * Load a cached analysis. Keys are "${planId}:${week}-${dayIndex}-${sessionIndex}".
 */
export async function getCachedAnalysis(workoutKey: string): Promise<AnalysisResult | null> {
  const { data, error } = await api<AnalysisResult | null>('GET', `/analysis?key=${encodeURIComponent(workoutKey)}`);
  if (error) {
    console.error('getCachedAnalysis error:', error);
    return null;
  }
  return data;
}

/**
 * Save an analysis to the cache
 */
export async function cacheAnalysis(workoutKey: string, result: AnalysisResult): Promise<void> {
  const { error } = await api('PUT', '/analysis', { key: workoutKey, ...result });
  if (error) {
    console.error('cacheAnalysis error:', error);
  }
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
    const { data, error } = await api<AnalysisResult>('POST', '/analyze-run', { stravaUrl, date, workoutContext });

    if (error) {
      console.error('analyze-run error:', error);
      return { data: null, error, cached: false };
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
