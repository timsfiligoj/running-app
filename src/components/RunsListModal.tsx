import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { rowsToCsv, downloadCsv } from '../lib/csvExport';
import type { Run, RunSplit, RunLap, WorkoutType, WorkoutSubtype } from '../types';

interface RunsListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WORKOUT_TYPES: WorkoutType[] = ['easy', 'tempo', 'interval', 'long', 'race', 'recovery', 'hill'];

const SUBTYPES_BY_TYPE: Record<WorkoutType, WorkoutSubtype[]> = {
  easy: ['recovery_easy', 'general_aerobic'],
  tempo: ['continuous_tempo', 'cruise_intervals', 'progression', 'hm_pace'],
  interval: ['vo2max', 'threshold_reps', 'speed', 'hill_repeats', 'fartlek'],
  long: ['easy_long', 'progressive_long', 'hm_pace_embedded', 'marathon_pace_embedded'],
  race: ['5k', '10k', 'hm', 'marathon', 'other'],
  recovery: ['recovery_easy'],
  hill: ['hill_repeats_short', 'hill_repeats_long', 'hill_sprints'],
};

const TYPE_COLORS: Record<WorkoutType, string> = {
  easy: 'bg-green-100 text-green-800',
  tempo: 'bg-orange-100 text-orange-800',
  interval: 'bg-red-100 text-red-800',
  long: 'bg-blue-100 text-blue-800',
  race: 'bg-purple-100 text-purple-800',
  recovery: 'bg-gray-100 text-gray-700',
  hill: 'bg-amber-100 text-amber-800',
};

function paceLabel(seconds: number | undefined | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function durationLabel(seconds: number | undefined | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  return `${d}. ${months[m - 1]} ${y}`;
}

interface SplitsChartProps {
  splits: RunSplit[];
}

function SplitsChart({ splits }: SplitsChartProps) {
  const validPaces = splits.map(s => s.pace_seconds).filter((p): p is number => typeof p === 'number');
  const validHr = splits.map(s => s.hr).filter((h): h is number => typeof h === 'number');
  if (validPaces.length === 0) return null;

  const minPace = Math.min(...validPaces);
  const maxPace = Math.max(...validPaces);
  const paceRange = Math.max(maxPace - minPace, 1);
  const maxHr = validHr.length ? Math.max(...validHr) : null;
  const minHr = validHr.length ? Math.min(...validHr) : null;
  const hrRange = maxHr !== null && minHr !== null ? Math.max(maxHr - minHr, 1) : 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Splits</span>
        <span>{paceLabel(minPace)} – {paceLabel(maxPace)}</span>
      </div>
      <div className="space-y-0.5">
        {splits.map(s => {
          const pacePct = s.pace_seconds
            ? ((maxPace - s.pace_seconds) / paceRange) * 100
            : 0;
          const hrPct = s.hr && maxHr !== null && minHr !== null
            ? ((s.hr - minHr) / hrRange) * 100
            : null;
          return (
            <div key={s.km} className="flex items-center gap-2 text-xs">
              <div className="w-6 text-right text-gray-500 font-mono">{s.km}</div>
              <div className="flex-1 relative h-4 bg-gray-100 rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-blue-400"
                  style={{ width: `${Math.max(8, pacePct)}%` }}
                />
                {hrPct !== null && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"
                    style={{ right: `${100 - hrPct}%` }}
                  />
                )}
              </div>
              <div className="w-16 text-right font-mono text-gray-700">{paceLabel(s.pace_seconds)}</div>
              <div className="w-10 text-right font-mono text-gray-500">{s.hr ?? '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LapsTableProps {
  laps: RunLap[];
}

function LapsTable({ laps }: LapsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 px-1 text-gray-500 font-medium">Lap</th>
            <th className="text-right py-1 px-1 text-gray-500 font-medium">Dist</th>
            <th className="text-right py-1 px-1 text-gray-500 font-medium">Čas</th>
            <th className="text-right py-1 px-1 text-gray-500 font-medium">Pace</th>
            <th className="text-right py-1 px-1 text-gray-500 font-medium">HR</th>
          </tr>
        </thead>
        <tbody>
          {laps.map(l => (
            <tr key={l.lap} className="border-b border-gray-50">
              <td className="py-1 px-1 font-mono text-gray-600">{l.lap}</td>
              <td className="py-1 px-1 text-right font-mono">{(l.distance_m / 1000).toFixed(2)} km</td>
              <td className="py-1 px-1 text-right font-mono">{durationLabel(l.duration_seconds)}</td>
              <td className="py-1 px-1 text-right font-mono">{paceLabel(l.pace_seconds)}</td>
              <td className="py-1 px-1 text-right font-mono text-gray-500">{l.hr ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RunsListModal({ isOpen, onClose }: RunsListModalProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<WorkoutType | ''>('');
  const [filterPhase, setFilterPhase] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editType, setEditType] = useState<WorkoutType | ''>('');
  const [editSubtype, setEditSubtype] = useState<WorkoutSubtype | ''>('');
  const [editPhase, setEditPhase] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadRuns();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setSelected(null);
      setError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (selected) {
      setEditType(selected.workout_type);
      setEditSubtype((selected.workout_subtype ?? '') as WorkoutSubtype | '');
      setEditPhase(selected.phase ?? '');
      setEditNotes(selected.notes ?? '');
    }
  }, [selected]);

  const loadRuns = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('runs')
      .select('*')
      .order('date', { ascending: false });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setRuns((data as Run[]) ?? []);
  };

  const filtered = useMemo(() => {
    return runs.filter(r => {
      if (filterType && r.workout_type !== filterType) return false;
      if (filterPhase && r.phase !== filterPhase) return false;
      return true;
    });
  }, [runs, filterType, filterPhase]);

  const uniquePhases = useMemo(() => {
    return Array.from(new Set(runs.map(r => r.phase).filter((p): p is string => !!p))).sort();
  }, [runs]);

  const isDirty = selected ? (
    editType !== selected.workout_type ||
    editSubtype !== (selected.workout_subtype ?? '') ||
    editPhase !== (selected.phase ?? '') ||
    editNotes !== (selected.notes ?? '')
  ) : false;

  const handleSave = async () => {
    if (!selected || !isDirty) return;
    setSaving(true);
    setError(null);
    const overridden = (
      editType !== selected.workout_type ||
      editSubtype !== (selected.workout_subtype ?? '') ||
      editPhase !== (selected.phase ?? '')
    );
    const { error: e } = await supabase
      .from('runs')
      .update({
        workout_type: editType,
        workout_subtype: editSubtype || null,
        phase: editPhase || null,
        notes: editNotes || null,
        classification_overridden: overridden || selected.classification_overridden,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    await loadRuns();
    // Re-select the updated row
    const refreshed = (await supabase.from('runs').select('*').eq('id', selected.id).single()).data as Run | null;
    if (refreshed) setSelected(refreshed);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Briši tek ${dateLabel(selected.date)} (${selected.distance_km} km)?`)) return;
    setSaving(true);
    const { error: e } = await supabase.from('runs').delete().eq('id', selected.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSelected(null);
    await loadRuns();
  };

  if (!isOpen) return null;

  const subtypeOptions = editType ? SUBTYPES_BY_TYPE[editType] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Teki</h2>
              <p className="text-xs text-gray-500">{runs.length} ingestiranih · {filtered.length} prikazanih</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* List pane */}
          <div className={`${selected ? 'hidden md:flex' : 'flex'} md:w-2/5 flex-col border-r border-gray-100`}>
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as WorkoutType | '')}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[120px]"
                >
                  <option value="">Vsi tipi</option>
                  {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[120px]"
                >
                  <option value="">Vse faze</option>
                  {uniquePhases.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  const rows = filtered.map(r => ({
                    date: r.date,
                    strava_id: r.strava_id,
                    distance_km: r.distance_km,
                    duration_seconds: r.duration_seconds,
                    avg_pace_seconds: r.avg_pace_seconds ?? '',
                    avg_hr: r.avg_hr ?? '',
                    max_hr: r.max_hr ?? '',
                    elevation_gain_m: r.elevation_gain_m ?? '',
                    hr_drift_bpm: r.hr_drift_bpm ?? '',
                    effort_score: r.effort_score ?? '',
                    workout_type: r.workout_type,
                    workout_subtype: r.workout_subtype ?? '',
                    phase: r.phase ?? '',
                    confidence: r.classification_confidence ?? '',
                    overridden: r.classification_overridden ? 'true' : 'false',
                    notes: r.notes ?? '',
                  }));
                  const csv = rowsToCsv(rows, [
                    'date', 'strava_id', 'distance_km', 'duration_seconds', 'avg_pace_seconds',
                    'avg_hr', 'max_hr', 'elevation_gain_m', 'hr_drift_bpm', 'effort_score',
                    'workout_type', 'workout_subtype', 'phase', 'confidence', 'overridden', 'notes',
                  ]);
                  downloadCsv(`runs_${new Date().toISOString().slice(0, 10)}.csv`, csv);
                }}
                disabled={filtered.length === 0}
                className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg disabled:opacity-50"
              >
                ⬇ Izvozi CSV ({filtered.length})
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500">Nalagam...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  {runs.length === 0 ? 'Še noben tek vnešen.' : 'Nič ne ustreza filtru.'}
                </div>
              ) : (
                filtered.map(run => (
                  <button
                    key={run.id}
                    onClick={() => setSelected(run)}
                    className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === run.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500 font-mono">{dateLabel(run.date)}</div>
                      {run.phase && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{run.phase}</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-gray-800">{run.distance_km} km</span>
                      <span className="text-xs text-gray-500">{paceLabel(run.avg_pace_seconds)}</span>
                      <span className="text-xs text-gray-500">{durationLabel(run.duration_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[run.workout_type]}`}>
                        {run.workout_type}{run.workout_subtype ? ` / ${run.workout_subtype}` : ''}
                      </span>
                      {run.classification_overridden && (
                        <span className="text-xs text-blue-600" title="Overridden">✎</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail pane */}
          {selected ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-800">{dateLabel(selected.date)}</h3>
                  <a
                    href={selected.strava_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline"
                  >
                    Strava ↗
                  </a>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden text-sm text-gray-500"
                >← nazaj</button>
              </div>

              {/* Metric grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Distanca</div>
                  <div className="font-bold text-gray-800">{selected.distance_km} km</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Čas</div>
                  <div className="font-bold text-gray-800">{durationLabel(selected.duration_seconds)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Pace</div>
                  <div className="font-bold text-gray-800">{paceLabel(selected.avg_pace_seconds)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Avg HR</div>
                  <div className="font-bold text-gray-800">{selected.avg_hr ?? '—'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Max HR</div>
                  <div className="font-bold text-gray-800">{selected.max_hr ?? '—'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">HR drift</div>
                  <div className={`font-bold ${(selected.hr_drift_bpm ?? 0) > 10 ? 'text-amber-600' : 'text-gray-800'}`}>
                    {selected.hr_drift_bpm != null ? `${selected.hr_drift_bpm} bpm` : '—'}
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Vzpon</div>
                  <div className="font-bold text-gray-800">{selected.elevation_gain_m ?? 0} m</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Effort</div>
                  <div className="font-bold text-gray-800">{selected.effort_score ?? '—'}/100</div>
                </div>
              </div>

              {selected.classification_confidence != null && (
                <div className="text-xs text-gray-500">
                  Confidence: <span className="font-mono">{(selected.classification_confidence * 100).toFixed(0)}%</span>
                  {selected.classification_overridden && <span className="ml-2 text-blue-600">· uporabnik popravil</span>}
                </div>
              )}

              {/* Classification editor */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Klasifikacija</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={editType}
                    onChange={(e) => {
                      const t = e.target.value as WorkoutType;
                      setEditType(t);
                      // Reset subtype if not valid for new type
                      if (t && !SUBTYPES_BY_TYPE[t].includes(editSubtype as WorkoutSubtype)) {
                        setEditSubtype('');
                      }
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    value={editSubtype}
                    onChange={(e) => setEditSubtype(e.target.value as WorkoutSubtype | '')}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">(brez subtipa)</option>
                    {subtypeOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <input
                    type="text"
                    value={editPhase}
                    onChange={(e) => setEditPhase(e.target.value)}
                    placeholder="Faza"
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Opombe</div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Splits */}
              {selected.splits && selected.splits.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <SplitsChart splits={selected.splits} />
                </div>
              )}

              {/* Laps */}
              {selected.laps && selected.laps.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Laps ({selected.laps.length})</div>
                  <LapsTable laps={selected.laps} />
                </div>
              )}

              {selected.temperature_c != null && (
                <div className="text-xs text-gray-500">
                  Temperatura: {selected.temperature_c}°C
                </div>
              )}

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Briši tek
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Shranjujem…' : 'Shrani spremembe'}
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-sm text-gray-400">
              Izberi tek iz seznama
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
