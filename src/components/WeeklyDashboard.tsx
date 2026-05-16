import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Run, StrengthSession, PhaseConfig, WorkoutType } from '../types';

interface BigThreeStatus {
  bss: boolean;            // Bulgarian split squat
  sl_rdl: boolean;         // Single-leg RDL
  calf_soleus: boolean;    // Calf raise soleus
}

interface WeekStats {
  totalKm: number;
  hardCount: number;
  longDone: boolean;
  strengthCount: number;
  avgHrDrift: number | null;
  bigThree: BigThreeStatus;
}

const HARD_TYPES: WorkoutType[] = ['tempo', 'interval', 'hill', 'race'];
const HARD_TARGET = 2; // sessions per week (HANDOFF: vsaj 2 hard/teden)

// Get Mon-Sun range containing `today`.
function currentWeekRange(today = new Date()): { start: Date; end: Date; startIso: string; endIso: string } {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(d);
  start.setDate(d.getDate() - daysFromMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { start, end, startIso: iso(start), endIso: iso(end) };
}

function formatWeekRangeLabel(start: Date, end: Date): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}.–${end.getDate()}. ${months[end.getMonth()]}`;
  }
  return `${start.getDate()}. ${months[start.getMonth()]} – ${end.getDate()}. ${months[end.getMonth()]}`;
}

interface MatchKey {
  bss?: string;
  sl_rdl?: string;
  calf_soleus?: string;
}

export function WeeklyDashboard() {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [phase, setPhase] = useState<PhaseConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const { start, end, startIso, endIso } = currentWeekRange();

  useEffect(() => {
    loadWeekData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: refresh when runs or strength_sessions change.
  useEffect(() => {
    const runsCh = supabase
      .channel('weekly_dashboard_runs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, () => loadWeekData())
      .subscribe();
    const strCh = supabase
      .channel('weekly_dashboard_strength')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'strength_sessions' }, () => loadWeekData())
      .subscribe();
    return () => {
      supabase.removeChannel(runsCh);
      supabase.removeChannel(strCh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWeekData = async () => {
    setLoading(true);

    // 1. Current phase
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: phaseRows } = await supabase
      .from('phase_config')
      .select('*')
      .lte('start_date', todayIso)
      .gte('end_date', todayIso)
      .limit(1);
    const currentPhase = (phaseRows?.[0] as PhaseConfig | undefined) ?? null;
    setPhase(currentPhase);

    // 2. BIG3 exercise IDs (3 rows)
    const { data: big3Exs } = await supabase
      .from('exercises')
      .select('id, name_en')
      .eq('is_big_three', true);
    const big3Map: MatchKey = {};
    (big3Exs as { id: string; name_en: string }[] | null)?.forEach(ex => {
      if (ex.name_en.startsWith('Bulgarian')) big3Map.bss = ex.id;
      else if (ex.name_en.startsWith('Single-leg RDL')) big3Map.sl_rdl = ex.id;
      else if (ex.name_en.toLowerCase().includes('calf') && ex.name_en.toLowerCase().includes('soleus')) big3Map.calf_soleus = ex.id;
    });

    // 3. Runs this week
    const { data: runs } = await supabase
      .from('runs')
      .select('distance_km, workout_type, hr_drift_bpm, date')
      .gte('date', startIso)
      .lte('date', endIso);
    const weekRuns = (runs as Pick<Run, 'distance_km' | 'workout_type' | 'hr_drift_bpm' | 'date'>[]) ?? [];

    // 4. Strength sessions this week
    const { data: strengths } = await supabase
      .from('strength_sessions')
      .select('date, exercises')
      .gte('date', startIso)
      .lte('date', endIso);
    const weekStrengths = (strengths as Pick<StrengthSession, 'date' | 'exercises'>[]) ?? [];

    // Compute stats
    const totalKm = weekRuns.reduce((s, r) => s + (Number(r.distance_km) || 0), 0);
    const hardCount = weekRuns.filter(r => HARD_TYPES.includes(r.workout_type as WorkoutType)).length;
    const longDone = weekRuns.some(r => r.workout_type === 'long');
    const driftValues = weekRuns.map(r => r.hr_drift_bpm).filter((d): d is number => typeof d === 'number');
    const avgHrDrift = driftValues.length
      ? Math.round(driftValues.reduce((a, b) => a + b, 0) / driftValues.length)
      : null;

    const bigThree: BigThreeStatus = { bss: false, sl_rdl: false, calf_soleus: false };
    for (const s of weekStrengths) {
      const exs = Array.isArray(s.exercises) ? s.exercises : [];
      for (const e of exs) {
        const exId = (e as { exercise_id?: string }).exercise_id;
        if (!exId) continue;
        if (exId === big3Map.bss) bigThree.bss = true;
        if (exId === big3Map.sl_rdl) bigThree.sl_rdl = true;
        if (exId === big3Map.calf_soleus) bigThree.calf_soleus = true;
      }
    }

    setStats({
      totalKm: Math.round(totalKm * 10) / 10,
      hardCount,
      longDone,
      strengthCount: weekStrengths.length,
      avgHrDrift,
      bigThree,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4 mb-4 text-sm text-gray-500">
        Nalagam tedenski pregled...
      </div>
    );
  }

  if (!stats) return null;

  const volumeTarget = phase?.weekly_volume_target_km ?? 0;
  const volumePct = volumeTarget ? Math.min(100, (stats.totalKm / volumeTarget) * 100) : 0;
  const volumeColor = volumePct >= 80 ? 'bg-green-500'
    : volumePct >= 60 ? 'bg-amber-400'
    : 'bg-red-400';
  const strengthTarget = phase?.strength_frequency ?? 0;

  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-5 mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">Ta teden</h2>
          <span className="text-xs text-gray-500">{formatWeekRangeLabel(start, end)}</span>
        </div>
        {phase && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded font-mono font-bold">
              {phase.phase_code}
            </span>
            {phase.key_race && (
              <span className="text-purple-600 truncate max-w-[200px]" title={phase.key_race}>
                🏁 {phase.key_race}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Volume bar */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-gray-600">Volume</span>
          <span className="text-xs font-mono">
            <span className="font-bold text-gray-800">{stats.totalKm}</span>
            {volumeTarget > 0 && <span className="text-gray-400"> / {volumeTarget} km</span>}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${volumeColor} transition-all duration-300`}
            style={{ width: `${volumePct}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Hard sesije</div>
          <div className="flex items-baseline gap-1">
            <span className={`font-bold ${stats.hardCount >= HARD_TARGET ? 'text-green-600' : 'text-gray-800'}`}>
              {stats.hardCount}
            </span>
            <span className="text-xs text-gray-400">/ {HARD_TARGET}</span>
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Long run</div>
          <div className={`font-bold ${stats.longDone ? 'text-green-600' : 'text-gray-400'}`}>
            {stats.longDone ? '✓ opravljen' : '✗ čaka'}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Strength</div>
          <div className="flex items-baseline gap-1">
            <span className={`font-bold ${strengthTarget && stats.strengthCount >= strengthTarget ? 'text-green-600' : 'text-gray-800'}`}>
              {stats.strengthCount}
            </span>
            {strengthTarget > 0 && <span className="text-xs text-gray-400">/ {strengthTarget}</span>}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">HR drift (avg)</div>
          <div className={`font-bold ${stats.avgHrDrift !== null && stats.avgHrDrift > 10 ? 'text-amber-600' : 'text-gray-800'}`}>
            {stats.avgHrDrift !== null ? `${stats.avgHrDrift} bpm` : '—'}
          </div>
        </div>
      </div>

      {/* BIG3 row */}
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs text-gray-500 mb-2">⭐ BIG3 ta teden</div>
        <div className="grid grid-cols-3 gap-2">
          <BigThreeBadge label="Bolgarski počep" done={stats.bigThree.bss} />
          <BigThreeBadge label="Single-leg RDL" done={stats.bigThree.sl_rdl} />
          <BigThreeBadge label="Calf soleus" done={stats.bigThree.calf_soleus} />
        </div>
      </div>
    </div>
  );
}

interface BigThreeBadgeProps {
  label: string;
  done: boolean;
}

function BigThreeBadge({ label, done }: BigThreeBadgeProps) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
      done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
      }`}>
        {done ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className={`text-xs font-medium truncate ${done ? 'text-green-700' : 'text-gray-500'}`} title={label}>
        {label}
      </span>
    </div>
  );
}
