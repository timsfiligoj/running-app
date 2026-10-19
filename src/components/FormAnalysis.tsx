import { useMemo, useState } from 'react';
import {
  ISTRA_ACTIVITIES,
  LJ_ACTIVITIES_SNAPSHOT,
  PALMANOVA_ACTIVITIES_SNAPSHOT,
  KEY_WORKOUTS,
  SNAPSHOT_DATE,
  type BlockActivity,
  type KeyWorkout,
} from '../data/blockData';
import {
  predict,
  calibration,
  summarise,
  matchedPairs,
  weeklyBuckets,
  rawProjection,
  workKmOf,
  isRace,
  CURRENT,
  PREVIOUS,
  RACES,
  TEK_TROJK,
  TRAINING_FROM,
  TAPER_FROM,
  MIN_WORK_KM,
  REST_PENALTY,
  TRAINING_TO_RACE,
  LEVEL_MIN_WORK_KM,
  HM_GPS_KM,
  RACE_DRIFT,
  plural,
  fmtPace,
  fmtTime,
  fmtDateSlo,
  HM_KM,
  type Block,
  type WeekBucket,
  type BacktestPoint,
} from '../lib/formAnalysis';
import { syncCurrentBlock } from '../lib/blockSync';

const ISTRA_COLOR = '#f59e0b';
const PREV_COLOR = '#2563eb';   // LJ
const CUR_COLOR = '#059669';    // Palmanova
const COLOR_OF: Record<Block, string> = { istra: ISTRA_COLOR, lj: PREV_COLOR, palmanova: CUR_COLOR };
const SHORT: Record<Block, string> = { istra: 'Istra', lj: 'LJ', palmanova: 'Palmanova' };

/** The goal is any 1:28:xx — so everything up to 1:28:59. */
const GOAL_SEC = 88 * 60 + 59;

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
    amber: 'text-amber-600', green: 'text-emerald-600',
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

const signedSec = (s: number) => `${s >= 0 ? '+' : '−'}${Math.abs(Math.round(s))} s`;

// ─── weekly volume chart ───────────────────────────────────────────────────────

interface Series { label: string; color: string; buckets: WeekBucket[] }

function VolumeChart({ series }: { series: Series[] }) {
  const maxOut = 20;
  const weeks = Array.from({ length: maxOut + 1 }, (_, i) => maxOut - i); // 20 … 0
  const maps = series.map(s => new Map(s.buckets.map(x => [x.weeksOut, x])));
  const peak = Math.max(60, ...series.flatMap(s => s.buckets.map(b => b.runKm)));

  const W = 720, H = 220, padL = 34, padB = 26, padT = 8;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const slot = plotW / weeks.length;
  const bw = Math.max(3, slot / series.length - 1.5);
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
          return (
            <g key={w}>
              {series.map((s, si) => {
                const b = maps[si].get(w);
                if (!b || b.runKm <= 0) return null;
                return (
                  <rect key={s.label} x={x + 1 + si * (bw + 1.5)} y={y(b.runKm)} width={bw}
                        height={plotH + padT - y(b.runKm)} fill={s.color} rx={1.5} opacity={b.partial ? 0.4 : 0.9}>
                    <title>{`${s.label}, ${w} tednov do tekme: ${b.runKm.toFixed(1)} km / ${plural(b.runs, 'tek', 'teka', 'teki', 'tekov')}${b.partial ? ' (nepopoln teden)' : ''}`}</title>
                  </rect>
                );
              })}
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

function QualityChart({ workouts, blocks, weeksToRace }: {
  workouts: KeyWorkout[]; blocks: Block[]; weeksToRace: number;
}) {
  const pts = workouts
    .filter(w => blocks.includes(w.block) && !isRace(w) && w.workKm >= MIN_WORK_KM)
    .map(w => ({
      w,
      out: Math.round((new Date(RACES[w.block].date).getTime() - new Date(w.date).getTime()) / 6048e5),
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

  const line = (block: Block) => {
    const s = pts.filter(p => p.w.block === block).sort((a, b) => b.out - a.out);
    if (s.length < 2) return null;
    return s.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.out).toFixed(1)},${y(p.proj).toFixed(1)}`).join(' ');
  };

  const ticks = [240, 250, 260, 270, 280, 290].filter(v => v >= lo && v <= hi);

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
        {weeksToRace <= 20 && (
          <>
            <line x1={x(weeksToRace)} x2={x(weeksToRace)} y1={padT} y2={padT + plotH}
                  stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <text x={x(weeksToRace) + 4} y={padT + 10} fontSize={9} fill="#64748b">danes</text>
          </>
        )}
        {blocks.map(b => {
          const d = line(b);
          return d ? <path key={b} d={d} fill="none" strokeWidth={1.5} stroke={COLOR_OF[b]} opacity={0.35} /> : null;
        })}
        {pts.map(p => (
          <circle key={`${p.w.block}-${p.w.id}`} cx={x(p.out)} cy={y(p.proj)} r={4.5}
                  fill={COLOR_OF[p.w.block]} opacity={0.9}>
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
 * The model replayed over a finished block. The solid line is what it claimed his
 * form was worth on each day; the dashed one is the forecast it would have made
 * for race day from there; the rule is what actually happened.
 */
function Backtest({ points, color, actualLabel }: { points: BacktestPoint[]; color: string; actualLabel: string }) {
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

  const step = 120;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img"
           aria-label={`Model preverjen na tekmi: ${actualLabel}`}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={padL} x2={W - 12} y1={y(v)} y2={y(v)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{fmtTime(v)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - 12} y1={y(actual)} y2={y(actual)}
              stroke="#374151" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={W - 14} y={y(actual) - 5} textAnchor="end" fontSize={10} fill="#374151">
          dejansko {actualLabel}
        </text>

        <path d={path(b => b.raceToday)} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
        <path d={path(b => b.predicted)} fill="none" stroke="#6366f1" strokeWidth={1.5}
              strokeDasharray="3 3" opacity={0.9} />

        {points.map(b => (
          <g key={b.asOf}>
            <circle cx={x(b.weeksOut)} cy={y(b.raceToday)} r={3.5} fill={color}>
              <title>{`${fmtDateSlo(b.asOf)} · ${b.weeksOut.toFixed(1)} tednov do tekme\nraven forme: ${fmtTime(b.raceToday)}\nnapoved za tekmo: ${fmtTime(b.predicted)}`}</title>
            </circle>
            <circle cx={x(b.weeksOut)} cy={y(b.predicted)} r={2.5} fill="#6366f1" opacity={0.8} />
          </g>
        ))}
        {[12, 10, 8, 6, 4, 2, 0].filter(t => t <= maxW).map(t => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">{t}</text>
        ))}
        <text x={padL} y={H - 8} fontSize={9} fill="#d1d5db">← tednov do tekme</text>
      </svg>
      <div className="flex gap-4 text-xs mt-2 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5" style={{ background: color }} /> raven forme tisti dan
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
  const [activities, setActivities] = useState<BlockActivity[]>(PALMANOVA_ACTIVITIES_SNAPSHOT);
  const [keyWorkouts, setKeyWorkouts] = useState<KeyWorkout[]>(KEY_WORKOUTS);
  const [asOf, setAsOf] = useState<string>(SNAPSHOT_DATE);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const p = useMemo(() => predict(keyWorkouts, asOf), [keyWorkouts, asOf]);
  const calIstra = useMemo(() => calibration(keyWorkouts, 'istra', ISTRA_ACTIVITIES), [keyWorkouts]);
  const calLj = useMemo(() => calibration(keyWorkouts, 'lj', LJ_ACTIVITIES_SNAPSHOT), [keyWorkouts]);
  const prevWeeks = useMemo(() => weeklyBuckets(LJ_ACTIVITIES_SNAPSHOT, PREVIOUS.date), []);
  const curWeeks = useMemo(() => weeklyBuckets(activities, CURRENT.date), [activities]);
  const sPrev = useMemo(() => summarise(LJ_ACTIVITIES_SNAPSHOT, PREVIOUS.date), []);
  const sCur = useMemo(() => summarise(activities, CURRENT.date), [activities]);
  const pairs = useMemo(() => matchedPairs(keyWorkouts, PREVIOUS.block, CURRENT.block), [keyWorkouts]);

  async function handleSync() {
    setSyncing(true);
    setSyncNote(null);
    const today = todayIso();
    const r = await syncCurrentBlock(CURRENT.blockStart, today, KEY_WORKOUTS, CURRENT.block);
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

  const ljResult = RACES.lj.timeSec as number;
  const status = p.realisticTime <= GOAL_SEC ? 'dosegljiv' : p.optimisticTime <= GOAL_SEC ? 'na robu' : 'težko';
  const curKeyCount = keyWorkouts.filter(w => w.block === CURRENT.block && w.workKm >= MIN_WORK_KM).length;
  const perWeek = (km: number, weeks: number) => (weeks > 0 ? (km / weeks).toFixed(1) : '–');
  const lastSixPrev = calLj?.points.filter(b => b.weeksOut <= 6.1) ?? [];
  const plateauSpread = lastSixPrev.length
    ? Math.max(...lastSixPrev.map(b => b.raceToday)) - Math.min(...lastSixPrev.map(b => b.raceToday))
    : 0;
  const sixOutForecast = lastSixPrev.length ? lastSixPrev[0].predicted : 0;

  return (
    <div className="space-y-6">

      {/* ── Prediction hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-lg p-5 sm:p-7 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Napoved · Palmanova HM · 29.11.</div>
            <div className="text-5xl sm:text-6xl font-bold tabular-nums mt-1">{fmtTime(p.realisticTime)}</div>
            <div className="text-white/80 text-sm mt-1">
              {fmtPace(p.realisticTime / HM_KM)} /km uradno · razpon {fmtTime(p.optimisticTime)} – {fmtTime(p.conservativeTime)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-bold">{Math.max(0, p.daysToRace)}</div>
            <div className="text-xs uppercase tracking-wide text-white/70">dni do tekme</div>
            <div className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-bold ${
              status === 'dosegljiv' ? 'bg-white text-green-700' : 'bg-amber-300 text-amber-900'
            }`}>
              1:28:xx {status}
            </div>
          </div>
        </div>

        {/* range bar */}
        <div className="mt-6">
          <div className="relative h-2 bg-white/25 rounded-full">
            {(() => {
              const lo = Math.min(p.optimisticTime, GOAL_SEC) - 60;
              const hi = Math.max(p.conservativeTime, ljResult) + 45;
              const pos = (t: number) => `${((t - lo) / (hi - lo)) * 100}%`;
              return (
                <>
                  <div className="absolute h-2 bg-white/80 rounded-full"
                       style={{ left: pos(p.optimisticTime), width: `${((p.conservativeTime - p.optimisticTime) / (hi - lo)) * 100}%` }} />
                  <div className="absolute -top-1 w-1 h-4 bg-white rounded" style={{ left: pos(p.realisticTime) }} />
                  <div className="absolute -top-1 w-0.5 h-4 bg-amber-300" style={{ left: pos(ljResult) }} />
                  <div className="absolute -top-1 w-0.5 h-4 bg-green-200" style={{ left: pos(GOAL_SEC) }} />
                </>
              );
            })()}
          </div>
          <div className="flex justify-between text-[11px] text-white/70 mt-2">
            <span>{fmtTime(p.optimisticTime)} optimistično</span>
            <span className="text-green-200">1:28:59 cilj</span>
            <span className="text-amber-200">1:29:51 LJ (PB)</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="bg-white/15 rounded-lg p-3.5">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Trenutna forma · če bi tekel ta konec tedna</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">{fmtTime(p.raceTodayTime)}</div>
            <div className="text-[11px] text-white/70 mt-1 leading-snug">
              Izmerjeno, ne napovedano. Na zadnji mesec pred tekmo je ista številka zgrešila Istro za
              {' '}{calIstra ? signedSec(calIstra.lateError) : '–'} in LJ za {calLj ? signedSec(calLj.lateError) : '–'}.
            </div>
          </div>
          <div className="bg-white/15 rounded-lg p-3.5">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Na čem stoji</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">
              {Math.round(p.raceShare * 100)} %<span className="text-base font-normal"> LJ tekma</span>
            </div>
            <div className="text-[11px] text-white/70 mt-1 leading-snug">
              {curKeyCount === 0
                ? 'V bloku za Palmanovo še ni ključnega treninga — forma je LJ tekma in zadnji treningi pred njo.'
                : `Iz bloka za Palmanovo že ${plural(curKeyCount, 'ključni trening', 'ključna treninga', 'ključni treningi', 'ključnih treningov')}; z vsakim naslednjim LJ tekma šteje manj.`}
            </div>
          </div>
        </div>

        <p className="text-sm text-white/85 mt-5 leading-relaxed">
          Napoved je trenutna forma plus napredek, ki ga še lahko odtreniraš:
          {' '}{plural(Math.round(p.trainingWeeksLeft), 'teden', 'tedna', 'tedni', 'tednov')} pravega treninga
          (regeneracija do {fmtDateSlo('2026-10-25')} in taper od {fmtDateSlo(TAPER_FROM)} ne štejeta), po polovici
          tempa, ki ga je izmeril LJ blok ({Math.round(p.previousRate)} s/teden). Brez novih treningov se napoved
          z vsakim tednom približa trenutni formi — napredek mora pokazati Strava, ne koledar.
        </p>
      </section>

      {/* ── Scenarios ───────────────────────────────────────────────────── */}
      <Card
        title="Trije scenariji"
        subtitle="Razlika med njimi je samo predpostavka o tem, koliko še napreduješ v preostalih tednih treninga."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {p.scenarios.map(sc => (
            <div key={sc.key} className={`rounded-lg p-3.5 border ${
              sc.key === 'realistic' ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'
            }`}>
              <div className="text-sm font-semibold text-gray-800">{sc.label}</div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${
                sc.key === 'realistic' ? 'text-emerald-700' : 'text-gray-700'
              }`}>{fmtTime(sc.time)}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {sc.gainPerWeek > 0 ? `−${Math.round(sc.gainPerWeek)} s/teden` : 'brez nadaljnjega napredka'}
              </div>
              <div className="text-[11px] text-gray-400 mt-2 leading-snug">{sc.note}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Zakaj realistično ne vzame polnega tempa LJ bloka: zadnjih šest tednov pred LJ je tvoja forma
          stala na mestu (raven se je gibala v razponu {Math.round(plateauSpread)} s), napoved z naklonom pa je šest
          tednov prej obljubljala {fmtTime(sixOutForecast)}. Blok za Palmanovo je prav tako dolg šest tednov — in ima
          regeneracijo, taper, gleženj ter novorojenčka. V LJ si odtekel <strong>1:29:51 s krčem</strong>; pri ~30–40 s
          izgube je bila forma tistega dne bližje 1:29:15. Ta razlika ni v številkah zgoraj — pridobiš jo z izvedbo,
          ne s treningom.
        </p>
      </Card>

      {/* ── What training turned into ───────────────────────────────────── */}
      <Card
        title="Kako se trening preslika v rezultat"
        subtitle="Tri letošnje tekme, model pognan nazaj skozi oba polmaratonska bloka — vsakič samo s podatki, ki so takrat že obstajali."
      >
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Tekma</th>
                <th className="py-2 font-medium text-right">Rezultat</th>
                <th className="py-2 font-medium text-right">km / teden</th>
                <th className="py-2 font-medium text-right">Najdaljši tek</th>
                <th className="py-2 font-medium text-right">Zadnji test</th>
                <th className="py-2 font-medium text-right">Forma po modelu</th>
                <th className="py-2 font-medium text-right">Napaka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[calIstra, calLj].filter(Boolean).map(c => c && (
                <tr key={c.race.block}>
                  <td className="py-2 pr-3">
                    <div className="font-medium" style={{ color: COLOR_OF[c.race.block] }}>{c.race.name}</div>
                    <div className="text-[11px] text-gray-400">{fmtDateSlo(c.race.date)} · HR {c.race.avgHr}</div>
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold text-gray-800">{fmtTime(c.race.timeSec as number)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{c.kmPerWeek.toFixed(1)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{c.longestKm.toFixed(0)} km</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    {c.lastTest
                      ? <>{c.lastTest.workKm.toFixed(0)} km @ {fmtPace(c.lastTest.workPace)}<div className="text-[11px] text-gray-400">HR {c.lastTest.workHr} · {fmtDateSlo(c.lastTest.date)}</div></>
                      : '–'}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{fmtTime(c.lateLevel)}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-gray-800">{signedSec(c.lateError)}</td>
                </tr>
              ))}
              <tr className="text-gray-400">
                <td className="py-2 pr-3">
                  <div className="font-medium text-gray-500">Tek trojk</div>
                  <div className="text-[11px]">{fmtDateSlo(TEK_TROJK.date)} · HR {TEK_TROJK.avgHr}</div>
                </td>
                <td className="py-2 text-right tabular-nums">{fmtTime(TEK_TROJK.sec)}</td>
                <td className="py-2 text-right" colSpan={5}>
                  {TEK_TROJK.km.toFixed(1)} km, {TEK_TROJK.elev} m vzpona, 4 tedne po Istri — ni polmaraton in nima svojega bloka, zato ne kalibrira modela
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          »Forma po modelu« = povprečje ocene »če bi tekel ta konec tedna« v zadnjih štirih tednih pred tekmo.
          Množitelj {TRAINING_TO_RACE} je bil izmerjen na Istri in na LJ preizkušen na slepo
          (sam iz LJ bi prišel {calLj?.impliedFactor.toFixed(3)}).
        </p>

        {calLj && (
          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">Model pognan skozi LJ blok</div>
            {/* The first weeks run on two or three sessions and swing by minutes; they say nothing. */}
            <Backtest points={calLj.points.filter(b => b.weeksOut <= 10)} color={PREV_COLOR} actualLabel="1:29:51" />
          </div>
        )}

        <div className="mt-5 space-y-3 text-sm text-gray-700 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Trenutno formo model bere na ~10 s natančno.</strong> Mesec pred Istro je kazal
              {' '}{calIstra ? fmtTime(calIstra.lateLevel) : '–'} (odtekel 1:33:33), mesec pred LJ
              {' '}{calLj ? fmtTime(calLj.lateLevel) : '–'} (odtekel 1:29:51 — s krčem). Isti množitelj, dve tekmi,
              obakrat v roku desetih sekund. Številka »Trenutna forma« zgoraj je zato najtrdnejša na strani.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Test 12–15 km v tekmovalnem tempu je najboljši napovednik.</strong> Pred Istro 15 km @ 4:22
              → tekma 4:26 uradno; pred LJ 15 km @ 4:10 in 12 km @ 4:11 (HR 170–171) → tekma 4:15,5 uradno.
              Obakrat je bila tekma ~4–5 s/km počasnejša od tempa testa na uri — večinoma razlika med uro in
              uradnimi kilometri. Tekmovalni HR je bil obakrat 171: to je tvoj polmaratonski napor.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>Napovedi daleč naprej ne zaupaj.</strong> Naklon napredka je pred Istro deloval (zadnjih šest
              tednov si napredoval za ~3 minute), pred LJ pa ne: forma je od začetka septembra stala pri ~1:29:30,
              napoved z naklonom pa je obljubljala do {fmtTime(sixOutForecast)}. Pred LJ si zadnjih šest tednov formo
              <em> vzdrževal</em>, ne gradil. Na celem LJ bloku je napoved za dan tekme grešila povprečno
              {' '}{calLj ? Math.round(calLj.forecastRmse) : '–'} s — v hitro smer.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Kaj je prineslo −3:42.</strong> Istra → LJ: {calIstra?.kmPerWeek.toFixed(0)} → {calLj?.kmPerWeek.toFixed(0)} km/teden,
              delovnih km v ključnih treningih {workKmOf(keyWorkouts, 'istra').toFixed(0)} → {workKmOf(keyWorkouts, 'lj').toFixed(0)},
              daljše ponovitve (5×2 km, 3×2 km pod 3:55) in dva zvezna testa v tekmovalnem tempu. Dolgi teki niso bili
              daljši ({calIstra?.longestKm.toFixed(0)} → {calLj?.longestKm.toFixed(0)} km) — in krč pri 18,5 km kaže,
              da je vzdržljivost nog v tekmovalnem tempu naslednja stvar, ki šteje.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Evidence behind today's form ────────────────────────────────── */}
      <Card
        title="Na čem stoji današnja forma"
        subtitle={`Vsak dokaz je preračunan v uradni polmaratonski čas. Ponovitve dobijo pribitek za odmore (${REST_PENALTY} s/km na kilometer dolžine ponovitve); treningi gredo skozi množitelj ${TRAINING_TO_RACE}, tekma šteje s svojim uradnim časom.`}
      >
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Trening</th>
                <th className="py-2 font-medium text-right">Delovno</th>
                <th className="py-2 font-medium text-right">Tempo</th>
                <th className="py-2 font-medium text-right">HR</th>
                <th className="py-2 font-medium text-right">Drift</th>
                <th className="py-2 font-medium text-right">HM ekvivalent</th>
                <th className="py-2 font-medium text-right">Teža</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {p.evidence.filter(e => e.share >= 0.01).map(e => (
                <tr key={e.workout.id} className={
                  e.kind === 'tekma' ? 'bg-amber-50/60' : e.workout.continuous ? 'bg-blue-50/40' : ''}>
                  <td className="py-2 pr-3">
                    <div className="text-gray-800 truncate max-w-[220px]" title={e.workout.name}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: COLOR_OF[e.workout.block] }} />
                      {e.workout.name}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {fmtDateSlo(e.workout.date)} · {e.kind === 'tekma' ? 'tekma' : e.kind === 'test' ? 'test (kot tekma)'
                        : e.workout.continuous ? 'zvezno' : `${e.workout.reps}× ${e.workout.repKm.toFixed(1)} km`}
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{e.workout.workKm.toFixed(1)} km</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    {fmtPace(e.workout.workPace)}
                    {e.restPenalty > 0 && <span className="text-[11px] text-amber-600"> +{Math.round(e.restPenalty)}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-500">{e.effortHr ? Math.round(e.effortHr) : '–'}</td>
                  <td className={`py-2 text-right tabular-nums ${
                    e.drift != null && e.drift > RACE_DRIFT * 2.5 ? 'text-amber-600' : 'text-gray-400'
                  }`}>{e.drift != null ? e.drift.toFixed(1) : '–'}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-gray-800">{fmtTime(e.raceTime)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-500">{Math.round(e.share * 100)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Teža raste s kvadratom delovne razdalje (nepretrgani teki ×1,5) in se vsakih pet tednov prepolovi —
          zato LJ tekma zdaj nosi največ, do Palmanove pa jo bodo prevzeli novi treningi. Pikica pove blok:
          <span style={{ color: PREV_COLOR }}> ● LJ</span>, <span style={{ color: CUR_COLOR }}>● Palmanova</span>.
          {' '}<strong>Drift</strong> je porast HR na kilometer delovnega dela; tekmovalno vzdržno je okoli {RACE_DRIFT.toFixed(2)}.
        </p>
      </Card>

      {/* ── Weekly volume ───────────────────────────────────────────────── */}
      <Card
        title="Tedenski obseg"
        subtitle="Poravnano po tednih do tekme — teden 3 pred LJ proti tednu 3 pred Palmanovo."
      >
        <div className="flex gap-4 text-xs mb-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: PREV_COLOR }} /> LJ (1.6.–18.10.)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: CUR_COLOR }} /> Palmanova ({fmtDateSlo(CURRENT.blockStart)}–{fmtDateSlo(asOf)})
          </span>
          <span className="text-gray-400">bled stolpec = nepopoln teden</span>
        </div>
        <VolumeChart series={[
          { label: 'LJ', color: PREV_COLOR, buckets: prevWeeks },
          { label: 'Palmanova', color: CUR_COLOR, buckets: curWeeks },
        ]} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          {[
            ['Povprečje na teden', `${sPrev.kmPerWeek.toFixed(1)} km`, sCur.fullWeeks ? `${sCur.kmPerWeek.toFixed(1)} km` : '–'],
            ['Najvišji teden', `${sPrev.peakWeekKm.toFixed(1)} km`, sCur.fullWeeks ? `${sCur.peakWeekKm.toFixed(1)} km` : '–'],
            ['Najdaljši tek', `${sPrev.longestKm.toFixed(1)} km`, sCur.runs ? `${sCur.longestKm.toFixed(1)} km` : '–'],
          ].map(([label, a, b]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-bold text-blue-600">{a}</span>
                <span className="text-gray-300">→</span>
                <span className="font-bold text-emerald-600">{b}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Plan za Palmanovo ima vrh 53 km (teden 3), torej namerno pod LJ vrhovi 60–67 km: omejitev je spanje, ne kondicija.
        </p>
      </Card>

      {/* ── Quality progression ─────────────────────────────────────────── */}
      <Card
        title="Kakovost treningov"
        subtitle="Vsaka pika je ključni trening, preračunan na ekvivalentni tempo za 21 km (na uri). Višje = hitreje."
      >
        <QualityChart workouts={keyWorkouts} blocks={['lj', 'palmanova']} weeksToRace={p.weeksToRace} />
        <p className="text-xs text-gray-400 mt-2">
          Ponovitvam je prištet pribitek za odmore, zato so pike med seboj primerljive. Zelene pike (Palmanova)
          naj bi ležale na višini zadnjih modrih — to pomeni, da je forma iz LJ ohranjena.
        </p>
      </Card>

      {/* ── Matched sessions ────────────────────────────────────────────── */}
      <Card
        title="Najboljši trening vsake vrste"
        subtitle="LJ blok proti bloku za Palmanovo — samo delovni del treninga, brez ogrevanja in odmorov."
      >
        <div className="space-y-4">
          {pairs.map(m => (
            <div key={m.family} className="border-l-4 pl-3" style={{ borderColor: CUR_COLOR }}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                <Delta sec={m.delta} unit="s/km" />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([[PREVIOUS.block, m.before], [CURRENT.block, m.now]] as const).map(([blk, w]) => (
                  <div key={blk} className={`rounded-lg p-2.5 ${blk === CURRENT.block ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                    {w ? (
                      <>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: COLOR_OF[blk] }}>
                          {SHORT[blk]} · {fmtDateSlo(w.date)}
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
                      <div className="text-sm text-gray-400">
                        {blk === CURRENT.block ? 'Še ni treninga te vrste v tem bloku' : 'Ni primerljivega treninga'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Block table ─────────────────────────────────────────────────── */}
      <Card title="Blok v številkah" subtitle="Cel LJ blok proti dosedanjemu bloku za Palmanovo.">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 font-medium">Kazalnik</th>
                <th className="py-2 font-medium text-right" style={{ color: PREV_COLOR }}>LJ</th>
                <th className="py-2 font-medium text-right" style={{ color: CUR_COLOR }}>Palmanova</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {([
                ['Tednov treninga', sPrev.weeks, sCur.weeks],
                ['Skupaj km', sPrev.totalKm.toFixed(0), sCur.totalKm.toFixed(0)],
                ['km / teden', sPrev.kmPerWeek.toFixed(1), sCur.fullWeeks ? sCur.kmPerWeek.toFixed(1) : '–'],
                ['Tekov', sPrev.runs, sCur.runs],
                ['Povprečen tempo', fmtPace(sPrev.avgPace), fmtPace(sCur.avgPace)],
                ['Povprečen HR', sPrev.avgHr ?? '–', sCur.avgHr ?? '–'],
                ['Treningov moči', sPrev.strength, sCur.strength],
                ['Delovnih km v ključnih treningih',
                  workKmOf(keyWorkouts, PREVIOUS.block).toFixed(0), workKmOf(keyWorkouts, CURRENT.block).toFixed(0)],
                ['Delovnih km / teden',
                  perWeek(workKmOf(keyWorkouts, PREVIOUS.block), sPrev.fullWeeks),
                  perWeek(workKmOf(keyWorkouts, CURRENT.block), sCur.fullWeeks)],
              ] as const).map(([label, a, b]) => (
                <tr key={label}>
                  <td className="py-2 text-gray-700">{label}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{a}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-800">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Blok za Palmanovo je šest tednov, od tega en regeneracijski — skupne vrednosti niso primerljive,
          primerjaj vrstice na teden. Nepopolni tedni v povprečje ne štejejo.
        </p>
      </Card>

      {/* ── Aerobic base ────────────────────────────────────────────────── */}
      <Card
        title="Aerobna baza"
        subtitle="Lahkotni teki nad 6 km s povprečnim HR do 152 — koliko poti dobiš na en srčni utrip."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Metrov na utrip" value={sCur.metresPerBeat?.toFixed(3) ?? '–'}
                sub={`LJ: ${sPrev.metresPerBeat?.toFixed(3) ?? '–'}`} tone="green" />
          <Stat label="Tempo lahkotnega teka" value={sCur.easyPace ? fmtPace(sCur.easyPace) : '–'}
                sub={`LJ: ${fmtPace(sPrev.easyPace ?? 0)}`} tone="green" />
          <Stat label="HR lahkotnega teka" value={`${sCur.easyHr ?? '–'}`}
                sub={`LJ: ${sPrev.easyHr ?? '–'}`} tone="green" />
        </div>
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">
          Najbolj zgodnji signal utrujenosti ali slabega spanja: če lahek tek pri istem tempu teče 8+ udarcev
          višje kot običajno, je po planu tisti dan lahko ali počitek. Konec oktobra in novembra je hladneje kot
          v LJ bloku, kar HR rahlo zniža — enak HR pri enakem tempu je torej že majhen opozorilni znak.
        </p>
      </Card>

      {/* ── Conclusions ─────────────────────────────────────────────────── */}
      <Card title="Zaključek za Palmanovo" subtitle="Kaj podatki povedo in kje je tveganje.">
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-green-600 font-bold shrink-0">✓</span>
            <p>
              <strong>Forma za 1:29 je izmerjena, ne napovedana.</strong> LJ 1:29:51 s krčem in s tremi postanki,
              HR raven 169–173 do cilja. Brez krča je bil dan vreden ~1:29:15.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>1:28:xx je na robu.</strong> Od trenutne forme do 1:28:59 manjka {Math.max(0, Math.round(p.raceTodayTime - GOAL_SEC))} s,
              pravega treninga je še {plural(Math.round(p.trainingWeeksLeft), 'teden', 'tedna', 'tedni', 'tednov')} — pred LJ pa se forma zadnjih šest tednov ni premaknila. Večji del dobička mora priti iz izvedbe: brez krča,
              enakomeren štart (4:15 prve 3 km), skupina v protivetru.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>Desna stran ima prednost pred planom.</strong> Krč v meči, tetiva gležnja, pronacija v Metaspeed
              Tokyo. Kakovostni trening samo pri gležnju 0–2/10; odločitev o copatih Ned 8.11.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-amber-500 font-bold shrink-0">!</span>
            <p>
              <strong>HM tempo na utrujenih nogah.</strong> V LJ bloku je bil najdaljši HM del pozno v teku 5 km po 13 km.
              Ned 8.11. (8 km @ 4:10–4:13 po 12 km lahko) je najpomembnejši trening proti krču — in hkrati preizkus copatov.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Ključni treningi do tekme</h3>
          <ol className="space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
            <li>Tor 27.10. — 5× 1 km, Pet 30.10. — 3× 3 km @ 4:10–4:12 (prvič v novih copatih).</li>
            <li>Tor 3.11. — 4× 2 km @ 3:55; <strong>Ned 8.11. — 21 km z zadnjimi 8 km @ 4:10–4:13</strong>, odločitev o copatih.</li>
            <li>Pet 20.11. — generalka 2× 4 km @ ciljni tempo v polni tekmovalni opremi.</li>
            <li>Tor 24.11. — 3× 1 km @ ciljni tempo, nato samo lahko do nedelje.</li>
          </ol>
        </div>
      </Card>

      {/* ── Method + refresh ────────────────────────────────────────────── */}
      <Card title="Metoda" subtitle="Da veš, od kod številke — in kje se lahko motijo.">
        <ol className="text-sm text-gray-600 space-y-2.5 leading-relaxed list-decimal list-inside marker:text-gray-400">
          <li>
            Vsak ključni trening se razčleni na <strong>delovne odseke</strong> (odsek nad 400 m, tečen pod
            4:45/km). Ogrevanje, odmori in ohlajanje odpadejo. Iz razporeda krogov in naslova se ugotovi, ali je bil
            delovni del nepretrgan ali ponovitve z odmori.
          </li>
          <li>
            Ponovitve dobijo <strong>pribitek za odmore</strong>: {REST_PENALTY} s/km, deljeno z dolžino ponovitve.
            Nato se tempo z <strong>Riegelovo formulo</strong> (eksponent 1,06) razširi na {HM_GPS_KM} km — toliko ura
            izmeri na certificirani progi.
          </li>
          <li>
            Trening se pretvori v tekmovalni čas z <strong>množiteljem {TRAINING_TO_RACE}</strong> (treningi niso
            tekme). Izmerjen je na Istri, na LJ je zdržal na slepo. Tekma šteje s svojim uradnim časom, morebiten time trial
            kot tekma (Riegel brez množitelja).
          </li>
          <li>
            <strong>Trenutna forma</strong> je tehtano povprečje vseh dokazov od začetka LJ bloka: teža raste s kvadratom
            delovne razdalje (nepretrgani ×1,5), vsakih pet tednov se prepolovi. Odseki pod {LEVEL_MIN_WORK_KM} km ne štejejo.
          </li>
          <li>
            <strong>Napoved</strong> = trenutna forma minus napredek v preostalih tednih pravega treninga (od
            {' '}{fmtDateSlo(TRAINING_FROM)} do {fmtDateSlo(TAPER_FROM)}), po polovici tempa LJ bloka
            ({Math.round(p.previousRate)} s/teden skozi {plural(p.previousSessions, 'trening', 'treninga', 'treninge', 'treningov')}).
          </li>
        </ol>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Kje se model lahko moti</h3>
          <ul className="text-sm text-gray-600 space-y-1.5 leading-relaxed list-disc list-inside marker:text-gray-300">
            <li>Množitelj stoji na dveh tekmah, obe na ravni progi in v mirnem vremenu. Veter na odprti progi v Palmanovi ali vroč dan v njem nista zajeta.</li>
            <li>LJ čas vsebuje krč. Če je bil krč enkraten dogodek, model formo podcenjuje za ~30 s; če se ponovi, ne.</li>
            <li>
              Napredek v šestih tednih je ugibanje. Pred Istro ga je bilo veliko, pred LJ nič — zato je realistični scenarij
              na polovici, ne na polnem tempu.
            </li>
          </ul>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-400">
            Podatki iz Strave · stanje {fmtDateSlo(asOf)} · {plural(activities.length, 'aktivnost', 'aktivnosti', 'aktivnosti', 'aktivnosti')} v bloku za Palmanovo ·
            {' '}{plural(curKeyCount, 'ključni trening', 'ključna treninga', 'ključni treningi', 'ključnih treningov')}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Osvežujem iz Strave…' : 'Osveži iz Strave'}
          </button>
        </div>
        {syncNote && <div className="mt-2 text-xs text-gray-500">{syncNote}</div>}
      </Card>
    </div>
  );
}
