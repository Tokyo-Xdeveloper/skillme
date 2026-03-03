import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { loadTaskGrid, getGridRate, getGoalForDate } from "../lib/tracking";
import { useCountUp } from "../hooks/useCountUp";
import { useInView } from "../hooks/useInView";
import { APPS } from "../data/apps";
import { getGeminiKey } from "../components/TabBar";
import type { GridTask } from "../types/app";

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export default function StatsPage() {
  const [grid] = useState(() => loadTaskGrid());
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const days = daysInMonth(year, month);

  // Per-task stats (this month): days where count >= goal
  const taskStats = useMemo(() => {
    return grid.tasks.map((task) => {
      let done = 0;
      let total = 0;
      for (let d = 1; d <= Math.min(today, days); d++) {
        const dk = fmtDate(year, month, d);
        const g = getGoalForDate(task, dk);
        if (g <= 0) continue;
        total++;
        if ((grid.counts[dk]?.[task.id] || 0) >= g) done++;
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
  const ranked = useMemo(() => [...taskStats].sort((a, b) => b.rate - a.rate), [taskStats]);

  // Overall daily rates for the month
  const dailyRates = useMemo(() => {
    const rates: number[] = [];
    for (let d = 1; d <= days; d++) {
      const dk = fmtDate(year, month, d);
      rates.push(getGridRate(dk, grid.tasks, grid.counts));
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
      const rate = getGridRate(dk, grid.tasks, grid.counts);
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
      const rate = getGridRate(dk, grid.tasks, grid.counts);
      if (rate > 0) count++;
    }
    return count;
  }, [grid, today, days, year, month]);

  // Heatmap data (last 16 weeks)
  const heatmap = useMemo(() => {
    const weeks = 16;
    const todayDate = new Date(year, month - 1, today);
    const endDay = todayDate.getDay();
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - (weeks * 7 - 1) - endDay);
    const cells: { date: string; rate: number; col: number; row: number }[] = [];
    for (let col = 0; col < weeks + 1; col++) {
      for (let row = 0; row < 7; row++) {
        const dd = new Date(startDate);
        dd.setDate(dd.getDate() + col * 7 + row);
        if (dd > todayDate) continue;
        const dk = fmtDate(dd.getFullYear(), dd.getMonth() + 1, dd.getDate());
        const rate = getGridRate(dk, grid.tasks, grid.counts);
        cells.push({ date: dk, rate, col, row });
      }
    }
    return { cells, weeks };
  }, [grid, year, month, today]);

  const [taskRateRef, taskRateVisible] = useInView<HTMLDivElement>();
  const [chartRef, chartVisible] = useInView<HTMLDivElement>();
  const [heatmapRef, heatmapVisible] = useInView<HTMLDivElement>();

  return (
    <div className="p-5 max-w-[900px] mx-auto space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <RingCard
          label="Overall Rate"
          value={Math.round(overallRate * 100)}
          suffix="%"
          rate={overallRate}
          color="var(--accent)"
          bg="linear-gradient(135deg, rgba(37,99,235,.13) 0%, rgba(37,99,235,.03) 100%)"
        />
        <IconCard
          label="Streak"
          value={streak}
          suffix="d"
          color="var(--orange)"
          bg="linear-gradient(135deg, rgba(249,115,22,.13) 0%, rgba(249,115,22,.03) 100%)"
          icon={<FlameIcon streak={streak} />}
        />
        <IconCard
          label="Active Days"
          value={activeDays}
          suffix={`/${Math.min(today, days)}`}
          color="var(--green)"
          bg="linear-gradient(135deg, rgba(34,197,94,.13) 0%, rgba(34,197,94,.03) 100%)"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
        <IconCard
          label="Tasks"
          value={grid.tasks.length}
          color="var(--text)"
          bg="linear-gradient(135deg, rgba(15,23,42,.08) 0%, rgba(15,23,42,.02) 100%)"
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          }
        />
      </div>

      {/* AI Reflection */}
      <AiReflection
        grid={grid}
        taskStats={taskStats}
        overallRate={overallRate}
        streak={streak}
        year={year}
        month={month}
        today={today}
        days={days}
      />

      {/* Task ranking */}
      <div ref={taskRateRef} className={`grid-card scroll-reveal${taskRateVisible ? " in-view" : ""}`} style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px 8px", fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
          Task Completion Rate
        </div>
        {ranked.length > 0 ? (
          <div>
            {ranked.map(({ task, appName, done, total, rate }, i) => (
              <TaskRateRow
                key={task.id}
                task={task}
                appName={appName}
                done={done}
                total={total}
                rate={rate}
                visible={taskRateVisible}
                index={i}
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
      <div ref={chartRef} className={`grid-card scroll-reveal${chartVisible ? " in-view" : ""}`} style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 0", fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
          Daily Completion Rate — {month}月
        </div>
        <div style={{ padding: "8px 18px 18px" }}>
          <MonthChart rates={dailyRates} today={today} visible={chartVisible} />
        </div>
      </div>

      {/* Heatmap */}
      <div ref={heatmapRef} className={`grid-card scroll-reveal${heatmapVisible ? " in-view" : ""}`} style={{ padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>
          Activity Heatmap
        </div>
        <Heatmap cells={heatmap.cells} weeks={heatmap.weeks} />
      </div>
    </div>
  );
}

// === Sub-components ===

function RingCard({ label, value, suffix, rate, color, bg }: { label: string; value: number; suffix?: string; rate: number; color: string; bg: string }) {
  const animVal = useCountUp(value);
  const ringRef = useRef<SVGCircleElement>(null);
  const animated = useRef(false);
  const R = 34;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    if (animated.current) return;
    const el = ringRef.current;
    if (!el) return;
    animated.current = true;
    el.setAttribute("stroke-dashoffset", String(C));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.2s ease-out";
        el.setAttribute("stroke-dashoffset", String(C * (1 - rate)));
      });
    });
  }, []);

  return (
    <div className="stat-card" style={{ borderTopColor: color, background: bg }}>
      <div className="stat-ring-wrap">
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={R} fill="none" stroke="var(--border)" strokeWidth="6" opacity=".4" />
          <circle
            ref={ringRef}
            cx="46" cy="46" r={R}
            fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={C}
            strokeDashoffset={C}
            transform="rotate(-90 46 46)"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="stat-ring-value" style={{ color }}>
          {animVal}<span style={{ fontSize: 14, fontWeight: 700, opacity: .7 }}>{suffix}</span>
        </div>
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function IconCard({ label, value, suffix, color, bg, icon }: { label: string; value: number; suffix?: string; color: string; bg: string; icon: React.ReactNode }) {
  const animVal = useCountUp(value);
  return (
    <div className="stat-card" style={{ borderTopColor: color, background: bg }}>
      <div className="stat-icon-row">
        {icon}
        <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1.5 }}>
          {animVal}<span style={{ fontSize: 16, fontWeight: 700, opacity: .7 }}>{suffix ?? ""}</span>
        </div>
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function FlameIcon({ streak }: { streak: number }) {
  let color = "#9ca3af";
  let animate = false;
  let glow = false;
  if (streak >= 8) { color = "#ef4444"; animate = true; glow = true; }
  else if (streak >= 4) { color = "#f97316"; animate = true; }
  else if (streak >= 1) { color = "#eab308"; animate = true; }
  return (
    <svg
      width="40" height="40" viewBox="0 0 24 24" fill={color}
      className={animate ? "flame-anim" : ""}
      style={glow ? { filter: "drop-shadow(0 0 8px rgba(239,68,68,.7))" } : animate ? { filter: `drop-shadow(0 0 4px ${color}80)` } : undefined}
    >
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.31-6.64 4-8 0 3 2 5 3 5.5C10.5 10 10 6 12 2c1.5 3 2.5 5.5 4 7.5 1-1 2-3.5 2-3.5 1.69 1.36 4 4.93 4 8 0 4.42-4.03 8-9 8z"/>
    </svg>
  );
}

function TaskRateRow({ task, appName, done, total, rate, visible, index }: { task: GridTask; appName: string; done: number; total: number; rate: number; visible: boolean; index: number }) {
  const pct = Math.round(rate * 100);
  const animPct = useCountUp(pct, 800, visible);
  const barColor = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--accent)" : pct >= 20 ? "var(--orange)" : "var(--red)";
  const barRef = useRef<HTMLDivElement>(null);
  const barDone = useRef(false);

  useEffect(() => {
    if (!visible || barDone.current) return;
    const el = barRef.current;
    if (!el) return;
    barDone.current = true;
    const tid = setTimeout(() => {
      el.style.transition = "width 0.6s cubic-bezier(.34,1.56,.64,1)";
      el.style.width = `${pct}%`;
    }, index * 80);
    return () => clearTimeout(tid);
  }, [visible, pct, index]);

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
          ref={barRef}
          style={{
            height: "100%",
            width: 0,
            background: barColor,
            borderRadius: 4,
          }}
        />
      </div>

      {/* Percentage */}
      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: barColor, minWidth: 44, textAlign: "right" }}>
        {animPct}%
      </div>

      {/* Count */}
      <div style={{ fontSize: 10, color: "var(--text4)", minWidth: 36, textAlign: "right" }}>
        {done}/{total}
      </div>
    </div>
  );
}

function MonthChart({ rates, today, visible }: { rates: number[]; today: number; visible: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (!visible || animated.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    animated.current = true;
    const bars = svg.querySelectorAll(".month-bar") as NodeListOf<SVGRectElement>;
    const tids: number[] = [];
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bars.forEach((b, i) => {
          tids.push(setTimeout(() => {
            b.style.transition = "transform 0.5s cubic-bezier(.34,1.56,.64,1)";
            b.style.transform = "scaleY(1)";
          }, i * 25));
        });
      });
    });
    return () => tids.forEach(clearTimeout);
  }, [visible]);

  const W = 600;
  const H = 120;
  const pad = { t: 14, r: 10, b: 22, l: 6 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const n = rates.length;

  const gy = (v: number) => pad.t + ch - ch * v;

  // bar chart
  const barW = cw / n;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
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
              className="month-bar"
              style={{
                transformBox: "fill-box" as React.CSSProperties["transformBox"],
                transformOrigin: "center bottom",
                transform: "scaleY(0)",
              }}
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

// === AI Reflection ===

const AI_CACHE_KEY = "skillme_ai_cache";

function getSlot(): string {
  const h = new Date().getHours();
  if (h >= 22) return "22";
  if (h >= 18) return "18";
  if (h >= 12) return "12";
  if (h >= 7) return "7";
  return "22";
}

interface AiCache { date: string; slot: string; comment: string }

function getAiCache(): AiCache | null {
  try { return JSON.parse(localStorage.getItem(AI_CACHE_KEY) || "null"); } catch { return null; }
}
function setAiCache(obj: AiCache) { localStorage.setItem(AI_CACHE_KEY, JSON.stringify(obj)); }

async function callGemini(prompt: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("no key");
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error("API " + res.status);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

interface AiReflectionProps {
  grid: { tasks: GridTask[]; counts: Record<string, Record<string, number>> };
  taskStats: { task: GridTask; appName: string; done: number; total: number; rate: number }[];
  overallRate: number;
  streak: number;
  year: number;
  month: number;
  today: number;
  days: number;
}

function AiReflection({ grid, taskStats, overallRate, streak, year, month, today, days }: AiReflectionProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping] = useState(false);
  const typeRaf = useRef(0);

  useEffect(() => {
    if (!comment) { setDisplayText(""); setTyping(false); return; }
    let i = 0;
    setDisplayText("");
    setTyping(true);
    const step = () => {
      i += 3;
      if (i >= comment.length) {
        setDisplayText(comment);
        setTyping(false);
        return;
      }
      setDisplayText(comment.slice(0, i));
      typeRaf.current = requestAnimationFrame(step);
    };
    typeRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(typeRaf.current);
  }, [comment]);

  const buildPrompt = useCallback(() => {
    const slot = getSlot();
    const monthRate = Math.round(overallRate * 100);

    // Per-task monthly & weekly rates
    const wStart = Math.max(1, today - 6);
    const taskMonth: string[] = [];
    const taskWeek: string[] = [];

    grid.tasks.forEach((task) => {
      const app = APPS.find((a) => a.id === task.appId);
      const name = (app?.name?.slice(0, 10) ?? task.appId) + " " + task.label;
      let mp = 0, ms = 0, wp = 0, ws = 0;
      for (let d = 1; d <= today; d++) {
        const dk = fmtDate(year, month, d);
        const g = getGoalForDate(task, dk);
        if (g <= 0) continue;
        const count = grid.counts[dk]?.[task.id] || 0;
        const met = count >= g ? 1 : 0;
        mp++; ms += met;
        if (d >= wStart) { wp++; ws += met; }
      }
      taskMonth.push(name + ": " + (mp > 0 ? Math.round((ms / mp) * 100) : 0) + "%");
      taskWeek.push(name + ": " + (wp > 0 ? Math.round((ws / wp) * 100) : 0) + "%");
    });

    // Weekly overall
    let wPts = 0, wDone = 0;
    for (let d = wStart; d <= today; d++) {
      const dk = fmtDate(year, month, d);
      grid.tasks.forEach((task) => {
        const g = getGoalForDate(task, dk);
        if (g <= 0) return;
        wPts++;
        if ((grid.counts[dk]?.[task.id] || 0) >= g) wDone++;
      });
    }
    const weekRate = wPts > 0 ? Math.round((wDone / wPts) * 100) : 0;

    // Today stats
    const todayKey = fmtDate(year, month, today);
    let todayTotal = 0, todayDone = 0;
    grid.tasks.forEach((task) => {
      const g = getGoalForDate(task, todayKey);
      if (g <= 0) return;
      todayTotal++;
      if ((grid.counts[todayKey]?.[task.id] || 0) >= g) todayDone++;
    });
    const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    const toneMap: Record<string, string> = {
      "7": "朝の時間帯です。今月の振り返りから始め、今週の傾向に触れ、今日の目標や激励で締めてください。",
      "12": "お昼の時間帯です。今月の全体感から今週の流れ、そして午前の振り返りと午後への切り替えの順で話してください。",
      "18": "夕方の時間帯です。今月の進捗から今週のハイライト、今日の振り返りの順でコメントしてください。",
      "22": "夜の時間帯です。今月の総括から今週の成果、今日の1日の締めくくりと明日への期待の順で話してください。",
    };

    let prompt = "あなたはスキル学習トラッキングアプリのAIコーチです。ユーザーの進捗データを見て、振り返りコメントを日本語で書いてください。\n";
    prompt += toneMap[slot] + "\n\n";
    prompt += "【今月のデータ】\n";
    prompt += `月間達成率: ${monthRate}% (${today}日目/${days}日)\n`;
    prompt += `現在のストリーク: ${streak}日\n`;
    prompt += `タスク別: ${taskMonth.join(", ")}\n\n`;
    prompt += "【今週のデータ (直近7日間)】\n";
    prompt += `週間達成率: ${weekRate}%\n`;
    prompt += `タスク別: ${taskWeek.join(", ")}\n\n`;
    prompt += "【今日のデータ】\n";
    prompt += `${month}/${today}: ${todayDone}/${todayTotal}完了 (${todayPct}%)\n`;
    prompt += `残り: ${todayTotal - todayDone}タスク\n\n`;
    prompt += "今月→今週→今日の順番で自然に流れるように、4〜5文で書いてください。セクション分けや見出しは不要です。絵文字は使わず、温かみのある自然な日本語で。";
    return prompt;
  }, [grid, overallRate, streak, year, month, today, days]);

  useEffect(() => {
    const key = getGeminiKey();
    if (!key) {
      setLoading(false);
      setError("no key");
      return;
    }

    const slot = getSlot();
    const todayStr = new Date().toISOString().slice(0, 10);
    const cache = getAiCache();
    if (cache && cache.date === todayStr && cache.slot === slot) {
      setComment(cache.comment);
      setLoading(false);
      setMeta("Updated at " + slot + ":00");
      return;
    }

    setLoading(true);
    setError("");
    const prompt = buildPrompt();
    callGemini(prompt)
      .then((text) => {
        setComment(text);
        setLoading(false);
        setMeta("Updated at " + slot + ":00");
        setAiCache({ date: todayStr, slot, comment: text });
      })
      .catch((e) => {
        setLoading(false);
        setError(e.message);
      });
  }, [buildPrompt]);

  return (
    <div className="grid-card ai-card" style={{ padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 10 }}>
        AI Reflection
      </div>
      {error === "no key" ? (
        <div className="ai-setup">
          AI振り返りを表示するには、ナビバーの <strong>KEY</strong> ボタンからAPI Keyを設定してください
        </div>
      ) : error ? (
        <div style={{ fontSize: 13, color: "var(--red)" }}>Failed to load ({error})</div>
      ) : (
        <div className={`ai-body${loading ? " ai-loading" : ""}`}>
          {loading ? "Loading..." : <>{displayText}{typing && <span className="ai-cursor" />}</>}
        </div>
      )}
      {meta && !error && <div className="ai-meta">{meta}</div>}
    </div>
  );
}
