import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { resolvePhase } from '../lib/runIngest';
import type { Exercise, StrengthExerciseEntry } from '../types';

interface StrengthSessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface ExerciseRow extends StrengthExerciseEntry {
  /** UI-only id to allow multiple rows of same exercise */
  rowKey: string;
}

const SESSION_TYPE_BY_DIFFICULTY: Record<number, string> = {
  1: 'light',
  2: 'maintenance',
  3: 'medium',
  4: 'heavy',
  5: 'explosive',
};

const SESSION_DURATION_BY_DIFFICULTY: Record<number, number> = {
  1: 18,
  2: 22,
  3: 32,
  4: 38,
  5: 42,
};

export function StrengthSessionForm({ isOpen, onClose, onSaved }: StrengthSessionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [notes, setNotes] = useState('');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [availableDumbbells, setAvailableDumbbells] = useState<number[]>([2, 3, 4, 6, 7.5]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [{ data: exs }, { data: profile }, phaseRow] = await Promise.all([
        supabase.from('exercises').select('*').order('category').order('name_sl'),
        supabase.from('athlete_profile').select('available_dumbbells').eq('id', 'default').maybeSingle(),
        resolvePhase(date),
      ]);
      if (exs) setAllExercises(exs as Exercise[]);
      const dbs = (profile as { available_dumbbells?: number[] } | null)?.available_dumbbells;
      if (Array.isArray(dbs) && dbs.length) setAvailableDumbbells(dbs);
      setPhase(phaseRow?.phase_code ?? '');
    })();
  }, [isOpen, date]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setRows([]);
      setNotes('');
      setError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const exercisesById = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach(e => map.set(e.id, e));
    return map;
  }, [allExercises]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    allExercises.forEach(e => {
      const g = e.category;
      if (!groups[g]) groups[g] = [];
      groups[g].push(e);
    });
    return groups;
  }, [allExercises]);

  if (!isOpen) return null;

  const addRow = () => {
    setRows(r => [...r, {
      rowKey: `r${Date.now()}-${r.length}`,
      exercise_id: '',
      name_sl: '',
      sets: 3,
      reps: 8,
      rir: 3,
    }]);
  };

  const updateRow = (rowKey: string, patch: Partial<ExerciseRow>) => {
    setRows(r => r.map(row => row.rowKey === rowKey ? { ...row, ...patch } : row));
  };

  const removeRow = (rowKey: string) => {
    setRows(r => r.filter(row => row.rowKey !== rowKey));
  };

  const handleExerciseChange = (rowKey: string, exerciseId: string) => {
    const ex = exercisesById.get(exerciseId);
    if (!ex) {
      updateRow(rowKey, { exercise_id: exerciseId, name_sl: '' });
      return;
    }
    const patch: Partial<ExerciseRow> = {
      exercise_id: ex.id,
      name_sl: ex.name_sl ?? ex.name_en,
      sets: Math.max(ex.default_sets_min ?? 2, Math.min(ex.default_sets_max ?? 4, 3)),
    };
    if (ex.is_time_based) {
      patch.duration_seconds = ex.default_duration_seconds_min ?? 30;
      patch.reps = undefined;
    } else {
      patch.reps = ex.default_reps_min ?? 8;
      patch.duration_seconds = undefined;
    }
    if (ex.equipment.includes('dumbbell') && !ex.is_bodyweight_only) {
      patch.weight_kg = availableDumbbells[0];
    } else {
      patch.weight_kg = undefined;
    }
    updateRow(rowKey, patch);
  };

  const handleSave = async () => {
    setError(null);
    const validRows = rows.filter(r => r.exercise_id);
    if (validRows.length === 0) {
      setError('Dodaj vsaj eno vajo.');
      return;
    }
    setSaving(true);
    const payload = {
      date,
      difficulty,
      duration_min: SESSION_DURATION_BY_DIFFICULTY[difficulty],
      phase: phase || null,
      session_type: SESSION_TYPE_BY_DIFFICULTY[difficulty],
      exercises: validRows.map(({ rowKey: _rowKey, ...rest }) => rest),
      notes: notes || null,
    };
    const { error: e } = await supabase.from('strength_sessions').insert(payload);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    onSaved?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Strength sesija</h2>
              <p className="text-xs text-gray-500">Manual logging (suggester pride v Phase 3)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty: <span className="font-bold">{difficulty}</span> · {SESSION_TYPE_BY_DIFFICULTY[difficulty]} · ~{SESSION_DURATION_BY_DIFFICULTY[difficulty]} min
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value) as 1|2|3|4|5)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>1 light</span><span>2 maint</span><span>3 medium</span><span>4 heavy</span><span>5 explosive</span>
              </div>
            </div>
          </div>

          {phase && (
            <div className="text-xs text-gray-500">
              Trenutna faza: <span className="font-mono font-semibold text-gray-700">{phase}</span>
            </div>
          )}

          {/* Exercise rows */}
          <div className="space-y-3">
            {rows.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-300 rounded-lg">
                Še nobene vaje. Klikni gumb spodaj za dodati.
              </div>
            )}
            {rows.map(row => {
              const ex = exercisesById.get(row.exercise_id);
              return (
                <div key={row.rowKey} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <select
                      value={row.exercise_id}
                      onChange={(e) => handleExerciseChange(row.rowKey, e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">— izberi vajo —</option>
                      {Object.entries(groupedExercises).map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.is_big_three ? '⭐ ' : ''}{e.name_sl ?? e.name_en}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button
                      onClick={() => removeRow(row.rowKey)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Odstrani"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
                      </svg>
                    </button>
                  </div>

                  {ex && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Seti</label>
                        <input
                          type="number"
                          value={row.sets}
                          min={1}
                          max={10}
                          onChange={(e) => updateRow(row.rowKey, { sets: Number(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      {ex.is_time_based ? (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Sek/set</label>
                          <input
                            type="number"
                            value={row.duration_seconds ?? ''}
                            onChange={(e) => updateRow(row.rowKey, { duration_seconds: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Ponovitve</label>
                          <input
                            type="number"
                            value={row.reps ?? ''}
                            onChange={(e) => updateRow(row.rowKey, { reps: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      )}
                      {ex.equipment.includes('dumbbell') && !ex.is_bodyweight_only && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Teža (kg)</label>
                          <select
                            value={row.weight_kg ?? ''}
                            onChange={(e) => updateRow(row.rowKey, { weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">—</option>
                            {availableDumbbells.map(w => <option key={w} value={w}>{w} kg</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">RIR</label>
                        <input
                          type="number"
                          value={row.rir ?? ''}
                          min={0}
                          max={5}
                          onChange={(e) => updateRow(row.rowKey, { rir: Number(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={row.notes ?? ''}
                    onChange={(e) => updateRow(row.rowKey, { notes: e.target.value })}
                    placeholder="Opomba (opcijsko)"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={addRow}
            className="w-full px-3 py-2 border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
          >
            + Dodaj vajo
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opombe sesije</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Splošen občutek, počutje, opažanja…"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Prekliči</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Shranjujem…' : 'Shrani sesijo'}
          </button>
        </div>
      </div>
    </div>
  );
}
