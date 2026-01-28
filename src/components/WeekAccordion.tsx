import { useState } from 'react';
import { Week, ProgressData, WorkoutProgress, ActivityType, RunType } from '../types';
import { WorkoutItem } from './WorkoutItem';

interface WeekAccordionProps {
  week: Week;
  progress: ProgressData;
  onUpdateWorkout: (weekNum: number, dayIndex: number, data: WorkoutProgress) => void;
}

// Helper to derive activity type and run type from planned workout type
const getDefaultsFromPlannedType = (plannedType: string): { activityType: ActivityType; runType?: RunType } => {
  const runTypes: string[] = ['intervals', 'tempo', 'easy', 'long', 'hills', 'test', 'race', 'activation'];

  if (runTypes.includes(plannedType)) {
    return {
      activityType: 'run',
      runType: plannedType === 'activation' ? 'easy' : plannedType as RunType,
    };
  }

  if (plannedType === 'strength') {
    return { activityType: 'strength' };
  }

  if (plannedType === 'rest') {
    return { activityType: 'rest' };
  }

  return { activityType: 'other' };
};

export function WeekAccordion({
  week,
  progress,
  onUpdateWorkout,
}: WeekAccordionProps) {
  // Handle swapping workouts between two days
  const handleSwapWorkouts = (fromIndex: number, toIndex: number) => {
    const fromKey = `${week.week}-${fromIndex}`;
    const toKey = `${week.week}-${toIndex}`;

    const fromProgress = progress[fromKey] || { completed: false };
    const toProgress = progress[toKey] || { completed: false };

    // Get defaults from planned types
    const fromDefaults = getDefaultsFromPlannedType(week.days[fromIndex].type);
    const toDefaults = getDefaultsFromPlannedType(week.days[toIndex].type);

    // Get effective values (saved or default)
    const fromWorkout = fromProgress.actualWorkout || week.days[fromIndex].workout;
    const toWorkout = toProgress.actualWorkout || week.days[toIndex].workout;
    const fromActivityType = fromProgress.activityType ?? fromDefaults.activityType;
    const toActivityType = toProgress.activityType ?? toDefaults.activityType;
    const fromRunType = fromProgress.runType ?? fromDefaults.runType;
    const toRunType = toProgress.runType ?? toDefaults.runType;

    // Swap everything: workout description, activity type, run type
    onUpdateWorkout(week.week, fromIndex, {
      ...fromProgress,
      actualWorkout: toWorkout,
      activityType: toActivityType,
      runType: toRunType,
    });
    onUpdateWorkout(week.week, toIndex, {
      ...toProgress,
      actualWorkout: fromWorkout,
      activityType: fromActivityType,
      runType: fromRunType,
    });
  };
  const [isOpen, setIsOpen] = useState(false);

  // Exclude rest days from counts
  const nonRestDays = week.days.filter(day => day.type !== 'rest');
  const completedCount = week.days.filter(
    (day, i) => day.type !== 'rest' && progress[`${week.week}-${i}`]?.completed
  ).length;
  const totalCount = nonRestDays.length;

  // Week is complete when all non-rest workouts are either completed OR skipped
  const doneCount = week.days.filter(
    (day, i) => {
      if (day.type === 'rest') return false;
      const p = progress[`${week.week}-${i}`];
      return p?.completed || p?.skipped;
    }
  ).length;
  const isWeekComplete = totalCount > 0 && doneCount === totalCount;

  // Total km for this week
  const weekKm = week.days.reduce((sum, _, i) => {
    const p = progress[`${week.week}-${i}`];
    return sum + (p?.distanceKm || 0);
  }, 0);

  return (
    <div className={`rounded-xl shadow-md overflow-hidden mb-4 ${
      isWeekComplete
        ? 'bg-green-50 border-2 border-green-400'
        : 'bg-white'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
          isWeekComplete ? 'hover:bg-green-100' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-lg text-gray-800">
              Teden {week.week}
            </span>
            <span className="text-sm text-gray-500">{week.title}</span>
            {isWeekComplete && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                ✓ Opravljen
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-blue-600 font-medium">{week.phase}</div>
          <div className="mt-0.5 text-xs text-gray-500">{week.focus}</div>
        </div>
        <div className="flex items-center gap-4">
          {weekKm > 0 && (
            <div className="text-right">
              <span className={`text-sm font-bold ${isWeekComplete ? 'text-green-700' : 'text-blue-600'}`}>
                {weekKm.toFixed(1)} km
              </span>
            </div>
          )}
          <div className="text-right">
            <span className="text-sm font-medium text-gray-600">
              {completedCount}/{totalCount}
            </span>
            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isWeekComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="space-y-3 mt-4">
            {week.days.map((day, index) => (
              <WorkoutItem
                key={index}
                day={day}
                weekStartDate={week.startDate}
                dayIndex={index}
                allDays={week.days}
                progress={progress[`${week.week}-${index}`] || { completed: false, actualWorkout: '' }}
                onUpdate={(data) => onUpdateWorkout(week.week, index, data)}
                onSwap={(toIndex) => handleSwapWorkouts(index, toIndex)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
