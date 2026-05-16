import { useEffect, useState } from 'react';
import { buildIngestPreview, saveIngestedRun, type IngestPreview } from '../lib/runIngest';
import type { WorkoutType, WorkoutSubtype } from '../types';

interface RunIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (runId: string) => void;
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

function paceSecondsToLabel(seconds: number | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

function durationLabel(seconds: number | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

export function RunIngestModal({ isOpen, onClose, onSaved }: RunIngestModalProps) {
  const [url, setUrl] = useState('');
  const [isRace, setIsRace] = useState(false);
  const [linkedProgressId, setLinkedProgressId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<IngestPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Override fields (set when user edits classification)
  const [overrideType, setOverrideType] = useState<WorkoutType | ''>('');
  const [overrideSubtype, setOverrideSubtype] = useState<WorkoutSubtype | ''>('');
  const [overridePhase, setOverridePhase] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset on close
      setUrl('');
      setIsRace(false);
      setLinkedProgressId('');
      setNotes('');
      setPreview(null);
      setError(null);
      setOverrideType('');
      setOverrideSubtype('');
      setOverridePhase('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetch = async () => {
    setError(null);
    setPreview(null);
    setLoading(true);
    const { preview: p, error: e } = await buildIngestPreview(url, { isRace });
    setLoading(false);
    if (e) {
      setError(e);
      return;
    }
    setPreview(p);
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    setError(null);
    const { id, error: e } = await saveIngestedRun(
      {
        ...preview,
        override_workout_type: overrideType || undefined,
        override_workout_subtype: overrideSubtype || undefined,
        override_phase: overridePhase || undefined,
      },
      {
        isRace,
        linkedProgressId: linkedProgressId || undefined,
        notes: notes || undefined,
      },
    );
    setSaving(false);
    if (e) {
      setError(e);
      return;
    }
    if (id) {
      onSaved?.(id);
      onClose();
    }
  };

  const confidence = preview?.classification.confidence ?? 0;
  const lowConfidence = preview && confidence < 0.7;
  const effectiveType = (overrideType || preview?.classification.workout_type) as WorkoutType | undefined;
  const subtypeOptions = effectiveType ? SUBTYPES_BY_TYPE[effectiveType] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Vnesi tek iz Strave</h2>
              <p className="text-xs text-gray-500">Paste URL → fetch → auto-klasifikacija</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strava URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.strava.com/activities/1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isRace}
                onChange={(e) => setIsRace(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              To je race
            </label>
            <input
              type="text"
              value={linkedProgressId}
              onChange={(e) => setLinkedProgressId(e.target.value)}
              placeholder="Linked progress ID (opcijsko)"
              className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={handleFetch}
            disabled={loading || !url}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Fetchanje...' : 'Fetch & klasificiraj'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Auto-classification preview */}
              <div className={`p-4 rounded-lg border ${lowConfidence ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-800">
                    Auto-klasifikacija
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded ${lowConfidence ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                    {(confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-bold">{preview.classification.workout_type}</span>
                  {preview.classification.workout_subtype && (
                    <> / <span className="italic">{preview.classification.workout_subtype}</span></>
                  )}
                  {preview.phase && <> · faza <span className="font-mono">{preview.phase}</span></>}
                </div>
                {lowConfidence && (
                  <div className="mt-2 text-xs text-amber-800">
                    Confidence pod 70 % — preveri ali popravi v polji spodaj.
                  </div>
                )}
              </div>

              {/* Override controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tip (override)</label>
                  <select
                    value={overrideType}
                    onChange={(e) => {
                      setOverrideType(e.target.value as WorkoutType | '');
                      setOverrideSubtype('');
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">(auto: {preview.classification.workout_type})</option>
                    {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subtip (override)</label>
                  <select
                    value={overrideSubtype}
                    onChange={(e) => setOverrideSubtype(e.target.value as WorkoutSubtype | '')}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">(auto: {preview.classification.workout_subtype ?? '—'})</option>
                    {subtypeOptions.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Faza (override)</label>
                  <input
                    type="text"
                    value={overridePhase}
                    onChange={(e) => setOverridePhase(e.target.value)}
                    placeholder={preview.phase ?? 'F-koda'}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Metrics summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Datum</div>
                  <div className="font-medium text-gray-800">{preview.date}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Distanca</div>
                  <div className="font-medium text-gray-800">{preview.distance_km} km</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Čas</div>
                  <div className="font-medium text-gray-800">{durationLabel(preview.duration_seconds)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Pace</div>
                  <div className="font-medium text-gray-800">{paceSecondsToLabel(preview.avg_pace_seconds)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Avg HR</div>
                  <div className="font-medium text-gray-800">{preview.avg_hr ?? '—'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Max HR</div>
                  <div className="font-medium text-gray-800">{preview.max_hr ?? '—'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">HR drift</div>
                  <div className="font-medium text-gray-800">{preview.hr_drift_bpm ?? '—'} bpm</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-gray-500">Effort</div>
                  <div className="font-medium text-gray-800">{preview.effort_score} / 100</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opombe</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Opcijsko: kako se je počutil tek, vreme, oprema…"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={!preview || saving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Shranjujem…' : 'Shrani tek'}
          </button>
        </div>
      </div>
    </div>
  );
}
