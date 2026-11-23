// Cloudflare Worker backing the running app. Replaces the Supabase project:
// the D1 tables stand in for Postgres, and the Strava routes are the former
// edge functions (strava-activities, fetch-strava).

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

// ─── Strava ────────────────────────────────────────────────────────────────────

async function getStravaAccessToken(env: Env): Promise<string> {
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID?.trim(),
      client_secret: env.STRAVA_CLIENT_SECRET?.trim(),
      refresh_token: env.STRAVA_REFRESH_TOKEN?.trim(),
      grant_type: 'refresh_token',
    }),
  });
  // Strava's body names the bad field (client_id, client_secret or refresh_token).
  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status} ${await resp.text()}`);
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
    case 'POST /strava-activities': return stravaActivities(env, await body());
    case 'POST /fetch-strava': return fetchStrava(env, await body());
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
