import { useMemo } from "react";
import { loadTaskGrid, getGridRate } from "../lib/tracking";
import { APPS } from "../data/apps";
import type { GridTask } from "../types/app";

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export default function StatsPage() {
  const grid = loadTaskGrid();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const days = daysInMonth(year, month);

  // Per-task stats (this month)
  const taskStats = useMemo(() => {
    return grid.tasks.map((task) => {
      let done = 0;
      let total = 0;
      for (let d = 1; d <= Math.min(today, days); d++) {
        const dk = fmtDate(year, month, d);
        total++;
        if (grid.marks[dk]?.[task.id]) done++;
      }
      const app = APPS.find((a) => a.id === task.appId);
      return {
        task,
        appName: app?.name?.slice(0, 14) ?? task.appId,
        done,
        total,
        rate: total > 0 ? done / total : 0,
      };
    });
  }, [grid, today, days, year, month]);

  // Sorted by rate descending
  const ranked = [...taskStats].sort((a, b) => b.rate - a.rate);

  // Overall daily rates for the month
  const dailyRates = useMemo(() => {
    const rates: number[] = [];
    for (let d = 1; d <= days; d++) {
      const dk = fmtDate(year, month, d);
      rates.push(getGridRate(dk, grid.tasks, grid.marks));
    }
    return rates;
  }, [grid, days, year, month]);

  // Overall this month
  const overallDone = taskStats.reduce((s, t) => s + t.done, 0);
  const overallTotal = taskStats.reduce((s, t) => s + t.total, 0);
  const overallRate = overallTotal > 0 ? overallDone / overallTotal : 0;

  // Streak (consecutive days with 100% completion)
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = new Date(d);
      ds.setDate(ds.getDate() - i);
      const dk = fmtDate(ds.getFullYear(), ds.getMonth() + 1, ds.getDate());
      const rate = getGridRate(dk, grid.tasks, grid.marks);
      if (rate === 1 && grid.tasks.length > 0) count++;
      else if (i > 0) break;
    }
    return count;
  }, [grid]);

  // Active days (days with any mark)
  const activeDays = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= Math.min(today, days); d++) {
      const dk = fmtDate(year, month, d);
      const rate = getGridRate(dk, grid.tasks, grid.marks);
      if (rate > 0) count++;
    }
    return count;
  }, [grid, today, days, year, month]);

  // Heatmap data (last 16 weeks)
  const heatmap = useMemo(() => {
    const weeks = 16;
    const endDay = now.getDay();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (weeks * 7 - 1) - endDay);
    const cells: { date: string; rate: number; col: number; row: number }[] = [];
    for (let col = 0; col < weeks + 1; col++) {
      for (let row = 0; row < 7; row++) {
        const dd = new Date(startDate);
        dd.setDate(dd.getDate() + col * 7 + row);
        if (dd > now) continue;
        const dk = fmtDate(dd.getFullYear(), dd.getMonth() + 1, dd.getDate());
        const rate = getGridRate(dk, grid.tasks, grid.marks);
        cells.push({ date: dk, rate, col, row });
      }
    }
    return { cells, weeks };
  }, [grid, now]);

  return (
    <div className="p-5 max-w-[900px] mx-auto space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Overall Rate"
          value={`${Math.round(overallRate * 100)}%`}
          color="var(--accent)"
          bg="rgba(37,99,235,.06)"
        />
        <StatCard
          label="Streak"
          value={`${streak}d`}
          color="var(--orange)"
          bg="var(--orangeBg)"
        />
        <StatCard
          label="Active Days"
          value={`${activeDays}/${Math.min(today, days)}`}
          color="var(--green)"
          bg="var(--greenBg)"
        />
        <StatCard
          label="Tasks"
          value={String(grid.tasks.length)}
          color="var(--text)"
          bg="rgba(0,0,0,.03)"
        />
      </div>

      {/* Task ranking */}
      <div className="grid-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px 8px", fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
          Task Completion Rate
        </div>
        {ranked.length > 0 ? (
          <div>
            {ranked.map(({ task, appName, done, total, rate }) => (
              <TaskRateRow
                key={task.id}
                task={task}
                appName={appName}
                done={done}
                total={total}
                rate={rate}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text4)", fontSize: 13 }}>
            タスクを追加してください
          </div>
        )}
      </div>

      {/* Monthly progress chart */}
      <div className="grid-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 0", fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
          Daily Completion Rate — {month}月
        </div>
        <div style={{ padding: "8px 18px 18px" }}>
          <MonthChart rates={dailyRates} today={today} />
        </div>
      </div>

      {/* Heatmap */}
      <div className="grid-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>
          Activity Heatmap
        </div>
        <Heatmap cells={heatmap.cells} weeks={heatmap.weeks} />
      </div>
    </div>
  );
}

// === Sub-components ===

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div
      className="grid-card"
      style={{ padding: "14px 16px", background: bg, border: "1px solid var(--border)" }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}

function TaskRateRow({ task, appName, done, total, rate }: { task: GridTask; appName: string; done: number; total: number; rate: number }) {
  const pct = Math.round(rate * 100);
  const barColor = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : pct >= 20 ? "var(--orange)" : "var(--red)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Task info */}
      <div style={{ flex: "0 0 auto", minWidth: 0, maxWidth: 140 }}>
        <div style={{ fontSize: 9, color: "var(--text4)", fontWeight: 600, lineHeight: 1 }}>{appName}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {task.label}
        </div>
      </div>

      {/* Bar */}
      <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColor,
            borderRadius: 4,
            transition: "width .4s ease",
          }}
        />
      </div>

      {/* Percentage */}
      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: barColor, minWidth: 44, textAlign: "right" }}>
        {pct}%
      </div>

      {/* Count */}
      <div style={{ fontSize: 10, color: "var(--text4)", minWidth: 36, textAlign: "right" }}>
        {done}/{total}
      </div>
    </div>
  );
}

function MonthChart({ rates, today }: { rates: number[]; today: number }) {
  const W = 600;
  const H = 120;
  const pad = { t: 14, r: 10, b: 22, l: 6 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const n = rates.length;

  const gx = (d: number) => pad.l + (cw * d) / (n - 1 || 1);
  const gy = (v: number) => pad.t + ch - ch * v;

  // bar chart
  const barW = cw / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid */}
      {[0, 0.5, 1].map((v, i) => (
        <line key={i} x1={pad.l} y1={gy(v)} x2={W - pad.r} y2={gy(v)} stroke="var(--border2)" strokeWidth=".7" strokeDasharray="4,4" />
      ))}

      {/* Bars */}
      {rates.map((r, d) => {
        const x = pad.l + d * barW + 1;
        const w = barW - 2;
        const h = r > 0 ? Math.max(ch * r, 2) : 1;
        const isT = d + 1 === today;
        const isPast = d + 1 <= today;
        return (
          <g key={d}>
            <rect
              x={x}
              y={gy(0) - h}
              width={w}
              height={h}
              rx={1.5}
              fill={isT ? "var(--accent)" : isPast ? "var(--green)" : "var(--border)"}
              opacity={isPast ? (r > 0 ? 0.7 : 0.15) : 0.1}
            />
            {/* X label */}
            {(d % 3 === 0 || d === n - 1) && (
              <text
                x={x + w / 2}
                y={H - 4}
                textAnchor="middle"
                fill={isT ? "var(--accent)" : "var(--text4)"}
                fontFamily="'JetBrains Mono', monospace"
                fontSize="7"
                fontWeight={isT ? 700 : 400}
              >
                {d + 1}
              </text>
            )}
          </g>
        );
      })}

      {/* Y labels */}
      <text x={pad.l} y={gy(1) - 3} textAnchor="start" fill="var(--text4)" fontFamily="'JetBrains Mono', monospace" fontSize="7">100%</text>
      <text x={pad.l} y={gy(0.5) - 3} textAnchor="start" fill="var(--text4)" fontFamily="'JetBrains Mono', monospace" fontSize="7">50%</text>
    </svg>
  );
}

function Heatmap({ cells, weeks }: { cells: { date: string; rate: number; col: number; row: number }[]; weeks: number }) {
  const cellSize = 12;
  const gap = 2;
  const step = cellSize + gap;
  const svgW = (weeks + 1) * step + 30;
  const svgH = 7 * step + 20;

  function getColor(rate: number): string {
    if (rate === 0) return "#ebedf0";
    if (rate <= 0.25) return "#9be9a8";
    if (rate <= 0.5) return "#40c463";
    if (rate <= 0.75) return "#30a14e";
    return "#216e39";
  }

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
    <>
      <div style={{ overflowX: "auto" }}>
        <svg width={svgW} height={svgH} style={{ display: "block" }}>
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x} y={10} fontSize="9" fill="var(--text4)">{m.text}</text>
          ))}
          {dayLabels.map((label, i) =>
            label ? (
              <text key={i} x={0} y={18 + i * step + cellSize / 2 + 3} fontSize="8" fill="var(--text4)">{label}</text>
            ) : null,
          )}
          {cells.map((c) => (
            <rect
              key={c.date}
              x={c.col * step + 30}
              y={c.row * step + 16}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(c.rate)}
            >
              <title>{c.date}: {Math.round(c.rate * 100)}%</title>
            </rect>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: "var(--text4)" }}>
        <span>0%</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span key={v} style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, backgroundColor: getColor(v) }} />
        ))}
        <span>100%</span>
      </div>
    </>
  );
}
