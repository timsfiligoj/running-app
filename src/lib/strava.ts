import { supabase } from './supabase';

export interface StravaData {
  distanceKm: number | null;
  durationSeconds: number | null;
  avgHeartRate: number | null;
  title: string | null;
}

export interface FetchStravaResult {
  data: StravaData | null;
  error: string | null;
}

/**
 * Fetch workout data from a Strava activity URL
 * Uses Supabase Edge Function to bypass CORS
 */
export async function fetchStravaData(stravaUrl: string): Promise<FetchStravaResult> {
  // Validate URL format
  if (!stravaUrl || !stravaUrl.includes('strava.com/activities/')) {
    return {
      data: null,
      error: 'Neveljaven Strava URL',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('fetch-strava', {
      body: { stravaUrl },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        data: null,
        error: 'Napaka pri pridobivanju podatkov iz Strave',
      };
    }

    if (data?.error) {
      return {
        data: null,
        error: data.error,
      };
    }

    return {
      data: {
        distanceKm: data.distanceKm,
        durationSeconds: data.durationSeconds,
        avgHeartRate: data.avgHeartRate,
        title: data.title,
      },
      error: null,
    };
  } catch (err) {
    console.error('Fetch Strava error:', err);
    return {
      data: null,
      error: 'Napaka pri povezavi s strežnikom',
    };
  }
}
