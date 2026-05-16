import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Run } from '../types';
import type { ResolvedWorkout, ResolvedSegment } from '../lib/runningSuggester';
import { formatPaceSeconds } from '../lib/runningSuggester';

interface PendingSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestionRow {
  id: string;
  date_generated: string;
  suggester_type: 'running' | 'strength';
  input_params: Record<string, unknown>;
  output_workout: Record<string, unknown> | ResolvedWorkout;
  rationale: string;
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired';
  actual_session_id?: string;
  template_id?: string;
  modifications?: Record<string, unknown>;
  feedback_notes?: string;
}

type StatusFilter = 'pending' | 'accepted' | 'rejected' | 'expired' | 'all';
type TypeFilter = 'all' | 'running' | 'strength';

const STATUS_LABELS: Record<SuggestionRow['status'], string> = {
  pending: 'Čaka izvedbo',
  accepted: 'Sprejet',
  modified: 'Modificiran',
  rejected: 'Zavrnjen',
  expired: 'Pretečen',
};

const STATUS_COLORS: Record<SuggestionRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  modified: 'bg-blue-100 text-blue-800',
  rejected: 'bg-gray-200 text-gray-600',
  expired: 'bg-gray-100 text-gray-500',
};

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  const dayMon = `${d.getDate()}. ${months[d.getMonth()]}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dayMon} ${time}`;
}

function dateOnlyLabel(iso: string): string {
  const d = new Date(iso);
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()}. ${months[d.getMonth()]}`;
}

export function PendingSuggestionsModal({ isOpen, onClose }: PendingSuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
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

  const loadData = async () => {
    setLoading(true);
    const [{ data: sugRows }, { data: runRows }] = await Promise.all([
      supabase.from('workout_suggestions').select('*').order('date_generated', { ascending: false }),
      supabase.from('runs').select('*').order('date', { ascending: false }).limit(30),
    ]);
    setSuggestions((sugRows as SuggestionRow[]) ?? []);
    setRecentRuns((runRows as Run[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return suggestions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.suggester_type !== typeFilter) return false;
      return true;
    });
  }, [suggestions, statusFilter, typeFilter]);

  const updateStatus = async (id: string, status: SuggestionRow['status']) => {
    setError(null);
    const { error: e } = await supabase
      .from('workout_suggestions')
      .update({ status })
      .eq('id', id);
    if (e) { setError(e.message); return; }
    await loadData();
    if (selected?.id === id) {
      setSelected(s => s ? { ...s, status } : null);
    }
  };

  const linkToRun = async (runId: string) => {
    if (!selected) return;
    setLinking(true);
    setError(null);
    const { error: sugErr } = await supabase
      .from('workout_suggestions')
      .update({ status: 'accepted', actual_session_id: runId })
      .eq('id', selected.id);
    if (sugErr) { setError(sugErr.message); setLinking(false); return; }
    // Also set linked_progress_id on the run row? In runs table we have planned_workout_id field
    const { error: runErr } = await supabase
      .from('runs')
      .update({ planned_workout_id: selected.id })
      .eq('id', runId);
    setLinking(false);
    if (runErr) { setError(runErr.message); return; }
    await loadData();
    setSelected(s => s ? { ...s, status: 'accepted', actual_session_id: runId } : null);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('Briši predlog?')) return;
    const { error: e } = await supabase.from('workout_suggestions').delete().eq('id', selected.id);
    if (e) { setError(e.message); return; }
    setSelected(null);
    await loadData();
  };

  if (!isOpen) return null;

  const linkedRun = selected?.actual_session_id ? recentRuns.find(r => r.id === selected.actual_session_id) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Predlogi treningov</h2>
              <p className="text-xs text-gray-500">{suggestions.length} skupaj · {filtered.length} prikazano</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* List */}
          <div className={`${selected ? 'hidden md:flex' : 'flex'} md:w-2/5 flex-col border-r border-gray-100`}>
            <div className="p-3 border-b border-gray-100 flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[110px]"
              >
                <option value="pending">Čakajo</option>
                <option value="accepted">Sprejeti</option>
                <option value="rejected">Zavrnjeni</option>
                <option value="expired">Pretečeni</option>
                <option value="all">Vsi</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[110px]"
              >
                <option value="all">Vsi tipi</option>
                <option value="running">Tek</option>
                <option value="strength">Strength</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500">Nalagam…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  {statusFilter === 'pending' ? 'Brez čakajočih predlogov.' : 'Nič ne ustreza filtru.'}
                </div>
              ) : (
                filtered.map(s => {
                  const isRunning = s.suggester_type === 'running';
                  const workout = s.output_workout as { display_name_sl?: string; estimated_total_km?: number; estimated_duration_min?: number };
                  const sessionDate = (s.input_params as { date?: string })?.date;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === s.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-gray-500">{dateLabel(s.date_generated)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[s.status]}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isRunning ? 'bg-cyan-100 text-cyan-700' : 'bg-pink-100 text-pink-700'}`}>
                          {isRunning ? '🚴 tek' : '💪 moč'}
                        </span>
                        {sessionDate && <span className="text-xs text-gray-500 font-mono">za {sessionDate}</span>}
                      </div>
                      <div className="text-sm text-gray-800 font-medium truncate">
                        {workout.display_name_sl ?? (isRunning ? 'Tek predlog' : 'Strength predlog')}
                      </div>
                      {isRunning && workout.estimated_total_km != null && (
                        <div className="text-xs text-gray-500">
                          ~{workout.estimated_total_km} km · {workout.estimated_duration_min} min
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail */}
          {selected && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selected.suggester_type === 'running' ? '🚴 ' : '💪 '}
                    {(selected.output_workout as { display_name_sl?: string }).display_name_sl ?? 'Predlog'}
                  </h3>
                  <div className="text-xs text-gray-500">
                    Generiran {dateLabel(selected.date_generated)} ·{' '}
                    <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[selected.status]}`}>
                      {STATUS_LABELS[selected.status]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden text-sm text-gray-500"
                >← nazaj</button>
              </div>

              {/* Rationale */}
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-line">
                {selected.rationale}
              </div>

              {selected.feedback_notes && (
                <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="text-xs font-medium text-blue-700">Opombe:</span> {selected.feedback_notes}
                </div>
              )}

              {/* Running-specific: segments */}
              {selected.suggester_type === 'running' && (selected.output_workout as ResolvedWorkout).segments && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase">Struktura</div>
                  {(selected.output_workout as ResolvedWorkout).segments.map((seg: ResolvedSegment, i: number) => (
                    <div key={i} className={`p-2.5 rounded-lg border ${seg.phase === 'main' ? 'bg-white border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold uppercase text-gray-500">{seg.phase}</span>
                        <span className="text-xs text-gray-400">{seg.kind}</span>
                      </div>
                      <div className="text-sm text-gray-800">{seg.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Running: pace targets */}
              {selected.suggester_type === 'running' && (selected.output_workout as ResolvedWorkout).target_paces && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Pace targeti:</span>{' '}
                  {Object.entries((selected.output_workout as ResolvedWorkout).target_paces).map(([k, v]) => (
                    <span key={k} className="mr-2 font-mono">
                      {k.replace('_pace', '')}: {formatPaceSeconds(v)}
                    </span>
                  ))}
                </div>
              )}

              {/* Strength-specific: exercises */}
              {selected.suggester_type === 'strength' && Array.isArray((selected.output_workout as { exercises?: unknown[] }).exercises) && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase">Vaje</div>
                  {(selected.output_workout as { exercises: { name_sl?: string; sets?: number; reps?: number; duration_seconds?: number; weight_kg?: number; rir?: number; reason?: string }[] }).exercises.map((e, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium text-gray-800">{i + 1}. {e.name_sl}</div>
                      <div className="text-xs text-gray-500">
                        {e.sets} × {e.reps ?? `${e.duration_seconds}s`}
                        {e.weight_kg !== undefined && ` @ ${e.weight_kg} kg`}
                        {e.rir !== undefined && ` · RIR ${e.rir}`}
                        {e.reason && ` · ${e.reason}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Linked run */}
              {linkedRun && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-xs font-medium text-green-700 mb-1">✓ Povezan z izvedenim tekom</div>
                  <div className="text-sm text-gray-800">
                    {dateOnlyLabel(linkedRun.date)} · {linkedRun.distance_km} km · {linkedRun.workout_type}
                    {linkedRun.workout_subtype && ` / ${linkedRun.workout_subtype}`}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'pending' && selected.suggester_type === 'running' && !linkedRun && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-600">Poveži z izvedenim tekom (zadnjih 30):</div>
                  <select
                    onChange={(e) => { if (e.target.value) linkToRun(e.target.value); }}
                    disabled={linking}
                    defaultValue=""
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">— izberi tek —</option>
                    {recentRuns.map(r => (
                      <option key={r.id} value={r.id}>
                        {dateOnlyLabel(r.date)} · {r.distance_km} km · {r.workout_type}{r.workout_subtype ? `/${r.workout_subtype}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              {/* Status buttons */}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  Briši
                </button>
                <div className="flex gap-2">
                  {selected.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'rejected')}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Zavrni
                    </button>
                  )}
                  {selected.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'expired')}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Označi pretečen
                    </button>
                  )}
                  {selected.status === 'pending' && selected.suggester_type === 'running' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'accepted')}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Označi izveden (brez linka)
                    </button>
                  )}
                  {(selected.status === 'rejected' || selected.status === 'expired') && (
                    <button
                      onClick={() => updateStatus(selected.id, 'pending')}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Vrni v pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {!selected && (
            <div className="hidden md:flex flex-1 items-center justify-center text-sm text-gray-400">
              Izberi predlog iz seznama
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
