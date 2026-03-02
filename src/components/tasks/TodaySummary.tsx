interface TodaySummaryProps {
  total: number;
  completed: number;
  newCount: number;
  reviewCount: number;
}

export default function TodaySummary({
  total,
  completed,
  newCount,
  reviewCount,
}: TodaySummaryProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5">
      {/* Progress ring */}
      <div className="relative shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="7"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={pct === 100 ? "#22c55e" : "#2563eb"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 44 44)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{pct}%</span>
        </div>
      </div>

      {/* Text */}
      <div>
        <div className="text-2xl font-bold text-gray-900">
          {remaining > 0 ? `残り ${remaining} タスク` : "All done!"}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          New: {newCount} / Review: {reviewCount}
        </div>
      </div>
    </div>
  );
}
