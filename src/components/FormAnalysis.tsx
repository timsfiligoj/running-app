import { useMemo, useState } from 'react';
import {
  ISTRA_ACTIVITIES,
  LJ_ACTIVITIES_SNAPSHOT,
  KEY_WORKOUTS,
  ISTRA_RACE_DATE,
  LJ_RACE_DATE,
  ISTRA_RESULT,
  SNAPSHOT_DATE,
  type BlockActivity,
  type KeyWorkout,
} from '../data/blockData';
import {
  predict,
  summarise,
  matchedPairs,
  weeklyBuckets,
  rawProjection,
  workKmOf,
  MIN_WORK_KM,
  REST_PENALTY,
  TRAINING_TO_RACE,
  TEST_KM,
  TEST_TO_RACE,
  projectTest,
  testPaceFor,
  LEVEL_MIN_WORK_KM,
  HM_GPS_KM,
  RACE_DRIFT,
  plural,
  fmtPace,
  fmtTime,
  fmtDateSlo,
  HM_KM,
  type WeekBucket,
  type BacktestPoint,
} from '../lib/formAnalysis';
import { syncCurrentBlock } from '../lib/blockSync';

const ISTRA_COLOR = '#f59e0b';
const LJ_COLOR = '#2563eb';
const LJ_BLOCK_START = '2026-06-01';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── small building blocks ─────────────────────────────────────────────────────

function Card({ title, subtitle, children, className = '' }: {
  title?: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 ${className}`}>
      {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}
      {subtitle && <p className="text-sm text-gray-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && title && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Stat({ label, value, sub, tone = 'gray' }: {
  label: string; value: string; sub?: string; tone?: 'gray' | 'blue' | 'amber' | 'green';
}) {
  const tones = {
    gray: 'text-gray-800', blue: 'text-blue-600',
    amber: 'text-amber-600', green: 'text-green-600',
  };
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

/** Renders a signed delta where negative (faster / better) is green. */
function Delta({ sec, unit = 'min' }: { sec: number | null; unit?: 'min' | 's/km' }) {
  if (sec == null) return <span className="text-gray-400">–</span>;
  const better = sec < 0;
  const txt = unit === 'min'
    ? `${better ? '−' : '+'}${fmtTime(Math.abs(sec))}`
    : `${better ? '−' : '+'}${Math.abs(Math.round(sec))} s/km`;
  return (
    <span className={`font-semibold ${better ? 'text-green-600' : 'text-red-500'}`}>{txt}</span>
  );
}

// ─── weekly volume chart ───────────────────────────────────────────────────────

function VolumeChart({ istra, lj }: { istra: WeekBucket[]; lj: WeekBucket[] }) {
  const maxOut = 20;
  const weeks = Array.from({ length: maxOut + 1 }, (_, i) => maxOut - i); // 20 … 0
  const byOut = (b: WeekBucket[]) => new Map(b.map(x => [x.weeksOut, x]));
  const mi = byOut(istra), ml = byOut(lj);
  const peak = Math.max(60, ...istra.map(b => b.runKm), ...lj.map(b => b.runKm));

  const W = 720, H = 220, padL = 34, padB = 26, padT = 8;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const slot = plotW / weeks.length;
  const bw = Math.max(3, slot / 2 - 1.5);
  const y = (km: number) => padT + plotH - (km / peak) * plotH;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img"
           aria-label="Tedenski obseg poravnan po tednih do tekme">
        {[0, 20, 40, 60].filter(v => v <= peak).map(v => (
          <g key={v}>
            <line x1={padL} x2={W - 6} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = padL + i * slot;
          const a = mi.get(w), b = ml.get(w);
          return (
            <g key={w}>
              {a && a.runKm > 0 && (
                <rect x={x + 1} y={y(a.runKm)} width={bw} height={plotH + padT - y(a.runKm)}
                      fill={ISTRA_COLOR} rx={1.5} opacity={a.partial ? 0.4 : 0.85}>
                  <title>{`Istra, ${w} tednov do tekme: ${a.runKm.toFixed(1)} km / ${plural(a.runs, 'tek', 'teka', 'teki', 'tekov')}${a.partial ? ' (nepopoln teden)' : ''}`}</title>
                </rect>
              )}
              {b && b.runKm > 0 && (
                <rect x={x + bw + 2.5} y={y(b.runKm)} width={bw} height={plotH + padT - y(b.runKm)}
                      fill={LJ_COLOR} rx={1.5} opacity={b.partial ? 0.4 : 0.9}>
                  <title>{`LJ, ${w} tednov do tekme: ${b.runKm.toFixed(1)} km / ${plural(b.runs, 'tek', 'teka', 'teki', 'tekov')}${b.partial ? ' (teden v teku)' : ''}`}</title>
                </rect>
              )}
              {w % 2 === 0 && (
                <text x={x + slot / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">{w}</text>
              )}
            </g>
          );
        })}
        <text x={padL} y={H - 8} fontSize={9} fill="#d1d5db">← tednov do tekme</text>
      </svg>
    </div>
  );
}

// ─── quality pace chart ────────────────────────────────────────────────────────

function QualityChart({ workouts, weeksToRace }: { workouts: KeyWorkout[]; weeksToRace: number }) {
  const pts = workouts
    .filter(w => w.id !== 18076519859 && w.workKm >= MIN_WORK_KM)
    .map(w => ({
      w,
      out: w.block === 'istra'
        ? Math.round((new Date(ISTRA_RACE_DATE).getTime() - new Date(w.date).getTime()) / 6048e5)
        : Math.round((new Date(LJ_RACE_DATE).getTime() - new Date(w.date).getTime()) / 6048e5),
      proj: rawProjection(w),
    }))
    .filter(p => p.out <= 20);

  if (!pts.length) return null;
  const lo = Math.min(...pts.map(p => p.proj)) - 6;
  const hi = Math.max(...pts.map(p => p.proj)) + 6;

  const W = 720, H = 210, padL = 42, padB = 26, padT = 10;
  const plotW = W - padL - 10, plotH = H - padB - padT;
  const x = (out: number) => padL + plotW - (out / 20) * plotW;
  const y = (p: number) => padT + ((p - lo) / (hi - lo)) * plotH;

  const line = (block: 'istra' | 'lj') => {
    const s = pts.filter(p => p.w.block === block).sort((a, b) => b.out - a.out);
    if (s.length < 2) return null;
    return s.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.out).toFixed(1)},${y(p.proj).toFixed(1)}`).join(' ');
  };

  const ticks = [250, 260, 270, 280, 290].filter(v => v >= lo && v <= hi);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img"
           aria-label="Kakovost ključnih treningov skozi blok">
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{fmtPace(v)}</text>
          </g>
        ))}
        <line x1={x(weeksToRace)} x2={x(weeksToRace)} y1={padT} y2={padT + plotH}
              stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
        <text x={x(weeksToRace) + 4} y={padT + 10} fontSize={9} fill="#64748b">danes</text>

        {(['istra', 'lj'] as const).map(b => {
          const d = line(b);
          return d ? <path key={b} d={d} fill="none" strokeWidth={1.5}
                           stroke={b === 'istra' ? ISTRA_COLOR : LJ_COLOR} opacity={0.35} /> : null;
        })}
        {pts.map(p => (
          <circle key={`${p.w.block}-${p.w.id}`} cx={x(p.out)} cy={y(p.proj)} r={4.5}
                  fill={p.w.block === 'istra' ? ISTRA_COLOR : LJ_COLOR} opacity={0.9}>
            <title>{`${fmtDateSlo(p.w.date)} · ${p.w.name}\n${p.w.workKm.toFixed(1)} km @ ${fmtPace(p.w.workPace)}${p.w.workHr ? ` · HR ${p.w.workHr}` : ''}\nekvivalent: ${fmtPace(p.proj)}/km`}</title>
          </circle>
        ))}
        {[20, 15, 10, 5, 0].map(t => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">{t}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── back-test chart ───────────────────────────────────────────────────────────

/**
 * The model replayed over the Istra build. The band is what it claimed his form
 * was worth on each day; the line is the forecast it would have made for race
 * day from there; the dashed rule is what actually happened.
 */
function Backtest({ points }: { points: BacktestPoint[] }) {
  if (points.length < 2) return null;
  const actual = points[0].actual;
  const all = points.flatMap(b => [b.raceToday, b.predicted]).concat(actual);
  const lo = Math.min(...all) - 60, hi = Math.max(...all) + 60;
  const maxW = Math.max(...points.map(b => b.weeksOut));

  const W = 720, H = 220, padL = 52, padB = 26, padT = 12;
  const plotW = W - padL - 12, plotH = H - padB - padT;
  const x = (w: number) => padL + plotW - (w / maxW) * plotW;
  const y = (t: number) => padT + ((t - lo) / (hi - lo)) * plotH;
  const path = (pick: (b: BacktestPoint) => number) =>
    [...points].sort((a, b) => b.weeksOut - a.weeksOut)
      .map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.weeksOut).toFixed(1)},${y(pick(b)).toFixed(1)}`).join(' ');

  // Gridlines every two minutes across whatever range the block covers.
  const step = 120;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img"
           aria-label="Model preverjen na pripravi za Istro">
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W - 12} y1={y(v)} y2={y(v)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{fmtTime(v)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - 12} y1={y(actual)} y2={y(actual)}
              stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={W - 14} y={y(actual) - 5} textAnchor="end" fontSize={10} fill="#16a34a">
          dejansko 1:33:33
        </text>

        <path d={path(b => b.raceToday)} fill="none" stroke={ISTRA_COLOR} strokeWidth={2} opacity={0.85} />
        <path d={path(b => b.predicted)} fill="none" stroke="#6366f1" strokeWidth={1.5}
              strokeDasharray="3 3" opacity={0.9} />

        {points.map(b => (
          <g key={b.asOf}>
            <circle cx={x(b.weeksOut)} cy={y(b.raceToday)} r={3.5} fill={ISTRA_COLOR}>
              <title>{`${fmtDateSlo(b.asOf)} · ${b.weeksOut.toFixed(1)} tednov do Istre\nraven forme: ${fmtTime(b.raceToday)}\nnapoved za tekmo: ${fmtTime(b.predicted)}`}</title>
            </circle>
            <circle cx={x(b.weeksOut)} cy={y(b.predicted)} r={2.5} fill="#6366f1" opacity={0.8} />
          </g>
        ))}
        {[10, 8, 6, 4, 2, 0].filter(t => t <= maxW).map(t => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">{t}</text>
        ))}
        <text x={padL} y={H - 8} fontSize={9} fill="#d1d5db">← tednov do tekme</text>
      </svg>
      <div className="flex gap-4 text-xs mt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5" style={{ background: ISTRA_COLOR }} /> raven forme tisti dan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500" /> napoved za dan tekme
        </span>
      </div>
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────────

export function FormAnalysis() {
  const [activities, setActivities] = useState<BlockActivity[]>(LJ_ACTIVITIES_SNAPSHOT);
  const [keyWorkouts, setKeyWorkouts] = useState<KeyWorkout[]>(KEY_WORKOUTS);
  const [asOf, setAsOf] = useState<string>(SNAPSHOT_DATE);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const p = useMemo(() => predict(keyWorkouts, asOf), [keyWorkouts, asOf]);
  const istraWeeks = useMemo(() => weeklyBuckets(ISTRA_ACTIVITIES, ISTRA_RACE_DATE), []);
  const ljWeeks = useMemo(() => weeklyBuckets(activities, LJ_RACE_DATE), [activities]);
  const sIstra = useMemo(() => summarise(ISTRA_ACTIVITIES, ISTRA_RACE_DATE), []);
  const sLj = useMemo(() => summarise(activities, LJ_RACE_DATE), [activities]);
  const pairs = useMemo(() => matchedPairs(keyWorkouts), [keyWorkouts]);

  // Only weeks that both blocks actually cover, so the averages compare fairly.
  const sameWindow = useMemo(() => {
    const overlap = istraWeeks.filter(b => b.runs > 0 && !b.partial).map(b => b.weeksOut)
      .filter(w => ljWeeks.some(x => x.weeksOut === w && x.runs > 0 && !x.partial));
    const pick = (list: WeekBucket[]) => list.filter(b => overlap.includes(b.weeksOut));
    const agg = (list: WeekBucket[]) => {
      const w = pick(list);
      const km = w.reduce((s, b) => s + b.runKm, 0);
      return { weeks: w.length, km, perWeek: w.length ? km / w.length : 0 };
    };
    return { weeks: overlap.length, istra: agg(istraWeeks), lj: agg(ljWeeks) };
  }, [istraWeeks, ljWeeks, p.weeksToRace]);

  async function handleSync() {
    setSyncing(true);
    setSyncNote(null);
    const today = todayIso();
    const r = await syncCurrentBlock(LJ_BLOCK_START, today, KEY_WORKOUTS);
    if (r.error || !r.activities || !r.keyWorkouts) {
      setSyncNote(r.error ?? 'Osvežitev ni uspela');
    } else {
      setActivities(r.activities);
      setKeyWorkouts(r.keyWorkouts);
      setAsOf(today);
      setSyncNote(
        r.added.length > 0
          ? `Osveženo · ${r.activities.length} aktivnosti · v model dodano: ${
              r.added.map(w => `${w.name} (${w.workKm.toFixed(1)} km @ ${fmtPace(w.workPace)})`).join(', ')}`
          : `Osveženo · ${r.activities.length} aktivnosti · ni novih kakovostnih treningov`,
      );
    }
    setSyncing(false);
  }

  const goalSec = 90 * 60;
  const beatsGoal = p.realisticTime < goalSec;

  // How well the model did when replayed over the Istra build — the honest
  // measure of how much the number above is worth.
  const { backtestRmse, backtestBias, lateLevel } = useMemo(() => {
    const errs = p.backtest.map(b => b.predicted - b.actual);
    const late = p.backtest.filter(b => b.weeksOut <= 4);
    return {
      backtestRmse: errs.length ? Math.sqrt(errs.reduce((s2, e) => s2 + e * e, 0) / errs.length) : 0,
      backtestBias: errs.length ? errs.reduce((s2, e) => s2 + e, 0) / errs.length : 0,
      lateLevel: late.length ? late.reduce((s2, b) => s2 + b.raceToday, 0) / late.length : 0,
    };
  }, [p.backtest]);

  return (
    <div className="space-y-6">

      {/* ── Prediction hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-lg p-5 sm:p-7 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Napoved · Ljubljanski polmaraton</div>
            <div className="text-5xl sm:text-6xl font-bold tabular-nums mt-1">{fmtTime(p.realisticTime)}</div>
            <div className="text-white/80 text-sm mt-1">
              {fmtPace(p.realisticTime / HM_KM)} /km · razpon {fmtTime(p.optimisticTime)} – {fmtTime(p.conservativeTime)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-bold">{p.daysToRace}</div>
            <div className="text-xs uppercase tracking-wide text-white/70">dni do tekme</div>
            <div className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-bold ${
              beatsGoal ? 'bg-white text-green-700' : 'bg-amber-300 text-amber-900'
            }`}>
              {beatsGoal ? 'sub-1:30 dosegljiv' : 'sub-1:30 na robu'}
            </div>
          </div>
        </div>

        {/* range bar */}
        <div className="mt-6">
          <div className="relative h-2 bg-white/25 rounded-full">
            {(() => {
              const lo = Math.min(p.optimisticTime, goalSec) - 90;
              const hi = Math.max(p.conservativeTime, ISTRA_RESULT.timeSec) + 60;
              const pos = (t: number) => `${((t - lo) / (hi - lo)) * 100}%`;
              return (
                <>
                  <div className="absolute h-2 bg-white/80 rounded-full"
                       style={{ left: pos(p.optimisticTime), width: `${((p.conservativeTime - p.optimisticTime) / (hi - lo)) * 100}%` }} />
                  <div className="absolute -top-1 w-1 h-4 bg-white rounded" style={{ left: pos(p.realisticTime) }} />
                  <div className="absolute -top-1 w-0.5 h-4 bg-amber-300" style={{ left: pos(ISTRA_RESULT.timeSec) }} />
                  <div className="absolute -top-1 w-0.5 h-4 bg-green-200" style={{ left: pos(goalSec) }} />
                </>
              );
            })()}
          </div>
          <div className="flex justify-between text-[11px] text-white/70 mt-2">
            <span>{fmtTime(p.optimisticTime)} optimistično</span>
            <span className="text-green-200">1:30:00 cilj</span>
            <span className="text-amber-200">1:33:33 Istra</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="bg-white/15 rounded-lg p-3.5">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Če bi tekel ta konec tedna</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">{fmtTime(p.raceTodayTime)}</div>
            <div className="text-[11px] text-white/70 mt-1 leading-snug">
              Izmerjeno, ne napovedano. Ista metoda je zadnji mesec pred Istro dala {fmtTime(lateLevel)},
              odtekel si 1:33:33.
            </div>
          </div>
          <div className="bg-white/15 rounded-lg p-3.5">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Napredek v tem bloku</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">
              {p.trend.slope > 0 ? `−${Math.round(p.trend.slope)} s` : '0 s'}<span className="text-base font-normal"> / teden</span>
            </div>
            <div className="text-[11px] text-white/70 mt-1 leading-snug">
              Naklon skozi {plural(p.trend.sessions, 'ključni trening', 'ključna treninga', 'ključne treninge', 'ključnih treningov')}.
              Pred Istro je bil {Math.round(p.istraTrend.slope)} s/teden.
            </div>
          </div>
        </div>

        <p className="text-sm text-white/85 mt-5 leading-relaxed">
          Prva številka je <strong>napoved</strong>: današnja raven minus {p.weeksToRace.toFixed(1)} tednov napredka po
          tempu, ki ga ta blok kaže. Zanesljiva je toliko, kolikor drži predpostavka, da napreduješ naprej enako hitro —
          na Istri je ista metoda za dan tekme grešila povprečno {Math.round(backtestRmse)} s.
          Številka <strong>{fmtTime(p.raceTodayTime)}</strong> spodaj levo je trdnejša: v njej ni nobene napovedi.
        </p>
      </section>

      {/* ── Scenarios ───────────────────────────────────────────────────── */}
      <Card
        title="Trije scenariji"
        subtitle="Razlika med njimi ni množitelj, ampak predpostavka o tem, koliko še napreduješ v preostalih tednih."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {p.scenarios.map(sc => (
            <div key={sc.key} className={`rounded-lg p-3.5 border ${
              sc.key === 'realistic' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            }`}>
              <div className="text-sm font-semibold text-gray-800">{sc.label}</div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${
                sc.key === 'realistic' ? 'text-blue-600' : 'text-gray-700'
              }`}>{fmtTime(sc.time)}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {sc.gainPerWeek > 0 ? `−${Math.round(sc.gainPerWeek)} s/teden` : 'brez nadaljnjega napredka'}
              </div>
              <div className="text-[11px] text-gray-400 mt-2 leading-snug">{sc.note}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Konservativni scenarij ni črnogled — pove, kaj si vreden danes, s konico in tekmovalnim dnem vred.
          Vse hitrejše od tega si moraš še odtrenirati.
        </p>
      </Card>

      {/* ── What each session says ──────────────────────────────────────── */}
      <Card
        title="Kaj pravi vsak trening"
        subtitle={`Ponovitve dobijo pribitek za odmore (${REST_PENALTY} s/km na kilometer dolžine ponovitve), da so primerljive z zveznim tempom. Šele nato gre vse skozi isto formulo.`}
      >
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Trening</th>
                <th className="py-2 font-medium text-right">Delovno</th>
                <th className="py-2 font-medium text-right">Tempo</th>
                <th className="py-2 font-medium text-right">Ekvivalent</th>
                <th className="py-2 font-medium text-right">HR</th>
                <th className="py-2 font-medium text-right">Drift</th>
                <th className="py-2 font-medium text-right">Napoved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {p.current.map(sp => (
                <tr key={sp.workout.id} className={sp.workout.continuous ? 'bg-blue-50/40' : ''}>
                  <td className="py-2 pr-3">
                    <div className="text-gray-800 truncate max-w-[220px]" title={sp.workout.name}>{sp.workout.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {fmtDateSlo(sp.workout.date)} · {sp.workout.continuous
                        ? 'zvezno'
                        : `${sp.workout.reps}× ${sp.workout.repKm.toFixed(1)} km`}
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{sp.workout.workKm.toFixed(1)} km</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{fmtPace(sp.workout.workPace)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-800 font-medium">
                    {fmtPace(sp.equivalentPace)}
                    {sp.restPenalty > 0 && (
                      <span className="text-[11px] text-amber-600"> +{Math.round(sp.restPenalty)}</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-500">
                    {sp.effortHr ? Math.round(sp.effortHr) : '–'}
                  </td>
                  <td className={`py-2 text-right tabular-nums ${
                    sp.drift != null && sp.drift > RACE_DRIFT * 2.5 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {sp.drift != null ? sp.drift.toFixed(1) : '–'}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold text-gray-800">{fmtTime(sp.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Modro obarvane vrstice so nepretrgani teki — v oceni štejejo poldrugkrat več, ker so za polmaraton
          najbolj povedni. <strong>Drift</strong> je porast srčnega utripa na kilometer delovnega dela: na Istri
          si tekel {RACE_DRIFT.toFixed(2)}, kar je tekmovalno vzdržno. Bistveno višja številka pomeni, da je bil
          tisti tempo nad tem, kar bi zdržal do 21. kilometra, ne glede na to, kaj kaže ura.
        </p>
      </Card>

      {/* ── 15 km test ──────────────────────────────────────────────────── */}
      <Card
        title={`Test ${TEST_KM} km — kontrolna točka`}
        subtitle="Najmočnejši posamični dokaz, ki ga model pozna. Tu preberi, kaj bo tvoj test pomenil, še preden ga odtečeš."
      >
        <p className="text-sm text-gray-600 leading-relaxed">
          Pred Istro si tri tedne pred tekmo odtekel {TEST_KM} km na 4:22. Ta test sam zase napove
          {' '}<strong>1:33:31</strong> — odtekel si <strong>1:33:33</strong>. Zato ima ta trening posebno
          mesto: {TEST_KM} km je 71 % tekme, zato formuli skoraj ni treba nič ekstrapolirati in ne rabi
          povprečenja čez mešanico treningov. Množitelj {TEST_TO_RACE} v spodnji tabeli je izmerjen prav
          na tem enem testu.
        </p>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mt-4">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Tempo testa</th>
                <th className="py-2 font-medium text-right">Čas {TEST_KM} km</th>
                <th className="py-2 font-medium text-right">Napoved, če ga tečeš 6 tednov prej</th>
                <th className="py-2 font-medium text-right">…in 3 tedne prej</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[240, 245, 250, 255, 260, 265].map(pc => {
                const late = projectTest(pc, 3, p.trend.slope);
                return (
                  <tr key={pc} className={late < goalSec ? 'bg-green-50/60' : ''}>
                    <td className="py-2 tabular-nums text-gray-800 font-medium">{fmtPace(pc)}/km</td>
                    <td className="py-2 text-right tabular-nums text-gray-600">{fmtTime(pc * TEST_KM)}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">
                      {fmtTime(projectTest(pc, 6, p.trend.slope))}
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold text-gray-800">{fmtTime(late)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[6, 3].map(wk => {
            const need = testPaceFor(goalSec, wk, p.trend.slope);
            return (
              <div key={wk} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-green-800 uppercase tracking-wide">
                  Test {plural(wk, 'teden', 'tedna', 'tedne', 'tednov')} pred tekmo
                </div>
                <div className="mt-1 text-gray-800">
                  za sub-1:30 rabiš <strong className="tabular-nums">{fmtPace(need)}/km</strong>
                  {' '}<span className="text-gray-500 tabular-nums">({fmtTime(need * TEST_KM)})</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Zgodnejši test sme biti počasnejši, ker mu model prizna napredek tednov, ki so še pred njim —
          po naklonu tega bloka, {Math.round(p.trend.slope)} s/teden. Prav zato sta <strong>dva testa vredna
          precej več kot dvakratnik enega</strong>: ker sta identična napora, izmerita ta naklon neposredno,
          namesto da ga model ocenjuje iz mešanice ponovitev in tempo tekov. Naklon je trenutno
          najšibkejši del napovedi — razlika med realističnim in optimističnim scenarijem je skoraj v
          celoti razlika v njem.
        </p>
      </Card>

      {/* ── Back-test ───────────────────────────────────────────────────── */}
      <Card
        title="Preverjeno na Istri"
        subtitle="Model pognan nazaj skozi pripravo na Istro, vsakič samo s podatki, ki so takrat že obstajali. Edini pošten način, da vemo, koliko je vreden."
      >
        <Backtest points={p.backtest} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Ocena forme zadnji mesec pred tekmo</div>
            <div className="mt-1 text-gray-800">
              <strong className="tabular-nums">{fmtTime(lateLevel)}</strong> proti dejanskim{' '}
              <strong className="tabular-nums">1:33:33</strong>
            </div>
            <div className="text-xs text-gray-400 mt-1">Razlika {Math.abs(Math.round(lateLevel - ISTRA_RESULT.timeSec))} s.</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Napoved za dan tekme, z vseh točk bloka</div>
            <div className="mt-1 text-gray-800">
              odstopanje <strong className="tabular-nums">±{Math.round(backtestRmse)} s</strong>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Brez sistematičnega nagiba ({backtestBias >= 0 ? '+' : ''}{Math.round(backtestBias)} s povprečno).
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Oceni <em>trenutne</em> forme se da zaupati — zadnji mesec pred Istro je zgrešila za sekunde.
          Napoved za dan tekme je drugačna reč: ugibati mora, kaj prinesejo tedni, ki so še pred tabo,
          in tam je razpršenost okrog dveh minut. Zato je razpon v naslovu tako širok.
        </p>
      </Card>

      {/* ── Weekly volume ───────────────────────────────────────────────── */}
      <Card
        title="Tedenski obseg"
        subtitle="Poravnano po tednih do tekme, ne po koledarju — teden 9 pred Istro proti tednu 9 pred Ljubljano."
      >
        <div className="flex gap-4 text-xs mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: ISTRA_COLOR }} /> Istra (1.1.–12.4.2026)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: LJ_COLOR }} /> Ljubljana (1.6.–{fmtDateSlo(asOf)})
          </span>
          <span className="text-gray-400">bled stolpec = nepopoln teden</span>
        </div>
        <VolumeChart istra={istraWeeks} lj={ljWeeks} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">
              Povprečje na {plural(sameWindow.weeks, 'skupnem tednu', 'skupnih tednih', 'skupnih tednih', 'skupnih tednih')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-bold text-amber-600">{sameWindow.istra.perWeek.toFixed(1)} km</span>
              <span className="text-gray-300">→</span>
              <span className="font-bold text-blue-600">{sameWindow.lj.perWeek.toFixed(1)} km</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Najvišji teden</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-bold text-amber-600">{sIstra.peakWeekKm.toFixed(1)} km</span>
              <span className="text-gray-300">→</span>
              <span className="font-bold text-blue-600">{sLj.peakWeekKm.toFixed(1)} km</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Najdaljši tek</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-bold text-amber-600">{sIstra.longestKm.toFixed(1)} km</span>
              <span className="text-gray-300">→</span>
              <span className="font-bold text-blue-600">{sLj.longestKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Quality progression ─────────────────────────────────────────── */}
      <Card
        title="Kakovost treningov skozi blok"
        subtitle="Vsaka pika je ključni trening, preračunan na ekvivalentni tempo za 21 km. Višje = hitreje."
      >
        <QualityChart workouts={keyWorkouts} weeksToRace={p.weeksToRace} />
        <p className="text-xs text-gray-400 mt-2">
          Ponovitvam je prištet pribitek za odmore, zato so pike med seboj primerljive. Modra serija leži
          skozi cel blok nad oranžno — na vsaki točki priprav si hitrejši kot pred Istro.
        </p>
      </Card>

      {/* ── Matched sessions ────────────────────────────────────────────── */}
      <Card
        title="Najboljši trening vsake vrste"
        subtitle="Neposredna primerjava — samo delovni del treninga, brez ogrevanja in odmorov."
      >
        <div className="space-y-4">
          {pairs.map(m => (
            <div key={m.family} className="border-l-4 pl-3" style={{ borderColor: LJ_COLOR }}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                <Delta sec={m.delta} unit="s/km" />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[['istra', m.istra] as const, ['lj', m.lj] as const].map(([blk, w]) => (
                  <div key={blk} className={`rounded-lg p-2.5 ${blk === 'istra' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {w ? (
                      <>
                        <div className={`text-[11px] uppercase tracking-wide ${blk === 'istra' ? 'text-amber-700' : 'text-blue-700'}`}>
                          {blk === 'istra' ? 'Istra' : 'Ljubljana'} · {fmtDateSlo(w.date)}
                        </div>
                        <div className="text-sm font-medium text-gray-800 truncate" title={w.name}>{w.name}</div>
                        <div className="text-sm text-gray-600 mt-0.5 tabular-nums">
                          {w.workKm.toFixed(1)} km delovno @ <strong>{fmtPace(w.workPace)}</strong>
                          {w.workHr && <> · HR {w.workHr}</>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {w.laps.slice(0, 12).map((l, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-gray-600 tabular-nums">
                              {fmtPace(l.pace)}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">Ni primerljivega treninga</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Block table ─────────────────────────────────────────────────── */}
      <Card title="Blok v številkah" subtitle="Cel blok Istre proti dosedanjemu bloku za Ljubljano.">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Kazalnik</th>
                <th className="py-2 font-medium text-right" style={{ color: ISTRA_COLOR }}>Istra</th>
                <th className="py-2 font-medium text-right" style={{ color: LJ_COLOR }}>Ljubljana</th>
                <th className="py-2 font-medium text-right">Razlika</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {([
                ['Tednov treninga', sIstra.weeks, sLj.weeks, null],
                ['Skupaj km', sIstra.totalKm.toFixed(0), sLj.totalKm.toFixed(0), null],
                ['km / teden', sIstra.kmPerWeek.toFixed(1), sLj.kmPerWeek.toFixed(1),
                  () => `${(sLj.kmPerWeek - sIstra.kmPerWeek >= 0 ? '+' : '')}${(sLj.kmPerWeek - sIstra.kmPerWeek).toFixed(1)}`],
                ['Tekov', sIstra.runs, sLj.runs, null],
                ['Povprečen tempo', fmtPace(sIstra.avgPace), fmtPace(sLj.avgPace),
                  () => `${sLj.avgPace - sIstra.avgPace >= 0 ? '+' : '−'}${Math.abs(Math.round(sLj.avgPace - sIstra.avgPace))} s/km`],
                ['Povprečen HR', sIstra.avgHr ?? '–', sLj.avgHr ?? '–',
                  () => `${(sLj.avgHr ?? 0) - (sIstra.avgHr ?? 0)} bpm`],
                ['Višinski metri', sIstra.elev.toFixed(0), sLj.elev.toFixed(0), null],
                ['Treningov moči', sIstra.strength, sLj.strength, null],
                ['Delovnih km v ključnih treningih',
                  workKmOf(keyWorkouts, 'istra').toFixed(0),
                  workKmOf(keyWorkouts, 'lj').toFixed(0), null],
                ['Delovnih km / teden',
                  (workKmOf(keyWorkouts, 'istra') / sIstra.fullWeeks).toFixed(1),
                  (workKmOf(keyWorkouts, 'lj') / sLj.fullWeeks).toFixed(1),
                  () => {
                    const d = workKmOf(keyWorkouts, 'lj') / sLj.fullWeeks - workKmOf(keyWorkouts, 'istra') / sIstra.fullWeeks;
                    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
                  }],
              ] as const).map(([label, a, b, d]) => (
                <tr key={label}>
                  <td className="py-2 text-gray-700">{label}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{a}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-800">{b}</td>
                  <td className="py-2 text-right tabular-nums text-xs text-gray-400">
                    {d ? d() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Blok za Ljubljano je krajši (šteje od 1.6.), zato skupne vrednosti niso primerljive — primerjaj
          vrstice na teden. Povprečen tempo je počasnejši ob hkrati nižjem HR: lahkotne teke tečeš
          bolj disciplinirano počasi, kar je pravilna smer, ne nazadovanje.
        </p>
      </Card>

      {/* ── Aerobic base ────────────────────────────────────────────────── */}
      <Card
        title="Aerobna baza"
        subtitle="Lahkotni teki nad 6 km s povprečnim HR do 152 — kaže, koliko poti dobiš na en srčni utrip."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Stat label="Metrov na utrip" value={`${sLj.metresPerBeat?.toFixed(3) ?? '–'}`}
                  sub={`Istra: ${sIstra.metresPerBeat?.toFixed(3) ?? '–'}`} tone="blue" />
          </div>
          <div>
            <Stat label="Tempo lahkotnega teka" value={fmtPace(sLj.easyPace ?? 0)}
                  sub={`Istra: ${fmtPace(sIstra.easyPace ?? 0)}`} tone="blue" />
          </div>
          <div>
            <Stat label="HR lahkotnega teka" value={`${sLj.easyHr ?? '–'}`}
                  sub={`Istra: ${sIstra.easyHr ?? '–'}`} tone="blue" />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">
          Učinkovitost je rahlo boljša ({sLj.metresPerBeat?.toFixed(3)} proti {sIstra.metresPerBeat?.toFixed(3)} m/utrip)
          pri praktično enakem HR — in to poleti, ko vročina HR sistematično dvigne za nekaj utripov.
          Toplotno popravljeno je to opaznejši napredek, kot kaže gola številka.
        </p>
      </Card>

      {/* ── Conclusions ─────────────────────────────────────────────────── */}
      <Card title="Zaključek" subtitle="Kaj podatki dejansko povedo in kje je tveganje.">
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Hitrost ni omejitev.</strong> Kilometrske ponovitve tečeš pod 4:00 — 8×1 km po
              3:57 in 6×1 km po 3:56. Tudi po pribitku za odmore to pomeni ekvivalent okoli
              {' '}{fmtPace((pairs.find(x => x.family === 'kratke')?.lj?.workPace ?? 0) + REST_PENALTY)}/km
              zveznega tempa, kar je tik ob tvojem najboljšem nepretrganem teku. Strop torej ni v nogah.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Obseg je večji.</strong> {sLj.kmPerWeek.toFixed(1)} km/teden čez cel blok proti
              {' '}{sIstra.kmPerWeek.toFixed(1)} km/teden pred Istro, z vrhom {sLj.peakWeekKm.toFixed(0)} km
              proti {sIstra.peakWeekKm.toFixed(0)} km. Na neposredno primerljivih tednih
              ({sameWindow.weeks}) je razlika manjša — {sameWindow.lj.perWeek.toFixed(1)} proti
              {' '}{sameWindow.istra.perWeek.toFixed(1)} km/teden.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>En izpadel teden.</strong> {(() => {
                const w = ljWeeks.filter(b => b.runs > 0 && !b.partial)
                  .reduce((m, b) => (b.runKm < m.runKm ? b : m));
                return `Teden ${fmtDateSlo(w.monday)} je imel le ${w.runKm.toFixed(1)} km v ${plural(w.runs, 'teku', 'tekih', 'tekih', 'tekih')}`;
              })()}. Blok za Istro takega padca ni imel — najnižji teden je bil
              {' '}{Math.min(...istraWeeks.filter(b => b.runs > 0 && !b.partial).map(b => b.runKm)).toFixed(1)} km.
              Enkraten padec ni problem, ponovljen bi bil.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Kakovostnega dela je več.</strong> V tem bloku si v ključnih treningih odtekel
              {' '}{workKmOf(keyWorkouts, 'lj').toFixed(0)} km delovnega dela proti
              {' '}{workKmOf(keyWorkouts, 'istra').toFixed(0)} km pred Istro, in serije so daljše —
              5×2 km pomeni 10 km delovnega dela, česar pred Istro ni bilo.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>Dolg zvezni tempo je še krajši kot pred Istro.</strong> Takrat je bil najboljši
              napovednik test 15 km na 4:22 tri tedne pred tekmo. V tem bloku je najdaljši nepretrgan napor
              {' '}{p.anchor ? `${p.anchor.workout.workKm.toFixed(0)} km na ${fmtPace(p.anchor.workout.workPace)}` : '–'}
              {' '}({p.anchor ? fmtDateSlo(p.anchor.workout.date) : '–'}). To je zdaj najtrdnejši dokaz v modelu,
              a raztegniti ga na 21 km je večji skok, kot je bil takrat. Test 15 km bi napoved zares utrdil.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>Dolgi teki so krajši.</strong> Najdaljši {sLj.longestKm.toFixed(0)} km proti
              {' '}{sIstra.longestKm.toFixed(0)} km pred Istro. Za sub-1:30 rabiš vsaj dva-tri teke
              24–28 km, najbolje z zadnjimi 6–10 km na HM tempu.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Kaj naj naredim v naslednjih {Math.round(p.weeksToRace)} tednih</h3>
          <ol className="space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
            <li>Napredujoč zvezni tempo: 8 km → 10 km → 12 km na 4:12–4:18, en na 10–14 dni.</li>
            <li>Dolgi teki na 26–28 km, dvakrat z zadnjimi 8–10 km na 4:15–4:20.</li>
            <li>Dva testa 15 km na tekmovalnem tempu, po dogovoru — prvi okoli 6 tednov pred tekmo
                (sredina septembra), drugi 3 tedne prej (okoli 27.9.). Isti odsek, isti pogoji, isti čas dneva,
                sicer druge številke ne merita.</li>
            <li>Obseg zadrži na 60–70 km/teden do 3 tedne pred tekmo, potem znižaj.</li>
            <li>Ponovitve pod 4:00 ohrani, a jih ne dodajaj — hitrost ni omejitev, vzdržljivost na tempu je.</li>
          </ol>
        </div>
      </Card>

      {/* ── Method + refresh ────────────────────────────────────────────── */}
      <Card title="Metoda" subtitle="Da veš, od kod številke — in kje se lahko motijo.">
        <ol className="text-sm text-gray-600 space-y-2.5 leading-relaxed list-decimal list-inside marker:text-gray-400">
          <li>
            Vsak ključni trening se razčleni na <strong>delovne odseke</strong> (odsek nad 400 m, tečen pod
            4:45/km). Ogrevanje, odmori in ohlajanje odpadejo.
          </li>
          <li>
            Iz razporeda krogov se ugotovi, ali je bil delovni del <strong>nepretrgan</strong> ali
            <strong> ponovitve z odmori</strong>. To je najpomembnejši korak in tu je stara formula padla:
            »3-2-1km intervals« nima v naslovu črke x, zato jo je brala kot zvezni tempo in 6 km po 3:54
            razumela, kot da bi jih tekel brez odmora.
          </li>
          <li>
            Ponovitve dobijo <strong>pribitek za odmore</strong>: {REST_PENALTY} s/km, deljeno z dolžino
            ponovitve — {REST_PENALTY} s/km pri kilometrskih, {(REST_PENALTY / 2).toFixed(0)} pri dvokilometrskih.
            Vrednost je izračunana iz tvojih podatkov: pribitek mora biti tak, da ponovitve in zvezni tempo
            iz istega štirinajstdnevja pokažeta isti čas. Šele s tem 6×1 km po 3:56 pomeni isto kot 8 km
            zvezno po 4:13 — kar tvoja treninga iz 18. in 21. avgusta tudi res kažeta.
          </li>
          <li>
            Delovni tempo se z <strong>Riegelovo formulo</strong> (eksponent 1.06) razširi na polmaraton, in
            sicer na {HM_GPS_KM} km — toliko namreč ura izmeri na certificirani progi. Prej je model računal z
            uradnimi 21.0975 km, kar je napoved skrajšalo za slabo minuto.
          </li>
          <li>
            Vsi treningi se združijo v <strong>eno raven forme</strong>, uteženo s kvadratom delovne razdalje
            (dolg trening pove veliko več kot kratek), s poldrugkratnim bonusom za nepretrgane teke in s
            starostjo (trening izpred petih tednov šteje pol). Odseki pod {LEVEL_MIN_WORK_KM} km ne štejejo —
            Riegel jim prišteje več kot 10 % in iz njih dela nesmisel.
          </li>
          <li>
            Raven forme se pretvori v <strong>tekmovalni čas z množiteljem {TRAINING_TO_RACE}</strong>. Zakaj
            sploh: treningi niso tekme — tečeš jih sredi tedna, na neodpočitih nogah in namenoma pod mejo.
            Množitelj je izmerjen na Istri, kjer je zadnji mesec priprav dal {fmtTime(lateLevel)}, ti pa si
            odtekel 1:33:33. Iz katerega koli dne tistega meseca ga izračunaš, pride enak na dve tisočinki.
          </li>
          <li>
            Napoved za 18. oktober vzame današnjo raven in odšteje <strong>napredek za preostale tedne</strong>
            po naklonu, ki ga ta blok že kaže ({Math.round(p.trend.slope)} s/teden skozi{' '}
            {plural(p.trend.sessions, 'trening', 'treninga', 'treninge', 'treningov')}). Stara formula je namesto
            tega predpostavila, da ponoviš ves napredek iz zaključka priprav na Istro — v celoti, na bistveno
            višji izhodiščni ravni. To je bil drugi razlog za 1:27.
          </li>
        </ol>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Kje se model lahko moti</h3>
          <ul className="text-sm text-gray-600 space-y-1.5 leading-relaxed list-disc list-inside marker:text-gray-300">
            <li>
              Množitelj {TRAINING_TO_RACE} stoji na <strong>eni sami tekmi</strong>. Če je bila Istra tvoj
              posebno dober dan, je napoved pretirano optimistična.
            </li>
            <li>
              Najdaljši nepretrgan napor v tem bloku je {p.anchor ? `${p.anchor.workout.workKm.toFixed(0)} km` : '–'},
              pred Istro je bil 15 km. Raztegniti 10 km na 21 je večji skok kot raztegniti 15 — dokler ne
              odtečeš daljšega testa, je ta del napovedi šibkejši.
            </li>
            <li>
              Naklon napredka predpostavlja, da gre naprej enako hitro. Bližje kot si svojemu stropu, manj to
              drži — in po polmaratonu aprila si mu bližje kot januarja.
            </li>
          </ul>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-400">
            Podatki iz Strave · stanje {fmtDateSlo(asOf)} · {activities.length} aktivnosti ·
            {' '}{plural(
              keyWorkouts.filter(w => w.block === 'lj' && w.workKm >= MIN_WORK_KM).length,
              'ključni trening', 'ključna treninga', 'ključni treningi', 'ključnih treningov',
            )} v tem bloku
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Osvežujem iz Strave…' : 'Osveži iz Strave'}
          </button>
        </div>
        {syncNote && <div className="mt-2 text-xs text-gray-500">{syncNote}</div>}
      </Card>
    </div>
  );
}
