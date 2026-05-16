import { supabase } from './supabase';
import { fetchStravaDataFull, extractStravaActivityId } from './strava';
import type { Run, RunSplit, RunLap, WorkoutType, WorkoutSubtype, PhaseConfig } from '../types';

export interface ClassificationResult {
  workout_type: WorkoutType;
  workout_subtype?: WorkoutSubtype;
  confidence: number;
}

export interface IngestPreview {
  strava_id: number;
  strava_url: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_seconds: number;
  avg_hr?: number;
  max_hr?: number;
  elevation_gain_m?: number;
  temperature_c?: number;
  hr_drift_bpm?: number;
  effort_score: number;
  classification: ClassificationResult;
  phase?: string;
  splits?: RunSplit[];
  laps?: RunLap[];
  title?: string;
}

export interface IngestOptions {
  isRace?: boolean;
  linkedProgressId?: string;
  plannedPaceTargetSeconds?: number;
  notes?: string;
}

/**
 * HR drift = avg HR second half - avg HR first half (split by time, not distance).
 * Returns null if too few splits with HR data.
 */
export function computeHrDrift(splits: RunSplit[] | null | undefined): number | null {
  if (!splits || splits.length < 4) return null;
  const withHr = splits.filter(s => typeof s.hr === 'number');
  if (withHr.length < 4) return null;

  const mid = Math.floor(withHr.length / 2);
  const firstHalf = withHr.slice(0, mid);
  const secondHalf = withHr.slice(mid);

  const avg = (arr: RunSplit[]) => arr.reduce((sum, s) => sum + (s.hr ?? 0), 0) / arr.length;
  return Math.round(avg(secondHalf) - avg(firstHalf));
}

/**
 * Composite effort score 1-100 from pace, HR, elevation, distance.
 * Heuristic: pace contribution (~50), HR contribution (~30), elevation (~20).
 */
export function computeEffortScore(
  distanceKm: number,
  durationSeconds: number,
  avgHr: number | null | undefined,
  elevationGainM: number | null | undefined,
  athleteMaxHr: number = 195,
): number {
  if (!distanceKm || !durationSeconds) return 0;
  const paceSec = durationSeconds / distanceKm;
  // Pace score: 0 at 6:30/km (390s), 50 at 3:30/km (210s) — linear
  const paceComponent = Math.max(0, Math.min(50, ((390 - paceSec) / (390 - 210)) * 50));
  // HR component: pct of max → up to 30 points
  const hrComponent = avgHr ? Math.max(0, Math.min(30, ((avgHr / athleteMaxHr) - 0.6) * 75)) : 0;
  // Elevation component: 10m/km = 1pt, capped 20
  const elev = elevationGainM ?? 0;
  const elevComponent = Math.min(20, (elev / distanceKm) / 10 * 2);
  return Math.round(paceComponent + hrComponent + elevComponent);
}

interface ClassifyInput {
  distance_km: number;
  duration_seconds: number;
  avg_pace_seconds: number;
  avg_hr?: number;
  max_hr?: number;
  elevation_gain_m?: number;
  splits?: RunSplit[];
  laps?: RunLap[];
  isRace?: boolean;
  phaseConfig?: PhaseConfig;
  athleteMaxHr?: number;
}

/**
 * Rule-based workout classifier per HANDOFF sekcija 7.2.
 * First matching rule wins.
 */
export function classifyWorkout(input: ClassifyInput): ClassificationResult {
  if (input.isRace) {
    let raceSubtype: WorkoutSubtype = 'other';
    if (input.distance_km < 7) raceSubtype = '5k';
    else if (input.distance_km < 13) raceSubtype = '10k';
    else if (input.distance_km < 25) raceSubtype = 'hm';
    else raceSubtype = 'marathon';
    return { workout_type: 'race', workout_subtype: raceSubtype, confidence: 1.0 };
  }

  const {
    distance_km, duration_seconds, avg_pace_seconds, avg_hr, elevation_gain_m,
    splits, laps, phaseConfig, athleteMaxHr,
  } = input;

  const thresholdPace = phaseConfig?.threshold_pace_seconds;
  const vo2maxPace = phaseConfig?.vo2max_pace_seconds;
  const hmPace = phaseConfig?.hm_pace_seconds;
  // Easy pace heuristic: 75-90s slower than threshold, fall back to 5:00/km
  const easyPace = thresholdPace ? thresholdPace + 80 : 300;
  const maxHr = athleteMaxHr ?? 195;

  // Rule 1: laps with high pace variance → interval
  if (laps && laps.length >= 4) {
    const paces = laps.map(l => l.pace_seconds).filter((p): p is number => typeof p === 'number');
    if (paces.length >= 4) {
      const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
      const stdDev = Math.sqrt(paces.reduce((a, b) => a + (b - mean) ** 2, 0) / paces.length);
      const variance = stdDev / mean;

      if (variance > 0.3) {
        // Work laps = faster than mean; estimate mean work duration
        const workLaps = laps.filter(l => l.pace_seconds && l.pace_seconds < mean);
        const meanWorkDuration = workLaps.length
          ? workLaps.reduce((a, b) => a + b.duration_seconds, 0) / workLaps.length
          : 90;
        const meanWorkPace = workLaps.length
          ? workLaps.reduce((a, b) => a + (b.pace_seconds ?? 0), 0) / workLaps.length
          : mean;
        const avgLapElevation = laps.reduce((a, b) => a + (b.hr ? 0 : 0), 0) / laps.length;

        let subtype: WorkoutSubtype = 'fartlek';
        if (meanWorkDuration <= 90 && vo2maxPace && Math.abs(meanWorkPace - vo2maxPace) < 20) {
          subtype = 'vo2max';
        } else if (meanWorkDuration > 90 && thresholdPace && Math.abs(meanWorkPace - thresholdPace) < 20) {
          subtype = 'threshold_reps';
        } else if (elevation_gain_m && distance_km > 0 && (elevation_gain_m / distance_km) > 25) {
          subtype = 'hill_repeats';
        } else if (avgLapElevation > 15) {
          subtype = 'hill_repeats';
        }
        return { workout_type: 'interval', workout_subtype: subtype, confidence: 0.9 };
      }
    }
  }

  // Rule 2: distance >= 18 → long
  if (distance_km >= 18) {
    let subtype: WorkoutSubtype = 'easy_long';
    if (splits && splits.length >= 6) {
      const firstChunk = splits.slice(0, 3);
      const lastChunk = splits.slice(-3);
      const firstAvgPace = firstChunk.reduce((a, b) => a + (b.pace_seconds ?? 0), 0) / firstChunk.length;
      const lastAvgPace = lastChunk.reduce((a, b) => a + (b.pace_seconds ?? 0), 0) / lastChunk.length;
      if (lastAvgPace < firstAvgPace * 0.9) {
        subtype = 'progressive_long';
      } else if (hmPace) {
        const midChunk = splits.slice(3, Math.min(splits.length - 3, 18));
        const matchingHm = midChunk.filter(s => Math.abs((s.pace_seconds ?? 0) - hmPace) < 5);
        if (matchingHm.length >= 4) subtype = 'hm_pace_embedded';
      }
    }
    return { workout_type: 'long', workout_subtype: subtype, confidence: 0.85 };
  }

  // Rule 3: 8-18 km AND pace close to threshold → tempo
  if (distance_km >= 8 && distance_km < 18 && thresholdPace && Math.abs(avg_pace_seconds - thresholdPace) < 8) {
    let subtype: WorkoutSubtype = 'continuous_tempo';
    if (laps && laps.length >= 2 && laps.length <= 8) {
      subtype = 'cruise_intervals';
    } else if (splits && splits.length >= 4) {
      const firstAvg = splits.slice(0, 2).reduce((a, b) => a + (b.pace_seconds ?? 0), 0) / 2;
      const lastAvg = splits.slice(-2).reduce((a, b) => a + (b.pace_seconds ?? 0), 0) / 2;
      if (lastAvg < firstAvg - 8) subtype = 'progression';
    }
    return { workout_type: 'tempo', workout_subtype: subtype, confidence: 0.85 };
  }

  // Rule 4: high elevation per km → hill
  if (elevation_gain_m && distance_km > 0 && elevation_gain_m / distance_km > 25) {
    const lapDurAvg = laps && laps.length
      ? laps.reduce((a, b) => a + b.duration_seconds, 0) / laps.length
      : duration_seconds / Math.max(distance_km, 1);
    let subtype: WorkoutSubtype = 'hill_sprints';
    if (lapDurAvg <= 90) subtype = 'hill_repeats_short';
    else if (lapDurAvg <= 240) subtype = 'hill_repeats_long';
    return { workout_type: 'hill', workout_subtype: subtype, confidence: 0.8 };
  }

  // Rule 5: easy pace + low HR → easy
  if (avg_pace_seconds > easyPace && (!avg_hr || avg_hr < maxHr * 0.75)) {
    const durMin = duration_seconds / 60;
    const subtype: WorkoutSubtype = durMin <= 45 ? 'recovery_easy' : 'general_aerobic';
    return { workout_type: 'easy', workout_subtype: subtype, confidence: 0.9 };
  }

  // Fallback: low confidence
  return { workout_type: 'easy', workout_subtype: 'general_aerobic', confidence: 0.5 };
}

/**
 * Find the phase config row whose [start_date, end_date] contains `date`.
 * Returns null if date is outside all configured phases.
 */
export async function resolvePhase(date: string): Promise<PhaseConfig | null> {
  const { data, error } = await supabase
    .from('phase_config')
    .select('*')
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1);
  if (error) {
    console.error('resolvePhase error:', error);
    return null;
  }
  return (data?.[0] as PhaseConfig | undefined) ?? null;
}

/**
 * Fetch athlete max_hr for HR-based heuristics. Defaults to 195.
 */
async function fetchAthleteMaxHr(): Promise<number> {
  const { data } = await supabase
    .from('athlete_profile')
    .select('max_hr')
    .eq('id', 'default')
    .maybeSingle();
  return (data as { max_hr?: number } | null)?.max_hr ?? 195;
}

/**
 * Build the preview (no DB write yet) so the UI can show classification
 * with confidence and let the user override before saving.
 */
export async function buildIngestPreview(
  stravaUrl: string,
  options: IngestOptions = {},
): Promise<{ preview: IngestPreview | null; error: string | null }> {
  const activityId = extractStravaActivityId(stravaUrl);
  if (!activityId) return { preview: null, error: 'Neveljaven Strava URL' };

  // Idempotency check
  const { data: existing } = await supabase
    .from('runs')
    .select('id, strava_id')
    .eq('strava_id', activityId)
    .maybeSingle();
  if (existing) {
    return { preview: null, error: 'Aktivnost je že shranjena (strava_id že obstaja)' };
  }

  const { data, error } = await fetchStravaDataFull(stravaUrl);
  if (error || !data) return { preview: null, error: error ?? 'Napaka pri Strava fetch' };
  if (!data.distanceKm || !data.durationSeconds) {
    return { preview: null, error: 'Aktivnost nima distance ali duration' };
  }

  const date = (data.startDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const phase = await resolvePhase(date);
  const athleteMaxHr = await fetchAthleteMaxHr();

  const avgPaceSeconds = data.durationSeconds / data.distanceKm;
  const hrDrift = computeHrDrift(data.splits) ?? undefined;
  const effortScore = computeEffortScore(
    data.distanceKm,
    data.durationSeconds,
    data.avgHeartRate,
    data.elevationMeters,
    athleteMaxHr,
  );

  const classification = classifyWorkout({
    distance_km: data.distanceKm,
    duration_seconds: data.durationSeconds,
    avg_pace_seconds: avgPaceSeconds,
    avg_hr: data.avgHeartRate ?? undefined,
    max_hr: data.maxHeartRate ?? undefined,
    elevation_gain_m: data.elevationMeters ?? undefined,
    splits: data.splits ?? undefined,
    laps: data.laps ?? undefined,
    isRace: options.isRace,
    phaseConfig: phase ?? undefined,
    athleteMaxHr,
  });

  return {
    preview: {
      strava_id: activityId,
      strava_url: stravaUrl,
      date,
      distance_km: data.distanceKm,
      duration_seconds: data.durationSeconds,
      avg_pace_seconds: Math.round(avgPaceSeconds * 100) / 100,
      avg_hr: data.avgHeartRate ?? undefined,
      max_hr: data.maxHeartRate ?? undefined,
      elevation_gain_m: data.elevationMeters ?? undefined,
      temperature_c: data.temperatureC ?? undefined,
      hr_drift_bpm: hrDrift,
      effort_score: effortScore,
      classification,
      phase: phase?.phase_code,
      splits: data.splits ?? undefined,
      laps: data.laps ?? undefined,
      title: data.title ?? undefined,
    },
    error: null,
  };
}

export interface IngestPayload extends IngestPreview {
  /** User-confirmed (possibly overridden) classification fields */
  override_workout_type?: WorkoutType;
  override_workout_subtype?: WorkoutSubtype;
  override_phase?: string;
}

/**
 * Persist the run to `runs` table. Returns the inserted row id or error.
 */
export async function saveIngestedRun(
  payload: IngestPayload,
  options: IngestOptions = {},
): Promise<{ id: string | null; error: string | null }> {
  const finalType = payload.override_workout_type ?? payload.classification.workout_type;
  const finalSubtype = payload.override_workout_subtype ?? payload.classification.workout_subtype;
  const finalPhase = payload.override_phase ?? payload.phase;
  const overridden = !!(
    payload.override_workout_type ||
    payload.override_workout_subtype ||
    payload.override_phase
  );

  const insertPayload: Partial<Run> & {
    strava_id: number;
    distance_km: number;
    duration_seconds: number;
    workout_type: WorkoutType;
  } = {
    strava_id: payload.strava_id,
    strava_url: payload.strava_url,
    date: payload.date,
    distance_km: payload.distance_km,
    duration_seconds: payload.duration_seconds,
    avg_pace_seconds: payload.avg_pace_seconds,
    avg_hr: payload.avg_hr,
    max_hr: payload.max_hr,
    elevation_gain_m: payload.elevation_gain_m,
    temperature_c: payload.temperature_c,
    hr_drift_bpm: payload.hr_drift_bpm,
    effort_score: payload.effort_score,
    workout_type: finalType,
    workout_subtype: finalSubtype,
    phase: finalPhase,
    classification_confidence: payload.classification.confidence,
    classification_overridden: overridden,
    splits: payload.splits,
    laps: payload.laps,
    planned_pace_target_seconds: options.plannedPaceTargetSeconds,
    linked_progress_id: options.linkedProgressId,
    notes: options.notes,
  };

  const { data, error } = await supabase
    .from('runs')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    console.error('saveIngestedRun error:', error);
    return { id: null, error: error.message };
  }
  return { id: (data as { id: string }).id, error: null };
}
