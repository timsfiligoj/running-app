import { useState } from 'react';
import { TrainingPlan } from '../types';
import { AthleteProfileModal } from './AthleteProfileModal';
import { RunIngestModal } from './RunIngestModal';
import { RunsListModal } from './RunsListModal';
import { StrengthSessionForm } from './StrengthSessionForm';
import { StrengthSessionsListModal } from './StrengthSessionsListModal';
import { CoverageHeatmap } from './CoverageHeatmap';
import { TrendsModal } from './TrendsModal';
import { RacePacingModal } from './RacePacingModal';
import { RunningTemplatesModal } from './RunningTemplatesModal';
import { PendingSuggestionsModal } from './PendingSuggestionsModal';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { PhaseConfigModal } from './PhaseConfigModal';
import { useSuggesters } from '../lib/suggestersContext';

interface HeaderProps {
  plan: TrainingPlan;
  syncing?: boolean;
}

// Format YYYY-MM-DD as "12. april 2026" in Slovenian
function formatRaceDateSlo(dateStr: string): string {
  const months = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}. ${months[m - 1]} ${y}`;
}

export function Header({ plan, syncing }: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showIngest, setShowIngest] = useState(false);
  const [showRuns, setShowRuns] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [showStrengthList, setShowStrengthList] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showRacePacing, setShowRacePacing] = useState(false);
  const [showRunTemplates, setShowRunTemplates] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPhases, setShowPhases] = useState(false);
  const { openRunning, openStrength } = useSuggesters();

  const [ry, rm, rd] = plan.raceDate.split('-').map(Number);
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const raceDateLocal = new Date(ry, rm - 1, rd);

  const diffTime = raceDateLocal.getTime() - todayLocal.getTime();
  const daysUntilRace = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const raceHasPassed = daysUntilRace < 0;

  const baseUrl = import.meta.env.BASE_URL;

  return (
    <header className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex items-start gap-4">
        <img
          src={`${baseUrl}tim-lisbon-run.png`}
          alt={plan.athlete}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 leading-tight flex items-center gap-2">
            {plan.name}
            {plan.raceUrl && (
              <a
                href={plan.raceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Odpri uradno stran"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </h1>
          <p className="text-blue-600 font-medium text-sm sm:text-base">{plan.athlete}</p>
          <p className="text-sm text-gray-600 mt-1">{formatRaceDateSlo(plan.raceDate)}</p>
          {plan.raceLocation && <p className="text-sm text-gray-500">{plan.raceLocation}</p>}
        </div>

        <div className="flex-shrink-0 text-right">
          <div className={`text-3xl sm:text-4xl font-bold ${raceHasPassed ? 'text-gray-400' : 'text-blue-600'}`}>
            {raceHasPassed ? '✓' : daysUntilRace}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {raceHasPassed ? 'tekma opravljena' : 'dni do tekme'}
          </div>
          {plan.targetPace && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 mt-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full">
              <span className="text-white text-sm font-bold">{plan.targetPace}</span>
              <span className="text-white/80 text-xs">min/km</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        <span className="font-medium">🎯</span> {plan.goal}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowProfile(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Atletski profil</span>
          <span className="sm:hidden">Profil</span>
        </button>

        <button
          onClick={() => setShowIngest(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Vnesi tek</span>
          <span className="sm:hidden">Tek</span>
        </button>

        <button
          onClick={() => setShowRuns(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="hidden sm:inline">Teki</span>
          <span className="sm:hidden">Teki</span>
        </button>

        <button
          onClick={() => openRunning()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden sm:inline">Predlagaj tek</span>
          <span className="sm:hidden">Tek AI</span>
        </button>

        <button
          onClick={() => openStrength()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="hidden sm:inline">Predlagaj moč</span>
          <span className="sm:hidden">Moč AI</span>
        </button>

        <button
          onClick={() => setShowPending(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="hidden sm:inline">Predlogi</span>
          <span className="sm:hidden">Pred</span>
        </button>

        <button
          onClick={() => setShowRunTemplates(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="hidden sm:inline">Templati</span>
          <span className="sm:hidden">Templati</span>
        </button>

        <button
          onClick={() => setShowStrength(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden sm:inline">Strength log</span>
          <span className="sm:hidden">Moč</span>
        </button>

        <button
          onClick={() => setShowStrengthList(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="hidden sm:inline">Sesije</span>
          <span className="sm:hidden">Ses</span>
        </button>

        <button
          onClick={() => setShowCoverage(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="hidden sm:inline">Pokritost</span>
          <span className="sm:hidden">Pokr</span>
        </button>

        <button
          onClick={() => setShowTrends(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
          </svg>
          <span className="hidden sm:inline">Trendi</span>
          <span className="sm:hidden">Trd</span>
        </button>

        <button
          onClick={() => setShowRacePacing(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="hidden sm:inline">Race pacing</span>
          <span className="sm:hidden">Race</span>
        </button>

        <button
          onClick={() => setShowLibrary(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="hidden sm:inline">Vaje</span>
          <span className="sm:hidden">Vaje</span>
        </button>

        <button
          onClick={() => setShowPhases(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Faze</span>
          <span className="sm:hidden">Faze</span>
        </button>

        {syncing && (
          <span className="ml-auto text-xs text-gray-400">Shranjujem...</span>
        )}
      </div>

      <AthleteProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <RunIngestModal isOpen={showIngest} onClose={() => setShowIngest(false)} />
      <RunsListModal isOpen={showRuns} onClose={() => setShowRuns(false)} />
      <StrengthSessionForm isOpen={showStrength} onClose={() => setShowStrength(false)} />
      <StrengthSessionsListModal isOpen={showStrengthList} onClose={() => setShowStrengthList(false)} />
      <CoverageHeatmap isOpen={showCoverage} onClose={() => setShowCoverage(false)} />
      <TrendsModal isOpen={showTrends} onClose={() => setShowTrends(false)} />
      <RacePacingModal isOpen={showRacePacing} onClose={() => setShowRacePacing(false)} />
      <RunningTemplatesModal isOpen={showRunTemplates} onClose={() => setShowRunTemplates(false)} />
      <PendingSuggestionsModal isOpen={showPending} onClose={() => setShowPending(false)} />
      <ExerciseLibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} />
      <PhaseConfigModal isOpen={showPhases} onClose={() => setShowPhases(false)} />
    </header>
  );
}
