import { supabase } from './supabase';
import { resolvePhase } from './runIngest';
import type { Run, PhaseConfig, WorkoutType, WorkoutSubtype } from '../types';

// ============================================================
// Types
// ============================================================

export type RunningGoal = '5k_pb' | '10k_pb' | 'hm_pb' | 'marathon_base' | 'general';
export type RunningCategory = 'easy' | 'tempo' | 'interval' | 'long' | 'hill' | 'recovery';
export type Terrain = 'flat' | 'hill' | 'mixed';
export type RecoveryState = 'fresh' | 'normal' | 'fatigued';
export type PaceRef =
  | 'easy' | 'threshold_pace' | 'vo2max_pace' | 'hm_pace'
  | 'mp_pace' | '10k_pace' | '5k_pace' | '3k_pace';

export interface RunningSuggesterInput {
  goal: RunningGoal;
  category?: RunningCategory;
  date: string;
  available_time_min?: number;
  terrain_preference?: Terrain;
}

export interface TemplateSegmentContinuous {
  phase: 'warmup' | 'main' | 'cooldown' | 'recovery';
  type: 'continuous';
  duration_min?: number;
  distance_km?: number;
  pace_ref: PaceRef;
  notes?: string;
}

export interface TemplateSegmentReps {
  phase: 'warmup' | 'main' | 'cooldown' | 'recovery';
  type: 'reps';
  reps: number;
  work_distance_m?: number;
  work_duration_seconds?: number;
  work_pace_ref: PaceRef;
  rest_duration_seconds?: number;
  rest_pace_ref?: PaceRef;
  rest_description?: string;
  notes?: string;
}

export type TemplateSegment = TemplateSegmentContinuous | TemplateSegmentReps;

export interface RunningWorkoutTemplate {
  id: string;
  template_code: string;
  display_name_sl: string;
  phase: string;
  goal_compat: RunningGoal[];
  category: RunningCategory;
  subtype?: WorkoutSubtype;
  terrain: Terrain;
  structure: { segments: TemplateSegment[] };
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  intra_category_difficulty?: number;
  max_per_2weeks?: number;
  description?: string;
  notes?: string;
}

export interface ResolvedSegment {
  phase: 'warmup' | 'main' | 'cooldown' | 'recovery';
  kind: 'continuous' | 'reps';
  description: string;
  // continuous
  duration_min?: number;
  distance_km?: number;
  pace_label?: string;
  pace_target_seconds?: number;
  hr_target?: string;
  // reps
  reps?: number;
  work_distance_m?: number;
  work_duration_seconds?: number;
  work_pace_label?: string;
  work_pace_target_seconds?: number;
  rest_duration_seconds?: number;
  rest_description?: string;
  notes?: string;
}

export interface ResolvedWorkout {
  template_id: string;
  template_code: string;
  display_name_sl: string;
  type: WorkoutType;
  subtype?: WorkoutSubtype;
  category: RunningCategory;
  goal: RunningGoal;
  segments: ResolvedSegment[];
  estimated_total_km: number;
  estimated_duration_min: number;
  target_paces: Partial<Record<PaceRef, number>>;
  terrain_recommendation: Terrain;
  rationale: string;
  warnings: string[];
  phase?: string;
  intra_category_difficulty?: number;
}

// ============================================================
// Pace resolution (HANDOFF dodatek 9.5)
// ============================================================

function resolvePaceRef(ref: PaceRef, phase: PhaseConfig | null): number | null {
  if (!phase) return null;
  switch (ref) {
    case 'threshold_pace': return phase.threshold_pace_seconds ?? null;
    case 'vo2max_pace': return phase.vo2max_pace_seconds ?? null;
    case 'hm_pace': return phase.hm_pace_seconds ?? null;
    case 'mp_pace': return phase.mp_pace_seconds ?? (phase.hm_pace_seconds ? phase.hm_pace_seconds + 30 : null);
    case '10k_pace': return phase.vo2max_pace_seconds ? phase.vo2max_pace_seconds + 10 : null;
    case '5k_pace': return phase.vo2max_pace_seconds ?? null;
    case '3k_pace': return phase.vo2max_pace_seconds ? phase.vo2max_pace_seconds - 10 : null;
    case 'easy': return phase.threshold_pace_seconds ? phase.threshold_pace_seconds + 80 : null;
  }
}

function paceLabelFromRef(ref: PaceRef): string {
  switch (ref) {
    case 'easy': return 'easy';
    case 'threshold_pace': return 'threshold';
    case 'vo2max_pace': return 'VO2max';
    case 'hm_pace': return 'HM pace';
    case 'mp_pace': return 'MP';
    case '10k_pace': return '10K pace';
    case '5k_pace': return '5K pace';
    case '3k_pace': return '3K pace';
  }
}

export function formatPaceSeconds(seconds: number | undefined | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

// ============================================================
// Context gathering
// ============================================================

const HARD_TYPES: WorkoutType[] = ['tempo', 'interval', 'hill', 'race'];
const HARD_TARGET = 2;

export interface RunningContext {
  phase: PhaseConfig | null;
  last7d: Run[];
  last14d: Run[];
  hardCountThisWeek: number;
  longDoneThisWeek: boolean;
  daysSinceLastHard: number | null;
  lastHardType: WorkoutType | null;
  nextRaceDate: string | null;
  isTaperWeek: boolean;
  recoveryState: RecoveryState;
  recentTemplateIds: Set<string>;          // used in last 14 days
  recentTemplateIds7d: Set<string>;        // used in last 7 days (fallback)
  /** template_codes used in last 14 days (for variety filter) */
  recentTemplateCodes: Set<string>;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekRange(dateIso: string): { start: string; end: string } {
  const [y, m, d] = dateIso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const dow = target.getDay() === 0 ? 6 : target.getDay() - 1;
  const start = new Date(target);
  start.setDate(target.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: isoDate(start), end: isoDate(end) };
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000);
}

function inferRecoveryState(runs: Run[]): RecoveryState {
  if (runs.length === 0) return 'fresh';
  const hardCount = runs.filter(r => HARD_TYPES.includes(r.workout_type)).length;
  const drifts = runs.map(r => r.hr_drift_bpm).filter((d): d is number => typeof d === 'number');
  const avgDrift = drifts.length ? drifts.reduce((a, b) => a + b, 0) / drifts.length : 0;
  if (hardCount >= 3 || avgDrift > 15) return 'fatigued';
  if (hardCount >= 2 && avgDrift > 8) return 'normal';
  if (hardCount === 0 && avgDrift < 5) return 'fresh';
  return 'normal';
}

export async function gatherRunningContext(dateIso: string): Promise<RunningContext> {
  const phase = await resolvePhase(dateIso);

  const target = new Date(dateIso);
  const sevenAgo = new Date(target); sevenAgo.setDate(target.getDate() - 7);
  const fourteenAgo = new Date(target); fourteenAgo.setDate(target.getDate() - 14);

  const { data: runs14Raw } = await supabase
    .from('runs')
    .select('*')
    .gte('date', isoDate(fourteenAgo))
    .lte('date', dateIso)
    .order('date', { ascending: false });
  const last14d = (runs14Raw as Run[] | null) ?? [];
  const last7d = last14d.filter(r => r.date >= isoDate(sevenAgo));

  const { start: wkStart, end: wkEnd } = weekRange(dateIso);
  const weekRuns = last7d.filter(r => r.date >= wkStart && r.date <= wkEnd);
  const hardCountThisWeek = weekRuns.filter(r => HARD_TYPES.includes(r.workout_type)).length;
  const longDoneThisWeek = weekRuns.some(r => r.workout_type === 'long');

  const lastHard = last7d.find(r => HARD_TYPES.includes(r.workout_type));
  const daysSinceLastHard = lastHard ? daysBetween(lastHard.date, dateIso) : null;
  const lastHardType = lastHard?.workout_type ?? null;

  // Next race: any phase_config row with key_race after today
  const { data: futurePhases } = await supabase
    .from('phase_config')
    .select('start_date, key_race')
    .gte('start_date', dateIso)
    .not('key_race', 'is', null)
    .order('start_date', { ascending: true })
    .limit(1);
  const nextRaceDate = (futurePhases?.[0] as { start_date?: string } | undefined)?.start_date ?? null;
  const isTaperWeek = !!phase && /F5[bd]/.test(phase.phase_code);

  // Variety filter: template ids used in last 14 days via workout_suggestions
  const { data: recentSuggestions } = await supabase
    .from('workout_suggestions')
    .select('template_id, date_generated')
    .eq('suggester_type', 'running')
    .gte('date_generated', isoDate(fourteenAgo))
    .not('template_id', 'is', null);
  const allRecent = (recentSuggestions as { template_id: string; date_generated: string }[] | null) ?? [];
  const recentTemplateIds = new Set<string>();
  const recentTemplateIds7d = new Set<string>();
  for (const r of allRecent) {
    if (r.template_id) {
      recentTemplateIds.add(r.template_id);
      const days = daysBetween(r.date_generated.slice(0, 10), dateIso);
      if (days <= 7) recentTemplateIds7d.add(r.template_id);
    }
  }

  // Also resolve template_codes for those ids
  let recentTemplateCodes = new Set<string>();
  if (recentTemplateIds.size > 0) {
    const { data: codes } = await supabase
      .from('running_workout_templates')
      .select('id, template_code')
      .in('id', Array.from(recentTemplateIds));
    recentTemplateCodes = new Set((codes as { template_code: string }[] | null ?? []).map(c => c.template_code));
  }

  const recoveryState = inferRecoveryState(last7d);

  return {
    phase, last7d, last14d,
    hardCountThisWeek, longDoneThisWeek,
    daysSinceLastHard, lastHardType,
    nextRaceDate, isTaperWeek,
    recoveryState,
    recentTemplateIds, recentTemplateIds7d, recentTemplateCodes,
  };
}

// ============================================================
// Category auto-decision (HANDOFF 9.3)
// ============================================================

export function decideCategory(ctx: RunningContext, dateIso: string): RunningCategory {
  const dow = new Date(dateIso).getDay();
  if (ctx.hardCountThisWeek >= HARD_TARGET && ctx.daysSinceLastHard !== null && ctx.daysSinceLastHard < 2) return 'easy';
  if (!ctx.longDoneThisWeek && (dow === 0 || dow === 6)) return 'long';
  if (ctx.hardCountThisWeek < HARD_TARGET && (ctx.daysSinceLastHard === null || ctx.daysSinceLastHard >= 3)) {
    if (ctx.lastHardType === 'interval' || ctx.lastHardType === 'hill') return 'tempo';
    if (ctx.lastHardType === 'tempo') return 'interval';
    return 'interval';
  }
  return 'easy';
}

// ============================================================
// F3 progression chain (HANDOFF dodatek 9.6)
// ============================================================

const F3_INTERVAL_CHAIN: Record<string, string> = {
  F3_int_5x1000: 'F3_int_4x1500',
  F3_int_4x1500: 'F3_int_3x2000',
  F3_int_3x2000: 'F3_int_2x3000',
  F3_int_2x3000: 'F3_int_5x1000',
};

async function findLastIntervalTemplateInF3(dateIso: string): Promise<string | null> {
  const fourteenAgo = isoDate(new Date(new Date(dateIso).getTime() - 14 * 86400000));
  const { data } = await supabase
    .from('workout_suggestions')
    .select('template_id, date_generated, input_params')
    .eq('suggester_type', 'running')
    .gte('date_generated', fourteenAgo)
    .not('template_id', 'is', null)
    .order('date_generated', { ascending: false });
  const list = (data as { template_id: string; input_params: { category?: string } }[] | null) ?? [];
  const intervalSug = list.find(s => s.input_params?.category === 'interval');
  if (!intervalSug) return null;
  const { data: tpl } = await supabase
    .from('running_workout_templates')
    .select('template_code, phase, category')
    .eq('id', intervalSug.template_id)
    .maybeSingle();
  const row = tpl as { template_code: string; phase: string; category: string } | null;
  if (!row || row.phase !== 'F3' || row.category !== 'interval') return null;
  return row.template_code;
}

// ============================================================
// Template selection (HANDOFF dodatek 9.4)
// ============================================================

interface SelectionWeights {
  difficulty_match: number;  // higher = preferred
  recency: number;           // higher = less recent
}

function diffRangeForRecoveryState(state: RecoveryState): [number, number] {
  switch (state) {
    case 'fresh': return [3, 5];
    case 'normal': return [2, 4];
    case 'fatigued': return [1, 2];
  }
}

async function fetchCandidateTemplates(
  ctx: RunningContext,
  category: RunningCategory,
  goal: RunningGoal,
  terrain?: Terrain,
): Promise<RunningWorkoutTemplate[]> {
  const phaseFilter = ctx.phase ? [ctx.phase.phase_code, 'any'] : ['any'];

  let query = supabase
    .from('running_workout_templates')
    .select('*')
    .in('phase', phaseFilter)
    .eq('category', category);
  if (terrain) query = query.eq('terrain', terrain);

  const { data } = await query;
  let candidates = ((data as RunningWorkoutTemplate[] | null) ?? [])
    .filter(t => t.goal_compat.includes(goal));

  // Variety filter — exclude templates used in last 14 days
  const filtered14 = candidates.filter(t => !ctx.recentTemplateIds.has(t.id));
  if (filtered14.length > 0) candidates = filtered14;
  else {
    // Relax to 7 days
    candidates = candidates.filter(t => !ctx.recentTemplateIds7d.has(t.id));
  }
  return candidates;
}

function selectFromCandidates(
  candidates: RunningWorkoutTemplate[],
  ctx: RunningContext,
  input: RunningSuggesterInput,
): RunningWorkoutTemplate | null {
  if (candidates.length === 0) return null;
  const [diffLo, diffHi] = diffRangeForRecoveryState(ctx.recoveryState);
  const inRange = candidates.filter(c =>
    c.intra_category_difficulty !== undefined &&
    c.intra_category_difficulty >= diffLo &&
    c.intra_category_difficulty <= diffHi,
  );
  let pool = inRange.length > 0 ? inRange : candidates;

  // Time constraint
  if (input.available_time_min) {
    const limit = input.available_time_min + 5;
    const within = pool.filter(c => (c.estimated_duration_min ?? 999) <= limit);
    if (within.length > 0) pool = within;
  }

  // Weighted pick: prefer middle of difficulty range, then any
  // For simplicity, pick the one with intra_category_difficulty closest to (lo+hi)/2,
  // breaking ties by deterministic order on template_code.
  const target = (diffLo + diffHi) / 2;
  const scored = pool.map(c => ({
    t: c,
    w: {
      difficulty_match: -Math.abs((c.intra_category_difficulty ?? target) - target),
      recency: 0,
    } as SelectionWeights,
  }));
  scored.sort((a, b) => {
    if (b.w.difficulty_match !== a.w.difficulty_match) return b.w.difficulty_match - a.w.difficulty_match;
    return a.t.template_code.localeCompare(b.t.template_code);
  });
  return scored[0]?.t ?? null;
}

async function selectTemplate(
  ctx: RunningContext,
  category: RunningCategory,
  input: RunningSuggesterInput,
): Promise<RunningWorkoutTemplate | null> {
  // F3 progression chain (HANDOFF 9.6): if last F3 interval was in chain, pick next
  if (ctx.phase?.phase_code === 'F3' && category === 'interval') {
    const lastCode = await findLastIntervalTemplateInF3(input.date);
    if (lastCode && F3_INTERVAL_CHAIN[lastCode]) {
      const { data: nextRow } = await supabase
        .from('running_workout_templates')
        .select('*')
        .eq('template_code', F3_INTERVAL_CHAIN[lastCode])
        .maybeSingle();
      const next = nextRow as RunningWorkoutTemplate | null;
      if (next && next.goal_compat.includes(input.goal)) return next;
    }
  }

  const candidates = await fetchCandidateTemplates(ctx, category, input.goal, input.terrain_preference);
  return selectFromCandidates(candidates, ctx, input);
}

// ============================================================
// Resolve a template into a workout with concrete paces
// ============================================================

function describeSegment(seg: TemplateSegment, paces: Partial<Record<PaceRef, number>>): string {
  if (seg.type === 'continuous') {
    const paceLabel = paceLabelFromRef(seg.pace_ref);
    const paceVal = paces[seg.pace_ref];
    const paceStr = paceVal !== undefined ? ` @ ${paceLabel} (${formatPaceSeconds(paceVal)})` : ` @ ${paceLabel}`;
    if (seg.duration_min) return `${seg.duration_min} min${paceStr}`;
    if (seg.distance_km) return `${seg.distance_km} km${paceStr}`;
    return paceStr;
  }
  const workLabel = paceLabelFromRef(seg.work_pace_ref);
  const workVal = paces[seg.work_pace_ref];
  const workStr = workVal !== undefined ? `${workLabel} (${formatPaceSeconds(workVal)})` : workLabel;
  const workQty = seg.work_distance_m ? `${seg.work_distance_m}m` : `${seg.work_duration_seconds}s`;
  const restStr = seg.rest_description
    ? seg.rest_description
    : seg.rest_duration_seconds
      ? `${seg.rest_duration_seconds}s ${seg.rest_pace_ref ? paceLabelFromRef(seg.rest_pace_ref) : 'jog'}`
      : 'recovery';
  return `${seg.reps} × ${workQty} @ ${workStr} / ${restStr}`;
}

function estimateSegmentKm(seg: TemplateSegment, paces: Partial<Record<PaceRef, number>>): number {
  if (seg.type === 'continuous') {
    if (seg.distance_km) return seg.distance_km;
    if (seg.duration_min) {
      const pace = paces[seg.pace_ref];
      if (pace) return (seg.duration_min * 60) / pace;
    }
    return 0;
  }
  let workKm = 0;
  if (seg.work_distance_m) workKm = (seg.reps * seg.work_distance_m) / 1000;
  else if (seg.work_duration_seconds) {
    const wp = paces[seg.work_pace_ref];
    if (wp) workKm = (seg.reps * seg.work_duration_seconds * 1000) / wp / 1000;
  }
  let restKm = 0;
  if (seg.rest_duration_seconds && seg.rest_pace_ref) {
    const rp = paces[seg.rest_pace_ref];
    if (rp) restKm = ((seg.reps - 1) * seg.rest_duration_seconds * 1000) / rp / 1000;
  }
  return workKm + restKm;
}

function estimateSegmentMinutes(seg: TemplateSegment, paces: Partial<Record<PaceRef, number>>): number {
  if (seg.type === 'continuous') {
    if (seg.duration_min) return seg.duration_min;
    if (seg.distance_km) {
      const pace = paces[seg.pace_ref];
      if (pace) return (seg.distance_km * pace) / 60;
    }
    return 0;
  }
  let workSec = 0;
  if (seg.work_duration_seconds) workSec = seg.reps * seg.work_duration_seconds;
  else if (seg.work_distance_m) {
    const wp = paces[seg.work_pace_ref];
    if (wp) workSec = (seg.reps * seg.work_distance_m * wp) / 1000;
  }
  const restSec = (seg.rest_duration_seconds ?? 0) * (seg.reps - 1);
  return (workSec + restSec) / 60;
}

function categoryToWorkoutType(c: RunningCategory): WorkoutType {
  switch (c) {
    case 'easy': return 'easy';
    case 'tempo': return 'tempo';
    case 'interval': return 'interval';
    case 'long': return 'long';
    case 'hill': return 'hill';
    case 'recovery': return 'recovery';
  }
}

function resolveTemplateToWorkout(
  tpl: RunningWorkoutTemplate,
  ctx: RunningContext,
  input: RunningSuggesterInput,
): ResolvedWorkout {
  const paces: Partial<Record<PaceRef, number>> = {};
  for (const ref of ['easy', 'threshold_pace', 'vo2max_pace', 'hm_pace', 'mp_pace', '10k_pace', '5k_pace', '3k_pace'] as PaceRef[]) {
    const v = resolvePaceRef(ref, ctx.phase);
    if (v !== null) paces[ref] = v;
  }

  const segments: ResolvedSegment[] = tpl.structure.segments.map(seg => {
    if (seg.type === 'continuous') {
      return {
        phase: seg.phase,
        kind: 'continuous',
        description: describeSegment(seg, paces),
        duration_min: seg.duration_min,
        distance_km: seg.distance_km,
        pace_label: paceLabelFromRef(seg.pace_ref),
        pace_target_seconds: paces[seg.pace_ref],
        notes: seg.notes,
      };
    }
    return {
      phase: seg.phase,
      kind: 'reps',
      description: describeSegment(seg, paces),
      reps: seg.reps,
      work_distance_m: seg.work_distance_m,
      work_duration_seconds: seg.work_duration_seconds,
      work_pace_label: paceLabelFromRef(seg.work_pace_ref),
      work_pace_target_seconds: paces[seg.work_pace_ref],
      rest_duration_seconds: seg.rest_duration_seconds,
      rest_description: seg.rest_description ?? (seg.rest_pace_ref ? `${seg.rest_duration_seconds ?? 0}s ${paceLabelFromRef(seg.rest_pace_ref)}` : undefined),
      notes: seg.notes,
    };
  });

  const totalKm = Math.round(
    tpl.structure.segments.reduce((s, seg) => s + estimateSegmentKm(seg, paces), 0) * 10,
  ) / 10;
  const totalMin = Math.round(
    tpl.structure.segments.reduce((s, seg) => s + estimateSegmentMinutes(seg, paces), 0),
  );

  return {
    template_id: tpl.id,
    template_code: tpl.template_code,
    display_name_sl: tpl.display_name_sl,
    type: categoryToWorkoutType(tpl.category),
    subtype: tpl.subtype,
    category: tpl.category,
    goal: input.goal,
    segments,
    estimated_total_km: totalKm || (tpl.estimated_distance_km ?? 0),
    estimated_duration_min: totalMin || (tpl.estimated_duration_min ?? 0),
    target_paces: paces,
    terrain_recommendation: tpl.terrain,
    rationale: '',  // filled by composeRationale
    warnings: [],
    phase: tpl.phase,
    intra_category_difficulty: tpl.intra_category_difficulty,
  };
}

// ============================================================
// Rationale + guards
// ============================================================

function composeRationale(
  workout: ResolvedWorkout,
  tpl: RunningWorkoutTemplate,
  ctx: RunningContext,
  _input: RunningSuggesterInput,
  categoryAutoDecided: boolean,
): string {
  const parts: string[] = [];
  parts.push(`Predlog: ${tpl.display_name_sl}.`);
  if (categoryAutoDecided) {
    parts.push(`Kategorija "${workout.category}" izbrana auto glede na: hard sesij ta teden ${ctx.hardCountThisWeek}/${HARD_TARGET}, dni od zadnjega hard ${ctx.daysSinceLastHard ?? '∞'}.`);
  }
  if (ctx.phase) {
    parts.push(`Faza ${ctx.phase.phase_code}${ctx.phase.emphasis_notes ? ` (${ctx.phase.emphasis_notes})` : ''}.`);
  }
  parts.push(`Recovery state: ${ctx.recoveryState}.`);
  if (tpl.intra_category_difficulty) {
    parts.push(`Intra-difficulty: ${tpl.intra_category_difficulty}/5.`);
  }
  if (ctx.recentTemplateCodes.size > 0) {
    parts.push(`Variety filter: izpuščeni templati uporabljeni v zadnjih 14 dneh.`);
  }
  return parts.join(' ');
}

function applyGuards(workout: ResolvedWorkout, ctx: RunningContext, dateIso: string): string[] {
  const warnings: string[] = [];
  const isHard = HARD_TYPES.includes(workout.type);

  if (isHard && ctx.daysSinceLastHard !== null && ctx.daysSinceLastHard < 2) {
    warnings.push(`Zadnji hard tek pred ${ctx.daysSinceLastHard} ${ctx.daysSinceLastHard === 1 ? 'dnem' : 'dnevi'} — manj kot 48h.`);
  }

  if (workout.type === 'long') {
    const yesterdayIso = isoDate(new Date(new Date(dateIso).getTime() - 86400000));
    const yesterdayRun = ctx.last7d.find(r => r.date === yesterdayIso);
    if (yesterdayRun && (yesterdayRun.workout_type === 'interval' || yesterdayRun.workout_type === 'tempo')) {
      warnings.push(`Včeraj je bil ${yesterdayRun.workout_type} — long po hard sesiji je tvegan.`);
    }
  }

  if (ctx.isTaperWeek && workout.type === 'long' && workout.estimated_total_km > 18) {
    warnings.push(`Taper teden: ${workout.estimated_total_km} km long je veliko za race week.`);
  }

  if (ctx.nextRaceDate) {
    const daysToRace = daysBetween(dateIso, ctx.nextRaceDate);
    if (daysToRace <= 5 && isHard) {
      warnings.push(`${daysToRace} dni do race — hard sesija lahko ukine peak.`);
    }
  }

  return warnings;
}

// ============================================================
// Main entry
// ============================================================

export async function suggestRunningWorkout(input: RunningSuggesterInput): Promise<ResolvedWorkout | null> {
  const ctx = await gatherRunningContext(input.date);
  const categoryAutoDecided = !input.category;
  const category = input.category ?? decideCategory(ctx, input.date);

  const tpl = await selectTemplate(ctx, category, input);
  if (!tpl) return null;

  const workout = resolveTemplateToWorkout(tpl, ctx, input);
  workout.rationale = composeRationale(workout, tpl, ctx, input, categoryAutoDecided);
  workout.warnings = applyGuards(workout, ctx, input.date);

  return workout;
}

// ============================================================
// Save
// ============================================================

export async function saveRunningSuggestion(
  input: RunningSuggesterInput,
  workout: ResolvedWorkout,
  notes?: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('workout_suggestions')
    .insert({
      suggester_type: 'running',
      input_params: input as unknown as Record<string, unknown>,
      output_workout: workout as unknown as Record<string, unknown>,
      rationale: workout.rationale + (workout.warnings.length ? `\n⚠️ ${workout.warnings.join(' ')}` : ''),
      status: 'pending',
      template_id: workout.template_id,
      feedback_notes: notes ?? null,
    })
    .select('id')
    .single();
  if (error) return { id: null, error: error.message };
  return { id: (data as { id: string }).id, error: null };
}

export { paceLabelFromRef };
