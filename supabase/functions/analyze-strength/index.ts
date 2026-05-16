// Supabase Edge Function: AI analysis of a strength session.
// Reads the strength_session row + recent context, builds Slovenian prompt, calls Claude.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};

interface StrengthExerciseEntry {
  exercise_id?: string;
  name_sl?: string;
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rir?: number;
  actual_reps?: number[];
  actual_weight_kg?: number;
  notes?: string;
}

interface StrengthSession {
  id: string;
  date: string;
  difficulty: number;
  duration_min?: number;
  phase?: string;
  session_type?: string;
  exercises?: StrengthExerciseEntry[];
  suggested_by_id?: string;
  notes?: string;
}

interface Exercise {
  id: string;
  name_sl?: string;
  name_en: string;
  category: string;
  movement_patterns: string[];
  primary_muscles: string[];
  secondary_muscles?: string[];
  tendons?: string[];
  is_big_three: boolean;
  intrinsic_difficulty: number;
}

interface PhaseConfig {
  phase_code: string;
  emphasis_notes?: string;
  weekly_volume_target_km?: number;
  strength_frequency?: number;
}

interface AthleteProfile {
  race_name?: string;
  race_date?: string;
  target_time?: string;
  target_pace?: string;
  max_hr?: number;
  weekly_volume?: string;
  weaknesses?: string;
  strengths?: string;
  context?: string;
  training_philosophy?: string;
}

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function sbGet<T>(path: string): Promise<T | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const resp = await fetch(`${SB_URL}/rest/v1/${path}`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
      },
    });
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows as T;
  } catch {
    return null;
  }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPrompt(args: {
  session: StrengthSession;
  exerciseMap: Map<string, Exercise>;
  recentSessions: StrengthSession[];
  recentRuns: { date: string; workout_type: string; distance_km: number; hr_drift_bpm?: number }[];
  phase: PhaseConfig | null;
  athlete: AthleteProfile | null;
  coverageBefore: { muscles: Record<string, number>; tendons: Record<string, number>; patterns: Record<string, number> };
  big3Status: { bss: boolean; sl_rdl: boolean; calf_soleus: boolean };
}): string {
  const { session, exerciseMap, recentSessions, recentRuns, phase, athlete, coverageBefore, big3Status } = args;

  const exsLines = (session.exercises ?? []).map((e, i) => {
    const ex = e.exercise_id ? exerciseMap.get(e.exercise_id) : undefined;
    const parts: string[] = [
      `${i + 1}. ${e.name_sl ?? ex?.name_sl ?? ex?.name_en ?? '?'}`,
      `${e.sets} × ${e.reps ?? (e.duration_seconds ? e.duration_seconds + 's' : '?')}`,
    ];
    if (e.weight_kg !== undefined) parts.push(`@ ${e.weight_kg} kg`);
    if (e.rir !== undefined) parts.push(`RIR ${e.rir}`);
    if (ex) {
      const meta: string[] = [];
      meta.push(`category: ${ex.category}`);
      if (ex.is_big_three) meta.push('BIG3');
      meta.push(`diff ${ex.intrinsic_difficulty}/5`);
      meta.push(`muscles: ${ex.primary_muscles.join(', ')}`);
      if (ex.tendons && ex.tendons.length) meta.push(`tendons: ${ex.tendons.join(', ')}`);
      parts.push(`[${meta.join(' · ')}]`);
    }
    if (e.notes) parts.push(`note: ${e.notes}`);
    return '  ' + parts.join(' · ');
  }).join('\n');

  const recentSessionsSummary = recentSessions
    .filter(s => s.id !== session.id)
    .slice(0, 5)
    .map(s => `  ${s.date} · diff ${s.difficulty} · ${s.exercises?.length ?? 0} vaj · ${s.session_type ?? ''}`)
    .join('\n');

  const recentRunsSummary = recentRuns.slice(0, 7)
    .map(r => `  ${r.date} · ${r.workout_type} · ${r.distance_km} km${r.hr_drift_bpm != null ? ` · drift ${r.hr_drift_bpm} bpm` : ''}`)
    .join('\n');

  const coverageGaps: string[] = [];
  const expectedMuscles = ['quads', 'glute_max', 'glute_med', 'hamstrings_prox', 'soleus', 'gastrocnemius', 'core_anterior', 'core_lateral'];
  for (const m of expectedMuscles) {
    if ((coverageBefore.muscles[m] ?? 0) < 1) coverageGaps.push(m);
  }

  const big3Lines = [
    `  BSS (Bolgarski počep): ${big3Status.bss ? '✓' : '✗'}`,
    `  SL RDL (Single-leg RDL): ${big3Status.sl_rdl ? '✓' : '✗'}`,
    `  Calf soleus: ${big3Status.calf_soleus ? '✓' : '✗'}`,
  ].join('\n');

  return `Si tekaški strength coach. Analiziraj to strength sesijo v slovenščini. Bodi konkreten in praktičen — output 150-250 besed.

══ ATLET ══
${athlete?.race_name ? `Ciljna tekma: ${athlete.race_name} (${athlete.race_date})` : 'Glavni cilj: Palmanova HM sub-1:30 (29.11.2026)'}
${athlete?.target_pace ? `Target pace: ${athlete.target_pace}` : ''}
${athlete?.training_philosophy ?? 'Polarized: 80% easy ≤145 bpm, 20% hard'}
${athlete?.weaknesses ? `Šibke točke: ${athlete.weaknesses}` : ''}
${athlete?.strengths ? `Močne točke: ${athlete.strengths}` : ''}
Strength prioriteta: phenomenal baza za sub-3h maraton napad 2028+

══ TRENUTNA FAZA ══
${phase ? `${phase.phase_code}${phase.emphasis_notes ? ` — ${phase.emphasis_notes}` : ''}` : 'unknown'}
${phase?.strength_frequency ? `Tedenska strength frekvenca: ${phase.strength_frequency}×` : ''}

══ TA STRENGTH SESIJA (${session.date}) ══
Difficulty: ${session.difficulty}/5 · ${session.session_type ?? '?'}${session.duration_min ? ` · ${session.duration_min} min` : ''}
${session.suggested_by_id ? '🎯 Generirana iz dynamic suggesterja' : '📋 Manualno vnešena'}
Vaje:
${exsLines}
${session.notes ? `Opombe atleta: ${session.notes}` : ''}

══ BIG3 STATUS TA TEDEN ══
${big3Lines}

══ POKRITOST PRED SESIJO (zadnjih 7 dni) ══
${coverageGaps.length > 0 ? `Šibke točke: ${coverageGaps.join(', ')}` : 'Pokritost solidna.'}
Tetive: achilles ${coverageBefore.tendons.achilles ?? 0}×, patellar ${coverageBefore.tendons.patellar ?? 0}×, hamstring_origin ${coverageBefore.tendons.hamstring_origin ?? 0}×

══ ZADNJE STRENGTH SESIJE ══
${recentSessionsSummary || '  (brez)'}

══ ZADNJI TEKI (zadnjih 7 dni) ══
${recentRunsSummary || '  (brez)'}

══ NAVODILA ANALIZE ══
Struktura outputa:
1. **Ocena izbire** (2-3 stavki): so vaje smiselne za fazo + atletove cilje? Manjkajo BIG3? Pokritost?
2. **Load/Intent**: RIR signali (če RIR ≥3 dvakrat → naslednjič bump up), volumen primeren glede na trenutni hard/easy ratio
3. **Interakcija s teki**: glede na recent runs in HR drift, ali strength dobro umeščen, ali tvega over-load?
4. **Konkretno priporočilo za naslednjo sesijo** (1-2 stavki, kateri pattern/muscle/tetiva manjka, kaj dodaj/zamenjaj)

Bodi konkreten. Uporabi imena vaj iz library-ja. Brez splošnih fraz tipa "dobra sesija". Output v Slovenščini.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Fetch session
    const sessions = await sbGet<StrengthSession[]>(`strength_sessions?id=eq.${session_id}&select=*`);
    const session = sessions?.[0];
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders });
    }

    // 2. Resolve exercise metadata
    const exerciseIds = (session.exercises ?? [])
      .map(e => e.exercise_id)
      .filter((id): id is string => !!id);
    let exerciseMap = new Map<string, Exercise>();
    if (exerciseIds.length > 0) {
      const inList = exerciseIds.map(id => `"${id}"`).join(',');
      const exs = await sbGet<Exercise[]>(`exercises?id=in.(${inList})&select=*`);
      (exs ?? []).forEach(ex => exerciseMap.set(ex.id, ex));
    }

    // 3. Fetch recent strength sessions (last 14 days)
    const today = new Date();
    const fourteenAgo = new Date(today); fourteenAgo.setDate(today.getDate() - 14);
    const recentSessions = await sbGet<StrengthSession[]>(
      `strength_sessions?date=gte.${isoDate(fourteenAgo)}&date=lte.${isoDate(today)}&order=date.desc&select=*`,
    ) ?? [];

    // 4. Fetch recent runs (last 7 days)
    const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);
    const recentRuns = await sbGet<{ date: string; workout_type: string; distance_km: number; hr_drift_bpm?: number }[]>(
      `runs?date=gte.${isoDate(sevenAgo)}&date=lte.${isoDate(today)}&select=date,workout_type,distance_km,hr_drift_bpm&order=date.desc`,
    ) ?? [];

    // 5. Resolve phase
    const phases = await sbGet<PhaseConfig[]>(
      `phase_config?start_date=lte.${session.date}&end_date=gte.${session.date}&select=*&limit=1`,
    );
    const phase = phases?.[0] ?? null;

    // 6. Athlete profile
    const profileRows = await sbGet<AthleteProfile[]>(`athlete_profile?id=eq.default&select=*`);
    const athlete = profileRows?.[0] ?? null;

    // 7. Compute coverage BEFORE this session (calendar week start → day before session)
    const sessionDate = new Date(session.date);
    const wkStart = new Date(sessionDate);
    const dow = wkStart.getDay() === 0 ? 6 : wkStart.getDay() - 1;
    wkStart.setDate(wkStart.getDate() - dow);
    const beforeSessions = recentSessions.filter(s =>
      s.id !== session.id && s.date >= isoDate(wkStart) && s.date < session.date,
    );
    const coverageBefore = { muscles: {} as Record<string, number>, tendons: {} as Record<string, number>, patterns: {} as Record<string, number> };
    const big3Status = { bss: false, sl_rdl: false, calf_soleus: false };
    for (const s of beforeSessions) {
      for (const e of s.exercises ?? []) {
        if (!e.exercise_id) continue;
        const ex = exerciseMap.get(e.exercise_id) ?? null;
        if (!ex) continue;
        for (const m of ex.primary_muscles) coverageBefore.muscles[m] = (coverageBefore.muscles[m] ?? 0) + 1;
        for (const m of ex.secondary_muscles ?? []) coverageBefore.muscles[m] = (coverageBefore.muscles[m] ?? 0) + 0.5;
        for (const t of ex.tendons ?? []) coverageBefore.tendons[t] = (coverageBefore.tendons[t] ?? 0) + 1;
        for (const p of ex.movement_patterns) coverageBefore.patterns[p] = (coverageBefore.patterns[p] ?? 0) + 1;
        if (ex.is_big_three) {
          if (ex.name_en.startsWith('Bulgarian')) big3Status.bss = true;
          else if (ex.name_en.startsWith('Single-leg RDL')) big3Status.sl_rdl = true;
          else if (ex.name_en.toLowerCase().includes('calf') && ex.name_en.toLowerCase().includes('soleus')) big3Status.calf_soleus = true;
        }
      }
    }
    // Also mark BIG3 from the current session itself for the status block
    for (const e of session.exercises ?? []) {
      if (!e.exercise_id) continue;
      const ex = exerciseMap.get(e.exercise_id);
      if (!ex?.is_big_three) continue;
      if (ex.name_en.startsWith('Bulgarian')) big3Status.bss = true;
      else if (ex.name_en.startsWith('Single-leg RDL')) big3Status.sl_rdl = true;
      else if (ex.name_en.toLowerCase().includes('calf') && ex.name_en.toLowerCase().includes('soleus')) big3Status.calf_soleus = true;
    }

    // 8. Build prompt
    const prompt = buildPrompt({
      session, exerciseMap, recentSessions, recentRuns, phase, athlete,
      coverageBefore, big3Status,
    });

    // 9. Call Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY ni nastavljen.' }), { status: 500, headers: corsHeaders });
    }
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      return new Response(JSON.stringify({ error: `Claude API error ${claudeResp.status}: ${errText}` }), { status: 502, headers: corsHeaders });
    }
    const claudeData = await claudeResp.json();
    const text = claudeData.content?.[0]?.text || 'Analiza ni na voljo.';

    return new Response(JSON.stringify({ text, phase: phase?.phase_code }), { headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('analyze-strength error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
