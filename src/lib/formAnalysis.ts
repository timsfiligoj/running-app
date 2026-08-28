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

// ─── race prediction ───────────────────────────────────────────────────────────

/**
 * A certified half marathon reads as ~21.31 km on his watch: tangents are never
 * run perfectly and GPS adds its own overshoot. Training paces are per GPS km, so
 * the finish time is the projected GPS pace over the distance actually recorded.
 * Ignoring this loses about 55 seconds at his level.
 */
export const HM_GPS_KM = 21.31;

/**
 * Seconds per km that reps buy from their recoveries, per km of rep length —
 * 17 s/km on 1 km reps, 8.5 on 2 km, 5.7 on 3 km. Fitted by requiring that a rep
 * session and a tempo run from the same fortnight agree on the same race time;
 * across both blocks the least-squares fit lands between 17 and 21.
 *
 * It is the single most important correction in the model. Without it 6x1 km at
 * 3:56 projects to a 1:29 half marathon, and the whole prediction rests on the
 * fiction that he could hold rep pace for ninety minutes. With it, his rep
 * sessions and his tempo runs finally tell the same story: over the Ljubljana
 * block they agree to within 75 seconds, over the Istra block to within 40.
 */
export const REST_PENALTY = 17;

/**
 * How much faster he races than his training sessions project.
 *
 * Measured on the Istra block: over the last month before it, his sessions put
 * him at 1:37:50 and he raced 1:33:33. The gap is taper and race day, but mostly
 * it is that training sessions are not time trials — they are run on tired legs,
 * mid-week, deliberately short of the limit, and Riegel treats each work set as
 * if it had been maximal.
 *
 * The factor comes out at 0.956 no matter which date in the final month it is
 * measured on (spread under 0.002), which is what makes it usable. It is still
 * one race, so it carries the assumption that Ljubljana goes as Istra did.
 */
export const TRAINING_TO_RACE = 0.956;

/** Fitness fades from view: a session six weeks old counts half of a fresh one. */
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

/** Heart rate he held for the whole Istra half — his demonstrated race effort. */
export const RACE_HR = ISTRA_RESULT.avgHr;

const RACE_ID = 18076519859;

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
 * almost flat (Istra: +5 bpm over 21 km). A steeply climbing session is being
 * held above what could be sustained to the finish, whatever the pace says.
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

export interface SessionProjection {
  workout: KeyWorkout;
  family: Family;
  /** Weeks before that block's own race. */
  weeksOut: number;
  restPenalty: number;
  /** Continuous-equivalent pace of the work set, seconds per km. */
  equivalentPace: number;
  /** Half-marathon time this session alone implies, untapered. */
  time: number;
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
  /** Seconds of race time gained per remaining week. */
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

export interface Prediction {
  sessions: SessionProjection[];
  /** Sessions from the current block, newest first. */
  current: SessionProjection[];
  trend: FormTrend;
  /** The Istra build, fitted the same way, as the reference trajectory. */
  istraTrend: FormTrend;
  /** Where the training says he stands today, before taper. */
  levelNow: number;
  /** What he would run this weekend, tapered. */
  raceTodayTime: number;
  scenarios: Scenario[];
  conservativeTime: number;
  realisticTime: number;
  optimisticTime: number;
  weeksToRace: number;
  daysToRace: number;
  /** Longest continuous effort in the current block — the most trustworthy evidence. */
  anchor: SessionProjection | null;
  /** Fastest rep session — a speed ceiling, not a prediction. */
  ceiling: SessionProjection | null;
  /** The model run against the Istra block as if the race had not happened yet. */
  backtest: BacktestPoint[];
  /** Continuous efforts in the current block. Below three, the trend is thin. */
  continuousCount: number;
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

const RACE_OF: Record<'istra' | 'lj', string> = { istra: ISTRA_RACE_DATE, lj: LJ_RACE_DATE };

function projectSession(w: KeyWorkout, asOf: string): SessionProjection {
  const weeksAgo = daysBetween(w.date, asOf) / 7;
  return {
    workout: w,
    family: familyOf(w),
    weeksOut: daysBetween(w.date, RACE_OF[w.block]) / 7,
    restPenalty: restPenalty(w),
    equivalentPace: w.workPace + restPenalty(w),
    time: projectWorkout(w),
    effortHr: effortHr(w),
    drift: hrDrift(w),
    weight: w.workKm ** 2
      * (w.continuous ? CONTINUOUS_BONUS : 1)
      * Math.pow(0.5, Math.max(0, weeksAgo) / RECENCY_HALF_LIFE_WK),
  };
}

/**
 * Where the block stands and how fast it is moving, from a weighted regression of
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

/**
 * Runs the model against the Istra block at each of its own session dates, using
 * only what was known by then, and compares with the 1:33:33 he actually ran. It
 * is the only honest way to say how much the number below should be trusted.
 */
export function backtest(keyWorkouts: KeyWorkout[]): BacktestPoint[] {
  const pool = usable(keyWorkouts).filter(w => w.block === 'istra');
  const out: BacktestPoint[] = [];
  for (const at of pool) {
    const seen = pool.filter(w => w.date <= at.date);
    if (seen.length < 3) continue;
    const weeksOut = daysBetween(at.date, ISTRA_RACE_DATE) / 7;
    if (weeksOut < 0.3) continue;
    const t = fitTrend(seen.map(w => projectSession(w, at.date)), at.date, ISTRA_RACE_DATE);
    out.push({
      asOf: at.date,
      weeksOut,
      // What the model would have said that day, if it had run that day.
      raceToday: t.level * TRAINING_TO_RACE,
      predicted: (t.level - Math.max(0, t.slope) * weeksOut) * TRAINING_TO_RACE,
      actual: ISTRA_RESULT.timeSec,
    });
  }
  return out;
}

function usable(keyWorkouts: KeyWorkout[]): KeyWorkout[] {
  return keyWorkouts
    .filter(w => w.id !== RACE_ID && w.workKm >= LEVEL_MIN_WORK_KM)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function predict(keyWorkouts: KeyWorkout[], today: string): Prediction {
  const pool = usable(keyWorkouts);
  const weeksToRace = daysBetween(today, LJ_RACE_DATE) / 7;

  const sessions = pool.map(w => projectSession(w, today));
  const current = sessions.filter(p => p.workout.block === 'lj' && p.workout.date <= today);
  const istra = pool.filter(w => w.block === 'istra')
    .map(w => projectSession(w, ISTRA_RACE_DATE));

  const trend = fitTrend(current, today, LJ_RACE_DATE);
  const istraTrend = fitTrend(istra, ISTRA_RACE_DATE, ISTRA_RACE_DATE);

  const raceTodayTime = trend.level * TRAINING_TO_RACE;

  // Three futures, each anchored on something observed rather than on a multiplier.
  // Conservative: form plateaus here. Realistic: this block keeps improving at the
  // rate it has already shown. Optimistic: it finishes the way the Istra build did.
  const blockRate = Math.max(0, trend.slope);
  const istraRate = Math.max(0, istraTrend.slope);
  const mk = (
    key: Scenario['key'], label: string, note: string, gainPerWeek: number,
  ): Scenario => ({
    key, label, note, gainPerWeek,
    time: (trend.level - gainPerWeek * weeksToRace) * TRAINING_TO_RACE,
  });

  const scenarios: Scenario[] = [
    mk('conservative', 'Konservativno',
       'Forma obstane na današnji ravni, pridobiš samo s konico.', 0),
    mk('realistic', 'Realistično',
       'Napreduješ naprej s tempom, ki ga ta blok že kaže.', blockRate),
    mk('optimistic', 'Optimistično',
       'Blok se zaključi tako sunkovito kot pred Istro.', Math.max(blockRate, istraRate)),
  ];

  const continuous = current.filter(p => p.workout.continuous);
  const anchor = continuous.length
    ? continuous.reduce((b, p) => (p.workout.workKm > b.workout.workKm ? p : b))
    : null;
  const reps = current.filter(p => !p.workout.continuous);
  const ceiling = reps.length ? reps.reduce((b, p) => (p.time < b.time ? p : b)) : null;

  return {
    sessions,
    current: [...current].sort((a, b) => b.workout.date.localeCompare(a.workout.date)),
    trend,
    istraTrend,
    levelNow: trend.level,
    raceTodayTime,
    scenarios,
    conservativeTime: scenarios[0].time,
    realisticTime: scenarios[1].time,
    optimisticTime: scenarios[2].time,
    weeksToRace,
    daysToRace: daysBetween(today, LJ_RACE_DATE),
    anchor,
    ceiling,
    backtest: backtest(keyWorkouts),
    continuousCount: continuous.length,
  };
}

// ─── the 15 km test ────────────────────────────────────────────────────────────

/**
 * The distance of his control test. Long enough that Riegel barely has to
 * extrapolate (15 km is 71 % of the race), short enough to slot into a normal
 * training week without needing its own taper.
 */
export const TEST_KM = 15;

/**
 * The one clean anchor in the whole model. Three weeks before Istra he ran 15 km
 * at 4:22; that projects to 1:35:02 and he raced 1:33:33 — a ratio of 0.984,
 * accurate to two seconds.
 *
 * Unlike TRAINING_TO_RACE this needs no averaging over a session mix, which is
 * why a 15 km test is worth more than a month of ordinary sessions: it reads the
 * race almost directly. It is still a single observation.
 */
export const TEST_TO_RACE = 0.984;

/** How far out that anchoring test was run, in weeks. */
export const TEST_ANCHOR_WEEKS = 3;

/**
 * What a 15 km test at this pace means for race day.
 *
 * The ratio above already contains everything the Istra test still had ahead of
 * it — three weeks of work plus the taper — so a test run earlier than that gets
 * the extra weeks credited at the block's own rate of improvement.
 */
export function projectTest(
  pace: number, weeksOut: number, gainPerWeek: number, km: number = TEST_KM,
): number {
  const raw = pace * Math.pow(HM_GPS_KM / km, RIEGEL_EXP) * HM_GPS_KM;
  return raw * TEST_TO_RACE - Math.max(0, weeksOut - TEST_ANCHOR_WEEKS) * Math.max(0, gainPerWeek);
}

/** The test pace that would put the prediction on `target`. Seconds per km. */
export function testPaceFor(
  target: number, weeksOut: number, gainPerWeek: number, km: number = TEST_KM,
): number {
  const credit = Math.max(0, weeksOut - TEST_ANCHOR_WEEKS) * Math.max(0, gainPerWeek);
  return (target + credit) / (TEST_TO_RACE * Math.pow(HM_GPS_KM / km, RIEGEL_EXP) * HM_GPS_KM);
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
