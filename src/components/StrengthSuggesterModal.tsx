import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  suggestStrengthSession,
  saveAcceptedSuggestion,
  type Difficulty,
  type StrengthSuggestion,
  type SuggesterInput,
} from '../lib/strengthSuggester';
import type { Equipment, StrengthExerciseEntry } from '../types';

export interface StrengthSuggesterPrefill {
  date?: string;
  difficulty?: Difficulty;
  excludeEquipment?: Equipment[];
  /** When set, after accepting the suggestion we upsert a workout_progress row
   * so the day slot in the plan view shows the planned strength session. */
  planId?: string;
  weekNum?: number;
  dayIndex?: number;
}

interface StrengthSuggesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  prefill?: StrengthSuggesterPrefill;
}

const SESSION_TYPE_LABEL: Record<Difficulty, string> = {
  1: 'light · ~18 min',
  2: 'maintenance · ~22 min',
  3: 'medium · ~32 min',
  4: 'heavy · ~38 min',
  5: 'explosive · ~42 min',
};

const EQUIPMENT_OPTIONS: Equipment[] = [
  'bodyweight', 'dumbbell', 'kettlebell', 'band', 'box', 'wall', 'bench', 'partner',
];

interface ExerciseOverride {
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rir?: number;
}

export function StrengthSuggesterModal({ isOpen, onClose, onSaved, prefill }: StrengthSuggesterModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [excludeEquip, setExcludeEquip] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<StrengthSuggestion | null>(null);
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState<Record<string, ExerciseOverride>>({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (prefill?.date) setDate(prefill.date);
      if (prefill?.difficulty) setDifficulty(prefill.difficulty);
      if (prefill?.excludeEquipment) setExcludeEquip(prefill.excludeEquipment);
    } else {
      document.body.style.overflow = '';
      setSuggestion(null);
      setError(null);
      setNotes('');
      setOverrides({});
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    setSuggestion(null);
    setOverrides({});
    try {
      const input: SuggesterInput = {
        difficulty,
        date,
        exclude_equipment: excludeEquip.length ? excludeEquip : undefined,
      };
      const s = await suggestStrengthSession(input);
      setSuggestion(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri generiranju');
    } finally {
      setLoading(false);
    }
  };

  const toggleExclude = (eq: Equipment) => {
    setExcludeEquip(curr => curr.includes(eq) ? curr.filter(x => x !== eq) : [...curr, eq]);
  };

  const updateOverride = (exId: string, patch: ExerciseOverride) => {
    setOverrides(curr => ({ ...curr, [exId]: { ...(curr[exId] ?? {}), ...patch } }));
  };

  const handleAccept = async () => {
    if (!suggestion) return;
    setSaving(true);
    setError(null);
    const ovrPayload: Record<string, Partial<StrengthExerciseEntry>> = {};
    for (const [id, o] of Object.entries(overrides)) ovrPayload[id] = o;
    const { error: e } = await saveAcceptedSuggestion({
      suggestion,
      input: {
        difficulty,
        date,
        exclude_equipment: excludeEquip.length ? excludeEquip : undefined,
      },
      notes: notes || undefined,
      exerciseOverrides: ovrPayload,
    });
    if (e) { setSaving(false); setError(e); return; }

    // If opened from a plan day slot, upsert workout_progress
    if (prefill?.planId && prefill?.weekNum !== undefined && prefill?.dayIndex !== undefined) {
      const exsList = suggestion.exercises.map(x => {
        const ovr = overrides[x.exercise.id] ?? {};
        const sets = ovr.sets ?? x.sets;
        const reps = ovr.reps ?? x.reps;
        const dur = ovr.duration_seconds ?? x.duration_seconds;
        const weight = ovr.weight_kg ?? x.weight_kg;
        const rir = ovr.rir ?? x.rir;
        const name = x.exercise.name_sl ?? x.exercise.name_en;
        const repsStr = reps !== undefined
          ? `${sets}×${reps}`
          : dur !== undefined
            ? `${sets}×${dur}s`
            : `${sets} setov`;
        const weightStr = weight !== undefined ? ` @ ${weight}kg` : '';
        const rirStr = rir !== undefined ? ` (RIR ${rir})` : '';
        return `${name} ${repsStr}${weightStr}${rirStr}`;
      }).join(' · ');
      const summary = `[Predlog] ${suggestion.session_type} (diff ${suggestion.difficulty}, ~${suggestion.estimated_duration_min} min): ${exsList}`;
      const slotId = `${prefill.weekNum}-${prefill.dayIndex}`;
      const { error: progressErr } = await supabase
        .from('workout_progress')
        .upsert({
          plan_id: prefill.planId,
          id: slotId,
          session_index: 0,
          completed: false,
          skipped: false,
          actual_workout: summary,
          activity_type: 'strength',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'plan_id,id,session_index' });
      if (progressErr) {
        console.error('workout_progress upsert failed:', progressErr);
      }
    }

    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Predlagaj strength</h2>
              <p className="text-xs text-gray-500">Dinamičen composer · BIG3 + faza + pokritost</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Input row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Difficulty: <span className="font-bold">{difficulty}</span> · {SESSION_TYPE_LABEL[difficulty]}
              </label>
              <input
                type="range"
                min={1} max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>1 light</span><span>2 maint</span><span>3 medium</span><span>4 heavy</span><span>5 expl</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Izloči equipment (opcijsko)</div>
            <div className="flex flex-wrap gap-1">
              {EQUIPMENT_OPTIONS.map(eq => {
                const active = excludeEquip.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleExclude(eq)}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      active
                        ? 'bg-red-100 text-red-700 border-red-300 line-through'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Generiram...' : suggestion ? 'Generiraj znova' : 'Generiraj predlog'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {suggestion && (
            <div className="space-y-4">
              {/* Rationale */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-violet-50 rounded-lg border border-blue-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Rationale</div>
                <p className="text-sm text-gray-800 leading-relaxed">{suggestion.rationale}</p>
              </div>

              {/* Session meta */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Vaj</div>
                  <div className="font-bold text-gray-800">{suggestion.exercises.length}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Trajanje</div>
                  <div className="font-bold text-gray-800">~{suggestion.estimated_duration_min} min</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Faza</div>
                  <div className="font-bold text-gray-800 font-mono">{suggestion.phase ?? '—'}</div>
                </div>
              </div>

              {/* BIG3 after */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">BIG3 po sesiji:</span>
                <span className={`px-1.5 py-0.5 rounded ${suggestion.big_three_status_after.bss ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {suggestion.big_three_status_after.bss ? '✓' : '✗'} BSS
                </span>
                <span className={`px-1.5 py-0.5 rounded ${suggestion.big_three_status_after.sl_rdl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {suggestion.big_three_status_after.sl_rdl ? '✓' : '✗'} SL RDL
                </span>
                <span className={`px-1.5 py-0.5 rounded ${suggestion.big_three_status_after.calf_soleus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {suggestion.big_three_status_after.calf_soleus ? '✓' : '✗'} Calf
                </span>
              </div>

              {/* Exercises list */}
              <div className="space-y-2">
                {suggestion.exercises.map((se, idx) => {
                  const ex = se.exercise;
                  const ovr = overrides[ex.id] ?? {};
                  const sets = ovr.sets ?? se.sets;
                  const reps = ovr.reps ?? se.reps;
                  const dur = ovr.duration_seconds ?? se.duration_seconds;
                  const weight = ovr.weight_kg ?? se.weight_kg;
                  const rir = ovr.rir ?? se.rir;
                  return (
                    <div key={ex.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {idx + 1}. {ex.is_big_three && '⭐ '}{ex.name_sl ?? ex.name_en}
                          </div>
                          <div className="text-xs text-gray-500">{ex.category} · diff {ex.intrinsic_difficulty}</div>
                        </div>
                        <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded text-right">
                          {se.reason || '—'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500">Seti</label>
                          <input
                            type="number"
                            value={sets}
                            min={1} max={10}
                            onChange={(e) => updateOverride(ex.id, { sets: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        {ex.is_time_based ? (
                          <div>
                            <label className="block text-[10px] text-gray-500">Sek/set</label>
                            <input
                              type="number"
                              value={dur ?? ''}
                              onChange={(e) => updateOverride(ex.id, { duration_seconds: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] text-gray-500">Ponov.</label>
                            <input
                              type="number"
                              value={reps ?? ''}
                              onChange={(e) => updateOverride(ex.id, { reps: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        )}
                        {weight !== undefined && (
                          <div>
                            <label className="block text-[10px] text-gray-500">Teža</label>
                            <input
                              type="number"
                              value={weight}
                              step={0.5}
                              onChange={(e) => updateOverride(ex.id, { weight_kg: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] text-gray-500">RIR</label>
                          <input
                            type="number"
                            value={rir}
                            min={0} max={5}
                            onChange={(e) => updateOverride(ex.id, { rir: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opombe (opcijsko)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Prekliči
          </button>
          {suggestion && (
            <button
              onClick={handleAccept}
              disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Shranjujem…' : 'Sprejmi & shrani sesijo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
