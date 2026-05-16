import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Exercise, ExerciseCategory, MovementPattern, Muscle, Tendon, Equipment,
} from '../types';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ExerciseCategory[] = ['compound', 'accessory', 'core', 'plyo', 'tendon', 'mobility'];

const MOVEMENT_PATTERNS: MovementPattern[] = [
  'squat_bilateral', 'squat_unilateral', 'hinge_bilateral', 'hinge_unilateral',
  'hinge_unilateral_eccentric', 'lunge', 'calf_gastroc', 'calf_soleus',
  'foot_ankle', 'hip_extension', 'hip_abduction', 'hip_adduction',
  'plyo_horizontal', 'plyo_vertical', 'plyo_reactive',
  'anti_rotation', 'anti_extension', 'anti_lateral_flexion', 'posterior_chain_pull',
];

const MUSCLES: Muscle[] = [
  'quads', 'hamstrings_prox', 'hamstrings_distal', 'hamstrings',
  'glute_max', 'glute_med', 'glute_min', 'adductors', 'hip_flexors',
  'gastrocnemius', 'soleus', 'tibialis_anterior', 'tibialis_posterior',
  'peroneals', 'foot_intrinsics', 'erector_spinae', 'multifidus',
  'core_anterior', 'core_lateral', 'core_rotational',
  'lats', 'mid_back', 'rear_delts', 'grip', 'obliques',
];

const TENDONS: Tendon[] = [
  'achilles', 'patellar', 'plantar_fascia', 'hamstring_origin',
  'gluteal', 'peroneal', 'posterior_tibial',
];

const EQUIPMENT: Equipment[] = [
  'bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'band',
  'cable', 'box', 'wall', 'bench', 'partner',
];

const emptyExercise: Omit<Exercise, 'id'> = {
  name_en: '',
  name_sl: '',
  category: 'accessory',
  movement_patterns: [],
  primary_muscles: [],
  secondary_muscles: [],
  tendons: [],
  is_unilateral: false,
  equipment: ['bodyweight'],
  is_bodyweight_only: false,
  is_time_based: false,
  intrinsic_difficulty: 2,
  is_big_three: false,
  default_sets_min: 2,
  default_sets_max: 4,
  default_reps_min: 8,
  default_reps_max: 12,
  default_rir_min: 2,
  default_rir_max: 4,
  max_per_week: 2,
};

interface ChipPickerProps<T extends string> {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  label: string;
}

function ChipPicker<T extends string>({ options, selected, onChange, label }: ChipPickerProps<T>) {
  const toggle = (v: T) => {
    if (selected.includes(v)) onChange(selected.filter(s => s !== v));
    else onChange([...selected, v]);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map(o => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExerciseLibraryModal({ isOpen, onClose }: ExerciseLibraryModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ExerciseCategory | ''>('');
  const [filterBig3, setFilterBig3] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadExercises();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setEditing(null);
      setIsCreating(false);
      setError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const loadExercises = async () => {
    const { data, error: e } = await supabase
      .from('exercises')
      .select('*')
      .order('category')
      .order('name_sl');
    if (e) {
      setError(e.message);
      return;
    }
    setExercises((data as Exercise[]) ?? []);
  };

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (filterCategory && ex.category !== filterCategory) return false;
      if (filterBig3 && !ex.is_big_three) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !(ex.name_en.toLowerCase().includes(s) ||
            (ex.name_sl ?? '').toLowerCase().includes(s))
        ) return false;
      }
      return true;
    });
  }, [exercises, filterCategory, filterBig3, search]);

  const startCreate = () => {
    setEditing({ id: '', ...emptyExercise } as Exercise);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name_en.trim()) {
      setError('name_en je obvezen.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Partial<Exercise> = { ...editing };
    if (isCreating) {
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('exercises').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const id = editing.id;
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('exercises').update(payload).eq('id', id);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setSaving(false);
    setEditing(null);
    setIsCreating(false);
    await loadExercises();
  };

  const handleDelete = async () => {
    if (!editing || isCreating) return;
    if (!confirm(`Briši vajo "${editing.name_sl ?? editing.name_en}"?`)) return;
    setSaving(true);
    const { error: e } = await supabase.from('exercises').delete().eq('id', editing.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setEditing(null);
    await loadExercises();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Exercise library</h2>
              <p className="text-xs text-gray-500">{exercises.length} vaj</p>
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
          <div className={`${editing ? 'hidden md:flex' : 'flex'} md:w-1/2 flex-col border-r border-gray-100`}>
            <div className="p-3 border-b border-gray-100 space-y-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po imenu…"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex gap-2 items-center">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as ExerciseCategory | '')}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Vse kategorije</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                  <input type="checkbox" checked={filterBig3} onChange={(e) => setFilterBig3(e.target.checked)} />
                  Le BIG3
                </label>
                <button
                  onClick={startCreate}
                  className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  + Nova
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setEditing(ex); setIsCreating(false); }}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${editing?.id === ex.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-sm font-medium text-gray-800">
                    {ex.is_big_three && '⭐ '}{ex.name_sl ?? ex.name_en}
                  </div>
                  <div className="text-xs text-gray-500">
                    {ex.category} · diff {ex.intrinsic_difficulty} · {ex.equipment.join(', ')}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">Nič ne ustreza filtru.</div>
              )}
            </div>
          </div>

          {/* Edit pane */}
          {editing && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  {isCreating ? 'Nova vaja' : 'Uredi vajo'}
                </h3>
                <button
                  onClick={() => { setEditing(null); setIsCreating(false); }}
                  className="md:hidden text-sm text-gray-500"
                >← nazaj</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name (EN)</label>
                  <input
                    value={editing.name_en}
                    onChange={(e) => setEditing({ ...editing, name_en: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Naziv (SL)</label>
                  <input
                    value={editing.name_sl ?? ''}
                    onChange={(e) => setEditing({ ...editing, name_sl: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kategorija</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value as ExerciseCategory })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty (1-5)</label>
                  <input
                    type="number"
                    min={1} max={5}
                    value={editing.intrinsic_difficulty}
                    onChange={(e) => setEditing({ ...editing, intrinsic_difficulty: Math.max(1, Math.min(5, Number(e.target.value))) as 1|2|3|4|5 })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max/teden</label>
                  <input
                    type="number"
                    value={editing.max_per_week ?? 2}
                    onChange={(e) => setEditing({ ...editing, max_per_week: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={editing.is_big_three}
                    onChange={(e) => setEditing({ ...editing, is_big_three: e.target.checked })}
                  />
                  BIG3
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={editing.is_unilateral}
                    onChange={(e) => setEditing({ ...editing, is_unilateral: e.target.checked })}
                  />
                  Unilateralna
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={editing.is_time_based}
                    onChange={(e) => setEditing({ ...editing, is_time_based: e.target.checked })}
                  />
                  Časovna (planke, carries)
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={editing.is_bodyweight_only}
                    onChange={(e) => setEditing({ ...editing, is_bodyweight_only: e.target.checked })}
                  />
                  Le lastna teža
                </label>
              </div>

              <ChipPicker
                options={MOVEMENT_PATTERNS}
                selected={editing.movement_patterns}
                onChange={(next) => setEditing({ ...editing, movement_patterns: next })}
                label="Movement patterns"
              />
              <ChipPicker
                options={MUSCLES}
                selected={editing.primary_muscles}
                onChange={(next) => setEditing({ ...editing, primary_muscles: next })}
                label="Primarne mišice"
              />
              <ChipPicker
                options={MUSCLES}
                selected={editing.secondary_muscles ?? []}
                onChange={(next) => setEditing({ ...editing, secondary_muscles: next })}
                label="Sekundarne mišice"
              />
              <ChipPicker
                options={TENDONS}
                selected={editing.tendons ?? []}
                onChange={(next) => setEditing({ ...editing, tendons: next })}
                label="Tetive"
              />
              <ChipPicker
                options={EQUIPMENT}
                selected={editing.equipment}
                onChange={(next) => setEditing({ ...editing, equipment: next })}
                label="Equipment"
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-gray-600">Seti min</label>
                  <input
                    type="number"
                    value={editing.default_sets_min ?? ''}
                    onChange={(e) => setEditing({ ...editing, default_sets_min: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Seti max</label>
                  <input
                    type="number"
                    value={editing.default_sets_max ?? ''}
                    onChange={(e) => setEditing({ ...editing, default_sets_max: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                {editing.is_time_based ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600">Sek min</label>
                      <input
                        type="number"
                        value={editing.default_duration_seconds_min ?? ''}
                        onChange={(e) => setEditing({ ...editing, default_duration_seconds_min: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Sek max</label>
                      <input
                        type="number"
                        value={editing.default_duration_seconds_max ?? ''}
                        onChange={(e) => setEditing({ ...editing, default_duration_seconds_max: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600">Reps min</label>
                      <input
                        type="number"
                        value={editing.default_reps_min ?? ''}
                        onChange={(e) => setEditing({ ...editing, default_reps_min: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Reps max</label>
                      <input
                        type="number"
                        value={editing.default_reps_max ?? ''}
                        onChange={(e) => setEditing({ ...editing, default_reps_max: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Technique notes</label>
                <textarea
                  value={editing.technique_notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, technique_notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Injury risk notes</label>
                <textarea
                  value={editing.injury_risk_notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, injury_risk_notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                {!isCreating ? (
                  <button onClick={handleDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    Briši
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(null); setIsCreating(false); }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Prekliči
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Shranjujem…' : 'Shrani'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
