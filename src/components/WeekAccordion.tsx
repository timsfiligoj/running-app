import { useState } from 'react';
import {
  Week,
  ProgressData,
  WorkoutProgress,
  ActivityType,
  RunType,
  dayKey,
  getDateForDay,
  formatDateShort,
} from '../types';
import { WorkoutItem } from './WorkoutItem';

interface WeekAccordionProps {
  week: Week;
  progress: ProgressData;
  planId: string;
  onUpdateSession: (
    weekNum: number,
    dayIndex: number,
    sessionIndex: number,
    data: Omit<WorkoutProgress, 'sessionIndex'>,
  ) => void;
  onAddSession: (weekNum: number, dayIndex: number) => void;
  onDeleteSession: (weekNum: number, dayIndex: number, sessionIndex: number) => void;
  weekPhaseOverride?: string;
  weekFocusOverride?: string;
  onUpdateWeekPhase?: (weekNum: number, phase: string) => void;
  onUpdateWeekFocus?: (weekNum: number, focus: string) => void;
}

// Derive activity / run type from the planned workout type string.
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

// Build a synthetic "ghost" session (no DB row yet) for an empty day with a planned workout.
const buildGhostSession = (plannedType: string): WorkoutProgress => {
  const defaults = getDefaultsFromPlannedType(plannedType);
  return {
    sessionIndex: 0,
    completed: false,
    activityType: defaults.activityType,
    runType: defaults.runType,
  };
};

export function WeekAccordion({
  week,
  progress,
  planId,
  onUpdateSession,
  onAddSession,
  onDeleteSession,
  weekPhaseOverride,
  weekFocusOverride,
  onUpdateWeekPhase,
  onUpdateWeekFocus,
}: WeekAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(false);
  const [editingFocus, setEditingFocus] = useState(false);

  const effectivePhase = weekPhaseOverride || week.phase;
  const effectiveFocus = weekFocusOverride || week.focus;

  // A day is "non-rest" if planned is non-rest OR any session is non-rest.
  const isRestDay = (dayIndex: number) => {
    const sessions = progress[dayKey(week.week, dayIndex)] ?? [];
    if (sessions.length > 0) {
      return sessions.every(s => (s.activityType ?? 'other') === 'rest');
    }
    return week.days[dayIndex].type === 'rest';
  };

  const nonRestDayIndexes = week.days.map((_, i) => i).filter(i => !isRestDay(i));

  // Day counts as completed if at least one session is completed.
  const completedCount = nonRestDayIndexes.filter(i => {
    const sessions = progress[dayKey(week.week, i)] ?? [];
    return sessions.some(s => s.completed);
  }).length;

  // Day counts as "done" (for status color) if all sessions are completed or skipped, AND at least one exists.
  const doneCount = nonRestDayIndexes.filter(i => {
    const sessions = progress[dayKey(week.week, i)] ?? [];
    if (sessions.length === 0) return false;
    return sessions.every(s => s.completed || s.skipped);
  }).length;

  const totalCount = nonRestDayIndexes.length;
  const isWeekDone = totalCount > 0 && doneCount === totalCount;

  const weekStatus = isWeekDone
    ? completedCount === totalCount
      ? 'perfect'
      : completedCount === 0
        ? 'skipped'
        : 'partial'
    : 'in-progress';

  // Sum km / elevation across all sessions in the week.
  const weekKm = week.days.reduce((sum, _, i) => {
    const sessions = progress[dayKey(week.week, i)] ?? [];
    return sum + sessions.reduce((s, w) => s + (w.distanceKm || 0), 0);
  }, 0);
  const weekElevation = week.days.reduce((sum, _, i) => {
    const sessions = progress[dayKey(week.week, i)] ?? [];
    return sum + sessions.reduce((s, w) => s + (w.elevationMeters || 0), 0);
  }, 0);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="font-bold text-lg text-gray-800">Teden {week.week}</span>
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
                  style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

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

        <div className="mt-1 text-left">
          {editingPhase && isOpen ? (
            <input
              type="text"
              value={effectivePhase}
              onChange={(e) => onUpdateWeekPhase?.(week.week, e.target.value)}
              onBlur={() => setEditingPhase(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingPhase(false); }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-sm text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          ) : (
            <div
              className="text-sm text-blue-600 font-medium cursor-text hover:bg-blue-50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
              onClick={(e) => { if (isOpen) { e.stopPropagation(); setEditingPhase(true); } }}
            >
              {effectivePhase}
            </div>
          )}
        </div>

        <div className="mt-0.5 text-left">
          {editingFocus && isOpen ? (
            <input
              type="text"
              value={effectiveFocus}
              onChange={(e) => onUpdateWeekFocus?.(week.week, e.target.value)}
              onBlur={() => setEditingFocus(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingFocus(false); }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          ) : (
            <div
              className="text-xs text-gray-500 cursor-text hover:bg-gray-50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
              onClick={(e) => { if (isOpen) { e.stopPropagation(); setEditingFocus(true); } }}
            >
              {effectiveFocus}
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="space-y-5 mt-4">
            {week.days.map((day, dayIndex) => {
              const key = dayKey(week.week, dayIndex);
              const sessions = progress[key] ?? [];
              const date = getDateForDay(week.startDate, dayIndex);

              // Empty day with a planned non-rest workout → show one "ghost" session that becomes real on edit.
              const showGhost = sessions.length === 0 && day.type !== 'rest';
              const ghost = showGhost ? buildGhostSession(day.type) : null;

              return (
                <div key={dayIndex} className="space-y-2">
                  {/* Day header with planned hint */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-bold text-gray-800">{day.day}</span>
                      <span className="text-xs text-gray-500">{formatDateShort(date)}</span>
                      {day.type === 'rest' && sessions.length === 0 && (
                        <span className="text-xs text-gray-500 italic truncate">😴 {day.workout}</span>
                      )}
                    </div>
                  </div>

                  {/* Sessions list (or ghost for empty non-rest days) */}
                  {ghost ? (
                    <WorkoutItem
                      day={day}
                      weekStartDate={week.startDate}
                      weekNumber={week.week}
                      weekPhase={effectivePhase}
                      weekFocus={effectiveFocus}
                      dayIndex={dayIndex}
                      session={ghost}
                      isGhost
                      planId={planId}
                      onUpdate={(data) => onUpdateSession(week.week, dayIndex, ghost.sessionIndex, data)}
                      onDelete={() => onDeleteSession(week.week, dayIndex, ghost.sessionIndex)}
                    />
                  ) : (
                    sessions.map((session) => (
                      <WorkoutItem
                        key={session.sessionIndex}
                        day={day}
                        weekStartDate={week.startDate}
                        weekNumber={week.week}
                        weekPhase={effectivePhase}
                        weekFocus={effectiveFocus}
                        dayIndex={dayIndex}
                        session={session}
                        isGhost={false}
                        planId={planId}
                        onUpdate={(data) => onUpdateSession(week.week, dayIndex, session.sessionIndex, data)}
                        onDelete={() => onDeleteSession(week.week, dayIndex, session.sessionIndex)}
                      />
                    ))
                  )}

                  {/* Add session button */}
                  <button
                    onClick={() => onAddSession(week.week, dayIndex)}
                    className="ml-9 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj aktivnost
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
