// Supabase Edge Function for Garmin Connect data fetching
// Implements Garmin SSO authentication (OAuth1 → OAuth2) with token caching
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};

const GARMIN_SSO_BASE = 'https://sso.garmin.com/sso';
const GARMIN_CONNECT_BASE = 'https://connect.garmin.com';

// ─── Cookie Jar ────────────────────────────────────────────────────────────────

class CookieJar {
  private cookies: Map<string, string> = new Map();

  addFromResponse(response: Response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const header of setCookies) {
      const match = header.match(/^([^=]+)=([^;]*)/);
      if (match) this.cookies.set(match[1], match[2]);
    }
  }

  toString(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

// ─── OAuth1 Signing ────────────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

interface OAuth1Tokens {
  consumer_key: string;
  consumer_secret: string;
  oauth_token: string;
  oauth_token_secret: string;
}

interface OAuth2Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function buildOAuth1Header(
  method: string,
  url: string,
  oauth1: OAuth1Tokens,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const params: Record<string, string> = {
    oauth_consumer_key: oauth1.consumer_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: oauth1.oauth_token,
    oauth_version: '1.0',
  };

  // Build base string
  const sortedParams = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(oauth1.consumer_secret)}&${percentEncode(oauth1.oauth_token_secret)}`;

  const signature = await hmacSha1(signingKey, baseString);
  params['oauth_signature'] = signature;

  const header = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(params[k])}"`)
    .join(', ');

  return `OAuth ${header}`;
}

// ─── Garmin SSO Authentication ─────────────────────────────────────────────────

async function ssoLogin(email: string, password: string): Promise<OAuth1Tokens> {
  const jar = new CookieJar();
  const ssoParams = new URLSearchParams({
    id: 'gauth-widget',
    embedWidget: 'true',
    gauthHost: `${GARMIN_SSO_BASE}/embed`,
  });
  const ssoUrl = `${GARMIN_SSO_BASE}/embed?${ssoParams}`;

  // Step 1: GET SSO page → extract CSRF token
  const pageResp = await fetch(ssoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept': 'text/html',
    },
    redirect: 'manual',
  });
  jar.addFromResponse(pageResp);
  const pageHtml = await pageResp.text();

  const csrfMatch = pageHtml.match(/name="_csrf"\s+value="([^"]+)"/);
  if (!csrfMatch) {
    throw new Error('Could not extract CSRF token from Garmin SSO page. Garmin may have changed their login flow.');
  }
  const csrf = csrfMatch[1];

  // Step 2: POST credentials
  const loginBody = new URLSearchParams({
    username: email,
    password: password,
    embed: 'true',
    _csrf: csrf,
  });

  const loginResp = await fetch(ssoUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': jar.toString(),
      'Origin': 'https://sso.garmin.com',
    },
    body: loginBody.toString(),
    redirect: 'manual',
  });
  jar.addFromResponse(loginResp);
  const loginHtml = await loginResp.text();

  // Step 3: Extract ticket from response
  const ticketMatch = loginHtml.match(/embed\?ticket=(ST-\d+-[a-zA-Z0-9]+)/);
  if (!ticketMatch) {
    if (loginHtml.includes('locked')) {
      throw new Error('Garmin account is locked. Please unlock via Garmin website.');
    }
    if (loginHtml.includes('invalid') || loginHtml.includes('incorrect')) {
      throw new Error('Invalid Garmin credentials. Check GARMIN_EMAIL and GARMIN_PASSWORD.');
    }
    throw new Error('Could not extract SSO ticket. Login may have failed or Garmin changed their flow.');
  }
  const ticket = ticketMatch[1];

  // Step 4: Exchange ticket for OAuth1 tokens
  const exchangeResp = await fetch(
    `${GARMIN_CONNECT_BASE}/modern/di-oauth/exchange/user/2.0`,
    {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': jar.toString(),
      },
      body: `ticket=${ticket}`,
    },
  );

  if (!exchangeResp.ok) {
    throw new Error(`OAuth1 exchange failed: ${exchangeResp.status}`);
  }

  return await exchangeResp.json() as OAuth1Tokens;
}

async function exchangeForOAuth2(oauth1: OAuth1Tokens): Promise<OAuth2Tokens> {
  const url = `${GARMIN_CONNECT_BASE}/modern/di-oauth/exchange`;
  const authHeader = await buildOAuth1Header('POST', url, oauth1);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OAuth2 exchange failed: ${resp.status} - ${text}`);
  }

  return await resp.json() as OAuth2Tokens;
}

// ─── Token Management (Supabase cache) ─────────────────────────────────────────

async function getCachedTokens(): Promise<{ oauth1: OAuth1Tokens; oauth2: OAuth2Tokens; expiresAt: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/garmin_tokens?id=eq.default&select=*`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    },
  );

  if (!resp.ok) return null;
  const rows = await resp.json();
  if (!rows.length || !rows[0].oauth2_tokens) return null;

  return {
    oauth1: rows[0].oauth1_tokens,
    oauth2: rows[0].oauth2_tokens,
    expiresAt: rows[0].oauth2_expires_at,
  };
}

async function cacheTokens(oauth1: OAuth1Tokens, oauth2: OAuth2Tokens): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return;

  const expiresAt = new Date(Date.now() + (oauth2.expires_in - 60) * 1000).toISOString();

  await fetch(`${supabaseUrl}/rest/v1/garmin_tokens`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: 'default',
      oauth1_tokens: oauth1,
      oauth2_tokens: oauth2,
      oauth2_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function getValidAccessToken(): Promise<string> {
  // 1. Check cache
  const cached = await getCachedTokens();
  if (cached) {
    const expiresAt = new Date(cached.expiresAt);
    if (expiresAt > new Date()) {
      return cached.oauth2.access_token;
    }

    // 2. Try refresh with cached OAuth1 tokens
    try {
      const newOAuth2 = await exchangeForOAuth2(cached.oauth1);
      await cacheTokens(cached.oauth1, newOAuth2);
      return newOAuth2.access_token;
    } catch {
      // OAuth1 tokens may be expired too, fall through to full login
    }
  }

  // 3. Full SSO login
  const email = Deno.env.get('GARMIN_EMAIL');
  const password = Deno.env.get('GARMIN_PASSWORD');
  if (!email || !password) {
    throw new Error('GARMIN_EMAIL and GARMIN_PASSWORD must be set as Supabase secrets.');
  }

  const oauth1 = await ssoLogin(email, password);
  const oauth2 = await exchangeForOAuth2(oauth1);
  await cacheTokens(oauth1, oauth2);

  return oauth2.access_token;
}

// ─── Garmin Connect API Calls ──────────────────────────────────────────────────

async function garminGet(accessToken: string, path: string): Promise<unknown> {
  const resp = await fetch(`${GARMIN_CONNECT_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'DI-Backend': 'connectapi.garmin.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  });

  if (resp.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!resp.ok) {
    throw new Error(`Garmin API error: ${resp.status} ${await resp.text()}`);
  }

  return await resp.json();
}

// Retry wrapper that re-authenticates on 401
async function garminGetWithRetry(path: string): Promise<unknown> {
  let accessToken = await getValidAccessToken();

  try {
    return await garminGet(accessToken, path);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      // Force re-login
      const email = Deno.env.get('GARMIN_EMAIL')!;
      const password = Deno.env.get('GARMIN_PASSWORD')!;
      const oauth1 = await ssoLogin(email, password);
      const oauth2 = await exchangeForOAuth2(oauth1);
      await cacheTokens(oauth1, oauth2);
      accessToken = oauth2.access_token;
      return await garminGet(accessToken, path);
    }
    throw err;
  }
}

// ─── API Endpoint Wrappers ─────────────────────────────────────────────────────

async function getActivity(activityId: string) {
  return await garminGetWithRetry(`/activity-service/activity/${activityId}`);
}

async function getActivityDetails(activityId: string) {
  return await garminGetWithRetry(`/activity-service/activity/${activityId}/details`);
}

async function getActivitySplits(activityId: string) {
  return await garminGetWithRetry(`/activity-service/activity/${activityId}/splits`);
}

async function getActivityHRZones(activityId: string) {
  return await garminGetWithRetry(`/activity-service/activity/${activityId}/hrTimeInZones`);
}

async function searchActivities(date: string, limit = 10) {
  // Search activities around a specific date
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return await garminGetWithRetry(
    `/activitylist-service/activities/search/activities?startDate=${date}&endDate=${date}&start=0&limit=${limit}&activityType=running`
  );
}

async function getDailySummary(date: string) {
  return await garminGetWithRetry(
    `/usersummary-service/usersummary/daily?calendarDate=${date}`
  );
}

async function getDailyHeartRate(date: string) {
  return await garminGetWithRetry(
    `/wellness-service/wellness/dailyHeartRate?date=${date}`
  );
}

async function getTrainingStatus() {
  return await garminGetWithRetry(
    `/metrics-service/metrics/maxmet/latest`
  );
}

async function getUserProfile() {
  return await garminGetWithRetry(`/userprofile-service/usersocialprofile`);
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === 'activity') {
      // Fetch detailed data for a specific Garmin activity
      const { activityId } = body;
      if (!activityId) {
        return new Response(
          JSON.stringify({ error: 'Missing activityId' }),
          { status: 400, headers: corsHeaders },
        );
      }

      const [activity, details, splits, hrZones] = await Promise.all([
        getActivity(activityId),
        getActivityDetails(activityId).catch(() => null),
        getActivitySplits(activityId).catch(() => null),
        getActivityHRZones(activityId).catch(() => null),
      ]);

      return new Response(
        JSON.stringify({ activity, details, splits, hrZones }),
        { headers: corsHeaders },
      );
    }

    if (mode === 'search') {
      // Search for activities on a specific date
      const { date } = body;
      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Missing date (YYYY-MM-DD)' }),
          { status: 400, headers: corsHeaders },
        );
      }

      const activities = await searchActivities(date);

      return new Response(
        JSON.stringify({ activities }),
        { headers: corsHeaders },
      );
    }

    if (mode === 'daily-stats') {
      // Fetch daily wellness summary + heart rate
      const { date } = body;
      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Missing date (YYYY-MM-DD)' }),
          { status: 400, headers: corsHeaders },
        );
      }

      const [summary, heartRate, training] = await Promise.all([
        getDailySummary(date).catch(() => null),
        getDailyHeartRate(date).catch(() => null),
        getTrainingStatus().catch(() => null),
      ]);

      return new Response(
        JSON.stringify({ summary, heartRate, training }),
        { headers: corsHeaders },
      );
    }

    if (mode === 'profile') {
      const profile = await getUserProfile();
      return new Response(
        JSON.stringify({ profile }),
        { headers: corsHeaders },
      );
    }

    if (mode === 'test') {
      // Test connection - just try to authenticate
      const token = await getValidAccessToken();
      return new Response(
        JSON.stringify({ ok: true, message: 'Garmin authentication successful', hasToken: !!token }),
        { headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode. Use: activity, search, daily-stats, profile, test' }),
      { status: 400, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('fetch-garmin error:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
