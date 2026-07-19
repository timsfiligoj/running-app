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
import { AnalysisModal } from './AnalysisModal';

type SessionUpdate = Omit<WorkoutProgress, 'sessionIndex'>;

interface WorkoutItemProps {
  day: Day;
  weekStartDate: string;
  weekNumber: number;
  weekPhase: string;
  weekFocus: string;
  dayIndex: number;
  session: WorkoutProgress;
  isGhost: boolean;
  planId: string;
  onUpdate: (data: SessionUpdate) => void;
  onDelete: () => void;
}

const activityLabels: Record<ActivityType, string> = {
  run: '🏃 Tek',
  strength: '💪 Moč',
  bike: '🚴 Kolo',
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
  bike: 'bg-cyan-100 text-cyan-700',
  rest: 'bg-gray-100 text-gray-600',
  other: 'bg-slate-100 text-slate-700',
};

const getDefaultsFromPlannedType = (plannedType: string): { activityType: ActivityType; runType?: RunType } => {
  const runTypes: string[] = ['intervals', 'tempo', 'easy', 'long', 'hills', 'test', 'race', 'activation'];
  if (runTypes.includes(plannedType)) {
    return {
      activityType: 'run',
      runType: plannedType === 'activation' ? 'easy' : (plannedType as RunType),
    };
  }
  if (plannedType === 'strength') return { activityType: 'strength' };
  if (plannedType === 'rest') return { activityType: 'rest' };
  return { activityType: 'other' };
};

const stripSessionIndex = (s: WorkoutProgress): SessionUpdate => {
  const { sessionIndex: _omit, ...rest } = s;
  void _omit;
  return rest;
};

export function WorkoutItem({
  day,
  weekStartDate,
  weekNumber,
  weekPhase,
  weekFocus,
  dayIndex,
  session,
  isGhost,
  onUpdate,
  onDelete,
}: WorkoutItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Local edit state mirrors `session` until the user saves.
  const [localData, setLocalData] = useState<WorkoutProgress>(session);
  const [durationInput, setDurationInput] = useState(
    session.durationSeconds ? formatDuration(session.durationSeconds) : ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasChanges) {
      setLocalData(session);
      setDurationInput(session.durationSeconds ? formatDuration(session.durationSeconds) : '');
    }
  }, [session, hasChanges]);

  const date = getDateForDay(weekStartDate, dayIndex);
  const dateStr = formatDateShort(date);

  const defaults = getDefaultsFromPlannedType(day.type);
  const effectiveActivityType: ActivityType = localData.activityType ?? defaults.activityType;
  const effectiveRunType = localData.runType ?? defaults.runType;

  const pace = localData.distanceKm && localData.durationSeconds
    ? calculatePace(localData.distanceKm, localData.durationSeconds)
    : null;

  const getBadgeInfo = () => {
    if (effectiveActivityType === 'run' && effectiveRunType) {
      return { label: runTypeLabels[effectiveRunType], color: runTypeColors[effectiveRunType] };
    }
    return { label: activityLabels[effectiveActivityType], color: activityTypeColors[effectiveActivityType] };
  };
  const badgeInfo = getBadgeInfo();

  const displayedWorkout = localData.actualWorkout ?? day.workout;

  // Commits whatever is in `localData` (with derived duration) up to the parent.
  const commit = (override?: Partial<WorkoutProgress>) => {
    const merged = { ...localData, ...(override ?? {}) };
    const seconds = parseDuration(durationInput);
    onUpdate(stripSessionIndex({ ...merged, durationSeconds: seconds || merged.durationSeconds || undefined }));
  };

  const handleToggleComplete = () => {
    const newData = { ...localData, completed: !localData.completed, skipped: false };
    setLocalData(newData);
    onUpdate(stripSessionIndex(newData));
  };

  const handleToggleSkip = () => {
    const newData = { ...localData, skipped: !localData.skipped, completed: false };
    setLocalData(newData);
    onUpdate(stripSessionIndex(newData));
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

  const handleRunTypeChange = (type: RunType) => updateLocalData({ runType: type });

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

  const handleCommentChange = (value: string) => updateLocalData({ comment: value });
  const handleActualWorkoutChange = (value: string) => updateLocalData({ actualWorkout: value });
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
      setLocalData(prev => ({
        ...prev,
        ...(result.data!.distanceKm !== null && { distanceKm: result.data!.distanceKm }),
        ...(result.data!.durationSeconds !== null && { durationSeconds: result.data!.durationSeconds }),
        ...(result.data!.elevationMeters !== null && { elevationMeters: result.data!.elevationMeters }),
        ...(result.data!.avgHeartRate !== null && { avgHeartRate: result.data!.avgHeartRate }),
      }));
      if (result.data.durationSeconds !== null) {
        setDurationInput(formatDuration(result.data.durationSeconds));
      }
      setHasChanges(true);
    }
    setStravaLoading(false);
  };

  const handleSave = () => {
    commit();
    setHasChanges(false);
  };

  const handleCancel = () => {
    setLocalData(session);
    setDurationInput(session.durationSeconds ? formatDuration(session.durationSeconds) : '');
    setHasChanges(false);
    setIsExpanded(false);
  };

  const containerColor = localData.skipped
    ? 'border-red-400 bg-red-50'
    : localData.completed
      ? 'border-green-400 bg-green-50'
      : isGhost
        ? 'border-gray-200 border-dashed bg-white/60'
        : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-lg border overflow-hidden ${containerColor}`}>
      {/* Main row */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {!(localData.skipped && !isExpanded) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleComplete(); }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                localData.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {localData.completed && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {(isExpanded || localData.skipped) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleSkip(); }}
              title="Izpuščen trening"
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                localData.skipped
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-gray-300 hover:border-red-400'
              }`}
            >
              {localData.skipped ? (
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

          <div className="flex-shrink-0">
            <div className="font-bold text-gray-900">{day.day}</div>
            <div className="text-sm text-gray-500">{dateStr}</div>
          </div>

          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>

          {!isGhost && session.sessionIndex > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
              #{session.sessionIndex + 1}
            </span>
          )}

          {localData.stravaActivityId && (
            <span title="Iz Strave" className="text-orange-500 flex-shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </span>
          )}

          <div className="flex-1" />

          <div className="p-2 text-gray-400 flex-shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <p className={`text-sm mt-2 ml-9 ${localData.skipped ? 'text-red-400 line-through' : 'text-gray-700'}`}>
          {displayedWorkout}
        </p>
        {localData.skipped && (
          <p className="text-xs text-red-500 mt-1 ml-9 font-medium">Izpuščeno</p>
        )}
      </div>

      {/* Logged data summary when collapsed */}
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

      {/* Strava link + Analysis button when collapsed */}
      {!isExpanded && (localData.stravaUrl || (localData.distanceKm && localData.durationSeconds)) && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-3">
          {localData.stravaUrl && (
            <a
              href={localData.stravaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Poglej na Stravi
            </a>
          )}
          {effectiveActivityType === 'run' && (localData.stravaUrl || localData.distanceKm) && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAnalysis(true); }}
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium bg-violet-50 hover:bg-violet-100 px-3 py-1 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analiza
            </button>
          )}
        </div>
      )}

      {!isExpanded && localData.comment && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 italic">"{localData.comment}"</p>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip aktivnosti</label>
            <div className="flex flex-wrap gap-2">
              {(['run', 'strength', 'bike', 'rest', 'other'] as ActivityType[]).map((type) => (
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

          {effectiveActivityType === 'run' && (
            <>
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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dolžina (km)</label>
                  <input
                    type="number" step="0.01" value={localData.distanceKm || ''}
                    onChange={(e) => handleDistanceChange(e.target.value)}
                    placeholder="12.55"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Čas (h:mm:ss)</label>
                  <input
                    type="text" value={durationInput}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    placeholder="1:05:30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vzpon (m)</label>
                  <input
                    type="number" value={localData.elevationMeters || ''}
                    onChange={(e) => handleElevationChange(e.target.value)}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Povp. HR (bpm)</label>
                  <input
                    type="number" value={localData.avgHeartRate || ''}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strava URL</label>
                <div className="flex gap-2">
                  <input
                    type="url" value={localData.stravaUrl || ''}
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
                    ) : 'Naloži'}
                  </button>
                </div>
                {stravaError && (
                  <p className="mt-1 text-sm text-red-600">{stravaError}</p>
                )}
              </div>
            </>
          )}

          {/* Non-run distance/duration for bike etc. */}
          {(effectiveActivityType === 'bike' || effectiveActivityType === 'other') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dolžina (km)</label>
                <input
                  type="number" step="0.01" value={localData.distanceKm || ''}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Čas (h:mm:ss)</label>
                <input
                  type="text" value={durationInput}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  placeholder="0:45:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vzpon (m)</label>
                <input
                  type="number" value={localData.elevationMeters || ''}
                  onChange={(e) => handleElevationChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Povp. HR (bpm)</label>
                <input
                  type="number" value={localData.avgHeartRate || ''}
                  onChange={(e) => handleHeartRateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

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

          <div className="flex flex-wrap gap-3 pt-2">
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
            {!isGhost && (
              <button
                onClick={() => {
                  if (confirm('Izbrišem to aktivnost?')) onDelete();
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                title="Izbriši aktivnost"
              >
                🗑️ Izbriši
              </button>
            )}
            <div className="flex-1" />
            {effectiveActivityType === 'run' && (localData.stravaUrl || localData.distanceKm) && (
              <button
                onClick={() => setShowAnalysis(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Analiza
              </button>
            )}
          </div>
        </div>
      )}

      <AnalysisModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        stravaUrl={localData.stravaUrl}
        date={date.toISOString().split('T')[0]}
        workoutKey={`${weekNumber}-${dayIndex}-${session.sessionIndex}`}
        workoutContext={{
          plannedWorkout: day.workout,
          runType: effectiveRunType,
          comment: localData.comment,
          weekNumber,
          phase: weekPhase,
          focus: weekFocus,
        }}
      />
    </div>
  );
}
