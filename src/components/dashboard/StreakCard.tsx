interface StreakCardProps {
  streak: number;
}

export default function StreakCard({ streak }: StreakCardProps) {
  const size = streak >= 8 ? 72 : streak >= 4 ? 60 : streak >= 1 ? 48 : 40;
  const color =
    streak >= 8
      ? "#ef4444"
      : streak >= 4
        ? "#f97316"
        : streak >= 1
          ? "#f59e0b"
          : "#9ca3af";
  const msg =
    streak >= 8
      ? "You're on fire!"
      : streak >= 4
        ? "On a roll!"
        : streak >= 1
          ? "Keep it up!"
          : "Start your streak!";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Day Streak
      </div>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="mb-2"
      >
        <path
          d="M32 4C32 4 38 16 38 24C38 28 42 28 44 24C48 32 52 40 44 52C40 56 36 58 32 58C28 58 24 56 20 52C12 40 16 32 20 24C22 28 26 28 26 24C26 16 32 4 32 4Z"
          fill={color}
          opacity={0.85}
        />
        <path
          d="M32 20C32 20 36 28 36 34C36 40 32 46 32 46C32 46 28 40 28 34C28 28 32 20 32 20Z"
          fill={streak >= 4 ? "#fbbf24" : "#f3f4f6"}
          opacity={0.7}
        />
      </svg>
      <div className="text-4xl font-extrabold font-mono" style={{ color }}>
        {streak}
      </div>
      <div className="text-xs text-gray-500 font-semibold mt-1">{msg}</div>
    </div>
  );
}
