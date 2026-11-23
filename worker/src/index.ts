// Cloudflare Worker backing the running app. Replaces the Supabase project:
// the D1 tables stand in for Postgres, and the Strava / Claude routes are the
// former edge functions (strava-activities, fetch-strava, analyze-run).

import { buildAnalysisPrompt, type AthleteProfile } from './prompt';

// Minimal D1 typings, so the Worker needs no extra dependencies.
interface D1Result<T> { results: T[] }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database { prepare(query: string): D1PreparedStatement }

interface Env {
  DB: D1Database;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  STRAVA_REFRESH_TOKEN: string;
  ANTHROPIC_API_KEY: string;
}

/** Browsers may only call the API from the app itself; scripts send no Origin. */
const ALLOWED_ORIGINS = [
  'https://timsfiligoj.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

const now = () => new Date().toISOString();

// ─── Data routes ───────────────────────────────────────────────────────────────

/** Columns the client writes on workout_progress, in insert order. */
const PROGRESS_COLUMNS = [
  'actual_workout', 'activity_type', 'run_type', 'distance_km', 'duration_seconds',
  'elevation_meters', 'avg_heart_rate', 'comment', 'strava_url', 'strava_activity_id',
] as const;

async function listProgress(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM workout_progress').all();
  return results.map(r => ({ ...r, completed: !!r.completed, skipped: !!r.skipped }));
}

async function upsertProgress(env: Env, body: Record<string, unknown>) {
  const { plan_id, id, session_index } = body;
  if (typeof plan_id !== 'string' || typeof id !== 'string' || typeof session_index !== 'number') {
    throw new HttpError(400, 'plan_id, id and session_index are required');
  }
  const values = PROGRESS_COLUMNS.map(c => {
    const v = body[c];
    if (v === undefined || v === '') return null;
    return c === 'strava_activity_id' ? String(v) : v;
  });
  const cols = ['plan_id', 'id', 'session_index', 'completed', 'skipped', ...PROGRESS_COLUMNS, 'updated_at'];
  const updates = cols.slice(3).map(c => `${c} = excluded.${c}`).join(', ');
  await env.DB.prepare(
    `INSERT INTO workout_progress (${cols.join(', ')})
     VALUES (${cols.map(() => '?').join(', ')})
     ON CONFLICT (plan_id, id, session_index) DO UPDATE SET ${updates}`,
  ).bind(plan_id, id, session_index, body.completed ? 1 : 0, body.skipped ? 1 : 0, ...values, now()).run();
}

async function deleteProgress(env: Env, url: URL) {
  const planId = url.searchParams.get('plan_id');
  const id = url.searchParams.get('id');
  const sessionIndex = Number(url.searchParams.get('session_index'));
  if (!planId || !id || !Number.isInteger(sessionIndex)) {
    throw new HttpError(400, 'plan_id, id and session_index are required');
  }
  await env.DB.prepare('DELETE FROM workout_progress WHERE plan_id = ? AND id = ? AND session_index = ?')
    .bind(planId, id, sessionIndex).run();
}

/** Sets phase and/or focus for one week, leaving the other field as it was. */
async function upsertWeekOverride(env: Env, body: Record<string, unknown>) {
  const { plan_id, week_num } = body;
  if (typeof plan_id !== 'string' || typeof week_num !== 'number') {
    throw new HttpError(400, 'plan_id and week_num are required');
  }
  const fields = (['phase', 'focus'] as const).filter(f => typeof body[f] === 'string');
  if (fields.length === 0) throw new HttpError(400, 'phase or focus is required');
  const cols = ['plan_id', 'week_num', ...fields, 'updated_at'];
  const updates = [...fields, 'updated_at'].map(c => `${c} = excluded.${c}`).join(', ');
  await env.DB.prepare(
    `INSERT INTO week_overrides (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
     ON CONFLICT (plan_id, week_num) DO UPDATE SET ${updates}`,
  ).bind(plan_id, week_num, ...fields.map(f => body[f]), now()).run();
}

async function getAnalysis(env: Env, key: string | null) {
  if (!key) throw new HttpError(400, 'key is required');
  const row = await env.DB.prepare('SELECT analysis, sources FROM analysis_cache WHERE key = ?')
    .bind(key).first<{ analysis: string; sources: string }>();
  return row ? { analysis: row.analysis, sources: JSON.parse(row.sources) } : null;
}

async function putAnalysis(env: Env, body: Record<string, unknown>) {
  const { key, analysis, sources } = body;
  if (typeof key !== 'string' || typeof analysis !== 'string') {
    throw new HttpError(400, 'key and analysis are required');
  }
  await env.DB.prepare(
    `INSERT INTO analysis_cache (key, analysis, sources, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET analysis = excluded.analysis, sources = excluded.sources,
       created_at = excluded.created_at`,
  ).bind(key, analysis, JSON.stringify(sources ?? {}), now()).run();
}

// ─── Strava ────────────────────────────────────────────────────────────────────

async function getStravaAccessToken(env: Env): Promise<string> {
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      refresh_token: env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

interface StravaActivity {
  id: number;
  // Strava moves to 64-bit ids after 1.6.2027; past 2^53 the numeric `id` loses
  // precision in JSON.parse, so `id_str` is the one to trust.
  id_str?: string;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed: number;
  max_speed: number;
}

/** Former `strava-activities` function: list or aggregate activities in a range. */
async function stravaActivities(env: Env, body: Record<string, unknown>) {
  const { after, before, type, mode } = body as {
    after?: string | number; before?: string | number; type?: string; mode?: string;
  };
  const afterEpoch = typeof after === 'string' ? Math.floor(new Date(after).getTime() / 1000) : after;
  const beforeEpoch = typeof before === 'string'
    ? Math.floor(new Date(before).getTime() / 1000)
    : before || Math.floor(Date.now() / 1000);
  if (!afterEpoch) throw new HttpError(400, 'Missing required "after" parameter (date string or epoch)');

  const token = await getStravaAccessToken(env);
  const activities: StravaActivity[] = [];
  const perPage = 200;
  for (let page = 1; ; page++) {
    const url = new URL('https://www.strava.com/api/v3/athlete/activities');
    url.searchParams.set('after', String(afterEpoch));
    url.searchParams.set('before', String(beforeEpoch));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) throw new Error(`Strava API error: ${resp.status}`);
    const batch = await resp.json() as StravaActivity[];
    if (batch.length === 0) break;
    activities.push(...(type ? batch.filter(a => a.type.toLowerCase() === type.toLowerCase()) : batch));
    if (batch.length < perPage) break;
  }

  const dateRange = {
    from: new Date(afterEpoch * 1000).toISOString().split('T')[0],
    to: new Date(beforeEpoch * 1000).toISOString().split('T')[0],
  };

  if (mode === 'summary') {
    const withHr = activities.filter(a => a.average_heartrate);
    return {
      totalActivities: activities.length,
      totalDistanceKm: Math.round(activities.reduce((s, a) => s + (a.distance || 0), 0) / 10) / 100,
      totalDurationSeconds: activities.reduce((s, a) => s + (a.moving_time || 0), 0),
      totalElevationMeters: Math.round(activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)),
      avgHeartRate: withHr.length > 0
        ? Math.round(withHr.reduce((s, a) => s + (a.average_heartrate || 0), 0) / withHr.length)
        : null,
      dateRange,
      type: type || 'all',
    };
  }

  const mapped = activities.map(a => ({
    id: a.id_str ?? String(a.id),
    name: a.name,
    type: a.type,
    date: a.start_date,
    distanceKm: Math.round(a.distance / 10) / 100,
    durationSeconds: a.moving_time,
    elevationMeters: Math.round(a.total_elevation_gain),
    avgHeartRate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    avgSpeedKmh: Math.round(a.average_speed * 3.6 * 100) / 100,
  }));
  return { count: mapped.length, activities: mapped, dateRange, type: type || 'all' };
}

/** Former `fetch-strava` function: one activity with splits and laps. */
async function fetchStrava(env: Env, body: Record<string, unknown>) {
  const match = String(body.stravaUrl ?? '').match(/strava\.com\/activities\/(\d+)/);
  if (!match) throw new HttpError(400, 'Invalid Strava URL');

  const token = await getStravaAccessToken(env);
  const resp = await fetch(`https://www.strava.com/api/v3/activities/${match[1]}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new HttpError(resp.status, `Strava API error: ${resp.status}`);
  const a = await resp.json() as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const round = (v: unknown) => (typeof v === 'number' && v ? Math.round(v) : null);

  const splits = Array.isArray(a.splits_metric)
    ? (a.splits_metric as Record<string, unknown>[]).map((s, i) => ({
        km: i + 1,
        pace_seconds: typeof s.moving_time === 'number' && typeof s.distance === 'number' && s.distance > 0
          ? s.moving_time / (s.distance / 1000)
          : null,
        hr: typeof s.average_heartrate === 'number' ? Math.round(s.average_heartrate) : undefined,
        elevation: typeof s.elevation_difference === 'number' ? Math.round(s.elevation_difference) : undefined,
      }))
    : null;

  const laps = Array.isArray(a.laps)
    ? (a.laps as Record<string, unknown>[]).map((l, i) => ({
        lap: i + 1,
        distance_m: typeof l.distance === 'number' ? Math.round(l.distance) : 0,
        duration_seconds: typeof l.moving_time === 'number' ? l.moving_time : 0,
        pace_seconds: typeof l.moving_time === 'number' && typeof l.distance === 'number' && l.distance > 0
          ? l.moving_time / (l.distance / 1000)
          : null,
        hr: typeof l.average_heartrate === 'number' ? Math.round(l.average_heartrate) : undefined,
      }))
    : null;

  return {
    distanceKm: typeof a.distance === 'number' && a.distance ? Math.round(a.distance / 10) / 100 : null,
    durationSeconds: a.moving_time || null,
    elevationMeters: round(a.total_elevation_gain),
    avgHeartRate: round(a.average_heartrate),
    title: a.name || null,
    maxHeartRate: round(a.max_heartrate),
    temperatureC: typeof a.average_temp === 'number' ? Math.round(a.average_temp) : null,
    startDate: a.start_date_local || a.start_date || null,
    activityType: a.type || null,
    sportType: a.sport_type || null,
    workoutTypeCode: num(a.workout_type),
    splits,
    laps,
  };
}

/** Activity summary + laps, shaped the way the analysis prompt expects. */
async function fetchStravaForAnalysis(env: Env, activityId: string): Promise<Record<string, unknown>> {
  const token = await getStravaAccessToken(env);
  const headers = { Authorization: `Bearer ${token}` };
  const [activityResp, lapsResp] = await Promise.all([
    fetch(`https://www.strava.com/api/v3/activities/${activityId}`, { headers }),
    fetch(`https://www.strava.com/api/v3/activities/${activityId}/laps`, { headers }).catch(() => null),
  ]);
  if (!activityResp.ok) throw new Error(`Strava API error: ${activityResp.status}`);
  const a = await activityResp.json() as Record<string, number & string>;
  const laps = lapsResp?.ok ? await lapsResp.json() as Record<string, number & string>[] : null;

  return {
    name: a.name,
    type: a.type,
    sport_type: a.sport_type,
    distance_km: Math.round(a.distance / 10) / 100,
    moving_time_seconds: a.moving_time,
    elapsed_time_seconds: a.elapsed_time,
    elevation_gain: Math.round(a.total_elevation_gain),
    avg_heart_rate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    max_heart_rate: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    avg_speed_kmh: Math.round(a.average_speed * 3.6 * 100) / 100,
    max_speed_kmh: Math.round(a.max_speed * 3.6 * 100) / 100,
    avg_cadence: a.average_cadence ? Math.round(a.average_cadence * 2) : null,
    calories: a.calories,
    suffer_score: a.suffer_score,
    start_date: a.start_date_local,
    description: a.description,
    workout_type: a.workout_type,
    laps: laps?.map(lap => ({
      name: lap.name,
      distance_km: Math.round(lap.distance / 10) / 100,
      moving_time_seconds: lap.moving_time,
      avg_heart_rate: lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
      max_heart_rate: lap.max_heartrate ? Math.round(lap.max_heartrate) : null,
      avg_speed_kmh: Math.round(lap.average_speed * 3.6 * 100) / 100,
      avg_cadence: lap.average_cadence ? Math.round(lap.average_cadence * 2) : null,
      elevation_gain: Math.round(lap.total_elevation_gain),
      pace_min_km: lap.average_speed > 0 ? Math.round(1000 / lap.average_speed / 60 * 100) / 100 : null,
    })) ?? null,
  };
}

// ─── Claude analysis ───────────────────────────────────────────────────────────

/** Former `analyze-run` function, minus the Garmin data. */
async function analyzeRun(env: Env, body: Record<string, unknown>) {
  const { stravaUrl, workoutContext } = body as { stravaUrl?: string; workoutContext?: Record<string, unknown> };
  const match = stravaUrl?.match(/activities\/(\d+)/);
  if (!match) throw new HttpError(400, 'Za analizo je potreben Strava URL.');

  let stravaData: Record<string, unknown> | null = null;
  try {
    stravaData = await fetchStravaForAnalysis(env, match[1]);
  } catch (err) {
    console.error('Strava fetch error:', err);
  }
  if (!stravaData) throw new HttpError(400, 'Ni bilo mogoče pridobiti podatkov iz Strave.');

  const row = await env.DB.prepare("SELECT profile FROM athlete_profile WHERE id = 'default'")
    .first<{ profile: string }>();
  const athleteProfile: AthleteProfile | null = row ? JSON.parse(row.profile) : null;

  if (!env.ANTHROPIC_API_KEY) throw new HttpError(500, 'ANTHROPIC_API_KEY ni nastavljen.');
  const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildAnalysisPrompt(stravaData, workoutContext || {}, athleteProfile) }],
    }),
  });
  if (!claudeResp.ok) throw new Error(`Claude API error: ${claudeResp.status} - ${await claudeResp.text()}`);
  const claudeData = await claudeResp.json() as { content?: { text?: string }[] };

  return {
    analysis: claudeData.content?.[0]?.text || 'Analiza ni na voljo.',
    sources: { strava: true, garmin: false, garminActivity: false, garminDailyStats: false },
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function route(req: Request, env: Env): Promise<unknown> {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;
  const body = (): Promise<Record<string, unknown>> => req.json();

  switch (key) {
    case 'GET /progress': return listProgress(env);
    case 'PUT /progress': await upsertProgress(env, await body()); return { ok: true };
    case 'DELETE /progress': await deleteProgress(env, url); return { ok: true };
    case 'GET /week-overrides': return (await env.DB.prepare('SELECT * FROM week_overrides').all()).results;
    case 'PUT /week-overrides': await upsertWeekOverride(env, await body()); return { ok: true };
    case 'GET /analysis': return getAnalysis(env, url.searchParams.get('key'));
    case 'PUT /analysis': await putAnalysis(env, await body()); return { ok: true };
    case 'POST /strava-activities': return stravaActivities(env, await body());
    case 'POST /fetch-strava': return fetchStrava(env, await body());
    case 'POST /analyze-run': return analyzeRun(env, await body());
    default: throw new HttpError(404, `Not found: ${key}`);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
    try {
      return json(req, await route(req, env));
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (status >= 500) console.error(message);
      return json(req, { error: message }, status);
    }
  },
};
