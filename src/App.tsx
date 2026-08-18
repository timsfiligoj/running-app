import { useState, useEffect, useCallback } from 'react';
import { trainingPlans } from './data/trainingPlans';
import { ProgressData, WorkoutProgress, dayKey } from './types';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { WeekAccordion } from './components/WeekAccordion';
import { FormAnalysis } from './components/FormAnalysis';
import { supabase } from './lib/supabase';

interface DbRow {
  id: string;
  plan_id?: string;
  session_index?: number;
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
  strava_activity_id?: number;
}

const ACTIVE_PLAN_KEY = 'activePlanId';

type View = 'plan' | 'form';

/** The form-analysis page is addressable as #forma so it can be bookmarked. */
function viewFromHash(): View {
  if (typeof window === 'undefined') return 'plan';
  return window.location.hash.replace('#', '') === 'forma' ? 'form' : 'plan';
}
const DEFAULT_PLAN_ID = trainingPlans[0].id;

function App() {
  const [activePlanId, setActivePlanId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_PLAN_KEY) : null;
    if (saved && trainingPlans.some(p => p.id === saved)) return saved;
    return DEFAULT_PLAN_ID;
  });
  const [view, setView] = useState<View>(viewFromHash);
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

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goTo = (next: View) => {
    setView(next);
    window.location.hash = next === 'form' ? 'forma' : '';
  };

  const dbRowToSession = (row: DbRow): WorkoutProgress => ({
    sessionIndex: row.session_index ?? 0,
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
    stravaActivityId: row.strava_activity_id,
  });

  const insertSession = (
    bucket: ProgressData,
    key: string,
    session: WorkoutProgress
  ): ProgressData => {
    const existing = bucket[key] ?? [];
    const without = existing.filter(s => s.sessionIndex !== session.sessionIndex);
    const next = [...without, session].sort((a, b) => a.sessionIndex - b.sessionIndex);
    return { ...bucket, [key]: next };
  };

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
        const session = dbRowToSession(row);
        const existing = grouped[planId][row.id] ?? [];
        grouped[planId][row.id] = [...existing, session].sort((a, b) => a.sessionIndex - b.sessionIndex);
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
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<DbRow>;
            const planId = oldRow.plan_id || 'istrski-2026';
            const sessionIndex = oldRow.session_index ?? 0;
            const id = oldRow.id;
            if (!id) return;
            setProgressByPlan(prev => {
              const planBucket = prev[planId];
              if (!planBucket) return prev;
              const existing = planBucket[id];
              if (!existing) return prev;
              const next = existing.filter(s => s.sessionIndex !== sessionIndex);
              const newBucket: ProgressData = { ...planBucket };
              if (next.length === 0) delete newBucket[id];
              else newBucket[id] = next;
              return { ...prev, [planId]: newBucket };
            });
            return;
          }
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as DbRow;
            const planId = row.plan_id || 'istrski-2026';
            const session = dbRowToSession(row);
            setProgressByPlan(prev => ({
              ...prev,
              [planId]: insertSession(prev[planId] ?? {}, row.id, session),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveSession = async (planId: string, key: string, data: WorkoutProgress) => {
    setSyncing(true);
    const { error } = await supabase
      .from('workout_progress')
      .upsert({
        id: key,
        plan_id: planId,
        session_index: data.sessionIndex,
        completed: data.completed,
        skipped: data.skipped || false,
        actual_workout: data.actualWorkout ?? null,
        activity_type: data.activityType || null,
        run_type: data.runType || null,
        distance_km: data.distanceKm ?? null,
        duration_seconds: data.durationSeconds ?? null,
        elevation_meters: data.elevationMeters ?? null,
        avg_heart_rate: data.avgHeartRate ?? null,
        comment: data.comment || null,
        strava_url: data.stravaUrl || null,
        strava_activity_id: data.stravaActivityId ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id,id,session_index' });

    if (error) {
      console.error('Error saving session:', error);
    }
    setSyncing(false);
  };

  const handleUpdateSession = async (
    weekNum: number,
    dayIndex: number,
    sessionIndex: number,
    data: Omit<WorkoutProgress, 'sessionIndex'>,
  ) => {
    const key = dayKey(weekNum, dayIndex);
    const session: WorkoutProgress = { ...data, sessionIndex };

    setProgressByPlan(prev => ({
      ...prev,
      [activePlanId]: insertSession(prev[activePlanId] ?? {}, key, session),
    }));

    await saveSession(activePlanId, key, session);
  };

  const handleAddSession = async (weekNum: number, dayIndex: number) => {
    const key = dayKey(weekNum, dayIndex);
    const existing = progress[key] ?? [];
    const nextIndex = existing.length === 0 ? 0 : Math.max(...existing.map(s => s.sessionIndex)) + 1;
    const newSession: WorkoutProgress = {
      sessionIndex: nextIndex,
      completed: false,
      activityType: 'other',
    };

    setProgressByPlan(prev => ({
      ...prev,
      [activePlanId]: insertSession(prev[activePlanId] ?? {}, key, newSession),
    }));

    await saveSession(activePlanId, key, newSession);
  };

  const handleDeleteSession = async (weekNum: number, dayIndex: number, sessionIndex: number) => {
    const key = dayKey(weekNum, dayIndex);

    setProgressByPlan(prev => {
      const planBucket = prev[activePlanId] ?? {};
      const sessions = (planBucket[key] ?? []).filter(s => s.sessionIndex !== sessionIndex);
      const nextBucket: ProgressData = { ...planBucket };
      if (sessions.length === 0) delete nextBucket[key];
      else nextBucket[key] = sessions;
      return { ...prev, [activePlanId]: nextBucket };
    });

    setSyncing(true);
    const { error } = await supabase
      .from('workout_progress')
      .delete()
      .eq('plan_id', activePlanId)
      .eq('id', key)
      .eq('session_index', sessionIndex);

    if (error) {
      console.error('Error deleting session:', error);
    }
    setSyncing(false);
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

  // Total "workouts" = sum of planned non-rest days across the plan.
  const totalWorkouts = activePlan.weeks.reduce(
    (acc, week) => acc + week.days.filter(day => day.type !== 'rest').length,
    0
  );

  // A day counts as "completed" if at least one session is marked completed.
  const completedWorkouts = activePlan.weeks.reduce((acc, week) => {
    return acc + week.days.filter((day, index) => {
      if (day.type === 'rest') return false;
      const sessions = progress[dayKey(week.week, index)] ?? [];
      return sessions.some(s => s.completed);
    }).length;
  }, 0);

  // Total km across all sessions.
  const totalKm = Object.values(progress).reduce(
    (acc, sessions) => acc + sessions.reduce((s, w) => s + (w.distanceKm || 0), 0),
    0
  );

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
        {/* Plan tabs + form analysis */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {trainingPlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => {
                setActivePlanId(plan.id);
                goTo('plan');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                plan.id === activePlanId && view === 'plan'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
              }`}
            >
              {plan.name}
            </button>
          ))}
          <span className="w-px bg-gray-200 shrink-0 my-1" aria-hidden />
          <button
            onClick={() => goTo('form')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              view === 'form'
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            📊 Analiza forme
          </button>
        </div>

        {/* Header */}
        <Header plan={activePlan} syncing={syncing} />

        {view === 'form' ? (
          <FormAnalysis />
        ) : (
          <>
            {/* Progress Bar */}
            <ProgressBar completed={completedWorkouts} total={totalWorkouts} totalKm={totalKm} />

            {/* Weeks Accordion */}
            <div className="space-y-4">
              {activePlan.weeks.map((week) => (
                <WeekAccordion
                  key={`${activePlanId}-${week.week}`}
                  week={week}
                  progress={progress}
                  planId={activePlanId}
                  onUpdateSession={handleUpdateSession}
                  onAddSession={handleAddSession}
                  onDeleteSession={handleDeleteSession}
                  weekPhaseOverride={weekPhaseOverrides[week.week]}
                  weekFocusOverride={weekFocusOverrides[week.week]}
                  onUpdateWeekPhase={handleUpdateWeekPhase}
                  onUpdateWeekFocus={handleUpdateWeekFocus}
                />
              ))}
            </div>
          </>
        )}

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
