import { supabase } from './supabase';

export interface StravaData {
  distanceKm: number | null;
  durationSeconds: number | null;
  elevationMeters: number | null;
  avgHeartRate: number | null;
  title: string | null;
}

export interface StravaActivitySummary {
  totalActivities: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  totalElevationMeters: number;
  avgHeartRate: number | null;
  dateRange: { from: string; to: string };
  type: string;
}

export interface StravaActivityItem {
  id: number;
  name: string;
  type: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  elevationMeters: number;
  avgHeartRate: number | null;
  avgSpeedKmh: number;
}

export interface StravaActivitiesResult {
  data: StravaActivitySummary | { count: number; activities: StravaActivityItem[] } | null;
  error: string | null;
}

/**
 * Fetch aggregated Strava activity stats for a date range
 * @param after - Start date (ISO string, e.g. "2025-02-28")
 * @param before - End date (ISO string, e.g. "2026-02-27"), defaults to now
 * @param type - Activity type filter (e.g. "Run", "Ride"), defaults to all
 * @param mode - "summary" for aggregated stats, "list" for individual activities
 */
export async function fetchStravaActivities(
  after: string,
  before?: string,
  type?: string,
  mode: 'summary' | 'list' = 'summary',
): Promise<StravaActivitiesResult> {
  try {
    const { data, error } = await supabase.functions.invoke('strava-activities', {
      body: { after, before, type, mode },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return { data: null, error: 'Napaka pri pridobivanju podatkov iz Strave' };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Fetch Strava activities error:', err);
    return { data: null, error: 'Napaka pri povezavi s strežnikom' };
  }
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
        elevationMeters: data.elevationMeters,
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
