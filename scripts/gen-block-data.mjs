/**
 * Regenerates src/data/blockData.ts from Strava.
 *
 *   node scripts/gen-block-data.mjs
 *
 * Pulls both training blocks, then fetches lap detail for every session that
 * looks like quality work. The lap list is what tells us whether a work set was
 * run unbroken or as reps with recoveries — the single most important thing the
 * race model needs, and something no title parser gets reliably right.
 */
import fs from 'fs';

const SUPABASE = 'https://vscticoufxoyxyhuzkeu.supabase.co/functions/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY3RpY291ZnhveXh5aHV6a2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUzNDEsImV4cCI6MjA4NDkzMTM0MX0.1o0loHeC86OJ6LQ9UGeTfcedWkZIauxNsJfCMeddwiA';

const ISTRA = { block: 'istra', from: '2026-01-01', to: '2026-04-13', race: '2026-04-12' };
const LJ    = { block: 'lj',    from: '2026-06-01', to: null,         race: '2026-10-18' };

/** A lap is "work" when it is a real rep, run at tempo effort or faster. */
const MIN_WORK_LAP_M = 400;
const MAX_WORK_PACE = 285; // 4:45/km
const MIN_WORK_KM = 4;
/** How much slower than a rep's best lap a trailing lap may be before it reads as cool-down. */
const TRAILING_SLACK = 25;
const QUALITY_RE = /(\d+\s*x\s*\d+|\d+\s*-\s*\d+\s*-\s*\d+|tempo|interval|prag|test|progression|goal pace|ponovit)/i;

const CACHE = '.cache/strava';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Strava allows 100 requests per 15 minutes. A full regeneration needs one
 * detail call per quality session, so responses are cached on disk and a 429
 * simply waits the window out rather than losing the run.
 */
const post = async (fn, body) => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${SUPABASE}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, apikey: KEY },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.ok && !text.includes('"error"')) return JSON.parse(text);
    if (!text.includes('429') || attempt >= 6) throw new Error(`${fn} ${res.status}: ${text}`);
    process.stderr.write('    rate limited, waiting 5 min…\n');
    await sleep(5 * 60 * 1000);
  }
};

async function detail(id) {
  const file = `${CACHE}/${id}.json`;
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  const d = await post('fetch-strava', { stravaUrl: `https://www.strava.com/activities/${id}` });
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(d));
  await sleep(250);
  return d;
}

const today = () => new Date().toISOString().slice(0, 10);
/** Strava's `before` is exclusive, so ask for one day past the end of the block. */
const dayAfter = iso => new Date(Date.parse(iso + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const r2 = n => Math.round(n * 100) / 100;

/**
 * How many reps the title says the session had. He names his sessions well and
 * consistently ("3x3km intervals", "5x1600", "3-2-1km"), which matters because
 * the watch is often left on auto-lap: when the recoveries are paused out, the
 * lap list shows one unbroken block of fast kilometres and looks exactly like a
 * tempo run. The title is the only surviving evidence that there were breaks.
 */
function titleReps(name) {
  const x = name.match(/(\d+)\s*[x\u00d7]\s*\d/i);
  if (x) return parseInt(x[1], 10);
  const chain = name.match(/(\d+(?:\s*[-\u2013]\s*\d+)+)\s*(?:km|m)\b/i);
  if (chain) return chain[1].split(/[-\u2013]/).length;
  return null;
}

/**
 * Split the work laps into reps: laps that follow each other with no recovery lap
 * in between belong to the same rep. Trailing laps far slower than the rest of
 * their group are cool-down that slipped under the pace cap, not work.
 */
function toReps(laps) {
  const groups = [];
  let cur = null;
  for (const l of laps) {
    const isWork = l.distance_m >= MIN_WORK_LAP_M && l.pace_seconds <= MAX_WORK_PACE;
    if (!isWork) { cur = null; continue; }
    if (!cur) { cur = []; groups.push(cur); }
    cur.push(l);
  }
  return groups
    .map(g => {
      const cut = Math.min(...g.map(l => l.pace_seconds)) + TRAILING_SLACK;
      let end = g.length;
      while (end > 1 && g[end - 1].pace_seconds > cut) end--;
      return g.slice(0, end);
    })
    .filter(g => g.length)
    .map(g => ({
      km: g.reduce((s, l) => s + l.distance_m, 0) / 1000,
      sec: g.reduce((s, l) => s + l.duration_seconds, 0),
      laps: g,
    }));
}

async function buildKeyWorkout(a, block) {
  const full = await detail(a.id);
  if (!full?.laps?.length) return null;

  const groups = toReps(full.laps);
  const work = groups.flatMap(r => r.laps);
  if (!work.length) return null;
  // Trust the title's rep count over the lap list: auto-lap can flatten a rep set
  // into one block, and a stray recovery lap can split one rep into two.
  const reps = titleReps(a.name) ?? groups.length;

  const workKm = work.reduce((s, l) => s + l.distance_m, 0) / 1000;
  if (workKm < MIN_WORK_KM) return null;
  const workSec = work.reduce((s, l) => s + l.duration_seconds, 0);
  const hrSec = work.filter(l => l.hr).reduce((s, l) => s + l.duration_seconds, 0);

  return {
    id: a.id,
    date: a.date.slice(0, 10),
    name: a.name,
    block,
    totalKm: r2(a.distanceKm),
    totalSec: a.durationSeconds,
    avgHr: a.avgHeartRate ?? null,
    maxHr: full.maxHeartRate ?? null,
    workKm: r2(workKm),
    workSec,
    workPace: Math.round(workSec / workKm),
    workHr: hrSec > 0
      ? Math.round(work.reduce((s, l) => s + (l.hr ?? 0) * l.duration_seconds, 0) / hrSec)
      : null,
    // One unbroken work block = a continuous effort; several = reps with recoveries.
    continuous: reps === 1,
    reps,
    repKm: r2(workKm / reps),
    laps: work.map(l => ({
      km: r2(l.distance_m / 1000),
      pace: Math.round(l.pace_seconds),
      hr: l.hr ?? null,
    })),
  };
}

async function block({ block: name, from, to, race }) {
  const list = await post('strava-activities', { after: from, before: dayAfter(to ?? today()), mode: 'list' });
  const acts = list.activities
    .filter(a => a.date.slice(0, 10) <= (to ?? today()))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activities = acts.map(a => ({
    id: a.id, date: a.date.slice(0, 10), name: a.name, type: a.type,
    km: r2(a.distanceKm), sec: a.durationSeconds,
    elev: Math.round(a.elevationMeters), hr: a.avgHeartRate ?? null,
  }));

  const candidates = acts.filter(
    a => a.type === 'Run' && a.distanceKm >= 5 && (QUALITY_RE.test(a.name) || a.date.slice(0, 10) === race),
  );

  const key = [];
  for (const c of candidates) {
    process.stderr.write(`  ${c.date.slice(0, 10)} ${c.name}\n`);
    const w = await buildKeyWorkout(c, name);
    if (w) key.push(w);
  }
  return { activities, key };
}

const lapsSrc = laps =>
  '[' + laps.map(l => `{ km: ${l.km.toFixed(2)}, pace: ${l.pace}, hr: ${l.hr ?? 'null'} }`).join(', ') + ']';

const actSrc = a =>
  `  { id: ${a.id}, date: "${a.date}", name: ${JSON.stringify(a.name)}, type: "${a.type}", ` +
  `km: ${a.km.toFixed(2)}, sec: ${a.sec}, elev: ${a.elev}, hr: ${a.hr ?? 'null'} },`;

const keySrc = w =>
  `  { id: ${w.id}, date: "${w.date}", name: ${JSON.stringify(w.name)}, block: "${w.block}", ` +
  `totalKm: ${w.totalKm.toFixed(2)}, totalSec: ${w.totalSec}, avgHr: ${w.avgHr ?? 'null'}, maxHr: ${w.maxHr ?? 'null'},\n` +
  `    workKm: ${w.workKm.toFixed(2)}, workSec: ${w.workSec}, workPace: ${w.workPace}, workHr: ${w.workHr ?? 'null'},\n` +
  `    continuous: ${w.continuous}, reps: ${w.reps}, repKm: ${w.repKm.toFixed(2)},\n` +
  `    laps: ${lapsSrc(w.laps)} },`;

console.error('Istra block…');
const istra = await block(ISTRA);
console.error('LJ block…');
const lj = await block(LJ);

const snapshot = today();
const header = fs.readFileSync('src/data/blockData.ts', 'utf-8')
  .split('export const ISTRA_ACTIVITIES')[0]
  .replace(/^\/\/ AUTO-GENERATED.*\n/, `// AUTO-GENERATED from Strava on ${snapshot}. Regenerate with scripts/gen-block-data.mjs.\n`)
  .replace(/export const SNAPSHOT_DATE = "[^"]*";/, `export const SNAPSHOT_DATE = "${snapshot}";`);

fs.writeFileSync('src/data/blockData.ts',
  header +
  'export const ISTRA_ACTIVITIES: BlockActivity[] = [\n' + istra.activities.map(actSrc).join('\n') + '\n];\n\n' +
  'export const LJ_ACTIVITIES_SNAPSHOT: BlockActivity[] = [\n' + lj.activities.map(actSrc).join('\n') + '\n];\n\n' +
  'export const KEY_WORKOUTS: KeyWorkout[] = [\n' +
  [...istra.key, ...lj.key].map(keySrc).join('\n') + '\n];\n');

console.error(`\nWrote src/data/blockData.ts — ${istra.activities.length} + ${lj.activities.length} activities, ${istra.key.length} + ${lj.key.length} key workouts.`);
