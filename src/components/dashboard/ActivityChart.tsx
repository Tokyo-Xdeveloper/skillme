import type { DailyRecord } from "../../types/app";

interface ActivityChartProps {
  days: DailyRecord[];
}

export default function ActivityChart({ days }: ActivityChartProps) {
  const maxVal = Math.max(...days.map((d) => d.activations + d.reviews + d.masteries), 1);
  const barWidth = 100 / days.length;
  const chartH = 160;
  const labelH = 20;
  const countH = 16;
  const totalH = chartH + labelH + countH;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Daily Activity (30 days)
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            New
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            Review
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            Mastery
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${days.length * 20} ${totalH}`}
        className="w-full"
        style={{ height: totalH }}
      >
        {days.map((d, i) => {
          const total = d.activations + d.reviews + d.masteries;
          const h = total > 0 ? Math.max((total / maxVal) * chartH, 4) : 2;
          const x = i * 20 + 2;
          const w = 16;
          const baseY = countH + chartH;

          // Stack: activations bottom (green), reviews mid (blue), masteries top (amber)
          const actH = total > 0 ? (d.activations / total) * h : 0;
          const revH = total > 0 ? (d.reviews / total) * h : 0;
          const masH = total > 0 ? (d.masteries / total) * h : 0;

          const date = new Date(d.date + "T00:00:00");
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          const isToday = i === days.length - 1;
          const showLabel = i % 5 === 0 || isToday;

          return (
            <g key={d.date}>
              {/* count above bar */}
              {total > 0 && (
                <text
                  x={x + w / 2}
                  y={baseY - h - 2}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#9ca3af"
                  fontFamily="monospace"
                >
                  {total}
                </text>
              )}
              {/* stacked bar */}
              <rect
                x={x}
                y={baseY - actH}
                width={w}
                height={actH || 0}
                rx={2}
                fill="#22c55e"
                opacity={total > 0 ? 0.85 : 0.15}
              />
              <rect
                x={x}
                y={baseY - actH - revH}
                width={w}
                height={revH || 0}
                rx={2}
                fill="#3b82f6"
                opacity={total > 0 ? 0.85 : 0.15}
              />
              <rect
                x={x}
                y={baseY - actH - revH - masH}
                width={w}
                height={masH || 0}
                rx={2}
                fill="#f59e0b"
                opacity={total > 0 ? 0.85 : 0.15}
              />
              {/* placeholder bar when empty */}
              {total === 0 && (
                <rect
                  x={x}
                  y={baseY - 2}
                  width={w}
                  height={2}
                  rx={1}
                  fill="#e5e7eb"
                />
              )}
              {/* date label */}
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={baseY + labelH - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isToday ? "#3b82f6" : "#9ca3af"}
                  fontWeight={isToday ? 700 : 400}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
