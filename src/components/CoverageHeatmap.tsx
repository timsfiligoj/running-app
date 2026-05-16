import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Exercise, StrengthSession, StrengthExerciseEntry,
  Muscle, Tendon, MovementPattern,
} from '../types';

interface CoverageData {
  muscles: Record<string, number>;
  tendons: Record<string, number>;
  patterns: Record<string, number>;
  exercisesByMuscle: Record<string, Set<string>>;     // muscle → set of exercise names
  exercisesByTendon: Record<string, Set<string>>;
  exercisesByPattern: Record<string, Set<string>>;
}

const MUSCLE_GROUPS: { label: string; items: Muscle[] }[] = [
  { label: 'Spodnji del', items: ['quads', 'glute_max', 'glute_med', 'hamstrings_prox', 'hamstrings_distal', 'adductors', 'hip_flexors'] },
  { label: 'Meča + stopalo', items: ['gastrocnemius', 'soleus', 'tibialis_anterior', 'foot_intrinsics'] },
  { label: 'Core', items: ['core_anterior', 'core_lateral', 'core_rotational', 'erector_spinae'] },
];

const TENDONS: Tendon[] = ['achilles', 'patellar', 'hamstring_origin', 'gluteal', 'plantar_fascia'];

const PATTERN_GROUPS: { label: string; items: MovementPattern[] }[] = [
  { label: 'Compound', items: ['squat_unilateral', 'hinge_unilateral', 'lunge', 'hip_extension'] },
  { label: 'Foot/ankle', items: ['foot_ankle', 'calf_soleus', 'calf_gastroc'] },
  { label: 'Plyo', items: ['plyo_reactive', 'plyo_horizontal', 'plyo_vertical'] },
  { label: 'Core anti-X', items: ['anti_rotation', 'anti_extension', 'anti_lateral_flexion'] },
];

const MUSCLE_LABELS: Partial<Record<Muscle, string>> = {
  quads: 'kvad', glute_max: 'glut max', glute_med: 'glut med',
  hamstrings_prox: 'ham prox', hamstrings_distal: 'ham dist',
  adductors: 'addukt', hip_flexors: 'hip flex',
  gastrocnemius: 'gastroc', soleus: 'soleus',
  tibialis_anterior: 'tibialis', foot_intrinsics: 'foot',
  core_anterior: 'anterior', core_lateral: 'lateral',
  core_rotational: 'rotational', erector_spinae: 'erector',
};

const TENDON_LABELS: Partial<Record<Tendon, string>> = {
  achilles: 'achilles', patellar: 'patellar',
  hamstring_origin: 'ham orig', gluteal: 'gluteal',
  plantar_fascia: 'plantar',
};

const PATTERN_LABELS: Partial<Record<MovementPattern, string>> = {
  squat_unilateral: 'sq uni', hinge_unilateral: 'hi uni', lunge: 'lunge',
  hip_extension: 'hip ext', foot_ankle: 'foot/ankle',
  calf_soleus: 'cf sol', calf_gastroc: 'cf gas',
  plyo_reactive: 'p react', plyo_horizontal: 'p horiz', plyo_vertical: 'p vert',
  anti_rotation: 'anti-rot', anti_extension: 'anti-ext', anti_lateral_flexion: 'anti-lat',
};

function cellColor(count: number): string {
  if (count >= 2) return 'bg-green-500 text-white border-green-600';
  if (count >= 1) return 'bg-amber-300 text-amber-900 border-amber-400';
  return 'bg-red-100 text-red-700 border-red-200';
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface CoverageHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoverageHeatmap({ isOpen, onClose }: CoverageHeatmapModalProps) {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<{ kind: 'muscle' | 'tendon' | 'pattern'; name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = '';
      setSelectedTarget(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const load = async () => {
    setLoading(true);
    const today = new Date();
    const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);

    const { data: sessRaw } = await supabase
      .from('strength_sessions')
      .select('exercises, date')
      .gte('date', isoDate(sevenAgo))
      .lte('date', isoDate(today));
    const sessions = (sessRaw as Pick<StrengthSession, 'exercises' | 'date'>[] | null) ?? [];

    const usedIds = new Set<string>();
    for (const s of sessions) {
      const exs = Array.isArray(s.exercises) ? s.exercises : [];
      for (const e of exs as StrengthExerciseEntry[]) {
        if (e.exercise_id) usedIds.add(e.exercise_id);
      }
    }

    const muscles: Record<string, number> = {};
    const tendons: Record<string, number> = {};
    const patterns: Record<string, number> = {};
    const exercisesByMuscle: Record<string, Set<string>> = {};
    const exercisesByTendon: Record<string, Set<string>> = {};
    const exercisesByPattern: Record<string, Set<string>> = {};

    if (usedIds.size > 0) {
      const { data: exsRaw } = await supabase
        .from('exercises')
        .select('id, name_sl, name_en, primary_muscles, secondary_muscles, tendons, movement_patterns')
        .in('id', Array.from(usedIds));
      const exs = (exsRaw as Pick<Exercise, 'id' | 'name_sl' | 'name_en' | 'primary_muscles' | 'secondary_muscles' | 'tendons' | 'movement_patterns'>[] | null) ?? [];

      // For each session × exercise: count hits
      for (const s of sessions) {
        const sessionExs = Array.isArray(s.exercises) ? s.exercises : [];
        for (const se of sessionExs as StrengthExerciseEntry[]) {
          const ex = exs.find(e => e.id === se.exercise_id);
          if (!ex) continue;
          const label = ex.name_sl ?? ex.name_en;
          for (const m of ex.primary_muscles) {
            muscles[m] = (muscles[m] ?? 0) + 1;
            (exercisesByMuscle[m] ??= new Set()).add(label);
          }
          for (const m of ex.secondary_muscles ?? []) {
            muscles[m] = (muscles[m] ?? 0) + 0.5;
            (exercisesByMuscle[m] ??= new Set()).add(label);
          }
          for (const t of ex.tendons ?? []) {
            tendons[t] = (tendons[t] ?? 0) + 1;
            (exercisesByTendon[t] ??= new Set()).add(label);
          }
          for (const p of ex.movement_patterns) {
            patterns[p] = (patterns[p] ?? 0) + 1;
            (exercisesByPattern[p] ??= new Set()).add(label);
          }
        }
      }
    }

    setData({ muscles, tendons, patterns, exercisesByMuscle, exercisesByTendon, exercisesByPattern });
    setLoading(false);
  };

  const selectedExercises = useMemo(() => {
    if (!selectedTarget || !data) return [];
    const map = selectedTarget.kind === 'muscle' ? data.exercisesByMuscle
      : selectedTarget.kind === 'tendon' ? data.exercisesByTendon
      : data.exercisesByPattern;
    return Array.from(map[selectedTarget.name] ?? []);
  }, [selectedTarget, data]);

  if (!isOpen) return null;

  const renderCell = (kind: 'muscle' | 'tendon' | 'pattern', name: string, label: string) => {
    if (!data) return null;
    const count = (kind === 'muscle' ? data.muscles : kind === 'tendon' ? data.tendons : data.patterns)[name] ?? 0;
    return (
      <button
        key={name}
        onClick={() => setSelectedTarget({ kind, name })}
        className={`text-[10px] sm:text-xs font-medium border rounded px-1.5 py-1 leading-tight ${cellColor(count)}`}
        title={`${name}: ${count}× zadnjih 7 dni`}
      >
        {label}
        <span className="ml-1 font-mono">{count % 1 === 0 ? count : count.toFixed(1)}</span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Anatomska pokritost</h2>
              <p className="text-xs text-gray-500">Zadnjih 7 dni iz strength sesij</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="text-xs text-gray-500 flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> ≥2× (dobro)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300" /> 1× (OK)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" /> 0× (gap)</span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 text-center py-6">Nalagam…</div>
          ) : !data ? (
            <div className="text-sm text-gray-500 text-center py-6">Ni podatkov.</div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {MUSCLE_GROUPS.map(g => (
                  <div key={g.label}>
                    <div className="text-[11px] text-gray-500 mb-1">{g.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {g.items.map(m => renderCell('muscle', m, MUSCLE_LABELS[m] ?? m))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="text-[11px] text-gray-500 mb-1">Tetive</div>
                <div className="flex flex-wrap gap-1">
                  {TENDONS.map(t => renderCell('tendon', t, TENDON_LABELS[t] ?? t))}
                </div>
              </div>

              <div className="space-y-2">
                {PATTERN_GROUPS.map(g => (
                  <div key={g.label}>
                    <div className="text-[11px] text-gray-500 mb-1">{g.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {g.items.map(p => renderCell('pattern', p, PATTERN_LABELS[p] ?? p))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTarget && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">{selectedTarget.name}</span>
                      <span className="text-gray-500 ml-1">— vaje zadnjih 7 dni:</span>
                    </div>
                    <button
                      onClick={() => setSelectedTarget(null)}
                      className="text-xs text-gray-500 hover:bg-gray-200 px-1.5 py-0.5 rounded"
                    >
                      ✕
                    </button>
                  </div>
                  {selectedExercises.length === 0 ? (
                    <div className="text-xs text-gray-500">Nobena vaja v zadnjih 7 dneh ne targeta tega.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedExercises.map(name => (
                        <span key={name} className="text-xs bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-700">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
