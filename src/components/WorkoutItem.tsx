import { useState, useEffect } from 'react';
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
import { fetchStravaData } from '../lib/strava';

interface WorkoutItemProps {
  day: Day;
  weekStartDate: string;
  dayIndex: number;
  allDays: Day[];
  progress: WorkoutProgress;
  onUpdate: (data: WorkoutProgress) => void;
  onSwap: (toIndex: number) => void;
}

const activityLabels: Record<ActivityType, string> = {
  run: '🏃 Tek',
  strength: '💪 Moč',
  rest: '😴 Počitek',
  other: '📋 Drugo',
};

const runTypeLabels: Record<RunType, string> = {
  easy: '🏃 Lahek',
  tempo: '🏃 Tempo',
  intervals: '🔥 Intervali',
  long: '🏃 Dolgi',
  hills: '⛰️ Klanci',
  test: '📊 Test',
  race: '🏆 Tekma',
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

const activityTypeColors: Record<ActivityType, string> = {
  run: 'bg-blue-100 text-blue-700',
  strength: 'bg-purple-100 text-purple-700',
  rest: 'bg-gray-100 text-gray-600',
  other: 'bg-slate-100 text-slate-700',
};

// Map planned workout type to activity type and run type
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

export function WorkoutItem({
  day,
  weekStartDate,
  dayIndex,
  allDays,
  progress,
  onUpdate,
  onSwap,
}: WorkoutItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSwapOptions, setShowSwapOptions] = useState(false);

  // Local state for form fields
  const [localData, setLocalData] = useState<WorkoutProgress>(progress);
  const [durationInput, setDurationInput] = useState(
    progress.durationSeconds ? formatDuration(progress.durationSeconds) : ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  // Sync local state when progress changes from outside (e.g., real-time sync)
  useEffect(() => {
    if (!hasChanges) {
      setLocalData(progress);
      setDurationInput(progress.durationSeconds ? formatDuration(progress.durationSeconds) : '');
    }
  }, [progress, hasChanges]);

  const date = getDateForDay(weekStartDate, dayIndex);
  const dateStr = formatDateShort(date);

  // Get defaults from planned type
  const defaults = getDefaultsFromPlannedType(day.type);

  // Effective values (use saved value or default from planned type)
  const effectiveActivityType = localData.activityType ?? defaults.activityType;
  const effectiveRunType = localData.runType ?? defaults.runType;

  // Calculate pace from local data
  const pace = localData.distanceKm && localData.durationSeconds
    ? calculatePace(localData.distanceKm, localData.durationSeconds)
    : null;

  // Get the badge info - show actual selection or effective default
  const getBadgeInfo = () => {
    if (effectiveActivityType === 'run' && effectiveRunType) {
      return {
        label: runTypeLabels[effectiveRunType],
        color: runTypeColors[effectiveRunType],
      };
    }
    return {
      label: activityLabels[effectiveActivityType],
      color: activityTypeColors[effectiveActivityType],
    };
  };

  const badgeInfo = getBadgeInfo();

  // Show actual workout if set (including empty string), otherwise planned
  const displayedWorkout = localData.actualWorkout ?? day.workout;

  const handleToggleComplete = () => {
    const newData = {
      ...localData,
      completed: !localData.completed,
      skipped: false, // Clear skipped when completing
    };
    setLocalData(newData);
    // Complete toggle saves immediately
    onUpdate(newData);
  };

  const handleToggleSkip = () => {
    const newData = {
      ...localData,
      skipped: !localData.skipped,
      completed: false, // Clear completed when skipping
    };
    setLocalData(newData);
    // Skip toggle saves immediately
    onUpdate(newData);
  };

  const updateLocalData = (updates: Partial<WorkoutProgress>) => {
    setLocalData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleActivityTypeChange = (type: ActivityType) => {
    updateLocalData({
      activityType: type,
      runType: type === 'run' ? localData.runType : undefined,
    });
  };

  const handleRunTypeChange = (type: RunType) => {
    updateLocalData({ runType: type });
  };

  const handleDistanceChange = (value: string) => {
    const num = parseFloat(value);
    updateLocalData({ distanceKm: isNaN(num) ? undefined : num });
  };

  const handleDurationChange = (value: string) => {
    setDurationInput(value);
    setHasChanges(true);
  };

  const handleElevationChange = (value: string) => {
    const num = parseInt(value);
    updateLocalData({ elevationMeters: isNaN(num) ? undefined : num });
  };

  const handleHeartRateChange = (value: string) => {
    const num = parseInt(value);
    updateLocalData({ avgHeartRate: isNaN(num) ? undefined : num });
  };

  const handleCommentChange = (value: string) => {
    updateLocalData({ comment: value });
  };

  const handleActualWorkoutChange = (value: string) => {
    updateLocalData({ actualWorkout: value });
  };

  const handleStravaUrlChange = (value: string) => {
    updateLocalData({ stravaUrl: value });
    setStravaError(null);
  };

  const handleFetchStrava = async () => {
    if (!localData.stravaUrl) return;

    setStravaLoading(true);
    setStravaError(null);

    const result = await fetchStravaData(localData.stravaUrl);

    if (result.error) {
      setStravaError(result.error);
    } else if (result.data) {
      // Update all available fields at once
      setLocalData(prev => ({
        ...prev,
        ...(result.data!.distanceKm !== null && { distanceKm: result.data!.distanceKm }),
        ...(result.data!.durationSeconds !== null && { durationSeconds: result.data!.durationSeconds }),
        ...(result.data!.elevationMeters !== null && { elevationMeters: result.data!.elevationMeters }),
        ...(result.data!.avgHeartRate !== null && { avgHeartRate: result.data!.avgHeartRate }),
      }));
      // Update duration input
      if (result.data.durationSeconds !== null) {
        setDurationInput(formatDuration(result.data.durationSeconds));
      }
      setHasChanges(true);
    }

    setStravaLoading(false);
  };

  const handleSave = () => {
    const seconds = parseDuration(durationInput);
    const dataToSave = {
      ...localData,
      durationSeconds: seconds || undefined,
    };
    onUpdate(dataToSave);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setLocalData(progress);
    setDurationInput(progress.durationSeconds ? formatDuration(progress.durationSeconds) : '');
    setHasChanges(false);
    setIsExpanded(false);
  };

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${
      progress.skipped
        ? 'border-red-400 bg-red-50'
        : progress.completed
        ? 'border-green-400 bg-green-50'
        : 'border-gray-200'
    }`}>
      {/* Main row - clickable to expand */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top row: checkbox, skip button, day/date, badge, expand */}
        <div className="flex items-center gap-3">
          {/* Checkbox / Checkmark - hide when skipped and collapsed */}
          {!(progress.skipped && !isExpanded) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleComplete();
              }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                progress.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {progress.completed && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Skip button (X) - only show when expanded OR when already skipped */}
          {(isExpanded || progress.skipped) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSkip();
              }}
              title="Izpuščen trening"
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                progress.skipped
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-gray-300 hover:border-red-400'
              }`}
            >
              {progress.skipped ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          )}

          {/* Day and date */}
          <div className="flex-shrink-0">
            <div className="font-bold text-gray-900">{day.day}</div>
            <div className="text-sm text-gray-500">{dateStr}</div>
          </div>

          {/* Activity badge - shows actual selection or planned */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Expand indicator */}
          <div className="p-2 text-gray-400 flex-shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Workout description - full width below */}
        <p className={`text-sm mt-2 ml-9 ${
          progress.skipped
            ? 'text-red-400 line-through'
            : 'text-gray-700'
        }`}>
          {displayedWorkout}
        </p>
        {progress.skipped && (
          <p className="text-xs text-red-500 mt-1 ml-9 font-medium">Izpuščeno</p>
        )}
      </div>

      {/* Logged data summary (if any) - when collapsed */}
      {!isExpanded && (localData.distanceKm || localData.durationSeconds || localData.elevationMeters || localData.avgHeartRate) && (
        <div className="px-4 pb-3 flex flex-wrap gap-3 text-sm">
          {localData.distanceKm && (
            <span className="text-gray-600">
              <span className="font-medium">{localData.distanceKm.toFixed(2)}</span> km
            </span>
          )}
          {localData.durationSeconds && (
            <span className="text-gray-600">
              <span className="font-medium">{formatDuration(localData.durationSeconds)}</span>
            </span>
          )}
          {localData.elevationMeters && (
            <span className="text-orange-600">
              <span className="font-medium">{localData.elevationMeters}</span> m
            </span>
          )}
          {pace && (
            <span className="text-blue-600 font-medium">{pace}</span>
          )}
          {localData.avgHeartRate && (
            <span className="text-red-600">
              <span className="font-medium">{localData.avgHeartRate}</span> bpm
            </span>
          )}
        </div>
      )}

      {/* Strava link when collapsed */}
      {!isExpanded && localData.stravaUrl && (
        <div className="px-4 pb-3">
          <a
            href={localData.stravaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Poglej na Stravi
          </a>
        </div>
      )}

      {/* Comment preview when collapsed */}
      {!isExpanded && localData.comment && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 italic">"{localData.comment}"</p>
        </div>
      )}

      {/* Expanded edit section */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
          {/* Swap workout with another day */}
          <div>
            <button
              type="button"
              onClick={() => setShowSwapOptions(!showSwapOptions)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Zamenjaj dan
            </button>
            {showSwapOptions && (
              <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 mb-2">Zamenjaj s:</p>
                <div className="flex flex-wrap gap-2">
                  {allDays.map((otherDay, idx) => (
                    idx !== dayIndex && (
                      <button
                        key={idx}
                        onClick={() => {
                          onSwap(idx);
                          setShowSwapOptions(false);
                          setIsExpanded(false);
                        }}
                        className="px-3 py-1.5 text-sm font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        {otherDay.day}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workout description edit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis treninga</label>
            <textarea
              value={localData.actualWorkout ?? day.workout}
              onChange={(e) => handleActualWorkoutChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {localData.actualWorkout !== undefined && localData.actualWorkout !== day.workout && (
              <button
                onClick={() => updateLocalData({ actualWorkout: undefined })}
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
                    effectiveActivityType === type
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
          {effectiveActivityType === 'run' && (
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
                        effectiveRunType === type
                          ? runTypeColors[type]
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {runTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance, Duration, Elevation, HR, Tempo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dolžina (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={localData.distanceKm || ''}
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
                    placeholder="1:05:30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vzpon (m)</label>
                  <input
                    type="number"
                    value={localData.elevationMeters || ''}
                    onChange={(e) => handleElevationChange(e.target.value)}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Povp. HR (bpm)</label>
                  <input
                    type="number"
                    value={localData.avgHeartRate || ''}
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

              {/* Strava URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strava URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={localData.stravaUrl || ''}
                    onChange={(e) => handleStravaUrlChange(e.target.value)}
                    placeholder="https://www.strava.com/activities/..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleFetchStrava}
                    disabled={!localData.stravaUrl || stravaLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      localData.stravaUrl && !stravaLoading
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {stravaLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Nalagam...
                      </>
                    ) : (
                      'Naloži'
                    )}
                  </button>
                </div>
                {stravaError && (
                  <p className="mt-1 text-sm text-red-600">{stravaError}</p>
                )}
              </div>
            </>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Komentar</label>
            <textarea
              value={localData.comment || ''}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Kako je šlo? Opombe, občutki..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Save / Cancel buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Shrani
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Prekliči
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
