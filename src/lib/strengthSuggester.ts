import { supabase } from './supabase';
import { resolvePhase } from './runIngest';
import type {
  Exercise, StrengthSession, Run, PhaseConfig,
  MovementPattern, Muscle, Tendon, Equipment, StrengthExerciseEntry,
} from '../types';

// ============================================================
// Inputs / outputs
// ============================================================

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface SuggesterInput {
  difficulty: Difficulty;
  date: string;                  // YYYY-MM-DD
  available_time_min?: number;
  exclude_equipment?: Equipment[];
}

export interface SuggestedExercise {
  exercise: Exercise;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rir: number;
  reason: string;                // why included (BIG3 / coverage gap / phase bonus / etc.)
}

export interface BigThreeStatus {
  bss: boolean;
  sl_rdl: boolean;
  calf_soleus: boolean;
}

export interface CoverageSummary {
  muscles: Record<string, number>;
  tendons: Record<string, number>;
  patterns: Record<string, number>;
}

export interface StrengthSuggestion {
  exercises: SuggestedExercise[];
  rationale: string;
  big_three_status_after: BigThreeStatus;
  coverage_after: CoverageSummary;
  estimated_duration_min: number;
  session_type: string;
  phase?: string;
  difficulty: Difficulty;
}

// ============================================================
// Session parameters by difficulty (HANDOFF 8.3)
// ============================================================

interface SessionParams {
  n_exercises_min: number;
  n_exercises_max: number;
  sets: number;
  reps_target: number;
  rir_target: number;
  duration_min: number;
  session_type: 'light' | 'maintenance' | 'medium' | 'heavy' | 'explosive';
}

const SESSION_PARAMS: Record<Difficulty, SessionParams> = {
  1: { n_exercises_min: 2, n_exercises_max: 3, sets: 2, reps_target: 8, rir_target: 4, duration_min: 18, session_type: 'light' },
  2: { n_exercises_min: 3, n_exercises_max: 4, sets: 3, reps_target: 8, rir_target: 4, duration_min: 22, session_type: 'maintenance' },
  3: { n_exercises_min: 5, n_exercises_max: 5, sets: 3, reps_target: 8, rir_target: 3, duration_min: 32, session_type: 'medium' },
  4: { n_exercises_min: 5, n_exercises_max: 6, sets: 4, reps_target: 6, rir_target: 2, duration_min: 38, session_type: 'heavy' },
  5: { n_exercises_min: 6, n_exercises_max: 7, sets: 4, reps_target: 5, rir_target: 2, duration_min: 42, session_type: 'explosive' },
};

// ============================================================
// Coverage targets per week (defaults; phase-tunable later)
// ============================================================

const MUSCLE_WEEKLY_TARGET: Partial<Record<Muscle, number>> = {
  quads: 2, hamstrings_prox: 2, hamstrings_distal: 1, glute_max: 2, glute_med: 2,
  adductors: 1, gastrocnemius: 1, soleus: 2, tibialis_anterior: 1, foot_intrinsics: 1,
  core_anterior: 2, core_lateral: 2, core_rotational: 1, hip_flexors: 1,
};

const TENDON_WEEKLY_TARGET: Partial<Record<Tendon, number>> = {
  achilles: 2, patellar: 1, hamstring_origin: 1, gluteal: 1, plantar_fascia: 1,
};

// ============================================================
// Phase bonus map (HANDOFF 8.5)
// ============================================================

interface PhaseBonus {
  patterns?: Partial<Record<MovementPattern, number>>;
  categories?: Record<string, number>;
  high_impact_plyo?: number;     // applied to plyo exercises with intrinsic_difficulty >= 3
}

const PHASE_BONUS: Record<string, PhaseBonus> = {
  F2: {
    categories: { tendon: 2 },
    patterns: { foot_ankle: 2, hinge_unilateral: 1 },
    high_impact_plyo: -2,
  },
  F3: {
    patterns: { squat_unilateral: 1, calf_soleus: 1, plyo_horizontal: 1, plyo_reactive: 1 },
  },
  F4: {
    patterns: { plyo_vertical: 2, plyo_reactive: 2, hinge_unilateral: 1 },
  },
  F5a: {
    patterns: { plyo_reactive: 1, squat_unilateral: 1, hip_extension: 1 },
  },
  'F5b-LJ': {
    categories: { core: 1 },
    high_impact_plyo: -3,
  },
  F5c: {
    patterns: { plyo_reactive: 1, hip_extension: 1 },
  },
  'F5d-Palmanova': {
    categories: { core: 1 },
    high_impact_plyo: -3,
  },
};

// ============================================================
// Helpers
// ============================================================

function classifyBig3(ex: Exercise): keyof BigThreeStatus | null {
  if (!ex.is_big_three) return null;
  if (ex.name_en.startsWith('Bulgarian')) return 'bss';
  if (ex.name_en.startsWith('Single-leg RDL')) return 'sl_rdl';
  if (ex.name_en.toLowerCase().includes('calf') && ex.name_en.toLowerCase().includes('soleus')) return 'calf_soleus';
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isMon0Sun6(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekRange(dateIso: string): { start: string; end: string } {
  const [y, m, d] = dateIso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const dow = isMon0Sun6(target);
  const start = new Date(target);
  start.setDate(target.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: isoDate(start), end: isoDate(end) };
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ============================================================
// Context gathering
// ============================================================

export interface SuggesterContext {
  phase: PhaseConfig | null;
  weekStrengths: StrengthSession[];
  weekRuns: Run[];
  lastSession: StrengthSession | null;
  bigThreeStatus: BigThreeStatus;
  exerciseUseCount: Record<string, number>;         // ex.id → uses this week
  lastUseDate: Record<string, string>;              // ex.id → last YYYY-MM-DD
  coverage: CoverageSummary;
  availableDumbbells: number[];
}

export async function gatherContext(dateIso: string): Promise<SuggesterContext> {
  const phase = await resolvePhase(dateIso);

  // Last 7d window (rolling, not calendar — we want recency context)
  const targetDate = new Date(dateIso);
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(targetDate.getDate() - 7);
  const startIso = isoDate(sevenDaysAgo);

  // Calendar week for BIG3 status (HANDOFF: "BIG3 ta teden")
  const { start: weekStart, end: weekEnd } = weekRange(dateIso);

  // Fetch strength sessions in last 7 days (for recency) AND this calendar week (for BIG3)
  const { data: strengthsRaw } = await supabase
    .from('strength_sessions')
    .select('*')
    .gte('date', startIso)
    .lte('date', dateIso)
    .order('date', { ascending: false });
  const allStrengths = (strengthsRaw as StrengthSession[] | null) ?? [];

  const weekStrengths = allStrengths.filter(s => s.date >= weekStart && s.date <= weekEnd);

  // Fetch runs in last 7 days
  const { data: runsRaw } = await supabase
    .from('runs')
    .select('*')
    .gte('date', startIso)
    .lte('date', dateIso);
  const weekRuns = (runsRaw as Run[] | null) ?? [];

  // BIG3 status: query BIG3 exercise IDs, scan calendar-week strength sessions
  const { data: big3Rows } = await supabase
    .from('exercises')
    .select('id, name_en')
    .eq('is_big_three', true);
  const big3IdMap: Partial<Record<keyof BigThreeStatus, string>> = {};
  (big3Rows as { id: string; name_en: string }[] | null)?.forEach(r => {
    if (r.name_en.startsWith('Bulgarian')) big3IdMap.bss = r.id;
    else if (r.name_en.startsWith('Single-leg RDL')) big3IdMap.sl_rdl = r.id;
    else if (r.name_en.toLowerCase().includes('calf') && r.name_en.toLowerCase().includes('soleus')) big3IdMap.calf_soleus = r.id;
  });
  const bigThreeStatus: BigThreeStatus = { bss: false, sl_rdl: false, calf_soleus: false };
  for (const s of weekStrengths) {
    const exs = Array.isArray(s.exercises) ? s.exercises : [];
    for (const e of exs as StrengthExerciseEntry[]) {
      if (e.exercise_id === big3IdMap.bss) bigThreeStatus.bss = true;
      if (e.exercise_id === big3IdMap.sl_rdl) bigThreeStatus.sl_rdl = true;
      if (e.exercise_id === big3IdMap.calf_soleus) bigThreeStatus.calf_soleus = true;
    }
  }

  // Use counts and last-use dates across last 7 days
  const exerciseUseCount: Record<string, number> = {};
  const lastUseDate: Record<string, string> = {};
  for (const s of allStrengths) {
    const exs = Array.isArray(s.exercises) ? s.exercises : [];
    for (const e of exs as StrengthExerciseEntry[]) {
      if (!e.exercise_id) continue;
      exerciseUseCount[e.exercise_id] = (exerciseUseCount[e.exercise_id] ?? 0) + 1;
      if (!lastUseDate[e.exercise_id] || s.date > lastUseDate[e.exercise_id]) {
        lastUseDate[e.exercise_id] = s.date;
      }
    }
  }

  // Coverage of muscles/tendons/patterns this calendar week
  // (need full exercise rows to know what muscles etc each used exercise targets)
  const usedExerciseIds = new Set<string>();
  for (const s of weekStrengths) {
    for (const e of (s.exercises as StrengthExerciseEntry[] | null) ?? []) {
      if (e.exercise_id) usedExerciseIds.add(e.exercise_id);
    }
  }
  const coverage: CoverageSummary = { muscles: {}, tendons: {}, patterns: {} };
  if (usedExerciseIds.size > 0) {
    const { data: usedExs } = await supabase
      .from('exercises')
      .select('id, primary_muscles, secondary_muscles, tendons, movement_patterns')
      .in('id', Array.from(usedExerciseIds));
    (usedExs as Pick<Exercise, 'id' | 'primary_muscles' | 'secondary_muscles' | 'tendons' | 'movement_patterns'>[] | null)?.forEach(ex => {
      // Count primary muscles as full hit, secondary as 0.5
      ex.primary_muscles.forEach(m => { coverage.muscles[m] = (coverage.muscles[m] ?? 0) + 1; });
      (ex.secondary_muscles ?? []).forEach(m => { coverage.muscles[m] = (coverage.muscles[m] ?? 0) + 0.5; });
      (ex.tendons ?? []).forEach(t => { coverage.tendons[t] = (coverage.tendons[t] ?? 0) + 1; });
      ex.movement_patterns.forEach(p => { coverage.patterns[p] = (coverage.patterns[p] ?? 0) + 1; });
    });
  }

  // Available dumbbells from athlete profile
  const { data: profile } = await supabase
    .from('athlete_profile')
    .select('available_dumbbells')
    .eq('id', 'default')
    .maybeSingle();
  const availableDumbbells = (profile as { available_dumbbells?: number[] } | null)?.available_dumbbells
    ?? [2, 3, 4, 6, 7.5];

  return {
    phase,
    weekStrengths,
    weekRuns,
    lastSession: allStrengths[0] ?? null,
    bigThreeStatus,
    exerciseUseCount,
    lastUseDate,
    coverage,
    availableDumbbells,
  };
}

// ============================================================
// Weight suggestion
// ============================================================

interface SuggestWeightInput {
  exercise: Exercise;
  availableDumbbells: number[];
  history: { weight_kg?: number; rir?: number; reps?: number; sets?: number }[];
}

function suggestWeight({ exercise, availableDumbbells, history }: SuggestWeightInput): number | undefined {
  if (exercise.is_bodyweight_only || exercise.is_time_based) return undefined;
  if (!exercise.equipment.includes('dumbbell')) return undefined;
  const sorted = [...availableDumbbells].sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;

  // No history: start at smallest
  if (history.length === 0) return sorted[0];

  // Find most recent weight used and bump up if RIR consistently >= 3 in last 2 sessions at same reps/sets
  const last = history[0];
  const prev = history[1];
  const lastWeight = last.weight_kg ?? sorted[0];

  const easyTwice =
    last.rir !== undefined && last.rir >= 3 &&
    prev?.rir !== undefined && prev.rir >= 3 &&
    last.reps === prev.reps && last.sets === prev.sets;

  if (easyTwice) {
    const idx = sorted.findIndex(w => w >= lastWeight);
    if (idx >= 0 && idx + 1 < sorted.length) return sorted[idx + 1];
    return lastWeight;
  }
  // Snap to nearest available dumbbell
  let nearest = sorted[0];
  let bestDelta = Math.abs(lastWeight - sorted[0]);
  for (const w of sorted) {
    const d = Math.abs(lastWeight - w);
    if (d < bestDelta) { nearest = w; bestDelta = d; }
  }
  return nearest;
}

// ============================================================
// Scoring
// ============================================================

function scoreExercise(
  ex: Exercise,
  ctx: SuggesterContext,
  selectedSoFar: Exercise[],
  todayIso: string,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const phaseCode = ctx.phase?.phase_code;

  // Coverage gap reward — muscles
  for (const m of ex.primary_muscles) {
    const target = MUSCLE_WEEKLY_TARGET[m];
    if (!target) continue;
    const current = (ctx.coverage.muscles[m] ?? 0) +
      selectedSoFar.filter(s => s.primary_muscles.includes(m)).length;
    if (current < target) {
      const bonus = 2 * (target - current) / target;
      score += bonus;
    }
  }

  // Coverage gap — tendons
  for (const t of ex.tendons ?? []) {
    const target = TENDON_WEEKLY_TARGET[t];
    if (!target) continue;
    const current = (ctx.coverage.tendons[t] ?? 0) +
      selectedSoFar.filter(s => (s.tendons ?? []).includes(t)).length;
    if (current < target) {
      score += 1.5;
      reasons.push(`tetiva ${t}`);
    }
  }

  // Movement patterns not yet covered
  const patternsCoveredNow = new Set([
    ...Object.keys(ctx.coverage.patterns),
    ...selectedSoFar.flatMap(s => s.movement_patterns),
  ]);
  for (const p of ex.movement_patterns) {
    if (!patternsCoveredNow.has(p)) score += 1;
  }

  // Phase bonus
  if (phaseCode && PHASE_BONUS[phaseCode]) {
    const pb = PHASE_BONUS[phaseCode];
    if (pb.patterns) {
      for (const p of ex.movement_patterns) {
        const b = pb.patterns[p];
        if (b) { score += b; if (b > 0) reasons.push(`faza ${phaseCode}`); }
      }
    }
    if (pb.categories?.[ex.category]) {
      const b = pb.categories[ex.category];
      score += b;
      if (b > 0) reasons.push(`faza ${phaseCode} ${ex.category}`);
    }
    if (pb.high_impact_plyo && ex.category === 'plyo' && ex.intrinsic_difficulty >= 3) {
      score += pb.high_impact_plyo;
    }
  }

  // Recency penalty: newer use = lower score
  const last = ctx.lastUseDate[ex.id];
  if (last) {
    const daysSince = daysBetween(last, todayIso);
    const factor = Math.min(1.0, Math.max(0.2, daysSince / 4));
    score *= factor;
  }

  return { score, reasons };
}

// ============================================================
// Main algorithm
// ============================================================

export async function suggestStrengthSession(
  input: SuggesterInput,
): Promise<StrengthSuggestion> {
  const ctx = await gatherContext(input.date);
  const params = SESSION_PARAMS[input.difficulty];
  const phaseCode = ctx.phase?.phase_code;

  // 1. Load all exercises
  const { data: allExsRaw } = await supabase
    .from('exercises')
    .select('*');
  const allExercises = (allExsRaw as Exercise[] | null) ?? [];

  // 2. Mandatory BIG3 — up to 2 missing in this session
  const big3List = allExercises.filter(e => e.is_big_three);
  const missingBig3: Exercise[] = [];
  for (const ex of big3List) {
    const key = classifyBig3(ex);
    if (key && !ctx.bigThreeStatus[key]) missingBig3.push(ex);
  }
  const selected: Exercise[] = [];
  const reasonsMap: Record<string, string[]> = {};
  for (const ex of missingBig3.slice(0, 2)) {
    selected.push(ex);
    reasonsMap[ex.id] = ['⭐ manjkajoča BIG3'];
  }

  // 3. Filter candidates
  const excludeEquip = new Set<Equipment>(input.exclude_equipment ?? []);
  const selectedIds = new Set(selected.map(e => e.id));
  const lastSessionExIds = new Set(
    ((ctx.lastSession?.exercises as StrengthExerciseEntry[] | null) ?? [])
      .map(e => e.exercise_id)
      .filter(Boolean) as string[],
  );

  const candidates = allExercises.filter(ex => {
    if (selectedIds.has(ex.id)) return false;
    if (ex.intrinsic_difficulty > input.difficulty + 1) return false;
    if (lastSessionExIds.has(ex.id)) return false;
    const useCount = ctx.exerciseUseCount[ex.id] ?? 0;
    if (useCount >= (ex.max_per_week ?? 2)) return false;
    if (excludeEquip.size > 0) {
      // Exercise filtered out only if ALL its equipment options are excluded
      const allExcluded = ex.equipment.every(eq => excludeEquip.has(eq));
      if (allExcluded) return false;
    }
    return true;
  });

  // 4. Score candidates iteratively (re-score after each selection to reflect updated coverage)
  const todayIso = input.date;
  const targetN = clamp(params.n_exercises_max, params.n_exercises_min, params.n_exercises_max);

  while (selected.length < targetN && candidates.length > 0) {
    const scored = candidates.map(ex => {
      const { score, reasons } = scoreExercise(ex, ctx, selected, todayIso);
      return { ex, score, reasons };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top || top.score <= -2) break; // strongly negative → skip
    selected.push(top.ex);
    reasonsMap[top.ex.id] = top.reasons.length ? top.reasons : ['pokritost'];
    // Remove from candidates
    const idx = candidates.findIndex(c => c.id === top.ex.id);
    if (idx >= 0) candidates.splice(idx, 1);
  }

  // 5. Enforce balance
  // 5a. At least one core
  if (!selected.some(e => e.category === 'core')) {
    const coreCandidates = allExercises.filter(e =>
      e.category === 'core' &&
      !selectedIds.has(e.id) &&
      !lastSessionExIds.has(e.id) &&
      (ctx.exerciseUseCount[e.id] ?? 0) < (e.max_per_week ?? 2),
    );
    if (coreCandidates.length > 0) {
      const swappable = selected.filter(e => !e.is_big_three && e.category !== 'core');
      if (swappable.length > 0) {
        // Remove lowest-scoring swappable, add best core
        const scoredSwap = swappable.map(e => ({
          e,
          score: scoreExercise(e, ctx, selected.filter(s => s.id !== e.id), todayIso).score,
        }));
        scoredSwap.sort((a, b) => a.score - b.score);
        const toRemove = scoredSwap[0].e;
        const remIdx = selected.findIndex(s => s.id === toRemove.id);
        if (remIdx >= 0) selected.splice(remIdx, 1);
        const scoredCore = coreCandidates.map(e => ({
          e,
          score: scoreExercise(e, ctx, selected, todayIso).score,
        }));
        scoredCore.sort((a, b) => b.score - a.score);
        selected.push(scoredCore[0].e);
        reasonsMap[scoredCore[0].e.id] = ['balans: vsaka sesija ≥1 core'];
      }
    }
  }

  // 5b. F2/F3: at least one foot_ankle pattern
  if (phaseCode === 'F2' || phaseCode === 'F3') {
    const hasFootAnkle = selected.some(e => e.movement_patterns.includes('foot_ankle')) ||
      (ctx.coverage.patterns.foot_ankle ?? 0) > 0;
    if (!hasFootAnkle) {
      const footCandidates = allExercises.filter(e =>
        e.movement_patterns.includes('foot_ankle') &&
        !selected.some(s => s.id === e.id),
      );
      if (footCandidates.length > 0) {
        const swappable = selected.filter(e => !e.is_big_three && e.category !== 'core');
        if (swappable.length > 0) {
          const scoredSwap = swappable.map(e => ({
            e,
            score: scoreExercise(e, ctx, selected.filter(s => s.id !== e.id), todayIso).score,
          }));
          scoredSwap.sort((a, b) => a.score - b.score);
          const toRemove = scoredSwap[0].e;
          const remIdx = selected.findIndex(s => s.id === toRemove.id);
          if (remIdx >= 0) selected.splice(remIdx, 1);
          selected.push(footCandidates[0]);
          reasonsMap[footCandidates[0].id] = [`balans: ${phaseCode} foot/ankle target`];
        }
      }
    }
  }

  // 6. Apply sets/reps/RIR + weight suggestion
  const out: SuggestedExercise[] = [];
  for (const ex of selected) {
    const sets = clamp(params.sets, ex.default_sets_min ?? params.sets, ex.default_sets_max ?? params.sets);
    let reps: number | undefined;
    let duration_seconds: number | undefined;
    if (ex.is_time_based) {
      const dMin = ex.default_duration_seconds_min ?? 20;
      const dMax = ex.default_duration_seconds_max ?? 60;
      // Scale duration linearly with difficulty
      duration_seconds = Math.round(dMin + ((dMax - dMin) * (input.difficulty - 1)) / 4);
    } else {
      const rMin = ex.default_reps_min ?? params.reps_target;
      const rMax = ex.default_reps_max ?? params.reps_target;
      reps = clamp(params.reps_target, rMin, rMax);
    }

    // Build history from last 7d sessions for this exercise
    const history: { weight_kg?: number; rir?: number; reps?: number; sets?: number }[] = [];
    for (const s of ctx.weekStrengths) {
      const exs = (s.exercises as StrengthExerciseEntry[] | null) ?? [];
      const found = exs.find(e => e.exercise_id === ex.id);
      if (found) {
        history.push({
          weight_kg: found.weight_kg,
          rir: found.rir,
          reps: found.reps,
          sets: found.sets,
        });
      }
    }

    const weight_kg = suggestWeight({
      exercise: ex,
      availableDumbbells: ctx.availableDumbbells,
      history,
    });

    out.push({
      exercise: ex,
      sets,
      reps,
      duration_seconds,
      weight_kg,
      rir: params.rir_target,
      reason: (reasonsMap[ex.id] ?? []).join(' · '),
    });
  }

  // 7. Compute big3 status after
  const big3After: BigThreeStatus = { ...ctx.bigThreeStatus };
  for (const se of out) {
    const k = classifyBig3(se.exercise);
    if (k) big3After[k] = true;
  }

  // 8. Compute coverage after
  const coverageAfter: CoverageSummary = JSON.parse(JSON.stringify(ctx.coverage));
  for (const se of out) {
    se.exercise.primary_muscles.forEach(m => { coverageAfter.muscles[m] = (coverageAfter.muscles[m] ?? 0) + 1; });
    (se.exercise.secondary_muscles ?? []).forEach(m => { coverageAfter.muscles[m] = (coverageAfter.muscles[m] ?? 0) + 0.5; });
    (se.exercise.tendons ?? []).forEach(t => { coverageAfter.tendons[t] = (coverageAfter.tendons[t] ?? 0) + 1; });
    se.exercise.movement_patterns.forEach(p => { coverageAfter.patterns[p] = (coverageAfter.patterns[p] ?? 0) + 1; });
  }

  // 9. Rationale
  const rationale = composeRationale({
    input, ctx, out, missingBig3, params,
  });

  return {
    exercises: out,
    rationale,
    big_three_status_after: big3After,
    coverage_after: coverageAfter,
    estimated_duration_min: params.duration_min,
    session_type: params.session_type,
    phase: phaseCode,
    difficulty: input.difficulty,
  };
}

// ============================================================
// Rationale composer (rule-based, HANDOFF 8.7)
// ============================================================

interface RationaleInput {
  input: SuggesterInput;
  ctx: SuggesterContext;
  out: SuggestedExercise[];
  missingBig3: Exercise[];
  params: SessionParams;
}

function composeRationale({ input, ctx, out, missingBig3, params }: RationaleInput): string {
  const parts: string[] = [];
  const todayIso = input.date;
  const phaseCode = ctx.phase?.phase_code;

  // Days since last strength
  if (ctx.lastSession) {
    const days = daysBetween(ctx.lastSession.date, todayIso);
    parts.push(`Zadnji strength pred ${days} ${days === 1 ? 'dnem' : 'dnevi'}.`);
  } else {
    parts.push('Prva strength sesija v tem oknu.');
  }

  // BIG3
  const includedBig3Keys: (keyof BigThreeStatus)[] = [];
  for (const se of out) {
    const k = classifyBig3(se.exercise);
    if (k) includedBig3Keys.push(k);
  }
  if (missingBig3.length > 0) {
    const slo = missingBig3.map(m => m.name_sl ?? m.name_en);
    parts.push(`Manjkajoči BIG3 ta teden: ${slo.join(', ')}.`);
    if (includedBig3Keys.length > 0) {
      parts.push(`Vključeni v sesijo: ${includedBig3Keys.length}.`);
    }
  } else {
    parts.push('BIG3 že pokriti ta teden.');
  }

  // Phase emphasis
  if (phaseCode) {
    const phaseEmphasis: Record<string, string> = {
      F1: 'F1 recovery — light vzdrževanje.',
      F2: 'F2 base — tendon adaptacija + foot/ankle prioriteta.',
      F3: 'F3 specifičnost — squat_unilateral + plyo intro.',
      F4: 'F4 peak speed — 2× tedensko, fokus power (plyo vertical/reactive).',
      F5a: 'F5a HM build — plyo_reactive + glute endurance.',
      'F5b-LJ': 'F5b-LJ taper — core only, brez high-impact plyo.',
      F5c: 'F5c re-build za Palmanova.',
      'F5d-Palmanova': 'F5d-Palmanova final taper — core only.',
    };
    if (phaseEmphasis[phaseCode]) parts.push(phaseEmphasis[phaseCode]);
  }

  // Recent hard run guard
  const recentHard = ctx.weekRuns.find(r => ['interval', 'tempo', 'hill'].includes(r.workout_type));
  if (recentHard) {
    const days = daysBetween(recentHard.date, todayIso);
    if (days < 2) {
      parts.push(`Hard tek pred ${days} ${days === 1 ? 'dnem' : 'dnevi'} → izpuščene high-impact plyo z diff≥3.`);
    }
  }

  // Coverage gaps
  const gaps: string[] = [];
  for (const m of Object.keys(MUSCLE_WEEKLY_TARGET) as Muscle[]) {
    const target = MUSCLE_WEEKLY_TARGET[m] ?? 0;
    const current = ctx.coverage.muscles[m] ?? 0;
    if (current < target * 0.5) gaps.push(m);
  }
  if (gaps.length > 0 && gaps.length <= 4) {
    parts.push(`Šibka pokritost: ${gaps.join(', ')}.`);
  }

  parts.push(`Difficulty ${input.difficulty} = ${params.duration_min} min, RIR ${params.rir_target}.`);

  return parts.join(' ');
}

// ============================================================
// Save suggestion + create strength_session
// ============================================================

export interface SaveAcceptedInput {
  suggestion: StrengthSuggestion;
  input: SuggesterInput;
  notes?: string;
  exerciseOverrides?: Record<string, Partial<StrengthExerciseEntry>>;
}

export async function saveAcceptedSuggestion(
  args: SaveAcceptedInput,
): Promise<{ session_id: string | null; suggestion_id: string | null; error: string | null }> {
  const { suggestion, input, notes, exerciseOverrides = {} } = args;

  // 1. Insert workout_suggestion
  const { data: sugRow, error: sugErr } = await supabase
    .from('workout_suggestions')
    .insert({
      suggester_type: 'strength',
      input_params: input as unknown as Record<string, unknown>,
      output_workout: { exercises: suggestion.exercises.map(e => ({
        exercise_id: e.exercise.id,
        name_sl: e.exercise.name_sl,
        sets: e.sets,
        reps: e.reps,
        duration_seconds: e.duration_seconds,
        weight_kg: e.weight_kg,
        rir: e.rir,
        reason: e.reason,
      })) },
      rationale: suggestion.rationale,
      status: 'accepted',
    })
    .select('id')
    .single();
  if (sugErr) return { session_id: null, suggestion_id: null, error: sugErr.message };
  const suggestionId = (sugRow as { id: string }).id;

  // 2. Insert strength_session
  const exercisesPayload: StrengthExerciseEntry[] = suggestion.exercises.map(e => {
    const ovr = exerciseOverrides[e.exercise.id] ?? {};
    return {
      exercise_id: e.exercise.id,
      name_sl: e.exercise.name_sl ?? e.exercise.name_en,
      sets: ovr.sets ?? e.sets,
      reps: ovr.reps ?? e.reps,
      duration_seconds: ovr.duration_seconds ?? e.duration_seconds,
      weight_kg: ovr.weight_kg ?? e.weight_kg,
      rir: ovr.rir ?? e.rir,
    };
  });

  const { data: sessRow, error: sessErr } = await supabase
    .from('strength_sessions')
    .insert({
      date: input.date,
      difficulty: input.difficulty,
      duration_min: suggestion.estimated_duration_min,
      phase: suggestion.phase ?? null,
      session_type: suggestion.session_type,
      exercises: exercisesPayload,
      suggested_by_id: suggestionId,
      notes: notes || null,
    })
    .select('id')
    .single();
  if (sessErr) return { session_id: null, suggestion_id: suggestionId, error: sessErr.message };

  // 3. Update suggestion with actual_session_id
  const sessionId = (sessRow as { id: string }).id;
  await supabase
    .from('workout_suggestions')
    .update({ actual_session_id: sessionId })
    .eq('id', suggestionId);

  return { session_id: sessionId, suggestion_id: suggestionId, error: null };
}
