import { useState } from 'react';
import { Week, ProgressData } from '../types';
import { WorkoutItem } from './WorkoutItem';

interface WeekAccordionProps {
  week: Week;
  progress: ProgressData;
  onToggleComplete: (weekNum: number, dayIndex: number) => void;
  onUpdateActual: (weekNum: number, dayIndex: number, actual: string) => void;
}

export function WeekAccordion({
  week,
  progress,
  onToggleComplete,
  onUpdateActual,
}: WeekAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const completedCount = week.days.filter(
    (_, i) => progress[`${week.week}-${i}`]?.completed
  ).length;
  const totalCount = week.days.length;
  const isWeekComplete = completedCount === totalCount;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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
          <div className="text-right">
            <span className="text-sm font-medium text-gray-600">
              {completedCount}/{totalCount}
            </span>
            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isWeekComplete ? 'bg-green-500' : 'bg-blue-500'
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
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="grid gap-3 mt-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {week.days.map((day, index) => (
              <WorkoutItem
                key={index}
                day={day}
                weekNum={week.week}
                dayIndex={index}
                progress={progress[`${week.week}-${index}`] || { completed: false, actualWorkout: '' }}
                onToggleComplete={onToggleComplete}
                onUpdateActual={onUpdateActual}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
