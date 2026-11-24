import { useRef, useState } from 'react';
import {
  Week,
  ProgressData,
  WorkoutProgress,
  ActivityType,
  RunType,
  dayKey,
  plannedSessions,
  sessionsByPlanned,
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
  if (plannedType === 'bike') return { activityType: 'bike' };
  if (plannedType === 'rest') return { activityType: 'rest' };
  return { activityType: 'other' };
};

// Build a synthetic "ghost" session (no DB row yet) for a planned workout not logged yet.
const buildGhostSession = (plannedType: string, sessionIndex: number): WorkoutProgress => {
  const defaults = getDefaultsFromPlannedType(plannedType);
  return {
    sessionIndex,
    completed: false,
    activityType: defaults.activityType,
    runType: defaults.runType,
  };
};

// Edits a week's phase/focus locally and saves once — on Enter or blur — instead of
// writing to the database on every keystroke. Escape discards the edit.
function WeekTextInput({ initial, onSave, onClose, className }: {
  initial: string;
  onSave: (value: string) => void;
  onClose: () => void;
  className: string;
}) {
  const [draft, setDraft] = useState(initial);
  const done = useRef(false);

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const value = draft.trim();
    if (save && value) onSave(value);
    onClose();
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      className={className}
    />
  );
}

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

  // Each planned session is a unit. It counts unless it is a planned rest with nothing
  // logged, or everything logged for it is rest.
  const units = week.days.flatMap((day, dayIndex) =>
    sessionsByPlanned(day, progress[dayKey(week.week, dayIndex)] ?? []).filter(({ plan, sessions }) =>
      sessions.length > 0
        ? !sessions.every(s => (s.activityType ?? 'other') === 'rest')
        : plan.type !== 'rest'),
  );

  // A unit is completed if any of its sessions is; "done" (for the week colour) if all
  // of its sessions are completed or skipped and at least one exists.
  const completedCount = units.filter(u => u.sessions.some(s => s.completed)).length;
  const doneCount = units.filter(u =>
    u.sessions.length > 0 && u.sessions.every(s => s.completed || s.skipped)).length;

  const totalCount = units.length;
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
      {/* A div, not a <button>: the phase/focus inputs live inside this header, and a
          real button swallows their Space key presses as clicks that collapse the week. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); }
        }}
        className={`w-full px-4 sm:px-6 py-4 transition-colors cursor-pointer ${weekHoverStyles[weekStatus]}`}
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
            <WeekTextInput
              initial={effectivePhase}
              onSave={(v) => { if (v !== effectivePhase) onUpdateWeekPhase?.(week.week, v); }}
              onClose={() => setEditingPhase(false)}
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
            <WeekTextInput
              initial={effectiveFocus}
              onSave={(v) => { if (v !== effectiveFocus) onUpdateWeekFocus?.(week.week, v); }}
              onClose={() => setEditingFocus(false)}
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
      </div>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="space-y-5 mt-4">
            {week.days.map((day, dayIndex) => {
              const key = dayKey(week.week, dayIndex);
              const sessions = progress[key] ?? [];
              const date = getDateForDay(week.startDate, dayIndex);

              // Planned session i pairs with the logged session of index i; one not logged
              // yet shows as a "ghost" that becomes real on edit. Sessions added beyond the
              // plan follow, described by the day's main workout.
              const planned = plannedSessions(day);
              const items = [
                ...planned.map((p, i) => {
                  const session = sessions.find(s => s.sessionIndex === i);
                  if (session) return { plan: p, session, isGhost: false };
                  if (p.type === 'rest') return null;
                  return { plan: p, session: buildGhostSession(p.type, i), isGhost: true };
                }),
                ...sessions
                  .filter(s => s.sessionIndex >= planned.length)
                  .map(session => ({ plan: day, session, isGhost: false })),
              ].filter((item): item is NonNullable<typeof item> => item !== null);

              return (
                <div key={dayIndex} className="space-y-2">
                  {/* Day header with planned hint */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-bold text-gray-800">{day.day}</span>
                      <span className="text-xs text-gray-500">{formatDateShort(date)}</span>
                      {items.length === 0 && (
                        <span className="text-xs text-gray-500 italic truncate">😴 {day.workout}</span>
                      )}
                    </div>
                  </div>

                  {items.map(({ plan, session, isGhost }) => (
                    <WorkoutItem
                      key={session.sessionIndex}
                      day={plan}
                      weekStartDate={week.startDate}
                      dayIndex={dayIndex}
                      session={session}
                      isGhost={isGhost}
                      planId={planId}
                      onUpdate={(data) => onUpdateSession(week.week, dayIndex, session.sessionIndex, data)}
                      onDelete={() => onDeleteSession(week.week, dayIndex, session.sessionIndex)}
                    />
                  ))}

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
