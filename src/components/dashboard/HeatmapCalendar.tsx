import type { DailyRecord } from "../../types/app";
import { loadTracking } from "../../lib/tracking";

interface HeatmapCalendarProps {
  weeks?: number;
}

function getColor(count: number): string {
  if (count === 0) return "#ebedf0";
  if (count <= 2) return "#9be9a8";
  if (count <= 5) return "#40c463";
  if (count <= 10) return "#30a14e";
  return "#216e39";
}

export default function HeatmapCalendar({ weeks = 20 }: HeatmapCalendarProps) {
  const data = loadTracking();
  const dateMap = new Map<string, DailyRecord>();
  data.daily.forEach((r) => dateMap.set(r.date, r));

  // Build grid: weeks × 7 days, ending today
  const today = new Date();
  const totalDays = weeks * 7;
  const cells: { date: string; count: number; col: number; row: number }[] = [];

  // Find the starting Sunday
  const endDay = today.getDay(); // 0=Sun
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalDays - 1) - endDay);

  for (let col = 0; col < weeks + 1; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + col * 7 + row);
      if (d > today) continue;
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const rec = dateMap.get(dk);
      const count = rec ? rec.activations + rec.reviews + rec.masteries : 0;
      cells.push({ date: dk, count, col, row });
    }
  }

  const cellSize = 12;
  const gap = 2;
  const step = cellSize + gap;
  const svgW = (weeks + 1) * step + 30;
  const svgH = 7 * step + 20;

  const monthLabels: { text: string; x: number }[] = [];
  let lastMonth = -1;
  cells
    .filter((c) => c.row === 0)
    .forEach((c) => {
      const d = new Date(c.date + "T00:00:00");
      const m = d.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          text: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m],
          x: c.col * step + 30,
        });
        lastMonth = m;
      }
    });

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Activity Heatmap
      </div>
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="block">
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x} y={10} fontSize="9" fill="#9ca3af">
              {m.text}
            </text>
          ))}
          {/* Day labels */}
          {dayLabels.map((label, i) =>
            label ? (
              <text key={i} x={0} y={18 + i * step + cellSize / 2 + 3} fontSize="8" fill="#9ca3af">
                {label}
              </text>
            ) : null,
          )}
          {/* Cells */}
          {cells.map((c) => (
            <rect
              key={c.date}
              x={c.col * step + 30}
              y={c.row * step + 16}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(c.count)}
            >
              <title>
                {c.date}: {c.count} activities
              </title>
            </rect>
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
        <span>Less</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <span
            key={v}
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
