// Supabase Edge Function to list and aggregate Strava activities
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};

// Get a fresh access token using the refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
  const refreshToken = Deno.env.get('STRAVA_REFRESH_TOKEN');

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;         // meters
  moving_time: number;      // seconds
  elapsed_time: number;     // seconds
  total_elevation_gain: number; // meters
  start_date: string;       // ISO 8601
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed: number;    // m/s
  max_speed: number;        // m/s
}

// Fetch all activities in a date range (handles pagination)
async function fetchAllActivities(
  accessToken: string,
  after: number,
  before: number,
  activityType?: string,
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = [];
  let page = 1;
  const perPage = 200; // Strava max

  while (true) {
    const url = new URL('https://www.strava.com/api/v3/athlete/activities');
    url.searchParams.set('after', String(after));
    url.searchParams.set('before', String(before));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status}`);
    }

    const activities: StravaActivity[] = await response.json();

    if (activities.length === 0) break;

    // Filter by type if specified (Run, Ride, Swim, etc.)
    const filtered = activityType
      ? activities.filter(a => a.type.toLowerCase() === activityType.toLowerCase())
      : activities;

    allActivities.push(...filtered);
    page++;

    // Safety: Strava returns max 200, if less we're done
    if (activities.length < perPage) break;
  }

  return allActivities;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { after, before, type, mode } = body;

    // 'after' and 'before' are ISO date strings (e.g. "2025-02-28") or epoch seconds
    let afterEpoch: number;
    let beforeEpoch: number;

    if (typeof after === 'string') {
      afterEpoch = Math.floor(new Date(after).getTime() / 1000);
    } else {
      afterEpoch = after;
    }

    if (typeof before === 'string') {
      beforeEpoch = Math.floor(new Date(before).getTime() / 1000);
    } else {
      beforeEpoch = before || Math.floor(Date.now() / 1000);
    }

    if (!afterEpoch) {
      return new Response(
        JSON.stringify({ error: 'Missing required "after" parameter (date string or epoch)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const accessToken = await getAccessToken();
    const activities = await fetchAllActivities(accessToken, afterEpoch, beforeEpoch, type);

    // Summary mode: return aggregated stats
    if (mode === 'summary') {
      const totalDistanceKm = Math.round(
        activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 10
      ) / 100;
      const totalDurationSeconds = activities.reduce((sum, a) => sum + (a.moving_time || 0), 0);
      const totalElevationMeters = Math.round(
        activities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0)
      );
      const avgHeartRate = activities.filter(a => a.average_heartrate).length > 0
        ? Math.round(
            activities.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) /
            activities.filter(a => a.average_heartrate).length
          )
        : null;

      return new Response(
        JSON.stringify({
          totalActivities: activities.length,
          totalDistanceKm,
          totalDurationSeconds,
          totalElevationMeters,
          avgHeartRate,
          dateRange: {
            from: new Date(afterEpoch * 1000).toISOString().split('T')[0],
            to: new Date(beforeEpoch * 1000).toISOString().split('T')[0],
          },
          type: type || 'all',
        }),
        { headers: corsHeaders }
      );
    }

    // List mode (default): return individual activities
    const mapped = activities.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      date: a.start_date,
      distanceKm: Math.round(a.distance / 10) / 100,
      durationSeconds: a.moving_time,
      elevationMeters: Math.round(a.total_elevation_gain),
      avgHeartRate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      avgSpeedKmh: Math.round(a.average_speed * 3.6 * 100) / 100,
    }));

    return new Response(
      JSON.stringify({
        count: mapped.length,
        activities: mapped,
        dateRange: {
          from: new Date(afterEpoch * 1000).toISOString().split('T')[0],
          to: new Date(beforeEpoch * 1000).toISOString().split('T')[0],
        },
        type: type || 'all',
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
