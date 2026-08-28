import { fetchStravaActivities, fetchStravaDataFull, type StravaActivityItem } from './strava';
import type { BlockActivity, KeyWorkout } from '../data/blockData';

/** A lap counts as "work" if it is a real rep and run at tempo effort or faster. */
const MIN_WORK_LAP_M = 400;
const MAX_WORK_PACE = 285; // 4:45/km
/** How much slower than a rep's best lap a trailing lap may be before it reads as cool-down. */
const TRAILING_SLACK = 25;

/**
 * Titles that look like a quality session worth pulling lap data for. Rep sets
 * get written in several ways ("5x1600", "3-2-1km"), so the pattern has to cover
 * more than the "NxM" form.
 */
const QUALITY_RE = /(\d+\s*x\s*\d+|\d+\s*-\s*\d+\s*-\s*\d+|tempo|interval|prag|test|progression|goal pace|ponovit)/i;

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

interface LapLike { distance_m: number; duration_seconds: number; pace_seconds: number; hr?: number | null }

/**
 * How many reps the title says the session had. He names his sessions well and
 * consistently ("3x3km intervals", "5x1600", "3-2-1km"), which matters because
 * the watch is often left on auto-lap: when the recoveries are paused out, the
 * lap list shows one unbroken block of fast kilometres and looks exactly like a
 * tempo run. The title is then the only surviving evidence that there were breaks.
 */
function titleReps(name: string): number | null {
  const x = name.match(/(\d+)\s*[x\u00d7]\s*\d/i);
  if (x) return parseInt(x[1], 10);
  const chain = name.match(/(\d+(?:\s*[-\u2013]\s*\d+)+)\s*(?:km|m)\b/i);
  if (chain) return chain[1].split(/[-\u2013]/).length;
  return null;
}

/**
 * Group the work laps into reps: laps that follow each other with no recovery in
 * between belong to the same rep. Trailing laps far slower than the rest of their
 * group are cool-down that slipped under the pace cap, not work.
 *
 * Getting this right matters more than anything else in the model. Reps bought
 * with jog recoveries are far faster than anything sustainable over 21 km, so a
 * rep set misread as a tempo run moves the prediction by minutes.
 */
function toReps<T extends LapLike>(laps: T[]): T[][] {
  const groups: T[][] = [];
  let cur: T[] | null = null;
  for (const l of laps) {
    if (l.distance_m < MIN_WORK_LAP_M || l.pace_seconds > MAX_WORK_PACE) { cur = null; continue; }
    if (!cur) { cur = []; groups.push(cur); }
    cur.push(l);
  }
  return groups
    .map(g => {
      const cut = Math.min(...g.map(l => l.pace_seconds)) + TRAILING_SLACK;
      let end = g.length;
      while (end > 1 && g[end - 1].pace_seconds > cut) end--;
      return g.slice(0, end);
    })
    .filter(g => g.length);
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
  // Strava reads `before` as midnight of that date, so asking for "up to today"
  // silently drops everything run today — including the session that prompted
  // the refresh. Ask for one day past the end instead.
  const end = new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const { data, error } = await fetchStravaActivities(from, end, undefined, 'list');
  if (error || !data || !('activities' in data)) {
    return { activities: null, keyWorkouts: null, added: [], error: error ?? 'Ni podatkov iz Strave' };
  }

  const activities = data.activities
    .filter(a => a.date.slice(0, 10) <= to)
    .map(toBlockActivity)
    .sort((a, b) => a.date.localeCompare(b.date));

  const knownIds = new Set(known.map(w => w.id));
  const candidates = data.activities.filter(
    a => a.type === 'Run' && a.distanceKm >= 5 && a.date.slice(0, 10) <= to
      && !knownIds.has(a.id) && QUALITY_RE.test(a.name),
  );

  const added: KeyWorkout[] = [];
  for (const c of candidates.slice(0, MAX_NEW_DETAILS)) {
    const { data: full } = await fetchStravaDataFull(`https://www.strava.com/activities/${c.id}`);
    if (!full?.laps?.length) continue;

    const groups = toReps(full.laps);
    const work = groups.flat();
    if (!work.length) continue;
    // Trust the title's rep count over the lap list: auto-lap can flatten a rep
    // set into one block, and a stray recovery lap can split one rep into two.
    const reps = titleReps(c.name) ?? groups.length;

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
      continuous: reps === 1,
      reps,
      repKm: Math.round((workKm / reps) * 100) / 100,
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
