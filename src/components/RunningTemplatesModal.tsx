import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RunningCategory, RunningGoal, Terrain, RunningWorkoutTemplate } from '../lib/runningSuggester';

interface RunningTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHASES = ['any', 'F1', 'F2', 'F3', 'F4', 'F5a', 'F5b-LJ', 'F5c', 'F5d-Palmanova'];
const CATEGORIES: RunningCategory[] = ['easy', 'tempo', 'interval', 'long', 'hill', 'recovery'];
const GOALS: RunningGoal[] = ['5k_pb', '10k_pb', 'hm_pb', 'marathon_base', 'general'];
const TERRAINS: Terrain[] = ['flat', 'hill', 'mixed'];

const EMPTY: Omit<RunningWorkoutTemplate, 'id'> = {
  template_code: '',
  display_name_sl: '',
  phase: 'F2',
  goal_compat: ['hm_pb'],
  category: 'tempo',
  subtype: undefined,
  terrain: 'flat',
  structure: { segments: [] },
  estimated_distance_km: undefined,
  estimated_duration_min: undefined,
  intra_category_difficulty: 3,
  max_per_2weeks: 2,
  description: undefined,
  notes: undefined,
};

export function RunningTemplatesModal({ isOpen, onClose }: RunningTemplatesModalProps) {
  const [templates, setTemplates] = useState<RunningWorkoutTemplate[]>([]);
  const [editing, setEditing] = useState<RunningWorkoutTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [structureText, setStructureText] = useState('');
  const [structureError, setStructureError] = useState<string | null>(null);
  const [filterPhase, setFilterPhase] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setEditing(null);
      setIsCreating(false);
      setError(null);
      setStructureError(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (editing) {
      setStructureText(JSON.stringify(editing.structure, null, 2));
      setStructureError(null);
    }
  }, [editing?.id, editing?.template_code]);

  const loadTemplates = async () => {
    const { data, error: e } = await supabase
      .from('running_workout_templates')
      .select('*')
      .order('phase')
      .order('category')
      .order('intra_category_difficulty');
    if (e) { setError(e.message); return; }
    setTemplates((data as RunningWorkoutTemplate[]) ?? []);
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (filterPhase && t.phase !== filterPhase) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!t.template_code.toLowerCase().includes(s) &&
            !t.display_name_sl.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [templates, filterPhase, filterCategory, search]);

  const startCreate = () => {
    setEditing({ id: '', ...EMPTY } as RunningWorkoutTemplate);
    setIsCreating(true);
  };

  const toggleGoal = (g: RunningGoal) => {
    if (!editing) return;
    const has = editing.goal_compat.includes(g);
    setEditing({
      ...editing,
      goal_compat: has ? editing.goal_compat.filter(x => x !== g) : [...editing.goal_compat, g],
    });
  };

  const handleStructureChange = (text: string) => {
    setStructureText(text);
    try {
      const parsed = JSON.parse(text);
      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        setStructureError('JSON mora vsebovati "segments" array.');
        return;
      }
      setStructureError(null);
      if (editing) setEditing({ ...editing, structure: parsed });
    } catch (e) {
      setStructureError(e instanceof Error ? e.message : 'JSON parse error');
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.template_code.trim() || !editing.display_name_sl.trim()) {
      setError('template_code in display_name_sl sta obvezna.');
      return;
    }
    if (structureError) {
      setError(`Popravi structure JSON: ${structureError}`);
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Partial<RunningWorkoutTemplate> = { ...editing };
    if (isCreating) {
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('running_workout_templates').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const id = editing.id;
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('running_workout_templates').update(payload).eq('id', id);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setSaving(false);
    setEditing(null);
    setIsCreating(false);
    await loadTemplates();
  };

  const handleDelete = async () => {
    if (!editing || isCreating || !editing.id) return;
    if (!confirm(`Briši template "${editing.template_code}"?`)) return;
    setSaving(true);
    const { error: e } = await supabase.from('running_workout_templates').delete().eq('id', editing.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setEditing(null);
    await loadTemplates();
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Running templates</h2>
              <p className="text-xs text-gray-500">{templates.length} templatov</p>
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
          <div className={`${editing ? 'hidden md:flex' : 'flex'} md:w-2/5 flex-col border-r border-gray-100`}>
            <div className="p-3 border-b border-gray-100 space-y-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Išči po kodi ali imenu…"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1"
                >
                  <option value="">Vse faze</option>
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1"
                >
                  <option value="">Vse kategorije</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={startCreate}
                className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                + Nov template
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setEditing(t); setIsCreating(false); }}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${editing?.id === t.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-gray-700">{t.template_code}</span>
                    <span className="text-xs text-gray-500 font-mono">{t.phase}</span>
                  </div>
                  <div className="text-sm text-gray-800 truncate">{t.display_name_sl}</div>
                  <div className="text-xs text-gray-500">
                    {t.category} · diff {t.intra_category_difficulty ?? '?'}/5 · ~{t.estimated_distance_km}km · {t.estimated_duration_min}min
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Edit */}
          {editing && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  {isCreating ? 'Nov template' : `Uredi ${editing.template_code}`}
                </h3>
                <button
                  onClick={() => { setEditing(null); setIsCreating(false); }}
                  className="md:hidden text-sm text-gray-500"
                >← nazaj</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">template_code</label>
                  <input
                    value={editing.template_code}
                    onChange={(e) => setEditing({ ...editing, template_code: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">display_name_sl</label>
                  <input
                    value={editing.display_name_sl}
                    onChange={(e) => setEditing({ ...editing, display_name_sl: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phase</label>
                  <select
                    value={editing.phase}
                    onChange={(e) => setEditing({ ...editing, phase: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value as RunningCategory })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Terrain</label>
                  <select
                    value={editing.terrain}
                    onChange={(e) => setEditing({ ...editing, terrain: e.target.value as Terrain })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {TERRAINS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Goal compat</label>
                <div className="flex flex-wrap gap-1">
                  {GOALS.map(g => {
                    const active = editing.goal_compat.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGoal(g)}
                        className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtype</label>
                  <input
                    value={editing.subtype ?? ''}
                    onChange={(e) => setEditing({ ...editing, subtype: e.target.value as RunningWorkoutTemplate['subtype'] })}
                    placeholder="vo2max, hm_pace…"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Est km</label>
                  <input
                    type="number"
                    step={0.1}
                    value={editing.estimated_distance_km ?? ''}
                    onChange={(e) => setEditing({ ...editing, estimated_distance_km: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Est min</label>
                  <input
                    type="number"
                    value={editing.estimated_duration_min ?? ''}
                    onChange={(e) => setEditing({ ...editing, estimated_duration_min: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Intra diff</label>
                  <input
                    type="number"
                    min={1} max={5}
                    value={editing.intra_category_difficulty ?? ''}
                    onChange={(e) => setEditing({ ...editing, intra_category_difficulty: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Structure JSON{' '}
                  <span className="text-gray-400">(format: <code>{`{"segments":[...]}`}</code>; pace_ref vrednosti: easy / threshold_pace / vo2max_pace / hm_pace / 5k_pace / 3k_pace / 10k_pace / mp_pace)</span>
                </label>
                <textarea
                  value={structureText}
                  onChange={(e) => handleStructureChange(e.target.value)}
                  rows={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                  spellCheck={false}
                />
                {structureError && (
                  <div className="mt-1 text-xs text-red-700">⚠ {structureError}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={1}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                {!isCreating && editing.id ? (
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
