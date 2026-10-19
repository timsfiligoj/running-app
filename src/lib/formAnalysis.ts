import {
  BlockActivity,
  KeyWorkout,
  ISTRA_RACE_DATE,
  LJ_RACE_DATE,
  PALMANOVA_RACE_DATE,
  PALMANOVA_START,
  ISTRA_RESULT,
  LJ_RESULT,
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
  dolge: 'Dolge ponovitve (2–4 km)',
  kratke: 'Kratke ponovitve (do 1.6 km)',
};

export const FAMILY_NOTE: Record<Family, string> = {
  zvezni: 'Najbolj specifično za polmaraton — nepretrgan tempo brez odmora.',
  dolge: 'Prag / HM tempo. Dober približek dirkalne intenzitete.',
  kratke: 'VO2max in hitrostna rezerva. Najmanj specifično, a pokaže strop.',
};

/**
 * Which family a session belongs to, decided by its lap structure rather than by
 * its title. Titles lie: "3-2-1km intervals" contains no "x" and used to be read
 * as a continuous tempo run, which flattered the model by several minutes.
 */
export function familyOf(w: KeyWorkout): Family {
  if (w.continuous) return 'zvezni';
  return w.repKm <= 1.65 ? 'kratke' : 'dolge';
}

/** Number of reps in the session (1 for a continuous effort). */
export function repCount(w: KeyWorkout): number {
  return w.reps;
}

// ─── races ─────────────────────────────────────────────────────────────────────

export type Block = KeyWorkout['block'];

export interface RaceDef {
  block: Block;
  name: string;
  date: string;
  /** Official finishing time; null while the race is still ahead. */
  timeSec: number | null;
  avgHr: number | null;
  /** The race's own Strava activity, kept out of the training pool. */
  stravaId: number | null;
  blockStart: string;
}

export const RACES: Record<Block, RaceDef> = {
  istra: {
    block: 'istra', name: 'Istrski polmaraton', date: ISTRA_RACE_DATE,
    timeSec: ISTRA_RESULT.timeSec, avgHr: ISTRA_RESULT.avgHr, stravaId: 18076519859,
    blockStart: '2026-01-01',
  },
  lj: {
    block: 'lj', name: 'Ljubljanski polmaraton', date: LJ_RACE_DATE,
    timeSec: LJ_RESULT.timeSec, avgHr: LJ_RESULT.avgHr, stravaId: LJ_RESULT.stravaId,
    blockStart: '2026-06-01',
  },
  palmanova: {
    block: 'palmanova', name: 'Palmanova HM', date: PALMANOVA_RACE_DATE,
    timeSec: null, avgHr: null, stravaId: null, blockStart: PALMANOVA_START,
  },
};

/** The race the page forecasts. */
export const CURRENT: RaceDef = RACES.palmanova;
/** The finished block it is compared against. */
export const PREVIOUS: RaceDef = RACES.lj;

const RACE_IDS = new Set(Object.values(RACES).map(r => r.stravaId).filter((id): id is number => id != null));
export const isRace = (w: KeyWorkout) => RACE_IDS.has(w.id);

/**
 * Tek trojk (9.5.2026) is on record but deliberately not a calibration point:
 * 20 km rather than a half, 275 m of climbing, and run four weeks after Istra
 * with no block of its own behind it. Its pace says more about the course than
 * about his form.
 */
export const TEK_TROJK = { date: '2026-05-09', km: 20.18, sec: 5647, elev: 275, avgHr: 169 };

// ─── race prediction ───────────────────────────────────────────────────────────

/**
 * A certified half marathon reads as ~21.3 km on his watch (Istra 21.31, LJ 21.25):
 * tangents are never run perfectly and GPS adds its own overshoot. Training paces
 * are per GPS km, so the finish time is the projected GPS pace over the distance
 * actually recorded. Ignoring this loses about 55 seconds at his level.
 */
export const HM_GPS_KM = 21.31;

/**
 * Seconds per km that reps buy from their recoveries, per km of rep length —
 * 17 s/km on 1 km reps, 8.5 on 2 km, 5.7 on 3 km. Fitted by requiring that a rep
 * session and a tempo run from the same fortnight agree on the same race time.
 * Without it 6x1 km at 3:56 projects to a 1:29 half marathon, as if he could hold
 * rep pace for ninety minutes.
 */
export const REST_PENALTY = 17;

/**
 * How much faster he races than his training sessions project: training is run
 * on tired legs, mid-week and deliberately short of the limit, and Riegel treats
 * each work set as if it had been maximal.
 *
 * Fitted on Istra (0.956), then tested blind on Ljubljana: the model's last month
 * before LJ, multiplied by the Istra factor, lands within a few seconds of the
 * 1:29:51 he ran — with a cramp. Two races, one factor; see `calibration()`.
 */
export const TRAINING_TO_RACE = 0.956;

/** Fitness fades from view: a session five weeks old counts half of a fresh one. */
const RECENCY_HALF_LIFE_WK = 5;

/**
 * Work sets shorter than this are dropped from the form estimate. Riegel adds
 * over 10 % when stretching 4 km to 21, so a short controlled session reads as a
 * catastrophe and drags the average toward nonsense.
 */
export const LEVEL_MIN_WORK_KM = 5;

/**
 * A long unbroken effort tells you far more about a half marathon than a short
 * one, so weight goes with the square of the work distance, and a tempo run
 * outranks a rep set of the same length.
 */
const CONTINUOUS_BONUS = 1.5;

/** Heart rate he held for both flat halves — his demonstrated race effort. */
export const RACE_HR = ISTRA_RESULT.avgHr;

/**
 * Taper and recovery do not build fitness, so the forecast only credits the
 * weeks of real training left: from the end of the post-LJ recovery week to the
 * start of race week.
 */
export const TRAINING_FROM = '2026-10-26';
export const TAPER_FROM = '2026-11-23';

/**
 * Six weeks with a recovery week, a taper, a sore ankle and a newborn are not
 * thirteen weeks of steady build. The realistic scenario assumes half the rate
 * of improvement the LJ block measured; the optimistic one the full rate.
 */
const REALISTIC_RATE_SHARE = 0.5;

/** Seconds per km added to a rep session so it reads like a continuous effort. */
export function restPenalty(w: KeyWorkout): number {
  return w.continuous ? 0 : REST_PENALTY / Math.max(w.repKm, 0.4);
}

/**
 * Effort heart rate, ignoring the opening rep while heart rate is still catching
 * up with the pace. Using the plain average understates a session by 2–3 bpm.
 */
export function effortHr(w: KeyWorkout): number | null {
  const laps = w.laps.filter(l => l.hr != null);
  if (!laps.length) return w.workHr;
  const use = laps.length >= 4 ? laps.slice(1) : laps;
  const t = use.reduce((s, l) => s + l.pace * l.km, 0);
  return t > 0 ? use.reduce((s, l) => s + (l.hr as number) * l.pace * l.km, 0) / t : w.workHr;
}

/**
 * Heart-rate drift across the work set, in bpm per km. A race-effort half runs
 * almost flat (Istra +5 bpm over 21 km, LJ +4). A steeply climbing session is
 * being held above what could be sustained to the finish, whatever the pace says.
 */
export function hrDrift(w: KeyWorkout): number | null {
  const laps = w.laps.filter(l => l.hr != null);
  if (laps.length < 4) return null;
  const km = laps.slice(1).reduce((s, l) => s + l.km, 0);
  return km > 0 ? ((laps[laps.length - 1].hr as number) - (laps[1].hr as number)) / km : null;
}

/** Race-effort drift for reference: how flat his Istra half actually was. */
export const RACE_DRIFT = 0.25;

/**
 * The session's pace, with recoveries paid back, extended to half-marathon
 * distance by Riegel. Result is seconds per GPS km.
 */
export function rawProjection(w: KeyWorkout): number {
  return (w.workPace + restPenalty(w)) * Math.pow(HM_GPS_KM / w.workKm, RIEGEL_EXP);
}

/** Projected official finishing time this one session implies, in seconds. */
export function projectWorkout(w: KeyWorkout): number {
  return rawProjection(w) * HM_GPS_KM;
}

/**
 * A solo time trial is a maximal effort, not a training session, so it is read
 * like a race: Riegel straight to the half, no training discount. Without this a
 * 10 km all-out run would pass through the training discount and read ~4 min fast.
 * Recognised by title, since its laps look exactly like a tempo run.
 */
const TIME_TRIAL_RE = /(\b10\s*k\b|10\s*km\s*test|time\s*trial|\bTT\b)/i;
export const isTimeTrial = (w: KeyWorkout) =>
  w.continuous && w.workKm >= 8 && w.workKm <= 11 && TIME_TRIAL_RE.test(w.name);

export type EvidenceKind = 'trening' | 'test' | 'tekma';

export interface SessionProjection {
  workout: KeyWorkout;
  family: Family;
  kind: EvidenceKind;
  /** Weeks before that block's own race. */
  weeksOut: number;
  restPenalty: number;
  /** Continuous-equivalent pace of the work set, seconds per km. */
  equivalentPace: number;
  /** Untapered training level this evidence implies (race time ÷ TRAINING_TO_RACE). */
  time: number;
  /** Official half-marathon time this evidence implies, tapered and on race day. */
  raceTime: number;
  effortHr: number | null;
  drift: number | null;
  weight: number;
}

export interface FormTrend {
  /** Seconds of race time gained per week. Positive = getting faster. */
  slope: number;
  /** What the recent work projects to, before taper. */
  level: number;
  /** Weighted spread of single sessions around the trend. */
  rmse: number;
  sessions: number;
  weeksLeft: number;
}

export interface Scenario {
  key: 'conservative' | 'realistic' | 'optimistic';
  label: string;
  note: string;
  /** Seconds of race time gained per remaining training week. */
  gainPerWeek: number;
  time: number;
}

export interface BacktestPoint {
  asOf: string;
  weeksOut: number;
  /** What the model said his form was worth that day, tapered. */
  raceToday: number;
  /** The full forecast it would have made for race day from there. */
  predicted: number;
  actual: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

function projectSession(w: KeyWorkout, asOf: string): SessionProjection {
  const weeksAgo = daysBetween(w.date, asOf) / 7;
  const race = isRace(w) ? RACES[w.block] : null;
  const kind: EvidenceKind = race ? 'tekma' : isTimeTrial(w) ? 'test' : 'trening';
  // Races count at their official time; a time trial at its Riegel projection; a
  // training session at its projection with the training-to-race discount.
  const raceTime = race?.timeSec
    ?? (kind === 'test' ? projectWorkout(w) : projectWorkout(w) * TRAINING_TO_RACE);
  return {
    workout: w,
    family: familyOf(w),
    kind,
    weeksOut: daysBetween(w.date, RACES[w.block].date) / 7,
    restPenalty: restPenalty(w),
    equivalentPace: w.workPace + restPenalty(w),
    time: raceTime / TRAINING_TO_RACE,
    raceTime,
    effortHr: effortHr(w),
    drift: hrDrift(w),
    weight: w.workKm ** 2
      * (w.continuous ? CONTINUOUS_BONUS : 1)
      * Math.pow(0.5, Math.max(0, weeksAgo) / RECENCY_HALF_LIFE_WK),
  };
}

/**
 * Where a block stands and how fast it is moving, from a weighted regression of
 * every session's projected race time against how far out it was run. The whole
 * block votes, so the answer does not hang off whichever session went best — and
 * the slope is his own measured rate of improvement rather than a guess.
 */
function fitTrend(list: SessionProjection[], asOf: string, raceIso: string): FormTrend {
  const weeksLeft = daysBetween(asOf, raceIso) / 7;
  const W = list.reduce((s, p) => s + p.weight, 0);
  if (!W) return { slope: 0, level: 0, rmse: 0, sessions: 0, weeksLeft };

  const level = list.reduce((s, p) => s + p.weight * p.time, 0) / W;
  if (list.length < 3) return { slope: 0, level, rmse: 0, sessions: list.length, weeksLeft };

  const mx = list.reduce((s, p) => s + p.weight * p.weeksOut, 0) / W;
  const sxx = list.reduce((s, p) => s + p.weight * (p.weeksOut - mx) ** 2, 0);
  const sxy = list.reduce((s, p) => s + p.weight * (p.weeksOut - mx) * (p.time - level), 0);
  // Positive slope: sessions further from race day project slower, so he is improving.
  const slope = sxx > 0 ? sxy / sxx : 0;
  const rmse = Math.sqrt(
    list.reduce((s, p) => s + p.weight * (p.time - (level + slope * (p.weeksOut - mx))) ** 2, 0) / W);
  return { slope, level, rmse, sessions: list.length, weeksLeft };
}

/** Training sessions long enough to project from, races excluded, oldest first. */
function usable(keyWorkouts: KeyWorkout[]): KeyWorkout[] {
  return keyWorkouts
    .filter(w => !isRace(w) && w.workKm >= LEVEL_MIN_WORK_KM)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** A finished block's trend as it stood on its own race morning. */
function blockTrend(keyWorkouts: KeyWorkout[], block: Block): FormTrend {
  const race = RACES[block];
  const list = usable(keyWorkouts).filter(w => w.block === block && w.date < race.date)
    .map(w => projectSession(w, race.date));
  return fitTrend(list, race.date, race.date);
}

/**
 * Runs the model through a finished block at each of its own session dates,
 * using only what was known by then, and compares with what he actually ran.
 * The only honest way to say how much the forecast should be trusted.
 */
export function backtest(keyWorkouts: KeyWorkout[], block: Block): BacktestPoint[] {
  const race = RACES[block];
  if (race.timeSec == null) return [];
  const pool = usable(keyWorkouts).filter(w => w.block === block && w.date < race.date);
  const out: BacktestPoint[] = [];
  for (const at of pool) {
    const seen = pool.filter(w => w.date <= at.date);
    if (seen.length < 3) continue;
    const weeksOut = daysBetween(at.date, race.date) / 7;
    if (weeksOut < 0.3) continue;
    const t = fitTrend(seen.map(w => projectSession(w, at.date)), at.date, race.date);
    out.push({
      asOf: at.date,
      weeksOut,
      raceToday: t.level * TRAINING_TO_RACE,
      predicted: (t.level - Math.max(0, t.slope) * weeksOut) * TRAINING_TO_RACE,
      actual: race.timeSec,
    });
  }
  return out;
}

export interface Calibration {
  race: RaceDef;
  /** Mean "race today" over the final four weeks before the race. */
  lateLevel: number;
  /** Error of that late reading against the official result. Negative = model too fast. */
  lateError: number;
  /** Error of the full race-day forecast, root mean square over the whole block. */
  forecastRmse: number;
  forecastBias: number;
  /** The training-to-race factor this race alone would have produced. */
  impliedFactor: number;
  points: BacktestPoint[];
  slope: number;
  /** Block facts for the "what training turned into" comparison. */
  kmPerWeek: number;
  longestKm: number;
  /** Longest unbroken effort at tempo or faster in the block. */
  longestContinuousKm: number;
  /** Pace and HR of the last long continuous test before the race. */
  lastTest: KeyWorkout | null;
}

export function calibration(
  keyWorkouts: KeyWorkout[], block: Block, activities: BlockActivity[],
): Calibration | null {
  const race = RACES[block];
  if (race.timeSec == null) return null;
  const points = backtest(keyWorkouts, block);
  const late = points.filter(b => b.weeksOut <= 4);
  const lateLevel = late.length ? late.reduce((s, b) => s + b.raceToday, 0) / late.length : 0;
  const errs = points.map(b => b.predicted - b.actual);
  const block_ = usable(keyWorkouts).filter(w => w.block === block && w.date < race.date);
  const continuous = block_.filter(w => w.continuous);
  const lastTest = [...continuous].reverse().find(w => w.workKm >= 12) ?? null;
  const s = summarise(activities.filter(a => a.date <= race.date), race.date);
  return {
    race,
    lateLevel,
    lateError: lateLevel - race.timeSec,
    forecastRmse: errs.length ? Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / errs.length) : 0,
    forecastBias: errs.length ? errs.reduce((a, e) => a + e, 0) / errs.length : 0,
    impliedFactor: lateLevel ? (race.timeSec / lateLevel) * TRAINING_TO_RACE : 0,
    points,
    slope: blockTrend(keyWorkouts, block).slope,
    kmPerWeek: s.kmPerWeek,
    longestKm: s.longestKm,
    longestContinuousKm: continuous.reduce((m, w) => Math.max(m, w.workKm), 0),
    lastTest,
  };
}

export interface Prediction {
  /** Every piece of evidence behind today's level, newest first, with its weight share. */
  evidence: (SessionProjection & { share: number })[];
  /** Sessions run in the current block so far, newest first. */
  current: SessionProjection[];
  /** Improvement rate the previous block measured, seconds of race time per week. */
  previousRate: number;
  previousSessions: number;
  /** Where the evidence says he stands today, before taper. */
  levelNow: number;
  /** What he would run this weekend, tapered. */
  raceTodayTime: number;
  scenarios: Scenario[];
  conservativeTime: number;
  realisticTime: number;
  optimisticTime: number;
  weeksToRace: number;
  daysToRace: number;
  /** Weeks of real training left (recovery and taper excluded). */
  trainingWeeksLeft: number;
  /** Share of today's level that still rests on the previous race. */
  raceShare: number;
  /** Fastest rep session of the current block — a speed ceiling, not a prediction. */
  ceiling: SessionProjection | null;
}

/**
 * Today's form, from everything since the LJ block began: the LJ race itself at
 * its official time, any time trial as a race, and every training session through
 * the calibrated discount — all weighted by length and by age. Right after LJ the
 * race carries most of the weight; as Palmanova sessions arrive and the race ages,
 * they take over. The forecast then adds the improvement still to come, at a
 * share of the rate the LJ block actually measured.
 */
export function predict(keyWorkouts: KeyWorkout[], today: string): Prediction {
  const since = PREVIOUS.blockStart;
  const pool = keyWorkouts.filter(w =>
    w.date >= since && w.date <= today && (isRace(w) || w.workKm >= LEVEL_MIN_WORK_KM));
  const list = pool.map(w => projectSession(w, today));
  const W = list.reduce((s, p) => s + p.weight, 0);
  const levelNow = W ? list.reduce((s, p) => s + p.weight * p.time, 0) / W : 0;

  const prevTrend = blockTrend(keyWorkouts, PREVIOUS.block);
  const rate = Math.max(0, prevTrend.slope);
  const trainingWeeksLeft = Math.max(0,
    daysBetween(today > TRAINING_FROM ? today : TRAINING_FROM, TAPER_FROM) / 7);

  const mk = (
    key: Scenario['key'], label: string, note: string, gainPerWeek: number,
  ): Scenario => ({
    key, label, note, gainPerWeek,
    time: (levelNow - gainPerWeek * trainingWeeksLeft) * TRAINING_TO_RACE,
  });
  const scenarios: Scenario[] = [
    mk('conservative', 'Konservativno',
       'Forma ostane na današnji ravni — dobiš samo, kar daje konica.', 0),
    mk('realistic', 'Realistično',
       'Napreduješ s polovico tempa LJ bloka: kratek blok, gleženj, spanje.', rate * REALISTIC_RATE_SHARE),
    mk('optimistic', 'Optimistično',
       'Napreduješ s polnim tempom LJ bloka v vseh preostalih tednih treninga.', rate),
  ];

  const evidence = list
    .map(p => ({ ...p, share: W ? p.weight / W : 0 }))
    .sort((a, b) => b.workout.date.localeCompare(a.workout.date));
  const current = list.filter(p => p.workout.block === CURRENT.block)
    .sort((a, b) => b.workout.date.localeCompare(a.workout.date));
  const reps = current.filter(p => !p.workout.continuous);

  return {
    evidence,
    current,
    previousRate: rate,
    previousSessions: prevTrend.sessions,
    levelNow,
    raceTodayTime: levelNow * TRAINING_TO_RACE,
    scenarios,
    conservativeTime: scenarios[0].time,
    realisticTime: scenarios[1].time,
    optimisticTime: scenarios[2].time,
    weeksToRace: daysBetween(today, CURRENT.date) / 7,
    daysToRace: daysBetween(today, CURRENT.date),
    trainingWeeksLeft,
    raceShare: evidence.filter(p => p.kind === 'tekma').reduce((s, p) => s + p.share, 0),
    ceiling: reps.length ? reps.reduce((b, p) => (p.raceTime < b.raceTime ? p : b)) : null,
  };
}

// ─── matched workout pairs ─────────────────────────────────────────────────────

export interface WorkoutPair {
  family: Family;
  label: string;
  before: KeyWorkout | null;
  now: KeyWorkout | null;
  /** Negative = faster now. Seconds per km. */
  delta: number | null;
}

/**
 * Best session of each family from both blocks, so like is compared with like
 * rather than comparing block averages with a different session mix.
 */
export function matchedPairs(keyWorkouts: KeyWorkout[], before: Block, now: Block): WorkoutPair[] {
  const pool = keyWorkouts.filter(w => !isRace(w) && w.workKm >= MIN_WORK_KM);
  const best = (block: Block, family: Family) => {
    const list = pool.filter(w => w.block === block && familyOf(w) === family);
    if (!list.length) return null;
    return list.reduce((b, w) => (rawProjection(w) < rawProjection(b) ? w : b));
  };

  return (['zvezni', 'dolge', 'kratke'] as Family[]).map(family => {
    const b = best(before, family);
    const n = best(now, family);
    return {
      family,
      label: FAMILY_LABEL[family],
      before: b,
      now: n,
      delta: b && n ? n.workPace - b.workPace : null,
    };
  });
}

/** Hard kilometres actually run in the block's quality sessions. */
export function workKmOf(keyWorkouts: KeyWorkout[], block: Block): number {
  return keyWorkouts
    .filter(w => w.block === block && !isRace(w) && w.workKm >= MIN_WORK_KM)
    .reduce((s, w) => s + w.workKm, 0);
}
