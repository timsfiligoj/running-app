// Supabase Edge Function for AI-powered run analysis
// Combines Strava + Garmin data and calls Claude API for analysis
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
};

// ─── Strava Data Fetching ──────────────────────────────────────────────────────

async function getStravaAccessToken(): Promise<string> {
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      refresh_token: Deno.env.get('STRAVA_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) throw new Error(`Strava token refresh failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

async function fetchStravaActivity(activityId: string): Promise<Record<string, unknown>> {
  const token = await getStravaAccessToken();

  // Fetch both summary and detailed streams
  const [activityResp, lapsResp] = await Promise.all([
    fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }),
    fetch(`https://www.strava.com/api/v3/activities/${activityId}/laps`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => null),
  ]);

  if (!activityResp.ok) throw new Error(`Strava API error: ${activityResp.status}`);

  const activity = await activityResp.json();
  const laps = lapsResp?.ok ? await lapsResp.json() : null;

  return {
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    distance_km: Math.round(activity.distance / 10) / 100,
    moving_time_seconds: activity.moving_time,
    elapsed_time_seconds: activity.elapsed_time,
    elevation_gain: Math.round(activity.total_elevation_gain),
    avg_heart_rate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    max_heart_rate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    avg_speed_kmh: Math.round(activity.average_speed * 3.6 * 100) / 100,
    max_speed_kmh: Math.round(activity.max_speed * 3.6 * 100) / 100,
    avg_cadence: activity.average_cadence ? Math.round(activity.average_cadence * 2) : null,
    calories: activity.calories,
    suffer_score: activity.suffer_score,
    start_date: activity.start_date_local,
    description: activity.description,
    workout_type: activity.workout_type,
    laps: laps?.map((lap: Record<string, unknown>) => ({
      name: lap.name,
      distance_km: Math.round((lap.distance as number) / 10) / 100,
      moving_time_seconds: lap.moving_time,
      avg_heart_rate: lap.average_heartrate ? Math.round(lap.average_heartrate as number) : null,
      max_heart_rate: lap.max_heartrate ? Math.round(lap.max_heartrate as number) : null,
      avg_speed_kmh: Math.round((lap.average_speed as number) * 3.6 * 100) / 100,
      avg_cadence: lap.average_cadence ? Math.round((lap.average_cadence as number) * 2) : null,
      elevation_gain: Math.round(lap.total_elevation_gain as number),
      pace_min_km: (lap.average_speed as number) > 0
        ? Math.round(1000 / (lap.average_speed as number) / 60 * 100) / 100
        : null,
    })) ?? null,
  };
}

// ─── Garmin Data Fetching (via fetch-garmin function) ──────────────────────────

async function callGarminFunction(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/fetch-garmin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

interface GarminRunData {
  activity: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  splits: Record<string, unknown> | null;
  hrZones: Record<string, unknown> | null;
  dailyStats: Record<string, unknown> | null;
}

async function fetchGarminDataForDate(date: string): Promise<GarminRunData | null> {
  // 1. Search for running activities on this date
  const searchResult = await callGarminFunction({ mode: 'search', date });
  if (!searchResult) return null;

  const activities = searchResult.activities as Array<Record<string, unknown>> | null;
  if (!activities || !Array.isArray(activities) || activities.length === 0) return null;

  // Take the first running activity
  const garminActivity = activities[0];
  const activityId = String(garminActivity.activityId || garminActivity.activityID);

  // 2. Fetch detailed data + daily stats in parallel
  const [activityData, dailyStats] = await Promise.all([
    callGarminFunction({ mode: 'activity', activityId }),
    callGarminFunction({ mode: 'daily-stats', date }),
  ]);

  return {
    activity: activityData?.activity as Record<string, unknown> | null,
    details: activityData?.details as Record<string, unknown> | null,
    splits: activityData?.splits as Record<string, unknown> | null,
    hrZones: activityData?.hrZones as Record<string, unknown> | null,
    dailyStats: dailyStats as Record<string, unknown> | null,
  };
}

// ─── Athlete Profile ───────────────────────────────────────────────────────────

interface AthleteProfile {
  race_name?: string;
  race_date?: string;
  target_time?: string;
  target_pace?: string;
  experience?: string;
  max_hr?: number;
  weekly_volume?: string;
  training_philosophy?: string;
  race_elevation?: string;
  weaknesses?: string;
  strengths?: string;
  context?: string;
}

async function getAthleteProfile(): Promise<AthleteProfile | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/athlete_profile?id=eq.default&select=*`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

// ─── Claude Analysis ───────────────────────────────────────────────────────────

function buildAnalysisPrompt(
  stravaData: Record<string, unknown> | null,
  garminData: GarminRunData | null,
  workoutContext: Record<string, unknown>,
  athleteProfile: AthleteProfile | null,
): string {
  let prompt = `Si strokovnjak za tekaško analizo. Analiziraj naslednji tek in podaj konkretno, personalizirano analizo v slovenščini.
`;

  // Athlete profile - the key context for personalized analysis
  if (athleteProfile) {
    prompt += `\n## Atletski profil`;
    if (athleteProfile.race_name) prompt += `\n- Ciljna tekma: ${athleteProfile.race_name}`;
    if (athleteProfile.race_date) prompt += `\n- Datum tekme: ${athleteProfile.race_date}`;
    if (athleteProfile.target_time) prompt += `\n- Ciljni čas: ${athleteProfile.target_time}`;
    if (athleteProfile.target_pace) prompt += `\n- Ciljni tempo: ${athleteProfile.target_pace}`;
    if (athleteProfile.race_elevation) prompt += `\n- Elevacija tekme: ${athleteProfile.race_elevation}`;
    if (athleteProfile.experience) prompt += `\n- Izkušnje: ${athleteProfile.experience}`;
    if (athleteProfile.max_hr) prompt += `\n- Max HR: ${athleteProfile.max_hr} bpm`;
    if (athleteProfile.weekly_volume) prompt += `\n- Tedenski volumen: ${athleteProfile.weekly_volume}`;
    if (athleteProfile.strengths) prompt += `\n- Prednosti: ${athleteProfile.strengths}`;
    if (athleteProfile.weaknesses) prompt += `\n- Šibkosti: ${athleteProfile.weaknesses}`;
    if (athleteProfile.training_philosophy) prompt += `\n- Trenažna filozofija: ${athleteProfile.training_philosophy}`;
    if (athleteProfile.context) prompt += `\n- Dodaten kontekst: ${athleteProfile.context}`;
    prompt += `\n`;
  }

  prompt += `
## Kontekst treninga
- Načrtovani trening: ${workoutContext.plannedWorkout || 'Ni podatka'}
- Tip teka: ${workoutContext.runType || 'Ni podatka'}
- Komentar tekača: ${workoutContext.comment || 'Ni komentarja'}
- Teden v načrtu: ${workoutContext.weekNumber || 'Ni podatka'}
- Faza treninga: ${workoutContext.phase || 'Ni podatka'}
- Fokus tedna: ${workoutContext.focus || 'Ni podatka'}
`;

  if (stravaData) {
    const paceMinKm = stravaData.avg_speed_kmh
      ? Math.round(60 / (stravaData.avg_speed_kmh as number) * 100) / 100
      : null;

    prompt += `
## Strava podatki
- Naziv: ${stravaData.name}
- Razdalja: ${stravaData.distance_km} km
- Čas gibanja: ${formatSeconds(stravaData.moving_time_seconds as number)}
- Skupni čas: ${formatSeconds(stravaData.elapsed_time_seconds as number)}
- Povprečni tempo: ${paceMinKm ? formatPace(paceMinKm) : 'N/A'} /km
- Povprečni HR: ${stravaData.avg_heart_rate ?? 'N/A'} bpm
- Max HR: ${stravaData.max_heart_rate ?? 'N/A'} bpm
- Vzpon: ${stravaData.elevation_gain} m
- Kadenca: ${stravaData.avg_cadence ?? 'N/A'} korakov/min
- Kalorije: ${stravaData.calories ?? 'N/A'}
- Suffer Score: ${stravaData.suffer_score ?? 'N/A'}
`;

    if (stravaData.laps && Array.isArray(stravaData.laps)) {
      prompt += `\n### Krogi/Odseki (Strava)\n`;
      (stravaData.laps as Array<Record<string, unknown>>).forEach((lap, i) => {
        prompt += `${i + 1}. ${lap.distance_km} km | ${formatPace(lap.pace_min_km as number)} /km | HR: ${lap.avg_heart_rate ?? '-'} bpm | Vzpon: ${lap.elevation_gain}m\n`;
      });
    }
  }

  if (garminData?.activity) {
    const ga = garminData.activity as Record<string, unknown>;
    prompt += `
## Garmin podatki
- VO2 Max: ${ga.vO2MaxValue ?? 'N/A'}
- Training Effect (aerobni): ${ga.aerobicTrainingEffect ?? 'N/A'}
- Training Effect (anaerobni): ${ga.anaerobicTrainingEffect ?? 'N/A'}
- Training Load: ${ga.activityTrainingLoad ?? 'N/A'}
- Povprečna kadenca: ${ga.averageRunningCadenceInStepsPerMinute ?? 'N/A'}
- Povprečna dolžina koraka: ${ga.avgStrideLength ? (Math.round((ga.avgStrideLength as number) * 100) / 100) + ' m' : 'N/A'}
- Ground Contact Time: ${ga.avgGroundContactTime ? (ga.avgGroundContactTime as number) + ' ms' : 'N/A'}
- Vertical Oscillation: ${ga.avgVerticalOscillation ? (Math.round((ga.avgVerticalOscillation as number) * 100) / 100) + ' cm' : 'N/A'}
- Vertical Ratio: ${ga.avgVerticalRatio ? (Math.round((ga.avgVerticalRatio as number) * 100) / 100) + ' %' : 'N/A'}
`;
  }

  if (garminData?.hrZones) {
    const zones = garminData.hrZones as Array<Record<string, unknown>>;
    if (Array.isArray(zones) && zones.length > 0) {
      prompt += `\n### HR Cone (Garmin)\n`;
      zones.forEach((zone: Record<string, unknown>) => {
        const mins = Math.round((zone.secsInZone as number || 0) / 60);
        prompt += `- Cona ${zone.zoneNumber}: ${mins} min (${zone.zoneLowBoundary}-${zone.zoneHighBoundary} bpm)\n`;
      });
    }
  }

  if (garminData?.splits) {
    const splitsData = garminData.splits as Record<string, unknown>;
    const lapDTOs = splitsData?.lapDTOs as Array<Record<string, unknown>>;
    if (Array.isArray(lapDTOs) && lapDTOs.length > 0) {
      prompt += `\n### Garmin odseki\n`;
      lapDTOs.forEach((split: Record<string, unknown>, i: number) => {
        const distKm = Math.round((split.distance as number || 0) / 10) / 100;
        const avgHr = split.averageHR ?? '-';
        const duration = formatSeconds(split.duration as number || 0);
        prompt += `${i + 1}. ${distKm} km | ${duration} | HR: ${avgHr} bpm\n`;
      });
    }
  }

  if (garminData?.dailyStats) {
    const ds = garminData.dailyStats as Record<string, unknown>;
    const summary = ds.summary as Record<string, unknown>;
    const hr = ds.heartRate as Record<string, unknown>;
    const training = ds.training as Record<string, unknown>;

    prompt += `\n## Dnevne metrike (Garmin)\n`;
    if (summary) {
      prompt += `- Mirovni HR: ${summary.restingHeartRate ?? 'N/A'} bpm\n`;
      prompt += `- Stres: ${summary.averageStressLevel ?? 'N/A'}\n`;
      prompt += `- Body Battery: ${summary.bodyBatteryHighestValue ?? 'N/A'} (max) / ${summary.bodyBatteryLowestValue ?? 'N/A'} (min)\n`;
      prompt += `- Koraki: ${summary.totalSteps ?? 'N/A'}\n`;
      prompt += `- Spanje (ure): ${summary.sleepingSeconds ? Math.round((summary.sleepingSeconds as number) / 3600 * 10) / 10 : 'N/A'}\n`;
    }
    if (training) {
      prompt += `- VO2 Max (generalno): ${(training as Record<string, unknown>).generic ?? 'N/A'}\n`;
    }
  }

  // Determine run type for adaptive analysis depth
  const runType = (workoutContext.runType as string || '').toLowerCase();
  const isEasyRun = ['easy', 'long'].includes(runType);
  const isIntenseRun = ['tempo', 'intervals', 'hills', 'test', 'race'].includes(runType);

  prompt += `
## Navodila za analizo

STROGA PRAVILA:
- Piši KRATKO. Celotna analiza 150-250 besed.
- NE komentiraj "odklonov od plana". Tekač sam upravlja plan. Zaupaj njegovi odločitvi.
- Priporočila morajo biti usklajena z atletovo trenažno filozofijo. Če je polariziran trening, NE priporočaj več Z3/tempo tekov za easy dneve.
- Upoštevaj fazo treninga: v taperu priporočaj konzervativnost, ne dodajanja volumna. V gradnji baze ne zahtevaj race-pace tekov.
- Piši v slovenščini, strokovno a prijazno.

HR DRIFT ANALIZA (ključni indikator forme):
- Če so na voljo HR spliti po kilometrih, IZRAČUNAJ HR drift: (HR zadnji 2km - HR prvi 2km).
- Drift <5 bpm = odlična aerobna baza. 5-10 bpm = normalen. >10 bpm = potrebno delo na aerobni vzdržljivosti.
- Drift pri race pace je najpomembnejši indikator pripravljenosti za tekmo.

STRUKTURA ODGOVORA (markdown ### za naslove):

### Povzetek
2-3 stavki. Kaj pove ta tek o trenutni formi?

${isIntenseRun ? `### Tempo & HR
Analiza tempa po odsekih in HR odziva. HR drift izračun. Primerjaj s ciljnim tempom.` : `### Ključni podatki
Kratek pregled: tempo, HR (ali je bil v aerobni coni?), kadenca. HR drift če so podatki.`}
${isIntenseRun ? `
### Tehnika
Kadenca, ground contact time, vertical oscillation - samo če podatki obstajajo. 1-2 stavka.` : ''}

### Predikcija cilja
Oceni verjetnost dosega cilja. Uporabi formulo:
- Za tempo/test teke: aktualni pace × 0.97 faktor = predviden HM pace
- HR drift korekcija: drift <10bpm = +5%, drift >15bpm = -10%
- Elevacija korekcija: primerjaj elevacijo tega teka z elevacijo ciljne tekme
Odgovori v formatu:
CONFIDENCE: [število 0-100]%
1-2 stavka zakaj.

### Priporočilo
ENO konkretno priporočilo, usklajeno s trenažno filozofijo in fazo.
`;

  return prompt;
}

function formatSeconds(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm)) return '-';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { stravaUrl, date, workoutContext } = body;

    if (!stravaUrl && !date) {
      return new Response(
        JSON.stringify({ error: 'Potreben je vsaj stravaUrl ali date.' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Extract Strava activity ID from URL
    let stravaData: Record<string, unknown> | null = null;
    if (stravaUrl) {
      const match = stravaUrl.match(/activities\/(\d+)/);
      if (match) {
        try {
          stravaData = await fetchStravaActivity(match[1]);
        } catch (err) {
          console.error('Strava fetch error:', err);
        }
      }
    }

    // Derive date from Strava data or use provided date
    const activityDate = date || (stravaData?.start_date
      ? (stravaData.start_date as string).split('T')[0]
      : null);

    // Fetch Garmin data for the activity date
    let garminData: GarminRunData | null = null;
    if (activityDate) {
      try {
        garminData = await fetchGarminDataForDate(activityDate);
      } catch (err) {
        console.error('Garmin fetch error:', err);
      }
    }

    if (!stravaData && !garminData) {
      return new Response(
        JSON.stringify({ error: 'Ni bilo mogoče pridobiti podatkov ne iz Strave ne iz Garmina.' }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Fetch athlete profile for personalized analysis
    const athleteProfile = await getAthleteProfile();

    // Build prompt and call Claude
    const prompt = buildAnalysisPrompt(stravaData, garminData, workoutContext || {}, athleteProfile);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY ni nastavljen.' }),
        { status: 500, headers: corsHeaders },
      );
    }

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      throw new Error(`Claude API error: ${claudeResp.status} - ${errText}`);
    }

    const claudeData = await claudeResp.json();
    const analysis = claudeData.content?.[0]?.text || 'Analiza ni na voljo.';

    return new Response(
      JSON.stringify({
        analysis,
        sources: {
          strava: !!stravaData,
          garmin: !!garminData,
          garminActivity: !!garminData?.activity,
          garminDailyStats: !!garminData?.dailyStats,
        },
      }),
      { headers: corsHeaders },
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('analyze-run error:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
