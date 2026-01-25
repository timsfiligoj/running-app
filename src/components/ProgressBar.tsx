interface ProgressBarProps {
  completed: number;
  total: number;
  totalKm: number;
}

export function ProgressBar({ completed, total, totalKm }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Napredek</h2>
        <span className="text-sm text-gray-600">
          {completed} / {total} treningov ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Total kilometers */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Skupaj pretečeno</span>
          <span className="text-lg font-bold text-blue-600">{totalKm.toFixed(1)} km</span>
        </div>
      </div>

      {percentage === 100 && (
        <p className="text-center text-green-600 font-semibold mt-3">
          Odlično! Vsi treningi opravljeni!
        </p>
      )}
    </div>
  );
}
