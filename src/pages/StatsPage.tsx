import { useMemo, useState, useEffect, useCallback } from "react";
import { loadTaskGrid, getGridRate, getGoalForDate } from "../lib/tracking";
import { useCountUp } from "../hooks/useCountUp";
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
  const grid = loadTaskGrid();
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
  const ranked = [...taskStats].sort((a, b) => b.rate - a.rate);

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
        const rate = getGridRate(dk, grid.tasks, grid.counts);
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
          value={Math.round(overallRate * 100)}
          suffix="%"
          color="var(--accent)"
          bg="rgba(37,99,235,.06)"
        />
        <StatCard
          label="Streak"
          value={streak}
          suffix="d"
          color="var(--orange)"
          bg="var(--orangeBg)"
        />
        <StatCard
          label="Active Days"
          value={activeDays}
          suffix={`/${Math.min(today, days)}`}
          color="var(--green)"
          bg="var(--greenBg)"
        />
        <StatCard
          label="Tasks"
          value={grid.tasks.length}
          color="var(--text)"
          bg="rgba(0,0,0,.03)"
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

function StatCard({ label, value, suffix, color, bg }: { label: string; value: number; suffix?: string; color: string; bg: string }) {
  const animVal = useCountUp(value);
  return (
    <div
      className="grid-card"
      style={{ padding: "14px 16px", background: bg, border: "1px solid var(--border)" }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {animVal}{suffix ?? ""}
      </div>
    </div>
  );
}

function TaskRateRow({ task, appName, done, total, rate }: { task: GridTask; appName: string; done: number; total: number; rate: number }) {
  const pct = Math.round(rate * 100);
  const animPct = useCountUp(pct);
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
        {animPct}%
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
              className="month-bar"
              style={{
                transformOrigin: `${x + w / 2}px ${gy(0)}px`,
                animationDelay: `${d * 20}ms`,
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
  }, [grid, taskStats, overallRate, streak, year, month, today, days]);

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
          {loading ? "Loading..." : comment}
        </div>
      )}
      {meta && !error && <div className="ai-meta">{meta}</div>}
    </div>
  );
}
