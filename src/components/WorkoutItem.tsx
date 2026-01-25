import { useState } from 'react';
import { Day, WorkoutProgress } from '../types';

interface WorkoutItemProps {
  day: Day;
  weekNum: number;
  dayIndex: number;
  progress: WorkoutProgress;
  onToggleComplete: (weekNum: number, dayIndex: number) => void;
  onUpdateActual: (weekNum: number, dayIndex: number, actual: string) => void;
}

const typeColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
  intervals: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Intervali' },
  tempo: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Tempo' },
  easy: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'Lahek' },
  long: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: 'Dolgi' },
  hills: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', label: 'Klanci' },
  strength: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', label: 'Moč' },
  rest: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600', label: 'Počitek' },
  test: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', label: 'Test' },
  race: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', label: 'Tekma' },
  activation: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', label: 'Aktivacija' },
};

export function WorkoutItem({
  day,
  weekNum,
  dayIndex,
  progress,
  onToggleComplete,
  onUpdateActual,
}: WorkoutItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(progress.actualWorkout || day.workout);

  const colors = typeColors[day.type] || typeColors.rest;

  const handleSave = () => {
    onUpdateActual(weekNum, dayIndex, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(progress.actualWorkout || day.workout);
    setIsEditing(false);
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border} ${
        progress.completed ? 'opacity-75' : ''
      } transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={progress.completed}
          onChange={() => onToggleComplete(weekNum, dayIndex)}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-gray-800">{day.day}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
            >
              {colors.label}
            </span>
            {progress.completed && (
              <span className="text-green-600 text-sm font-medium">✓ Opravljeno</span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Shrani
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                >
                  Prekliči
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p
                className={`text-sm text-gray-700 ${progress.completed ? 'line-through' : ''}`}
              >
                {progress.actualWorkout || day.workout}
              </p>
              {progress.actualWorkout && progress.actualWorkout !== day.workout && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  Prvotno: {day.workout}
                </p>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Uredi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
