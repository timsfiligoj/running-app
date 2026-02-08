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
    const fromWorkout = fromProgress.actualWorkout ?? week.days[fromIndex].workout;
    const toWorkout = toProgress.actualWorkout ?? week.days[toIndex].workout;
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

  // Helper to check if a day is rest (user selection overrides planned type)
  const isRestDay = (dayIndex: number) => {
    const p = progress[`${week.week}-${dayIndex}`];
    // User's activityType selection takes priority, otherwise use planned type
    if (p?.activityType) {
      return p.activityType === 'rest';
    }
    return week.days[dayIndex].type === 'rest';
  };

  // Exclude rest days from counts (based on effective type, not just planned)
  const nonRestDays = week.days.filter((_, i) => !isRestDay(i));
  const completedCount = week.days.filter(
    (_, i) => !isRestDay(i) && progress[`${week.week}-${i}`]?.completed
  ).length;
  const totalCount = nonRestDays.length;

  // Week is done when all non-rest workouts are either completed OR skipped
  const doneCount = week.days.filter(
    (_, i) => {
      if (isRestDay(i)) return false;
      const p = progress[`${week.week}-${i}`];
      return p?.completed || p?.skipped;
    }
  ).length;
  const isWeekDone = totalCount > 0 && doneCount === totalCount;

  // Determine week status: 'perfect' (all completed), 'partial' (some completed), 'skipped' (none completed)
  const weekStatus = isWeekDone
    ? completedCount === totalCount
      ? 'perfect'   // 100% completed
      : completedCount === 0
        ? 'skipped'   // All skipped, none completed
        : 'partial'   // Some completed, some skipped
    : 'in-progress';

  // Total km for this week
  const weekKm = week.days.reduce((sum, _, i) => {
    const p = progress[`${week.week}-${i}`];
    return sum + (p?.distanceKm || 0);
  }, 0);

  // Total elevation for this week
  const weekElevation = week.days.reduce((sum, _, i) => {
    const p = progress[`${week.week}-${i}`];
    return sum + (p?.elevationMeters || 0);
  }, 0);

  // Styling based on week status
  const weekStyles = {
    perfect: 'bg-green-50 border-2 border-green-400',
    partial: 'bg-yellow-50 border-2 border-yellow-400',
    skipped: 'bg-red-50 border-2 border-red-400',
    'in-progress': 'bg-white',
  };
  const weekHoverStyles = {
    perfect: 'hover:bg-green-100',
    partial: 'hover:bg-yellow-100',
    skipped: 'hover:bg-red-100',
    'in-progress': 'hover:bg-gray-50',
  };

  return (
    <div className={`rounded-xl shadow-md overflow-hidden mb-4 ${weekStyles[weekStatus]}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 sm:px-6 py-4 transition-colors ${weekHoverStyles[weekStatus]}`}
      >
        {/* Top row: Title, progress, chevron */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="font-bold text-lg text-gray-800">
              Teden {week.week}
            </span>
            <span className="text-sm text-gray-500">{week.title}</span>
            {weekStatus === 'perfect' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                ✓ Opravljen
              </span>
            )}
            {weekStatus === 'partial' && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                ⚡ Delno opravljen
              </span>
            )}
            {weekStatus === 'skipped' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                ✗ Izpuščen
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <div className="text-right">
              <span className="text-sm font-medium text-gray-600">
                {completedCount}/{totalCount}
              </span>
              <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    weekStatus === 'perfect' ? 'bg-green-500' :
                    weekStatus === 'partial' ? 'bg-yellow-500' :
                    weekStatus === 'skipped' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
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
        </div>

        {/* Stats row: km and elevation */}
        {(weekKm > 0 || weekElevation > 0) && (
          <div className="flex items-center gap-4 mt-2">
            {weekKm > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm">🏃</span>
                <span className={`text-sm font-bold ${
                  weekStatus === 'perfect' ? 'text-green-700' :
                  weekStatus === 'partial' ? 'text-yellow-700' :
                  weekStatus === 'skipped' ? 'text-red-700' :
                  'text-blue-600'
                }`}>
                  {weekKm.toFixed(1)} km
                </span>
              </div>
            )}
            {weekElevation > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm">⛰️</span>
                <span className={`text-sm font-bold ${
                  weekStatus === 'perfect' ? 'text-green-700' :
                  weekStatus === 'partial' ? 'text-yellow-700' :
                  weekStatus === 'skipped' ? 'text-red-700' :
                  'text-orange-600'
                }`}>
                  {weekElevation} m
                </span>
              </div>
            )}
          </div>
        )}

        {/* Phase and focus */}
        <div className="mt-1 text-sm text-blue-600 font-medium text-left">{week.phase}</div>
        <div className="mt-0.5 text-xs text-gray-500 text-left">{week.focus}</div>
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
