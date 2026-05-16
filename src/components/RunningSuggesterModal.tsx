import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  suggestRunningWorkout,
  saveRunningSuggestion,
  formatPaceSeconds,
  type RunningGoal,
  type RunningCategory,
  type Terrain,
  type ResolvedWorkout,
} from '../lib/runningSuggester';

export interface RunningSuggesterPrefill {
  date?: string;
  goal?: RunningGoal;
  category?: RunningCategory;
  terrain?: Terrain;
  availableTime?: number;
  /** When set, after accepting the suggestion we upsert a workout_progress row
   * so the day slot in the plan view shows the planned workout. */
  planId?: string;
  weekNum?: number;
  dayIndex?: number;
}

interface RunningSuggesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
  prefill?: RunningSuggesterPrefill;
}

function categoryToRunType(c: RunningCategory): string {
  switch (c) {
    case 'easy': return 'easy';
    case 'tempo': return 'tempo';
    case 'interval': return 'intervals';
    case 'long': return 'long';
    case 'hill': return 'hills';
    case 'recovery': return 'easy';
  }
}

const GOALS: { value: RunningGoal; label: string }[] = [
  { value: 'hm_pb', label: 'HM PB' },
  { value: '10k_pb', label: '10K PB' },
  { value: '5k_pb', label: '5K PB' },
  { value: 'marathon_base', label: 'Marathon base' },
  { value: 'general', label: 'Splošno' },
];

const CATEGORIES: { value: RunningCategory; label: string }[] = [
  { value: 'easy', label: 'easy' },
  { value: 'tempo', label: 'tempo' },
  { value: 'interval', label: 'interval' },
  { value: 'long', label: 'long' },
  { value: 'hill', label: 'hill' },
  { value: 'recovery', label: 'recovery' },
];

const TERRAINS: { value: Terrain; label: string }[] = [
  { value: 'flat', label: 'flat' },
  { value: 'hill', label: 'hill' },
  { value: 'mixed', label: 'mixed' },
];

export function RunningSuggesterModal({ isOpen, onClose, onSaved, prefill }: RunningSuggesterModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [goal, setGoal] = useState<RunningGoal>('hm_pb');
  const [category, setCategory] = useState<RunningCategory | ''>('');
  const [terrain, setTerrain] = useState<Terrain | ''>('');
  const [availableTime, setAvailableTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState<ResolvedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Apply prefill each time modal opens
      if (prefill?.date) setDate(prefill.date);
      if (prefill?.goal) setGoal(prefill.goal);
      if (prefill?.category !== undefined) setCategory(prefill.category);
      if (prefill?.terrain) setTerrain(prefill.terrain);
      if (prefill?.availableTime !== undefined) setAvailableTime(String(prefill.availableTime));
    } else {
      document.body.style.overflow = '';
      setWorkout(null);
      setError(null);
      setNotes('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setWorkout(null);
    try {
      const w = await suggestRunningWorkout({
        date,
        goal,
        category: category || undefined,
        terrain_preference: terrain || undefined,
        available_time_min: availableTime ? Number(availableTime) : undefined,
      });
      if (!w) {
        setError('Ni našel ustreznega template-a. Preveri faza/kategorija/goal kombinacijo ali sprosti variety filter (počakaj 7 dni).');
      } else {
        setWorkout(w);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri generiranju');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!workout) return;
    setSaving(true);
    setError(null);
    const { id, error: e } = await saveRunningSuggestion(
      {
        date,
        goal,
        category: category || undefined,
        terrain_preference: terrain || undefined,
        available_time_min: availableTime ? Number(availableTime) : undefined,
      },
      workout,
      notes || undefined,
    );
    if (e) { setSaving(false); setError(e); return; }

    // If we were opened from a plan day slot, upsert workout_progress
    if (prefill?.planId && prefill?.weekNum !== undefined && prefill?.dayIndex !== undefined) {
      const summary = `[Predlog] ${workout.display_name_sl} · ~${workout.estimated_total_km} km · ${workout.estimated_duration_min} min`;
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
          activity_type: 'run',
          run_type: categoryToRunType(workout.category),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'plan_id,id,session_index' });
      if (progressErr) {
        console.error('workout_progress upsert failed:', progressErr);
      }
    }

    setSaving(false);
    if (id) { onSaved?.(id); onClose(); }
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Predlagaj tek</h2>
              <p className="text-xs text-gray-500">Template-based · pace targeti iz phase_config</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as RunningGoal)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kategorija</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RunningCategory | '')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">(auto)</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teren</label>
              <select
                value={terrain}
                onChange={(e) => setTerrain(e.target.value as Terrain | '')}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">(katero koli)</option>
                {TERRAINS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Razpoložljiv čas (min, opcijsko)</label>
            <input
              type="number"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              placeholder="60"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Generiram...' : workout ? 'Generiraj znova' : 'Generiraj predlog'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {workout && (
            <div className="space-y-3">
              {/* Header */}
              <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{workout.display_name_sl}</h3>
                    <div className="text-xs text-gray-600 font-mono">{workout.template_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      <span className="font-mono">{workout.phase}</span> · {workout.category}
                    </div>
                    <div className="text-xs text-gray-500">
                      ~{workout.estimated_total_km} km · {workout.estimated_duration_min} min
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                {workout.rationale}
              </div>

              {/* Warnings */}
              {workout.warnings.length > 0 && (
                <div className="space-y-1">
                  {workout.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠️ {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Segments */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 uppercase">Struktura</div>
                {workout.segments.map((seg, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    seg.phase === 'main'
                      ? 'bg-white border-blue-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {seg.phase}
                      </span>
                      <span className="text-xs text-gray-400">{seg.kind}</span>
                    </div>
                    <div className="text-sm text-gray-800">{seg.description}</div>
                    {seg.notes && <div className="text-xs text-gray-500 mt-1 italic">{seg.notes}</div>}
                  </div>
                ))}
              </div>

              {/* Pace reference */}
              <div className="text-xs text-gray-500">
                <span className="font-medium">Pace targeti (iz {workout.phase}):</span>{' '}
                {Object.entries(workout.target_paces).map(([k, v]) => (
                  <span key={k} className="mr-2 font-mono">
                    {k.replace('_pace', '')}: {formatPaceSeconds(v)}
                  </span>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opombe (opcijsko)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Prekliči
          </button>
          {workout && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Shranjujem…' : 'Sprejmi predlog'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
