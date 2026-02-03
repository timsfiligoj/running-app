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

    return new Response(
      JSON.stringify({
        distanceKm,
        durationSeconds,
        elevationMeters,
        avgHeartRate,
        title: activity.name || null,
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
