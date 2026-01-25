import { useState, useEffect } from 'react';
import { trainingPlan } from './data/trainingPlan';
import { ProgressData } from './types';
import { ProgressBar } from './components/ProgressBar';
import { WeekAccordion } from './components/WeekAccordion';
import { RaceStrategy } from './components/RaceStrategy';

const STORAGE_KEY = 'training-progress';

function App() {
  const [progress, setProgress] = useState<ProgressData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const handleToggleComplete = (weekNum: number, dayIndex: number) => {
    const key = `${weekNum}-${dayIndex}`;
    setProgress((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        completed: !prev[key]?.completed,
        actualWorkout: prev[key]?.actualWorkout || '',
      },
    }));
  };

  const handleUpdateActual = (weekNum: number, dayIndex: number, actual: string) => {
    const key = `${weekNum}-${dayIndex}`;
    setProgress((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        completed: prev[key]?.completed || false,
        actualWorkout: actual,
      },
    }));
  };

  const totalWorkouts = trainingPlan.weeks.reduce((acc, week) => acc + week.days.length, 0);
  const completedWorkouts = Object.values(progress).filter((p) => p.completed).length;

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
        </footer>
      </div>
    </div>
  );
}

export default App;
