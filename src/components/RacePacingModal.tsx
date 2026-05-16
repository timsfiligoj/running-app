import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PhaseConfig } from '../types';

interface RacePacingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RaceDistance = '5K' | '10K' | 'HM' | 'Marathon';

const RACE_DISTANCES: Record<RaceDistance, number> = {
  '5K': 5.0,
  '10K': 10.0,
  HM: 21.0975,
  Marathon: 42.195,
};

function paceSecToLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function paceLabelToSec(str: string): number | null {
  const m = str.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];
  return `${d}. ${months[m - 1]} ${y}`;
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  const t0 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t0 - today) / 86400000);
}

export function RacePacingModal({ isOpen, onClose }: RacePacingModalProps) {
  const [phases, setPhases] = useState<PhaseConfig[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [distance, setDistance] = useState<RaceDistance>('HM');
  const [paceText, setPaceText] = useState('4:16');
  const [paceError, setPaceError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'even' | 'negative' | 'positive'>('even');

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const load = async () => {
    const { data } = await supabase
      .from('phase_config')
      .select('*')
      .not('key_race', 'is', null)
      .order('start_date', { ascending: true });
    const rows = (data as PhaseConfig[] | null) ?? [];
    setPhases(rows);
    // Auto-select first future race
    const today = new Date().toISOString().slice(0, 10);
    const futureFirst = rows.find(r => r.end_date >= today);
    if (futureFirst?.id) {
      setSelectedPhaseId(futureFirst.id);
      if (futureFirst.hm_pace_seconds) {
        setPaceText(paceSecToLabel(futureFirst.hm_pace_seconds));
      }
    }
  };

  const selectedPhase = useMemo(() => phases.find(p => p.id === selectedPhaseId) ?? null, [phases, selectedPhaseId]);

  useEffect(() => {
    if (selectedPhase?.hm_pace_seconds) {
      setPaceText(paceSecToLabel(selectedPhase.hm_pace_seconds));
    }
  }, [selectedPhase?.id]);

  const paceSeconds = useMemo(() => {
    const p = paceLabelToSec(paceText);
    if (p == null) {
      setPaceError('Format: mm:ss (npr. 4:16)');
      return null;
    }
    setPaceError(null);
    return p;
  }, [paceText]);

  const totalKm = RACE_DISTANCES[distance];
  const splits = useMemo(() => {
    if (paceSeconds == null) return [];
    const out: { km: number; splitSec: number; cumulSec: number }[] = [];
    const fullKm = Math.floor(totalKm);
    let cumul = 0;
    for (let i = 1; i <= fullKm; i++) {
      let pace = paceSeconds;
      if (strategy === 'negative') {
        // Start +3s/km slower, end -3s/km faster, linear
        const factor = ((i - 1) / Math.max(fullKm - 1, 1) - 0.5) * 6; // -3 to +3
        pace = paceSeconds - factor; // first km slower (positive factor), last km faster (negative factor)
      } else if (strategy === 'positive') {
        const factor = ((i - 1) / Math.max(fullKm - 1, 1) - 0.5) * 6;
        pace = paceSeconds + factor;
      }
      cumul += pace;
      out.push({ km: i, splitSec: pace, cumulSec: cumul });
    }
    // Final partial km (e.g., HM 0.0975 km)
    const frac = totalKm - fullKm;
    if (frac > 0.01) {
      const pace = paceSeconds;
      const splitSec = pace * frac;
      cumul += splitSec;
      out.push({ km: totalKm, splitSec, cumulSec: cumul, /* partial flag implicit via km */ });
    }
    return out;
  }, [paceSeconds, totalKm, strategy]);

  const totalTime = splits.length ? splits[splits.length - 1].cumulSec : 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Race pacing</h2>
              <p className="text-xs text-gray-500">Km splits @ goal pace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tekma</label>
              <select
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="">— ročni vnos —</option>
                {phases.map(p => (
                  <option key={p.id} value={p.id ?? ''}>
                    {p.key_race} ({p.end_date})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Razdalja</label>
              <select
                value={distance}
                onChange={(e) => setDistance(e.target.value as RaceDistance)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="5K">5K (5.0 km)</option>
                <option value="10K">10K (10.0 km)</option>
                <option value="HM">HM (21.0975 km)</option>
                <option value="Marathon">Marathon (42.195 km)</option>
              </select>
            </div>
          </div>

          {selectedPhase && (
            <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-gray-900">{selectedPhase.key_race}</div>
                  <div className="text-xs text-gray-600">{dateLabel(selectedPhase.end_date)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-700">
                    {daysUntil(selectedPhase.end_date) >= 0 ? daysUntil(selectedPhase.end_date) : 'opravljena'}
                  </div>
                  <div className="text-xs text-gray-500">{daysUntil(selectedPhase.end_date) >= 0 ? 'dni' : ''}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal pace (mm:ss)</label>
              <input
                type="text"
                value={paceText}
                onChange={(e) => setPaceText(e.target.value)}
                placeholder="4:16"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
              />
              {paceError && <div className="text-xs text-red-600 mt-1">{paceError}</div>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Strategija</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="even">Even (konstantno)</option>
                <option value="negative">Negative split (drugi del hitreje)</option>
                <option value="positive">Positive split (prvi del hitreje)</option>
              </select>
            </div>
          </div>

          {paceSeconds != null && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Pričakovan rezultat</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{formatTotalTime(totalTime)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalKm.toFixed(2)} km @ avg {paceSecToLabel(paceSeconds)}/km
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-700">Km</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-gray-700">Split</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-gray-700">Kumulativno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((s, i) => {
                      const isPartial = s.km !== Math.floor(s.km);
                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1 font-mono">{isPartial ? s.km.toFixed(2) : s.km}</td>
                          <td className="px-2 py-1 text-right font-mono">
                            {isPartial ? `${formatTotalTime(s.splitSec)} (frac)` : paceSecToLabel(s.splitSec)}
                          </td>
                          <td className="px-2 py-1 text-right font-mono font-bold text-gray-800">
                            {formatTotalTime(s.cumulSec)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
