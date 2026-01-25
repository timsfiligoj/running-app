import { RaceStrategy as RaceStrategyType } from '../types';

interface RaceStrategyProps {
  strategy: RaceStrategyType;
}

export function RaceStrategy({ strategy }: RaceStrategyProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-6 mt-8 border-2 border-amber-200">
      <h2 className="text-2xl font-bold text-amber-800 mb-6 flex items-center gap-2">
        <span>🏁</span> Strategija za tekmo
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pacing Strategy */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>⏱️</span> Strategija tempa
          </h3>
          <div className="space-y-4">
            {strategy.pacing.map((item, index) => (
              <div key={index} className="border-l-4 border-amber-400 pl-4">
                <div className="font-semibold text-amber-700">{item.section}</div>
                <div className="text-sm text-gray-600 mt-1">{item.instruction}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Strategy */}
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🍌</span> Prehrana
          </h3>
          <div className="space-y-4">
            {strategy.nutrition.map((item, index) => (
              <div key={index} className="border-l-4 border-green-400 pl-4">
                <div className="font-semibold text-green-700">{item.when}</div>
                <div className="text-sm text-gray-600 mt-1">{item.what}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
