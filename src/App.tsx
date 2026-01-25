import { useState, useEffect, useCallback } from 'react';
import { trainingPlan } from './data/trainingPlan';
import { ProgressData, WorkoutProgress } from './types';
import { ProgressBar } from './components/ProgressBar';
import { WeekAccordion } from './components/WeekAccordion';
import { RaceStrategy } from './components/RaceStrategy';
import { supabase } from './lib/supabase';

function App() {
  const [progress, setProgress] = useState<ProgressData>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase
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

      const progressData: ProgressData = {};
      data?.forEach((row: { id: string; completed: boolean; actual_workout: string }) => {
        progressData[row.id] = {
          completed: row.completed,
          actualWorkout: row.actual_workout,
        };
      });
      setProgress(progressData);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Nepričakovana napaka pri nalaganju');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('workout_progress_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_progress' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { id: string; completed: boolean; actual_workout: string };
            setProgress((prev) => ({
              ...prev,
              [row.id]: {
                completed: row.completed,
                actualWorkout: row.actual_workout,
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

  // Save to Supabase
  const saveProgress = async (key: string, data: WorkoutProgress) => {
    setSyncing(true);
    const { error } = await supabase
      .from('workout_progress')
      .upsert({
        id: key,
        completed: data.completed,
        actual_workout: data.actualWorkout,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving progress:', error);
    }
    setSyncing(false);
  };

  const handleToggleComplete = async (weekNum: number, dayIndex: number) => {
    const key = `${weekNum}-${dayIndex}`;
    const newData: WorkoutProgress = {
      completed: !progress[key]?.completed,
      actualWorkout: progress[key]?.actualWorkout || '',
    };

    setProgress((prev) => ({
      ...prev,
      [key]: newData,
    }));

    await saveProgress(key, newData);
  };

  const handleUpdateActual = async (weekNum: number, dayIndex: number, actual: string) => {
    const key = `${weekNum}-${dayIndex}`;
    const newData: WorkoutProgress = {
      completed: progress[key]?.completed || false,
      actualWorkout: actual,
    };

    setProgress((prev) => ({
      ...prev,
      [key]: newData,
    }));

    await saveProgress(key, newData);
  };

  const totalWorkouts = trainingPlan.weeks.reduce((acc, week) => acc + week.days.length, 0);
  const completedWorkouts = Object.values(progress).filter((p) => p.completed).length;

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
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Tekaški Načrt
          </h1>
          <p className="text-lg text-blue-600 font-medium">{trainingPlan.athlete}</p>
          <p className="text-gray-600 mt-2">{trainingPlan.goal}</p>
          {syncing && (
            <p className="text-xs text-gray-400 mt-1">Sinhroniziram...</p>
          )}
        </header>

        {/* Progress Bar */}
        <ProgressBar completed={completedWorkouts} total={totalWorkouts} />

        {/* Weeks Accordion */}
        <div className="space-y-4">
          {trainingPlan.weeks.map((week) => (
            <WeekAccordion
              key={week.week}
              week={week}
              progress={progress}
              onToggleComplete={handleToggleComplete}
              onUpdateActual={handleUpdateActual}
            />
          ))}
        </div>

        {/* Race Strategy */}
        <RaceStrategy strategy={trainingPlan.raceStrategy} />

        {/* Footer */}
        <footer className="text-center mt-12 py-6 text-sm text-gray-500">
          <p>Istrski polmaraton 2026 - Priprava na sub-1:35</p>
          <p className="text-xs mt-1 text-gray-400">Sinhronizacija med napravami omogočena</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
