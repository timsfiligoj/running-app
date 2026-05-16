import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { rowsToCsv, downloadCsv } from '../lib/csvExport';
import type { StrengthSession, StrengthExerciseEntry } from '../types';

interface StrengthSessionsListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'light', 2: 'maintenance', 3: 'medium', 4: 'heavy', 5: 'explosive',
};

const DIFFICULTY_COLOR: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
};

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
  return `${d}. ${months[m - 1]} ${y}`;
}

export function StrengthSessionsListModal({ isOpen, onClose }: StrengthSessionsListModalProps) {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [selected, setSelected] = useState<StrengthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState('');
  const [filterDiff, setFilterDiff] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadSessions();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setSelected(null);
      setError(null);
      setAnalysisText(null);
      setAnalysisError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (selected) {
      setEditNotes(selected.notes ?? '');
      const a = selected.analysis_result as { text?: string } | null | undefined;
      setAnalysisText(a?.text ?? null);
      setAnalysisError(null);
    }
  }, [selected?.id]);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('strength_sessions')
      .select('*')
      .order('date', { ascending: false });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setSessions((data as StrengthSession[]) ?? []);
  };

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (filterPhase && s.phase !== filterPhase) return false;
      if (filterDiff && String(s.difficulty) !== filterDiff) return false;
      return true;
    });
  }, [sessions, filterPhase, filterDiff]);

  const uniquePhases = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.phase).filter((p): p is string => !!p))).sort();
  }, [sessions]);

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const { error: e } = await supabase
      .from('strength_sessions')
      .update({ notes: editNotes || null })
      .eq('id', selected.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    await loadSessions();
    setSelected(s => s ? { ...s, notes: editNotes || undefined } : null);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Briši sesijo ${dateLabel(selected.date)}?`)) return;
    setSaving(true);
    const { error: e } = await supabase.from('strength_sessions').delete().eq('id', selected.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSelected(null);
    await loadSessions();
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke('analyze-strength', {
        body: { session_id: selected.id },
      });
      if (e) {
        setAnalysisError('Edge function napaka: ' + (e.message ?? 'unknown'));
        return;
      }
      if (data?.error) {
        setAnalysisError(data.error);
        return;
      }
      const text = data?.text as string | undefined;
      if (text) {
        setAnalysisText(text);
        // Persist to row
        await supabase
          .from('strength_sessions')
          .update({ analysis_result: { text, generated_at: new Date().toISOString() } })
          .eq('id', selected.id);
        await loadSessions();
      } else {
        setAnalysisError('Edge function ni vrnil analize.');
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Strength sesije</h2>
              <p className="text-xs text-gray-500">{sessions.length} sesij · {filtered.length} prikazano</p>
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
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[100px]"
                >
                  <option value="">Vse faze</option>
                  {uniquePhases.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filterDiff}
                  onChange={(e) => setFilterDiff(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[100px]"
                >
                  <option value="">Vse diff</option>
                  {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} {DIFFICULTY_LABEL[d]}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  const rows = filtered.map(s => {
                    const exs = Array.isArray(s.exercises) ? (s.exercises as StrengthExerciseEntry[]) : [];
                    const exsCol = exs.map(e => {
                      const repsStr = e.reps !== undefined ? `${e.sets}x${e.reps}` : e.duration_seconds !== undefined ? `${e.sets}x${e.duration_seconds}s` : `${e.sets}sets`;
                      const wStr = e.weight_kg !== undefined ? `@${e.weight_kg}kg` : '';
                      const rirStr = e.rir !== undefined ? `RIR${e.rir}` : '';
                      return `${e.name_sl ?? '?'} ${repsStr} ${wStr} ${rirStr}`.trim();
                    }).join(' | ');
                    return {
                      date: s.date,
                      difficulty: s.difficulty,
                      session_type: s.session_type ?? '',
                      duration_min: s.duration_min ?? '',
                      phase: s.phase ?? '',
                      n_exercises: exs.length,
                      exercises: exsCol,
                      from_suggester: s.suggested_by_id ? 'true' : 'false',
                      analyzed: s.analysis_result ? 'true' : 'false',
                      notes: s.notes ?? '',
                    };
                  });
                  const csv = rowsToCsv(rows, [
                    'date', 'difficulty', 'session_type', 'duration_min', 'phase',
                    'n_exercises', 'exercises', 'from_suggester', 'analyzed', 'notes',
                  ]);
                  downloadCsv(`strength_sessions_${new Date().toISOString().slice(0, 10)}.csv`, csv);
                }}
                disabled={filtered.length === 0}
                className="w-full px-2 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg disabled:opacity-50"
              >
                ⬇ Izvozi CSV ({filtered.length})
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500">Nalagam…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  {sessions.length === 0 ? 'Še ni shranjenih sesij.' : 'Nič ne ustreza filtru.'}
                </div>
              ) : (
                filtered.map(s => {
                  const exs = Array.isArray(s.exercises) ? (s.exercises as StrengthExerciseEntry[]) : [];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === s.id ? 'bg-purple-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500 font-mono">{dateLabel(s.date)}</div>
                        {s.phase && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{s.phase}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_COLOR[s.difficulty]}`}>
                          diff {s.difficulty} · {s.session_type ?? DIFFICULTY_LABEL[s.difficulty]}
                        </span>
                        {s.duration_min && <span className="text-xs text-gray-500">{s.duration_min} min</span>}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {exs.length} vaj{exs.length === 0 ? '' : exs.length === 1 ? '' : exs.length < 5 ? 'e' : ''}
                        {s.suggested_by_id ? <span className="ml-1 text-violet-600">🎯</span> : null}
                        {s.analysis_result ? <span className="ml-1 text-blue-600">📝</span> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail */}
          {selected ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{dateLabel(selected.date)}</h3>
                  <div className="text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded ${DIFFICULTY_COLOR[selected.difficulty]}`}>
                      diff {selected.difficulty} · {selected.session_type ?? DIFFICULTY_LABEL[selected.difficulty]}
                    </span>
                    {selected.duration_min && <span className="ml-1">· {selected.duration_min} min</span>}
                    {selected.phase && <span className="ml-1 font-mono">· {selected.phase}</span>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="md:hidden text-sm text-gray-500">← nazaj</button>
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">Vaje</div>
                {(Array.isArray(selected.exercises) ? (selected.exercises as StrengthExerciseEntry[]) : []).map((e, i) => (
                  <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-800">{i + 1}. {e.name_sl ?? '?'}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {e.sets} × {e.reps ?? (e.duration_seconds ? `${e.duration_seconds}s` : '?')}
                      {e.weight_kg !== undefined && ` @ ${e.weight_kg} kg`}
                      {e.rir !== undefined && ` · RIR ${e.rir}`}
                    </div>
                    {e.notes && <div className="text-xs text-gray-500 italic mt-0.5">{e.notes}</div>}
                  </div>
                ))}
              </div>

              {/* AI Analiza */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-600 uppercase">AI Analiza</div>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {analyzing ? 'Analiziram…' : analysisText ? 'Nova analiza' : 'Analiziraj'}
                  </button>
                </div>
                {analysisError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">⚠ {analysisError}</div>
                )}
                {analysisText && (
                  <div className="text-sm text-gray-800 bg-blue-50 border border-blue-200 rounded p-3 whitespace-pre-line leading-relaxed">
                    {analysisText}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Opombe</div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={saving || editNotes === (selected.notes ?? '')}
                  className="mt-1 px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Shrani opombe
                </button>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  Briši sesijo
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-sm text-gray-400">
              Izberi sesijo iz seznama
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
