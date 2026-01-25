import { trainingPlan } from '../data/trainingPlan';

interface HeaderProps {
  syncing?: boolean;
}

export function Header({ syncing }: HeaderProps) {
  // Race date: April 12, 2026
  const raceDate = new Date('2026-04-12');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = raceDate.getTime() - today.getTime();
  const daysUntilRace = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <header className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center gap-5">
        {/* Profile photo */}
        <img
          src="/tim-lisbon-run.png"
          alt={trainingPlan.athlete}
          className="w-20 h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Istrski polmaraton
          </h1>
          <p className="text-blue-600 font-medium mt-0.5">{trainingPlan.athlete}</p>

          {/* Race details row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
            <span className="text-gray-600">
              <span className="font-medium">12. april 2026</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Pula, Hrvaška</span>
          </div>
        </div>

        {/* Countdown & goal */}
        <div className="flex-shrink-0 text-right">
          {/* Days countdown */}
          <div className="mb-2">
            <div className="text-3xl md:text-4xl font-bold text-blue-600">
              {daysUntilRace}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              dni do tekme
            </div>
          </div>

          {/* Target pace */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-green-500 rounded-full">
            <span className="text-white text-sm font-bold">4:30</span>
            <span className="text-white/80 text-xs">/km</span>
          </div>
        </div>
      </div>

      {syncing && (
        <p className="text-xs text-gray-400 mt-3 text-center">Sinhroniziram...</p>
      )}
    </header>
  );
}
