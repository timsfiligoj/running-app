import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Run, StrengthSession, WorkoutType } from '../types';

interface TrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WeekBucket {
  weekStart: string;       // ISO Mon
  label: string;           // "6.–12. apr"
  totalKm: number;
  hardCount: number;
  longCount: number;
  strengthCount: number;
  avgHrDrift: number | null;
  avgEasyPace: number | null;
  avgThresholdPace: number | null;
  bigThreeHits: number;    // count of BIG3 ex usages in week
}

const HARD_TYPES: WorkoutType[] = ['tempo', 'interval', 'hill', 'race'];
const MONTHS_SLO = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay() === 0 ? 6 : x.getDay() - 1;
  x.setDate(x.getDate() - dow);
  return x;
}

function shortLabel(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}.–${end.getDate()}. ${MONTHS_SLO[end.getMonth()]}`;
  return `${start.getDate()}. ${MONTHS_SLO[start.getMonth()]}—${end.getDate()}. ${MONTHS_SLO[end.getMonth()]}`;
}

function paceLabel(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  target?: number;
  yLabel?: string;
  formatValue?: (v: number) => string;
}

function BarChart({ data, target, yLabel, formatValue }: BarChartProps) {
  if (data.length === 0) return <div className="text-xs text-gray-400 text-center py-4">brez podatkov</div>;
  const max = Math.max(target ?? 0, ...data.map(d => d.value), 1);
  const fmt = formatValue ?? ((v: number) => String(Math.round(v * 10) / 10));
  const barW = 100 / data.length;
  return (
    <div className="space-y-1">
      <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">
        {target != null && (
          <line
            x1={0} x2={100}
            y1={40 - (target / max) * 38}
            y2={40 - (target / max) * 38}
            stroke="#94a3b8" strokeWidth={0.3} strokeDasharray="1,1"
          />
        )}
        {data.map((d, i) => {
          const h = (d.value / max) * 38;
          return (
            <rect
              key={i}
              x={i * barW + barW * 0.1}
              y={40 - h}
              width={barW * 0.8}
              height={h}
              fill={d.color ?? '#3b82f6'}
              rx={0.3}
            >
              <title>{`${d.label}: ${fmt(d.value)}${yLabel ? ` ${yLabel}` : ''}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 px-0.5">
        {data.map((d, i) => (
          <span key={i} className="truncate" style={{ width: `${barW}%` }}>{d.label.split('—')[0]}</span>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number | null }[];
  yLabel?: string;
  formatValue?: (v: number) => string;
  invertY?: boolean;
  color?: string;
}

function LineChart({ data, yLabel, formatValue, invertY, color = '#ef4444' }: LineChartProps) {
  const numeric = data.map(d => d.value).filter((v): v is number => v != null);
  if (numeric.length === 0) return <div className="text-xs text-gray-400 text-center py-4">brez podatkov</div>;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = Math.max(max - min, 1);
  const fmt = formatValue ?? ((v: number) => String(Math.round(v * 10) / 10));
  const barW = 100 / data.length;
  const points = data.map((d, i) => {
    if (d.value == null) return null;
    const xCenter = i * barW + barW / 2;
    const norm = (d.value - min) / range;
    const y = invertY ? 4 + norm * 32 : 36 - norm * 32;
    return { x: xCenter, y, value: d.value, label: d.label };
  }).filter((p): p is { x: number; y: number; value: number; label: string } => p !== null);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="space-y-1">
      <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth={0.6} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.8} fill={color}>
            <title>{`${p.label}: ${fmt(p.value)}${yLabel ? ` ${yLabel}` : ''}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 px-0.5">
        {data.map((d, i) => (
          <span key={i} className="truncate" style={{ width: `${barW}%` }}>{d.label.split('—')[0]}</span>
        ))}
      </div>
    </div>
  );
}

export function TrendsModal({ isOpen, onClose }: TrendsModalProps) {
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWeeks, setWindowWeeks] = useState(12);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, windowWeeks]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    const today = new Date();
    const start = startOfWeek(today);
    start.setDate(start.getDate() - 7 * (windowWeeks - 1));
    const startIso = isoDate(start);

    const [{ data: runsRaw }, { data: strRaw }, { data: big3Raw }] = await Promise.all([
      supabase.from('runs').select('date, distance_km, avg_pace_seconds, hr_drift_bpm, workout_type, workout_subtype').gte('date', startIso),
      supabase.from('strength_sessions').select('date, exercises').gte('date', startIso),
      supabase.from('exercises').select('id, name_en').eq('is_big_three', true),
    ]);
    const runs = (runsRaw as Pick<Run, 'date' | 'distance_km' | 'avg_pace_seconds' | 'hr_drift_bpm' | 'workout_type' | 'workout_subtype'>[] | null) ?? [];
    const strengths = (strRaw as Pick<StrengthSession, 'date' | 'exercises'>[] | null) ?? [];
    const big3Ids = new Set(((big3Raw as { id: string }[] | null) ?? []).map(r => r.id));

    // Bucket weeks
    const buckets: WeekBucket[] = [];
    for (let i = 0; i < windowWeeks; i++) {
      const wkStart = new Date(start);
      wkStart.setDate(start.getDate() + i * 7);
      const wkEnd = new Date(wkStart);
      wkEnd.setDate(wkStart.getDate() + 6);
      const startStr = isoDate(wkStart);
      const endStr = isoDate(wkEnd);

      const wkRuns = runs.filter(r => r.date >= startStr && r.date <= endStr);
      const wkStr = strengths.filter(s => s.date >= startStr && s.date <= endStr);

      const totalKm = wkRuns.reduce((s, r) => s + (Number(r.distance_km) || 0), 0);
      const hardCount = wkRuns.filter(r => HARD_TYPES.includes(r.workout_type as WorkoutType)).length;
      const longCount = wkRuns.filter(r => r.workout_type === 'long').length;
      const drifts = wkRuns.map(r => r.hr_drift_bpm).filter((v): v is number => typeof v === 'number');
      const avgHrDrift = drifts.length ? drifts.reduce((a, b) => a + b, 0) / drifts.length : null;
      const easyPaces = wkRuns.filter(r => r.workout_type === 'easy').map(r => r.avg_pace_seconds).filter((v): v is number => typeof v === 'number');
      const avgEasyPace = easyPaces.length ? easyPaces.reduce((a, b) => a + b, 0) / easyPaces.length : null;
      const thresPaces = wkRuns.filter(r => ['tempo', 'interval'].includes(r.workout_type)).map(r => r.avg_pace_seconds).filter((v): v is number => typeof v === 'number');
      const avgThresholdPace = thresPaces.length ? thresPaces.reduce((a, b) => a + b, 0) / thresPaces.length : null;
      let bigThreeHits = 0;
      for (const s of wkStr) {
        const exs = Array.isArray(s.exercises) ? s.exercises : [];
        for (const e of exs as { exercise_id?: string }[]) {
          if (e.exercise_id && big3Ids.has(e.exercise_id)) bigThreeHits += 1;
        }
      }
      buckets.push({
        weekStart: startStr,
        label: shortLabel(wkStart, wkEnd),
        totalKm: Math.round(totalKm * 10) / 10,
        hardCount, longCount,
        strengthCount: wkStr.length,
        avgHrDrift,
        avgEasyPace,
        avgThresholdPace,
        bigThreeHits,
      });
    }
    setWeeks(buckets);
    setLoading(false);
  };

  const last = weeks[weeks.length - 1];
  const totals = useMemo(() => ({
    totalKm: weeks.reduce((s, w) => s + w.totalKm, 0),
    totalHard: weeks.reduce((s, w) => s + w.hardCount, 0),
    totalLong: weeks.reduce((s, w) => s + w.longCount, 0),
    totalStr: weeks.reduce((s, w) => s + w.strengthCount, 0),
  }), [weeks]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Trendi</h2>
              <p className="text-xs text-gray-500">Volume, hard sessions, HR drift, pace skozi tedne</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Okno:</label>
            <select
              value={windowWeeks}
              onChange={(e) => setWindowWeeks(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={4}>4 tedne</option>
              <option value={8}>8 tednov</option>
              <option value={12}>12 tednov</option>
              <option value={24}>24 tednov</option>
            </select>
            <div className="ml-auto text-xs text-gray-500">
              Skupno: <span className="font-bold text-gray-700">{Math.round(totals.totalKm)} km</span>
              {' · '}<span>{totals.totalHard} hard</span>
              {' · '}<span>{totals.totalLong} long</span>
              {' · '}<span>{totals.totalStr} strength</span>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 text-center py-8">Nalagam…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Volume (km/teden)</span>
                  <span className="text-xs text-gray-500 font-mono">{last?.totalKm ?? 0} km zadnji</span>
                </div>
                <BarChart
                  data={weeks.map(w => ({ label: w.label, value: w.totalKm, color: '#3b82f6' }))}
                  yLabel="km"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Hard sesije/teden</span>
                  <span className="text-xs text-gray-500 font-mono">{last?.hardCount ?? 0} zadnji</span>
                </div>
                <BarChart
                  data={weeks.map(w => ({ label: w.label, value: w.hardCount, color: '#f97316' }))}
                  target={2}
                  yLabel="hard"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">HR drift (bpm avg)</span>
                  <span className="text-xs text-gray-500 font-mono">{last?.avgHrDrift != null ? Math.round(last.avgHrDrift) : '—'} bpm zadnji</span>
                </div>
                <LineChart
                  data={weeks.map(w => ({ label: w.label, value: w.avgHrDrift }))}
                  yLabel="bpm"
                  formatValue={(v) => `${Math.round(v)}`}
                  color="#ef4444"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Easy pace (min/km)</span>
                  <span className="text-xs text-gray-500 font-mono">{paceLabel(last?.avgEasyPace ?? null)} zadnji</span>
                </div>
                <LineChart
                  data={weeks.map(w => ({ label: w.label, value: w.avgEasyPace }))}
                  yLabel="/km"
                  formatValue={(v) => paceLabel(v)}
                  color="#10b981"
                  invertY
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Tempo/interval pace</span>
                  <span className="text-xs text-gray-500 font-mono">{paceLabel(last?.avgThresholdPace ?? null)} zadnji</span>
                </div>
                <LineChart
                  data={weeks.map(w => ({ label: w.label, value: w.avgThresholdPace }))}
                  yLabel="/km"
                  formatValue={(v) => paceLabel(v)}
                  color="#a855f7"
                  invertY
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">BIG3 hits/teden</span>
                  <span className="text-xs text-gray-500 font-mono">{last?.bigThreeHits ?? 0} zadnji</span>
                </div>
                <BarChart
                  data={weeks.map(w => ({ label: w.label, value: w.bigThreeHits, color: '#f59e0b' }))}
                  target={3}
                  yLabel="hits"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
