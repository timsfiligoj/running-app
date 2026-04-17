import { useState, useEffect, useCallback } from 'react';
import { trainingPlans } from './data/trainingPlans';
import { ProgressData, WorkoutProgress } from './types';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { WeekAccordion } from './components/WeekAccordion';
import { supabase } from './lib/supabase';

interface DbRow {
  id: string;
  plan_id?: string;
  completed: boolean;
  skipped?: boolean;
  actual_workout: string;
  activity_type?: string;
  run_type?: string;
  distance_km?: number;
  duration_seconds?: number;
  elevation_meters?: number;
  avg_heart_rate?: number;
  comment?: string;
  strava_url?: string;
}

const ACTIVE_PLAN_KEY = 'activePlanId';
const DEFAULT_PLAN_ID = trainingPlans[0].id;

function App() {
  const [activePlanId, setActivePlanId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_PLAN_KEY) : null;
    if (saved && trainingPlans.some(p => p.id === saved)) return saved;
    return DEFAULT_PLAN_ID;
  });
  const [progressByPlan, setProgressByPlan] = useState<Record<string, ProgressData>>({});
  const [phasesByPlan, setPhasesByPlan] = useState<Record<string, Record<number, string>>>({});
  const [focusByPlan, setFocusByPlan] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePlan = trainingPlans.find(p => p.id === activePlanId) ?? trainingPlans[0];
  const progress = progressByPlan[activePlanId] ?? {};
  const weekPhaseOverrides = phasesByPlan[activePlanId] ?? {};
  const weekFocusOverrides = focusByPlan[activePlanId] ?? {};

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_PLAN_KEY, activePlanId);
    }
  }, [activePlanId]);

  const dbRowToProgress = (row: DbRow): WorkoutProgress => ({
    completed: row.completed,
    skipped: row.skipped,
    actualWorkout: row.actual_workout ?? undefined,
    activityType: row.activity_type as WorkoutProgress['activityType'],
    runType: row.run_type as WorkoutProgress['runType'],
    distanceKm: row.distance_km,
    durationSeconds: row.duration_seconds,
    elevationMeters: row.elevation_meters,
    avgHeartRate: row.avg_heart_rate,
    comment: row.comment,
    stravaUrl: row.strava_url,
  });

  const loadProgress = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('workout_progress')
        .select('*');

      if (dbError) {
        console.error('Error loading progress:', dbError);
        setError(`Napaka pri povezavi: ${dbError.message}`);
        setLoading(false);
        return;
      }

      const grouped: Record<string, ProgressData> = {};
      data?.forEach((row: DbRow) => {
        const planId = row.plan_id || 'istrski-2026';
        if (!grouped[planId]) grouped[planId] = {};
        grouped[planId][row.id] = dbRowToProgress(row);
      });
      setProgressByPlan(grouped);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Nepričakovana napaka pri nalaganju');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeekOverrides = useCallback(async () => {
    const { data } = await supabase.from('week_overrides').select('*');
    if (data) {
      const phases: Record<string, Record<number, string>> = {};
      const focuses: Record<string, Record<number, string>> = {};
      data.forEach((row: { plan_id?: string; week_num: number; phase?: string; focus?: string }) => {
        const planId = row.plan_id || 'istrski-2026';
        if (!phases[planId]) phases[planId] = {};
        if (!focuses[planId]) focuses[planId] = {};
        if (row.phase) phases[planId][row.week_num] = row.phase;
        if (row.focus) focuses[planId][row.week_num] = row.focus;
      });
      setPhasesByPlan(phases);
      setFocusByPlan(focuses);
    }
  }, []);

  useEffect(() => {
    loadProgress();
    loadWeekOverrides();
  }, [loadProgress, loadWeekOverrides]);

  useEffect(() => {
    const channel = supabase
      .channel('workout_progress_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_progress' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as DbRow;
            const planId = row.plan_id || 'istrski-2026';
            setProgressByPlan((prev) => ({
              ...prev,
              [planId]: {
                ...(prev[planId] ?? {}),
                [row.id]: dbRowToProgress(row),
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveProgress = async (planId: string, key: string, data: WorkoutProgress) => {
    setSyncing(true);
    const { error } = await supabase
      .from('workout_progress')
      .upsert({
        id: key,
        plan_id: planId,
        completed: data.completed,
        skipped: data.skipped || false,
        actual_workout: data.actualWorkout ?? null,
        activity_type: data.activityType || null,
        run_type: data.runType || null,
        distance_km: data.distanceKm || null,
        duration_seconds: data.durationSeconds || null,
        elevation_meters: data.elevationMeters || null,
        avg_heart_rate: data.avgHeartRate || null,
        comment: data.comment || null,
        strava_url: data.stravaUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id,id' });

    if (error) {
      console.error('Error saving progress:', error);
    }
    setSyncing(false);
  };

  const handleUpdateWorkout = async (weekNum: number, dayIndex: number, data: WorkoutProgress) => {
    const key = `${weekNum}-${dayIndex}`;

    setProgressByPlan((prev) => ({
      ...prev,
      [activePlanId]: {
        ...(prev[activePlanId] ?? {}),
        [key]: data,
      },
    }));

    await saveProgress(activePlanId, key, data);
  };

  const handleUpdateWeekPhase = async (weekNum: number, phase: string) => {
    setPhasesByPlan(prev => ({
      ...prev,
      [activePlanId]: { ...(prev[activePlanId] ?? {}), [weekNum]: phase },
    }));
    await supabase.from('week_overrides').upsert({
      plan_id: activePlanId,
      week_num: weekNum,
      phase,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,week_num' });
  };

  const handleUpdateWeekFocus = async (weekNum: number, focus: string) => {
    setFocusByPlan(prev => ({
      ...prev,
      [activePlanId]: { ...(prev[activePlanId] ?? {}), [weekNum]: focus },
    }));
    await supabase.from('week_overrides').upsert({
      plan_id: activePlanId,
      week_num: weekNum,
      focus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id,week_num' });
  };

  const totalWorkouts = activePlan.weeks.reduce(
    (acc, week) => acc + week.days.filter(day => day.type !== 'rest').length,
    0
  );

  const completedWorkouts = activePlan.weeks.reduce((acc, week) => {
    return acc + week.days.filter((day, index) => {
      if (day.type === 'rest') return false;
      const key = `${week.week}-${index}`;
      return progress[key]?.completed;
    }).length;
  }, 0);

  const totalKm = Object.values(progress).reduce((acc, p) => acc + (p.distanceKm || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Nalagam podatke...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-700 mb-2">Napaka pri povezavi</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Preveri, da je tabela <code className="bg-gray-100 px-1 rounded">workout_progress</code> ustvarjena v Supabase.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              loadProgress();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Poskusi znova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Plan tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {trainingPlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                plan.id === activePlanId
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
              }`}
            >
              {plan.name}
            </button>
          ))}
        </div>

        {/* Header */}
        <Header plan={activePlan} syncing={syncing} />

        {/* Progress Bar */}
        <ProgressBar completed={completedWorkouts} total={totalWorkouts} totalKm={totalKm} />

        {/* Weeks Accordion */}
        <div className="space-y-4">
          {activePlan.weeks.map((week) => (
            <WeekAccordion
              key={`${activePlanId}-${week.week}`}
              week={week}
              progress={progress}
              onUpdateWorkout={handleUpdateWorkout}
              weekPhaseOverride={weekPhaseOverrides[week.week]}
              weekFocusOverride={weekFocusOverrides[week.week]}
              onUpdateWeekPhase={handleUpdateWeekPhase}
              onUpdateWeekFocus={handleUpdateWeekFocus}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 py-8">
          <div className="max-w-md mx-auto">
            <p className="text-lg italic text-gray-500 font-light">
              "Your only limit is the one you accept."
            </p>
            <div className="mt-3 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 mx-auto rounded-full"></div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
