import { useState } from 'react';
import {
  Day,
  WorkoutProgress,
  ActivityType,
  RunType,
  calculatePace,
  formatDuration,
  parseDuration,
  getDateForDay,
  formatDateShort,
} from '../types';

interface WorkoutItemProps {
  day: Day;
  weekStartDate: string;
  dayIndex: number;
  progress: WorkoutProgress;
  onUpdate: (data: WorkoutProgress) => void;
}

const activityLabels: Record<ActivityType, string> = {
  run: 'Tek',
  strength: 'Moč',
  rest: 'Počitek',
  other: 'Drugo',
};

const runTypeLabels: Record<RunType, string> = {
  easy: 'Lahek',
  tempo: 'Tempo',
  intervals: 'Intervali',
  long: 'Dolgi',
  hills: 'Klanci',
  test: 'Test',
  race: 'Tekma',
};

const runTypeColors: Record<RunType, string> = {
  easy: 'bg-green-100 text-green-700 border-green-300',
  tempo: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  intervals: 'bg-red-100 text-red-700 border-red-300',
  long: 'bg-blue-100 text-blue-700 border-blue-300',
  hills: 'bg-orange-100 text-orange-700 border-orange-300',
  test: 'bg-pink-100 text-pink-700 border-pink-300',
  race: 'bg-amber-100 text-amber-700 border-amber-400',
};

const plannedTypeColors: Record<string, string> = {
  intervals: 'bg-red-100 text-red-700',
  tempo: 'bg-yellow-100 text-yellow-700',
  easy: 'bg-green-100 text-green-700',
  long: 'bg-blue-100 text-blue-700',
  hills: 'bg-orange-100 text-orange-700',
  strength: 'bg-purple-100 text-purple-700',
  rest: 'bg-gray-100 text-gray-600',
  test: 'bg-pink-100 text-pink-700',
  race: 'bg-amber-100 text-amber-700',
  activation: 'bg-cyan-100 text-cyan-700',
};

const plannedTypeLabels: Record<string, string> = {
  intervals: 'Intervali',
  tempo: 'Tempo',
  easy: 'Lahek',
  long: 'Dolgi',
  hills: 'Klanci',
  strength: 'Moč',
  rest: 'Počitek',
  test: 'Test',
  race: 'Tekma',
  activation: 'Aktivacija',
};

export function WorkoutItem({
  day,
  weekStartDate,
  dayIndex,
  progress,
  onUpdate,
}: WorkoutItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [durationInput, setDurationInput] = useState(
    progress.durationSeconds ? formatDuration(progress.durationSeconds) : ''
  );

  const date = getDateForDay(weekStartDate, dayIndex);
  const dateStr = formatDateShort(date);
  const pace = progress.distanceKm && progress.durationSeconds
    ? calculatePace(progress.distanceKm, progress.durationSeconds)
    : null;

  const handleToggleComplete = () => {
    onUpdate({
      ...progress,
      completed: !progress.completed,
    });
  };

  const handleActivityTypeChange = (type: ActivityType) => {
    onUpdate({
      ...progress,
      activityType: type,
      runType: type === 'run' ? progress.runType : undefined,
    });
  };

  const handleRunTypeChange = (type: RunType) => {
    onUpdate({
      ...progress,
      runType: type,
    });
  };

  const handleDistanceChange = (value: string) => {
    const num = parseFloat(value);
    onUpdate({
      ...progress,
      distanceKm: isNaN(num) ? undefined : num,
    });
  };

  const handleDurationChange = (value: string) => {
    setDurationInput(value);
  };

  const handleDurationBlur = () => {
    const seconds = parseDuration(durationInput);
    onUpdate({
      ...progress,
      durationSeconds: seconds || undefined,
    });
  };

  const handleHeartRateChange = (value: string) => {
    const num = parseInt(value);
    onUpdate({
      ...progress,
      avgHeartRate: isNaN(num) ? undefined : num,
    });
  };

  const handleCommentChange = (value: string) => {
    onUpdate({
      ...progress,
      comment: value,
    });
  };

  const handleActualWorkoutChange = (value: string) => {
    onUpdate({
      ...progress,
      actualWorkout: value,
    });
  };

  // Show actual workout if filled, otherwise planned
  const displayedWorkout = progress.actualWorkout || day.workout;

  return (
    <div className={`bg-white rounded-lg border ${progress.completed ? 'border-green-300 bg-green-50/30' : 'border-gray-200'} overflow-hidden`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={progress.completed}
          onChange={handleToggleComplete}
          className="w-5 h-5 rounded-full border-2 border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer flex-shrink-0"
        />

        {/* Day and date */}
        <div className="flex-shrink-0 w-20">
          <div className="font-bold text-gray-900">{day.day}</div>
          <div className="text-sm text-gray-500">{dateStr}</div>
        </div>

        {/* Planned type badge */}
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${plannedTypeColors[day.type] || 'bg-gray-100 text-gray-600'}`}>
          {plannedTypeLabels[day.type] || day.type}
        </span>

        {/* Workout description */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-gray-700 ${progress.completed ? 'line-through opacity-60' : ''}`}>
            {displayedWorkout}
          </p>
          {progress.actualWorkout && progress.actualWorkout !== day.workout && (
            <p className="text-xs text-gray-400 line-through mt-0.5">{day.workout}</p>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Logged data summary (if any) */}
      {!isExpanded && (progress.distanceKm || progress.durationSeconds || progress.avgHeartRate) && (
        <div className="px-4 pb-3 flex flex-wrap gap-3 text-sm">
          {progress.activityType === 'run' && progress.runType && (
            <span className={`px-2 py-0.5 rounded border text-xs ${runTypeColors[progress.runType]}`}>
              {runTypeLabels[progress.runType]}
            </span>
          )}
          {progress.distanceKm && (
            <span className="text-gray-600">
              <span className="font-medium">{progress.distanceKm.toFixed(2)}</span> km
            </span>
          )}
          {progress.durationSeconds && (
            <span className="text-gray-600">
              <span className="font-medium">{formatDuration(progress.durationSeconds)}</span>
            </span>
          )}
          {pace && (
            <span className="text-blue-600 font-medium">{pace}</span>
          )}
          {progress.avgHeartRate && (
            <span className="text-red-600">
              <span className="font-medium">{progress.avgHeartRate}</span> bpm
            </span>
          )}
        </div>
      )}

      {/* Expanded edit section */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
          {/* Workout description edit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis treninga</label>
            <textarea
              value={progress.actualWorkout || day.workout}
              onChange={(e) => handleActualWorkoutChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {progress.actualWorkout && progress.actualWorkout !== day.workout && (
              <button
                onClick={() => handleActualWorkoutChange('')}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Ponastavi na originalni načrt
              </button>
            )}
          </div>

          {/* Activity type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip aktivnosti</label>
            <div className="flex flex-wrap gap-2">
              {(['run', 'strength', 'rest', 'other'] as ActivityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleActivityTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    progress.activityType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {activityLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Run-specific fields */}
          {progress.activityType === 'run' && (
            <>
              {/* Run type selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vrsta teka</label>
                <div className="flex flex-wrap gap-2">
                  {(['easy', 'tempo', 'intervals', 'long', 'hills', 'test', 'race'] as RunType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleRunTypeChange(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        progress.runType === type
                          ? runTypeColors[type]
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {runTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance, Duration, HR */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dolžina (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={progress.distanceKm || ''}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    placeholder="12.55"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Čas (h:mm:ss)</label>
                  <input
                    type="text"
                    value={durationInput}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    onBlur={handleDurationBlur}
                    placeholder="1:05:30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Povp. HR (bpm)</label>
                  <input
                    type="number"
                    value={progress.avgHeartRate || ''}
                    onChange={(e) => handleHeartRateChange(e.target.value)}
                    placeholder="145"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo</label>
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700">
                    {pace || '-'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Komentar</label>
            <textarea
              value={progress.comment || ''}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Kako je šlo? Opombe, občutki..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Comment preview when collapsed */}
      {!isExpanded && progress.comment && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 italic">"{progress.comment}"</p>
        </div>
      )}
    </div>
  );
}
