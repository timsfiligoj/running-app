import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { paceSecondsToString, paceStringToSeconds, type PhaseConfig } from '../types';

interface PhaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyPhase: PhaseConfig = {
  phase_code: '',
  start_date: '',
  end_date: '',
};

interface PaceFieldProps {
  label: string;
  seconds: number | undefined;
  onChange: (seconds: number | undefined) => void;
}

function PaceField({ label, seconds, onChange }: PaceFieldProps) {
  const [text, setText] = useState(paceSecondsToString(seconds));
  useEffect(() => { setText(paceSecondsToString(seconds)); }, [seconds]);
  const handleBlur = () => {
    if (!text.trim()) { onChange(undefined); return; }
    const sec = paceStringToSeconds(text);
    if (sec !== null) onChange(sec);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="4:15"
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
    </div>
  );
}

export function PhaseConfigModal({ isOpen, onClose }: PhaseConfigModalProps) {
  const [phases, setPhases] = useState<PhaseConfig[]>([]);
  const [editing, setEditing] = useState<PhaseConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadPhases();
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

  const loadPhases = async () => {
    const { data, error: e } = await supabase
      .from('phase_config')
      .select('*')
      .order('start_date');
    if (e) {
      setError(e.message);
      return;
    }
    setPhases((data as PhaseConfig[]) ?? []);
  };

  const startCreate = () => {
    setEditing({ ...emptyPhase });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.phase_code.trim() || !editing.start_date || !editing.end_date) {
      setError('phase_code, start_date in end_date so obvezni.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Partial<PhaseConfig> = { ...editing };
    if (isCreating) {
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('phase_config').insert(payload);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const id = editing.id;
      delete (payload as { id?: string }).id;
      const { error: e } = await supabase.from('phase_config').update(payload).eq('id', id);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setSaving(false);
    setEditing(null);
    setIsCreating(false);
    await loadPhases();
  };

  const handleDelete = async () => {
    if (!editing || isCreating || !editing.id) return;
    if (!confirm(`Briši fazo "${editing.phase_code}"?`)) return;
    setSaving(true);
    const { error: e } = await supabase.from('phase_config').delete().eq('id', editing.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setEditing(null);
    await loadPhases();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Faze treninga</h2>
              <p className="text-xs text-gray-500">{phases.length} faz · pace targeti, volume, strength frekvenca</p>
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
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startCreate}
                className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                + Nova faza
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {phases.map(p => (
                <button
                  key={p.id ?? p.phase_code}
                  onClick={() => { setEditing(p); setIsCreating(false); }}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50 ${editing?.id === p.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-mono text-sm font-bold text-gray-800">{p.phase_code}</div>
                  <div className="text-xs text-gray-500">
                    {p.start_date} → {p.end_date}
                  </div>
                  {p.key_race && <div className="text-xs text-purple-600 mt-0.5">🏁 {p.key_race}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Edit */}
          {editing && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  {isCreating ? 'Nova faza' : `Uredi: ${editing.phase_code}`}
                </h3>
                <button
                  onClick={() => { setEditing(null); setIsCreating(false); }}
                  className="md:hidden text-sm text-gray-500"
                >← nazaj</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phase code</label>
                  <input
                    value={editing.phase_code}
                    onChange={(e) => setEditing({ ...editing, phase_code: e.target.value })}
                    placeholder="F4"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Easy HR max</label>
                  <input
                    type="number"
                    value={editing.easy_hr_max ?? ''}
                    onChange={(e) => setEditing({ ...editing, easy_hr_max: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <PaceField
                  label="Threshold (mm:ss)"
                  seconds={editing.threshold_pace_seconds}
                  onChange={(s) => setEditing({ ...editing, threshold_pace_seconds: s })}
                />
                <PaceField
                  label="VO2max (mm:ss)"
                  seconds={editing.vo2max_pace_seconds}
                  onChange={(s) => setEditing({ ...editing, vo2max_pace_seconds: s })}
                />
                <PaceField
                  label="HM pace (mm:ss)"
                  seconds={editing.hm_pace_seconds}
                  onChange={(s) => setEditing({ ...editing, hm_pace_seconds: s })}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <PaceField
                  label="Marathon pace (mm:ss)"
                  seconds={editing.mp_pace_seconds}
                  onChange={(s) => setEditing({ ...editing, mp_pace_seconds: s })}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Volume (km/teden)</label>
                  <input
                    type="number"
                    value={editing.weekly_volume_target_km ?? ''}
                    onChange={(e) => setEditing({ ...editing, weekly_volume_target_km: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Strength frekvenca</label>
                  <input
                    type="number"
                    min={0} max={5}
                    value={editing.strength_frequency ?? ''}
                    onChange={(e) => setEditing({ ...editing, strength_frequency: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Key race</label>
                <input
                  value={editing.key_race ?? ''}
                  onChange={(e) => setEditing({ ...editing, key_race: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emphasis notes</label>
                <textarea
                  value={editing.emphasis_notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, emphasis_notes: e.target.value })}
                  rows={2}
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
