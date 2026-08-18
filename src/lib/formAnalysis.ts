import {
  BlockActivity,
  KeyWorkout,
  ISTRA_RACE_DATE,
  LJ_RACE_DATE,
  ISTRA_RESULT,
} from '../data/blockData';

export const HM_KM = 21.0975;

/** Riegel endurance exponent. 1.06 is the classic value; we use the pace form (exp - 1). */
const RIEGEL_EXP = 0.06;

/**
 * Sessions with less hard running than this are dropped from the model —
 * extrapolating a half-marathon time from one or two fast kilometres is noise.
 */
export const MIN_WORK_KM = 4;

// ─── formatting ────────────────────────────────────────────────────────────────

/** Seconds per km -> "4:26" */
export function fmtPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '–';
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds -> "1:28:40" */
export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '–';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
}

/** Seconds -> "5h 22min" */
export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/** Slovenian dual/plural agreement: 1 trening, 2 treninga, 3 treningi, 5 treningov. */
export function plural(n: number, one: string, two: string, few: string, many: string): string {
  const r = n % 100;
  if (r === 1) return `${n} ${one}`;
  if (r === 2) return `${n} ${two}`;
  if (r === 3 || r === 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function fmtDateSlo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

// ─── week bucketing ────────────────────────────────────────────────────────────

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Monday of the ISO week containing `date`, as UTC ms. */
function mondayOf(date: Date): number {
  const day = (date.getUTCDay() + 6) % 7; // Mon = 0
  return date.getTime() - day * 86400000;
}

/**
 * How many whole weeks before race week this date falls in.
 * 0 = race week, 1 = the week before, etc.
 */
export function weeksOut(iso: string, raceIso: string): number {
  const a = mondayOf(toDate(iso));
  const b = mondayOf(toDate(raceIso));
  return Math.round((b - a) / (7 * 86400000));
}

export interface WeekBucket {
  weeksOut: number;
  monday: string;
  runs: number;
  runKm: number;
  runSec: number;
  elev: number;
  /** Duration-weighted average HR across runs, null if no HR data. */
  avgHr: number | null;
  strength: number;
  longestKm: number;
  /** True when the block's data does not cover the whole Mon–Sun week. */
  partial: boolean;
  activities: BlockActivity[];
}

export function weeklyBuckets(activities: BlockActivity[], raceIso: string): WeekBucket[] {
  const map = new Map<number, WeekBucket>();
  const dates = activities.map(a => a.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  for (const a of activities) {
    const w = weeksOut(a.date, raceIso);
    let b = map.get(w);
    if (!b) {
      b = {
        weeksOut: w,
        monday: new Date(mondayOf(toDate(a.date))).toISOString().slice(0, 10),
        runs: 0, runKm: 0, runSec: 0, elev: 0, avgHr: null,
        strength: 0, longestKm: 0, partial: false, activities: [],
      };
      map.set(w, b);
    }
    if (a.type === 'Run') {
      b.runs++;
      b.runKm += a.km;
      b.runSec += a.sec;
      b.elev += a.elev;
      b.longestKm = Math.max(b.longestKm, a.km);
      b.activities.push(a);
    } else if (a.type === 'WeightTraining') {
      b.strength++;
    }
  }

  for (const b of map.values()) {
    // A week is partial when the block's coverage starts or ends inside it.
    const monday = new Date(b.monday + 'T00:00:00Z').getTime();
    const sunday = new Date(monday + 6 * 86400000).toISOString().slice(0, 10);
    b.partial = (first > b.monday) || (last < sunday);

    const withHr = b.activities.filter(a => a.hr != null);
    const sec = withHr.reduce((s, a) => s + a.sec, 0);
    b.avgHr = sec > 0
      ? Math.round(withHr.reduce((s, a) => s + (a.hr as number) * a.sec, 0) / sec)
      : null;
  }

  return [...map.values()].sort((x, y) => y.weeksOut - x.weeksOut);
}

// ─── block summary ─────────────────────────────────────────────────────────────

export interface BlockSummary {
  weeks: number;
  /** Weeks the block covers end to end (partial edge weeks excluded). */
  fullWeeks: number;
  runs: number;
  totalKm: number;
  totalSec: number;
  elev: number;
  kmPerWeek: number;
  avgPace: number;
  avgHr: number | null;
  strength: number;
  longestKm: number;
  peakWeekKm: number;
  /** Easy-run aerobic efficiency: metres covered per heartbeat. */
  metresPerBeat: number | null;
  easyPace: number | null;
  easyHr: number | null;
}

export function summarise(activities: BlockActivity[], raceIso: string): BlockSummary {
  const runs = activities.filter(a => a.type === 'Run');
  const allBuckets = weeklyBuckets(activities, raceIso).filter(b => b.runs > 0);
  // Partial weeks would drag the per-week average down without meaning anything.
  const buckets = allBuckets.filter(b => !b.partial);

  const totalKm = runs.reduce((s, a) => s + a.km, 0);
  const totalSec = runs.reduce((s, a) => s + a.sec, 0);
  const withHr = runs.filter(a => a.hr != null);
  const hrSec = withHr.reduce((s, a) => s + a.sec, 0);

  // "Easy" = at least 6 km, average HR <= 152, slower than 5:00/km.
  const easy = runs.filter(a => a.km >= 6 && a.hr != null && a.hr <= 152 && a.sec / a.km > 300);
  const easyKm = easy.reduce((s, a) => s + a.km, 0);
  const easySec = easy.reduce((s, a) => s + a.sec, 0);
  const beats = easy.reduce((s, a) => s + (a.hr as number) * (a.sec / 60), 0);


  return {
    weeks: allBuckets.length,
    fullWeeks: buckets.length,
    runs: runs.length,
    totalKm,
    totalSec,
    elev: runs.reduce((s, a) => s + a.elev, 0),
    kmPerWeek: buckets.length
      ? buckets.reduce((s2, b) => s2 + b.runKm, 0) / buckets.length
      : 0,
    avgPace: totalKm > 0 ? totalSec / totalKm : 0,
    avgHr: hrSec > 0
      ? Math.round(withHr.reduce((s, a) => s + (a.hr as number) * a.sec, 0) / hrSec)
      : null,
    strength: activities.filter(a => a.type === 'WeightTraining').length,
    longestKm: runs.reduce((m, a) => Math.max(m, a.km), 0),
    peakWeekKm: buckets.reduce((m, b) => Math.max(m, b.runKm), 0),
    metresPerBeat: beats > 0 ? (easyKm * 1000) / beats : null,
    easyPace: easyKm > 0 ? easySec / easyKm : null,
    easyHr: easy.length
      ? Math.round(easy.reduce((s, a) => s + (a.hr as number) * a.sec, 0) / easySec)
      : null,
  };
}

// ─── workout families ──────────────────────────────────────────────────────────

export type Family = 'zvezni' | 'dolge' | 'kratke';

export const FAMILY_LABEL: Record<Family, string> = {
  zvezni: 'Zvezni tempo',
  dolge: 'Dolge ponovitve (2\u20134 km)',
  kratke: 'Kratke ponovitve (1\u20131.6 km)',
};

export const FAMILY_NOTE: Record<Family, string> = {
  zvezni: 'Najbolj specifično za polmaraton \u2014 nepretrgan tempo brez odmora.',
  dolge: 'Prag / HM tempo. Dober približek dirkalne intenzitete.',
  kratke: 'VO2max in hitrostna rezerva. Najmanj specifično, a pokaže strop.',
};

/** How specific each family is to half-marathon performance. */
export const FAMILY_WEIGHT: Record<Family, number> = {
  zvezni: 0.50,
  dolge: 0.35,
  kratke: 0.15,
};

/** Number of reps, parsed from the session title ("5x1600", "3x2km"). */
export function repCount(w: KeyWorkout): number {
  const m = w.name.match(/(\d+)\s*x\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
}

export function familyOf(w: KeyWorkout): Family {
  const reps = repCount(w);
  if (reps === 1) return 'zvezni';
  return w.workKm / reps <= 1.65 ? 'kratke' : 'dolge';
}

// ─── race prediction ───────────────────────────────────────────────────────────

/**
 * Raw Riegel extrapolation of a workout's hard portion out to half-marathon
 * distance, in seconds per km. This treats the work set as if it were a maximal
 * effort, so it always comes out slower than real race pace \u2014 the per-family
 * calibration below corrects for that.
 */
export function rawProjection(w: KeyWorkout): number {
  return w.workPace * Math.pow(HM_KM / w.workKm, RIEGEL_EXP);
}

/** Specificity-weighted mean of raw projections (longer work sets count more). */
function weightedRaw(list: KeyWorkout[]): number | null {
  const den = list.reduce((s, w) => s + w.workKm, 0);
  if (den === 0) return null;
  return list.reduce((s, w) => s + rawProjection(w) * w.workKm, 0) / den;
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

export interface FamilyResult {
  family: Family;
  /** Multiplier making the Istra block back-predict 1:33:33 for this family. */
  calibration: number;
  istraCalibRaw: number;
  istraCalibWorkouts: KeyWorkout[];
  /** Current block, last 8 weeks. */
  currentRaw: number | null;
  currentTime: number | null;
  currentWorkouts: KeyWorkout[];
  /** Istra block at the same distance from race day. */
  istraSameRaw: number | null;
  istraSameTime: number | null;
  istraSameWorkouts: KeyWorkout[];
  /** Negative = faster now than Istra was at the same point. */
  deltaSec: number | null;
}

export interface Prediction {
  families: FamilyResult[];
  /** What he would run today, blended across families. */
  currentTime: number;
  /** Where the Istra block stood at the same distance from its race. */
  istraSamePointTime: number;
  /** Seconds the Istra block actually gained over its final stretch. */
  realisedGainSec: number;
  conservativeTime: number;
  realisticTime: number;
  optimisticTime: number;
  weeksToRace: number;
  daysToRace: number;
  /** Most race-specific session in the current block. */
  mostSpecific: KeyWorkout | null;
  /** Families with too little evidence in the current block. */
  thinEvidence: Family[];
}

/** Per-workout projected half-marathon time, using its family's calibration. */
export function projectWorkout(w: KeyWorkout, families: FamilyResult[]): number | null {
  const f = families.find(x => x.family === familyOf(w));
  if (!f) return null;
  return rawProjection(w) * f.calibration * HM_KM;
}

const RACE_ID = 18076519859;

export function predict(
  keyWorkouts: KeyWorkout[],
  today: string,
  opts: { conservativeShare?: number; realisticShare?: number; optimisticShare?: number } = {},
): Prediction {
  const conservativeShare = opts.conservativeShare ?? 0.5;
  const realisticShare = opts.realisticShare ?? 1.0;
  const optimisticShare = opts.optimisticShare ?? 1.4;

  const racePace = ISTRA_RESULT.timeSec / ISTRA_RESULT.officialKm;
  const weeksToRace = weeksOut(today, LJ_RACE_DATE);
  const pool = keyWorkouts.filter(w => w.id !== RACE_ID && w.workKm >= MIN_WORK_KM);

  const families: FamilyResult[] = (['zvezni', 'dolge', 'kratke'] as Family[]).map(family => {
    const inFamily = pool.filter(w => familyOf(w) === family);

    // Calibrate on the Istra sharpening phase, which produced the 1:33:33.
    const istraCalibWorkouts = inFamily.filter(
      w => w.block === 'istra' && weeksOut(w.date, ISTRA_RACE_DATE) <= 8,
    );
    const istraCalibRaw = weightedRaw(istraCalibWorkouts);
    const calibration = istraCalibRaw ? racePace / istraCalibRaw : 1;

    const currentWorkouts = inFamily.filter(
      w => w.block === 'lj' && daysBetween(w.date, today) <= 56 && daysBetween(w.date, today) >= 0,
    );
    const currentRaw = weightedRaw(currentWorkouts);

    const istraSameWorkouts = inFamily.filter(
      w => w.block === 'istra' && weeksOut(w.date, ISTRA_RACE_DATE) >= weeksToRace,
    );
    const istraSameRaw = weightedRaw(istraSameWorkouts);

    const currentTime = currentRaw ? currentRaw * calibration * HM_KM : null;
    const istraSameTime = istraSameRaw ? istraSameRaw * calibration * HM_KM : null;

    return {
      family, calibration, istraCalibRaw: istraCalibRaw ?? racePace, istraCalibWorkouts,
      currentRaw, currentTime, currentWorkouts,
      istraSameRaw, istraSameTime, istraSameWorkouts,
      deltaSec: currentTime != null && istraSameTime != null ? currentTime - istraSameTime : null,
    };
  });

  // Blend families that have data on both sides, so the comparison stays fair.
  const usable = families.filter(f => f.currentTime != null && f.istraSameTime != null);
  const wsum = usable.reduce((s, f) => s + FAMILY_WEIGHT[f.family], 0) || 1;
  const currentTime = usable.reduce(
    (s, f) => s + FAMILY_WEIGHT[f.family] * (f.currentTime as number), 0) / wsum;
  const istraSamePointTime = usable.reduce(
    (s, f) => s + FAMILY_WEIGHT[f.family] * (f.istraSameTime as number), 0) / wsum;

  const realisedGainSec = Math.max(0, istraSamePointTime - ISTRA_RESULT.timeSec);

  const current = pool.filter(
    w => w.block === 'lj' && daysBetween(w.date, today) <= 56 && daysBetween(w.date, today) >= 0);

  return {
    families,
    currentTime,
    istraSamePointTime,
    realisedGainSec,
    conservativeTime: currentTime - realisedGainSec * conservativeShare,
    realisticTime: currentTime - realisedGainSec * realisticShare,
    optimisticTime: currentTime - realisedGainSec * optimisticShare,
    weeksToRace,
    daysToRace: daysBetween(today, LJ_RACE_DATE),
    mostSpecific: current.length
      ? current.reduce((b, w) => (w.workKm > b.workKm ? w : b))
      : null,
    thinEvidence: families.filter(f => f.currentWorkouts.length <= 1).map(f => f.family),
  };
}

// ─── matched workout pairs ─────────────────────────────────────────────────────

export interface WorkoutPair {
  family: Family;
  label: string;
  istra: KeyWorkout | null;
  lj: KeyWorkout | null;
  /** Negative = faster now. Seconds per km. */
  delta: number | null;
}

/**
 * Best session of each family from both blocks, so like is compared with like
 * rather than comparing block averages with a different session mix.
 */
export function matchedPairs(keyWorkouts: KeyWorkout[]): WorkoutPair[] {
  const pool = keyWorkouts.filter(w => w.id !== RACE_ID && w.workKm >= MIN_WORK_KM);
  const best = (block: 'istra' | 'lj', family: Family) => {
    const list = pool.filter(w => w.block === block && familyOf(w) === family);
    if (!list.length) return null;
    return list.reduce((b, w) => (rawProjection(w) < rawProjection(b) ? w : b));
  };

  return (['zvezni', 'dolge', 'kratke'] as Family[]).map(family => {
    const istra = best('istra', family);
    const lj = best('lj', family);
    return {
      family,
      label: FAMILY_LABEL[family],
      istra,
      lj,
      delta: istra && lj ? lj.workPace - istra.workPace : null,
    };
  });
}

/** Hard kilometres actually run in the block's quality sessions. */
export function workKmOf(keyWorkouts: KeyWorkout[], block: 'istra' | 'lj'): number {
  return keyWorkouts
    .filter(w => w.block === block && w.id !== RACE_ID && w.workKm >= MIN_WORK_KM)
    .reduce((s, w) => s + w.workKm, 0);
}
