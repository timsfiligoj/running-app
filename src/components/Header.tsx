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

  // Use BASE_URL for GitHub Pages compatibility
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <header className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
      {/* Top row: Photo + Info + Countdown */}
      <div className="flex items-start gap-4">
        {/* Profile photo */}
        <img
          src={`${baseUrl}tim-lisbon-run.png`}
          alt={trainingPlan.athlete}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
            Istrski polmaraton
          </h1>
          <p className="text-blue-600 font-medium text-sm sm:text-base">{trainingPlan.athlete}</p>
          <p className="text-sm text-gray-600 mt-1">12. april 2026</p>
          <p className="text-sm text-gray-500">Koper, Slovenija</p>
        </div>

        {/* Countdown */}
        <div className="flex-shrink-0 text-right">
          <div className="text-3xl sm:text-4xl font-bold text-blue-600">
            {daysUntilRace}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            dni do tekme
          </div>
          {/* Target pace */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 mt-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full">
            <span className="text-white text-sm font-bold">4:30</span>
            <span className="text-white/80 text-xs">min/km</span>
          </div>
        </div>
      </div>

      {syncing && (
        <p className="text-xs text-gray-400 mt-3 text-center">Sinhroniziram...</p>
      )}
    </header>
  );
}
