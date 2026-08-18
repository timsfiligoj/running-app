import { fetchStravaActivities, fetchStravaDataFull, type StravaActivityItem } from './strava';
import type { BlockActivity, KeyWorkout } from '../data/blockData';

/** A lap counts as "work" if it is a real rep and run at tempo effort or faster. */
const MIN_WORK_LAP_M = 400;
const MAX_WORK_PACE = 285; // 4:45/km

/** Titles that look like a quality session worth pulling lap data for. */
const QUALITY_RE = /(\d+\s*x\s*\d+|tempo|interval|prag|test|progression|goal pace)/i;

/** Cap on how many new sessions we pull lap data for in one refresh. */
const MAX_NEW_DETAILS = 8;

/**
 * Below this the work set is too short to extrapolate from: Riegel would blow a
 * single fast kilometre inside an easy run up into a nonsense race prediction.
 */
const MIN_WORK_KM = 4;

function toBlockActivity(a: StravaActivityItem): BlockActivity {
  return {
    id: a.id,
    date: a.date.slice(0, 10),
    name: a.name,
    type: a.type,
    km: Math.round(a.distanceKm * 100) / 100,
    sec: a.durationSeconds,
    elev: Math.round(a.elevationMeters),
    hr: a.avgHeartRate ?? null,
  };
}

export interface SyncResult {
  activities: BlockActivity[] | null;
  keyWorkouts: KeyWorkout[] | null;
  /** Quality sessions newly pulled into the model, so the change is auditable. */
  added: KeyWorkout[];
  error: string | null;
}

/**
 * Re-pull the current training block from Strava and, for any quality session
 * we do not have lap data for yet, fetch its splits so it can feed the model.
 * Falls back to the bundled snapshot by returning nulls on failure.
 */
export async function syncCurrentBlock(
  from: string,
  to: string,
  known: KeyWorkout[],
): Promise<SyncResult> {
  const { data, error } = await fetchStravaActivities(from, to, undefined, 'list');
  if (error || !data || !('activities' in data)) {
    return { activities: null, keyWorkouts: null, added: [], error: error ?? 'Ni podatkov iz Strave' };
  }

  const activities = data.activities.map(toBlockActivity).sort((a, b) => a.date.localeCompare(b.date));

  const knownIds = new Set(known.map(w => w.id));
  const candidates = data.activities.filter(
    a => a.type === 'Run' && a.distanceKm >= 5 && !knownIds.has(a.id) && QUALITY_RE.test(a.name),
  );

  const added: KeyWorkout[] = [];
  for (const c of candidates.slice(0, MAX_NEW_DETAILS)) {
    const { data: full } = await fetchStravaDataFull(`https://www.strava.com/activities/${c.id}`);
    if (!full?.laps?.length) continue;

    const work = full.laps.filter(
      l => l.distance_m >= MIN_WORK_LAP_M && l.pace_seconds <= MAX_WORK_PACE,
    );
    if (!work.length) continue;

    const workKm = work.reduce((s, l) => s + l.distance_m, 0) / 1000;
    if (workKm < MIN_WORK_KM) continue;
    const workSec = work.reduce((s, l) => s + l.duration_seconds, 0);
    const hrSec = work.filter(l => l.hr).reduce((s, l) => s + l.duration_seconds, 0);

    added.push({
      id: c.id,
      date: c.date.slice(0, 10),
      name: c.name,
      block: 'lj',
      totalKm: Math.round(c.distanceKm * 100) / 100,
      totalSec: c.durationSeconds,
      avgHr: c.avgHeartRate ?? null,
      maxHr: full.maxHeartRate ?? null,
      workKm: Math.round(workKm * 100) / 100,
      workSec,
      workPace: Math.round(workSec / workKm),
      workHr: hrSec > 0
        ? Math.round(work.reduce((s, l) => s + (l.hr ?? 0) * l.duration_seconds, 0) / hrSec)
        : null,
      laps: work.map(l => ({
        km: Math.round((l.distance_m / 1000) * 100) / 100,
        pace: Math.round(l.pace_seconds),
        hr: l.hr ?? null,
      })),
    });
  }

  const keyWorkouts = [...known, ...added].sort((a, b) => a.date.localeCompare(b.date));
  return { activities, keyWorkouts, added, error: null };
}
