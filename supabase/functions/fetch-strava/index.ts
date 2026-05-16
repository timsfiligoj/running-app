// Supabase Edge Function to fetch workout data from Strava API
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

// Extract activity ID from Strava URL
function extractActivityId(url: string): string | null {
  const match = url.match(/strava\.com\/activities\/(\d+)/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stravaUrl } = await req.json();

    const activityId = extractActivityId(stravaUrl);
    if (!activityId) {
      return new Response(
        JSON.stringify({ error: 'Invalid Strava URL' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get fresh access token
    const accessToken = await getAccessToken();

    // Fetch activity from Strava API
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Strava API error: ${response.status}` }),
        { status: response.status, headers: corsHeaders }
      );
    }

    const activity = await response.json();

    // Extract data from API response
    // Distance is in meters, convert to km
    const distanceKm = activity.distance ? Math.round(activity.distance / 10) / 100 : null;
    // Moving time is in seconds
    const durationSeconds = activity.moving_time || null;
    // Total elevation gain in meters (rounded to whole number)
    const elevationMeters = activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null;
    // Average heart rate (if available) - rounded to whole number
    const avgHeartRate = activity.average_heartrate ? Math.round(activity.average_heartrate) : null;
    const maxHeartRate = activity.max_heartrate ? Math.round(activity.max_heartrate) : null;
    const temperatureC = typeof activity.average_temp === 'number' ? Math.round(activity.average_temp) : null;
    const startDate = activity.start_date_local || activity.start_date || null;
    const activityType = activity.type || null;
    const sportType = activity.sport_type || null;
    const workoutTypeCode = typeof activity.workout_type === 'number' ? activity.workout_type : null;

    // Splits per km (Strava provides splits_metric array)
    const splits = Array.isArray(activity.splits_metric)
      ? activity.splits_metric.map((s: Record<string, unknown>, i: number) => ({
          km: i + 1,
          pace_seconds: typeof s.moving_time === 'number' && typeof s.distance === 'number' && s.distance > 0
            ? (s.moving_time as number) / ((s.distance as number) / 1000)
            : null,
          hr: typeof s.average_heartrate === 'number' ? Math.round(s.average_heartrate as number) : undefined,
          elevation: typeof s.elevation_difference === 'number' ? Math.round(s.elevation_difference as number) : undefined,
        }))
      : null;

    // Laps (only present for structured workouts)
    const laps = Array.isArray(activity.laps)
      ? activity.laps.map((l: Record<string, unknown>, i: number) => ({
          lap: i + 1,
          distance_m: typeof l.distance === 'number' ? Math.round(l.distance as number) : 0,
          duration_seconds: typeof l.moving_time === 'number' ? (l.moving_time as number) : 0,
          pace_seconds: typeof l.moving_time === 'number' && typeof l.distance === 'number' && (l.distance as number) > 0
            ? (l.moving_time as number) / (((l.distance as number)) / 1000)
            : null,
          hr: typeof l.average_heartrate === 'number' ? Math.round(l.average_heartrate as number) : undefined,
        }))
      : null;

    return new Response(
      JSON.stringify({
        // Backward-compatible fields
        distanceKm,
        durationSeconds,
        elevationMeters,
        avgHeartRate,
        title: activity.name || null,
        // Extended v2 fields for classifier
        maxHeartRate,
        temperatureC,
        startDate,
        activityType,
        sportType,
        workoutTypeCode,
        splits,
        laps,
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
