import { useState } from 'react';
import { TrainingPlan } from '../types';
import { AthleteProfileModal } from './AthleteProfileModal';

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
      {/* Top row: Photo + Info + Countdown */}
      <div className="flex items-start gap-4">
        {/* Profile photo */}
        <img
          src={`${baseUrl}tim-lisbon-run.png`}
          alt={plan.athlete}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
        />

        {/* Main info */}
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

        {/* Countdown */}
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

      {/* Goal */}
      <div className="mt-3 text-sm text-gray-600">
        <span className="font-medium">🎯</span> {plan.goal}
      </div>

      {/* Profile button */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setShowProfile(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Atletski profil
        </button>
        {syncing && (
          <span className="text-xs text-gray-400">Sinhroniziram...</span>
        )}
      </div>

      <AthleteProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}
