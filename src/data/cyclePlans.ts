import type { TrainingPlan, Week, Day, RaceStrategy } from '../types';

// ============================================================
// Helpers
// ============================================================

const MONTHS_SLO = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + days);
  return dateToIso(d);
}

function shortDateLabel(iso: string): string {
  const d = isoToDate(iso);
  return `${d.getDate()}. ${MONTHS_SLO[d.getMonth()]}`;
}

function phaseForDate(iso: string): string {
  if (iso <= '2026-05-23') return 'F1';
  if (iso <= '2026-06-14') return 'F2';
  if (iso <= '2026-07-12') return 'F3';
  if (iso <= '2026-08-09') return 'F4';
  if (iso <= '2026-10-18') return 'F5a';
  if (iso <= '2026-10-25') return 'F5b-LJ';
  if (iso <= '2026-11-22') return 'F5c';
  return 'F5d-Palmanova';
}

function phaseFocus(phase: string): string {
  switch (phase) {
    case 'F1': return 'Recovery post-Istrski, easy aerobic baza';
    case 'F2': return 'Aerobic base + tendon adaptation + intro VO2max';
    case 'F3': return 'Specifičnost 4:00/km — VO2max progression chain';
    case 'F4': return 'Peak speed — 5K/10K PB poskusi';
    case 'F5a': return 'HM specific build — embedded HM pace';
    case 'F5b-LJ': return 'Taper week — LJ HM B-race';
    case 'F5c': return 'Re-build — between races';
    case 'F5d-Palmanova': return 'Final taper — Palmanova HM A-race';
    default: return '';
  }
}

const DAY_LABELS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'] as const;

// ============================================================
// Day templates (placeholder workouts pointing user to AI suggester)
// ============================================================

const NORMAL_WEEK: Day[] = [
  { day: 'Pon', type: 'easy', workout: 'Lahek tek' },
  { day: 'Tor', type: 'intervals', workout: 'Intervali (hard sesija)  •  💪 Legs & Core' },
  { day: 'Sre', type: 'easy', workout: 'Lahek tek' },
  { day: 'Čet', type: 'tempo', workout: 'Tempo (hard sesija)  •  💪 Legs & Core' },
  { day: 'Pet', type: 'rest', workout: 'Počitek ali lahka mobilnost' },
  { day: 'Sob', type: 'long', workout: 'Long tek' },
  { day: 'Ned', type: 'easy', workout: 'Lahek tek' },
];

const DELOAD_WEEK: Day[] = [
  { day: 'Pon', type: 'easy', workout: 'Lahek tek — deload (krajši)' },
  { day: 'Tor', type: 'intervals', workout: 'Krajši intervali — deload' },
  { day: 'Sre', type: 'rest', workout: 'Počitek — deload' },
  { day: 'Čet', type: 'easy', workout: 'Lahek tek — deload' },
  { day: 'Pet', type: 'rest', workout: 'Počitek' },
  { day: 'Sob', type: 'long', workout: 'Krajši long — deload' },
  { day: 'Ned', type: 'easy', workout: 'Lahek tek — deload' },
];

function taperWeek(raceDayIndex: number, raceLabel: string): Day[] {
  // raceDayIndex: 0=Pon ... 6=Ned (Slovenian week)
  const days: Day[] = DAY_LABELS.map((dl) => ({
    day: dl, type: 'easy', workout: 'Lahek tek — taper',
  }));
  // Day-by-day mapping for typical race week (race on Sunday assumption, adjust if needed)
  // We position relative to race day:
  days.forEach((d, i) => {
    const daysToRace = raceDayIndex - i;
    if (daysToRace === 0) {
      d.type = 'race';
      d.workout = `🏃 ${raceLabel}`;
    } else if (daysToRace === 1) {
      d.type = 'rest';
      d.workout = 'Počitek — dan pred tekmo (hidracija, priprava opreme)';
    } else if (daysToRace === 2) {
      d.type = 'easy';
      d.workout = 'Shakeout 3-4 km easy + 2× 100 m strides';
    } else if (daysToRace === 3) {
      d.type = 'rest';
      d.workout = 'Počitek ali 20-30 min easy mobilizacija';
    } else if (daysToRace === 4) {
      d.type = 'easy';
      d.workout = 'Krajši pace-feel tek + strides';
    } else if (daysToRace === 5) {
      d.type = 'easy';
      d.workout = 'Lahek tek — taper';
    } else if (daysToRace === 6) {
      d.type = 'rest';
      d.workout = 'Počitek — start race week';
    } else if (daysToRace < 0) {
      // Days after the race in same week (rare since race is usually Sunday=6)
      d.type = 'rest';
      d.workout = 'Regeneracija po tekmi — sprehod, raztezanje';
    }
  });
  return days;
}

// ============================================================
// Week generator
// ============================================================

interface WeekGenOpts {
  weekNum: number;
  startDate: string;          // Monday ISO
  isDeload?: boolean;
  raceDayIso?: string;        // if this is race week, the ISO of race day
  raceLabel?: string;
}

function generateWeek(opts: WeekGenOpts): Week {
  const { weekNum, startDate, isDeload, raceDayIso, raceLabel } = opts;
  const endDate = addDays(startDate, 6);
  const title = `${shortDateLabel(startDate)} – ${shortDateLabel(endDate)}`;
  const phase = phaseForDate(startDate);
  const focus = isDeload ? 'Deload teden' : phaseFocus(phase);

  let days: Day[];
  if (raceDayIso) {
    const raceDate = isoToDate(raceDayIso);
    const startD = isoToDate(startDate);
    const raceDayIndex = Math.round((raceDate.getTime() - startD.getTime()) / 86400000);
    days = taperWeek(raceDayIndex, raceLabel ?? 'Tekma');
  } else if (isDeload) {
    days = DELOAD_WEEK.map(d => ({ ...d }));
  } else {
    days = NORMAL_WEEK.map(d => ({ ...d }));
  }

  return {
    week: weekNum,
    title,
    phase,
    focus,
    startDate,
    days,
  };
}

// ============================================================
// Plan generator
// ============================================================

interface PlanGenOpts {
  id: string;
  name: string;
  startDate: string;          // first Monday
  totalWeeks: number;
  raceDate: string;
  raceLocation?: string;
  raceUrl?: string;
  targetPace?: string;
  goal: string;
  raceLabel?: string;
  raceStrategy: RaceStrategy;
  deloadEvery?: number;       // every Nth week is deload (default: no deload)
  taperWeeks?: number;        // last N weeks are taper (default: 0)
}

function generatePlan(opts: PlanGenOpts): TrainingPlan {
  const weeks: Week[] = [];
  for (let i = 0; i < opts.totalWeeks; i++) {
    const weekStart = addDays(opts.startDate, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekNum = i + 1;
    const isLastWeek = weekNum === opts.totalWeeks;
    const isTaperWeek = (opts.taperWeeks ?? 0) > 0 && (weekNum > opts.totalWeeks - (opts.taperWeeks ?? 0));
    const isDeload = !!opts.deloadEvery && weekNum % opts.deloadEvery === 0 && !isTaperWeek;

    const raceInWeek = opts.raceDate >= weekStart && opts.raceDate <= weekEnd;
    weeks.push(generateWeek({
      weekNum,
      startDate: weekStart,
      isDeload,
      // Only trigger race-week template when this plan has a labelled race
      raceDayIso: raceInWeek && opts.raceLabel ? opts.raceDate : undefined,
      raceLabel: opts.raceLabel,
    }));
    // Suppress lint for unused isLastWeek (kept for readability)
    void isLastWeek;
  }

  return {
    id: opts.id,
    name: opts.name,
    raceDate: opts.raceDate,
    raceLocation: opts.raceLocation,
    raceUrl: opts.raceUrl,
    targetPace: opts.targetPace,
    athlete: 'Tim Šfiligoj',
    goal: opts.goal,
    weeks,
    raceStrategy: opts.raceStrategy,
    hrZones: {
      z1: { range: '< 139 bpm', purpose: 'Regeneracija' },
      z2: { range: '140-150 bpm', purpose: 'Aerobna baza (lahki teki)' },
      z3: { range: '151-165 bpm', purpose: 'IZOGIBAJ SE — siva cona' },
      z4: { range: '166-180 bpm', purpose: 'Tempo / Threshold' },
      z5: { range: '> 180 bpm', purpose: 'VO2max (kratki intervali)' },
    },
    paceZones: {
      easy: '5:00-5:30 /km',
      long: '4:50-5:15 /km',
      hmTempo: '4:15-4:20 /km',
      threshold: '4:05-4:15 /km',
      vo2max: '3:55-4:00 /km',
    },
  };
}

// ============================================================
// Plan 1: LJ Baza — bazni blok pred LJ Maratonom (F1+F2+F3)
// 11.5.2026 → 19.7.2026, 10 tednov
// (tedni 11-13 odstranjeni; nadaljuje se v ljMaratonPlan od 20.7.)
// ============================================================

export const bazaPbPlan: TrainingPlan = generatePlan({
  id: 'baza-pb-2026',
  name: 'LJ Baza',
  startDate: '2026-05-11',          // First Mon after Istrski recovery start
  totalWeeks: 10,
  raceDate: '2026-07-19',           // konec baznega bloka (brez tekme)
  targetPace: '3:59',
  goal: 'Bazni blok pred LJ Maratonom (F1→F3 + uvod v F4): recovery po Istrskem, aerobna baza, specifičnost, uvod v hitrost. 10 tednov (11.5.→19.7.). Nadaljuje se v tabu "LJ Maraton (21km)".',
  deloadEvery: 4,
  raceStrategy: {
    pacing: [
      { section: 'F1 (10-23. maj)', instruction: 'Recovery post-Istrski. Vse easy, HR ≤145.' },
      { section: 'F2 (24. maj - 14. jun)', instruction: 'Aerobic base. Intro VO2max (5×3min). Tendon adaptation strength.' },
      { section: 'F3 (15. jun - 12. jul)', instruction: 'Progression chain: 5×1000 → 4×1500 → 3×2000 → 2×3000 @ 4:00/km.' },
      { section: 'F4 (13. jul - 9. avg)', instruction: 'PEAK SPEED. 2× strength/teden (svežina). PB poskusi 5K + 10K.' },
    ],
    nutrition: [
      { when: 'Splošno', what: 'Polarized: 80% easy ≤145 bpm, 20% hard. Brez Z3 sive cone.' },
      { when: 'PB teden', what: 'Carb-load 2-3 dni pred poskusom. Hidracija, gel za 10K poskus.' },
    ],
  },
});

// ============================================================
// Plan 2: Palmanova HM (2. A-race)
// 26.10.2026 → 29.11.2026, 5 tednov, race 29.11.2026
// Opomba: glavni cilj sezone je LJ polmaraton (18.10.), glej ljMaratonPlan.
//         Palmanova ostane kot druga tekma po LJ.
// ============================================================

export const palmanovaPlan: TrainingPlan = generatePlan({
  id: 'palmanova-hm-2026',
  name: 'Palmanova HM (A-race, sub-1:30)',
  startDate: '2026-10-26',
  totalWeeks: 5,
  raceDate: '2026-11-29',
  raceLocation: 'Palmanova, Italija',
  targetPace: '4:16',
  goal: 'F5c re-build + F5d taper. A-race cilj: sub-1:30 HM (PB attempt). Vse moč usmerjena v ta dan.',
  raceLabel: 'Palmanova HM (A-race)',
  taperWeeks: 1,
  raceStrategy: {
    pacing: [
      { section: 'Km 1-3', instruction: '4:18/km. Settle, ne pohitri kljub fresh občutku.' },
      { section: 'Km 3-15', instruction: 'Target 4:16/km. Lock-in pace. Drink at each station.' },
      { section: 'Km 15-21', instruction: 'Negative split: pospeši na 4:13/km če imaš rezervo. Push zadnje 3 km.' },
    ],
    nutrition: [
      { when: 'Dan prej', what: 'Carb-load (več kot za LJ). 3 L vode + elektroliti. Zgodaj v posteljo.' },
      { when: 'Zajtrk', what: '3 h pred startom. Standardni race breakfast (kot za LJ).' },
      { when: 'Med tekmo', what: 'Gel pri km 7 in km 14. Caffeine gel pri km 7. Voda na vsakem postaji.' },
      { when: 'Po tekmi', what: 'A-race opravljena. Off-season transition (2-3 tedne lahko/recovery).' },
    ],
  },
});

export const futurePlans: TrainingPlan[] = [bazaPbPlan, palmanovaPlan];
