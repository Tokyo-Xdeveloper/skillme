import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  loadTaskGrid,
  toggleGridMark,
  addGridTask,
  removeGridTask,
  getGridRate,
} from "../lib/tracking";
import { APPS } from "../data/apps";
import type { TaskGridData } from "../types/app";

const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TASK_TYPES = ["New", "Review"];

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function TasksPage() {
  const [grid, setGrid] = useState<TaskGridData>(loadTaskGrid);
  const [showAdd, setShowAdd] = useState(false);
  const [addApp, setAddApp] = useState(APPS[0]?.id ?? "");
  const [addLabel, setAddLabel] = useState(TASK_TYPES[0]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const days = daysInMonth(year, month);

  // refs for sync scroll
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const summRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const els = [headRef.current, bodyRef.current, summRef.current].filter(
      Boolean,
    ) as HTMLDivElement[];
    const handlers = els.map((el) => {
      const handler = () => {
        if (syncing.current) return;
        syncing.current = true;
        els.forEach((o) => {
          if (o !== el) o.scrollLeft = el.scrollLeft;
        });
        syncing.current = false;
      };
      el.addEventListener("scroll", handler);
      return { el, handler };
    });
    return () =>
      handlers.forEach(({ el, handler }) =>
        el.removeEventListener("scroll", handler),
      );
  }, [grid.tasks.length]);

  const handleToggle = useCallback((date: string, taskId: string) => {
    setGrid(toggleGridMark(date, taskId));
  }, []);

  const handleAdd = useCallback(() => {
    if (!addApp || !addLabel) return;
    setGrid(addGridTask(addApp, addLabel));
    setShowAdd(false);
  }, [addApp, addLabel]);

  const handleRemove = useCallback((taskId: string) => {
    setGrid(removeGridTask(taskId));
  }, []);

  // today stats
  const todayKey = fmtDate(year, month, today);
  const todayMarks = grid.marks[todayKey] || {};
  const todayDone = grid.tasks.filter((t) => todayMarks[t.id]).length;
  const todayTotal = grid.tasks.length;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // daily rates for chart
  const dailyRates = useMemo(() => {
    const rates: number[] = [];
    for (let d = 1; d <= days; d++) {
      const dk = fmtDate(year, month, d);
      rates.push(getGridRate(dk, grid.tasks, grid.marks));
    }
    return rates;
  }, [grid, days, year, month]);

  return (
    <div className="p-5 max-w-[1100px] mx-auto">
      {/* Today flashbox */}
      <TodayFlash
        pct={todayPct}
        done={todayDone}
        total={todayTotal}
        month={month}
        day={today}
        year={year}
      />

      {/* Grid card */}
      <div className="grid-card mt-5">
        {/* Header scroll area */}
        <div className="grid-scroll" ref={headRef}>
          <table className="grid-table">
            <thead>
              <tr className="grid-head">
                <th>#</th>
                <th>Task</th>
                {Array.from({ length: days }, (_, i) => {
                  const d = i + 1;
                  const dt = new Date(year, month - 1, d);
                  const wk = dt.getDay() === 0 || dt.getDay() === 6;
                  const isT = d === today;
                  return (
                    <th
                      key={d}
                      className={`${wk ? "wk" : ""} ${isT ? "today-col" : ""}`}
                    >
                      <span className="grid-day-num">{d}</span>
                      <span className="grid-day-name">{DN[dt.getDay()]}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>

        {/* Body scroll area */}
        <div className="grid-body grid-scroll" ref={bodyRef}>
          <table className="grid-table">
            <tbody>
              {grid.tasks.map((task, idx) => {
                const app = APPS.find((a) => a.id === task.appId);
                return (
                  <tr key={task.id}>
                    <td className="grid-num">{idx + 1}</td>
                    <td className="grid-task-name">
                      <div className="grid-task-inner">
                        <span className="grid-task-app">
                          {app?.name?.slice(0, 12) ?? task.appId}
                        </span>
                        <span className="grid-task-label">{task.label}</span>
                        <button
                          className="grid-del-btn"
                          onClick={() => handleRemove(task.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {Array.from({ length: days }, (_, i) => {
                      const d = i + 1;
                      const dk = fmtDate(year, month, d);
                      const done = grid.marks[dk]?.[task.id] ?? false;
                      const isT = d === today;
                      return (
                        <td
                          key={d}
                          className={`grid-cell ${isT ? "today-col" : ""} ${done ? "m-done" : ""}`}
                          onClick={() => handleToggle(dk, task.id)}
                        >
                          {done && <span className="mark">○</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Add task row */}
              <tr>
                <td className="grid-num" style={{ borderBottom: "none" }} />
                <td
                  className="grid-task-name"
                  style={{ borderBottom: "none" }}
                >
                  <button
                    className="grid-add-btn"
                    onClick={() => setShowAdd(true)}
                  >
                    + Add Task
                  </button>
                </td>
                {Array.from({ length: days }, (_, i) => (
                  <td
                    key={i}
                    style={{
                      borderBottom: "none",
                      borderRight: "1px solid var(--border)",
                    }}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        <div className="grid-summary grid-scroll" ref={summRef}>
          <table className="grid-table">
            <tbody>
              <tr>
                <td />
                <td>Rate</td>
                {dailyRates.map((r, i) => (
                  <td key={i}>{r > 0 ? `${Math.round(r * 100)}%` : "–"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Progress chart */}
        <div className="chart-section">
          <div className="chart-title">Progress</div>
          <ProgressChart rates={dailyRates} today={today} />
        </div>
      </div>

      {/* Add task modal */}
      {showAdd && (
        <div className="add-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>タスクを追加</h3>
            <select
              value={addApp}
              onChange={(e) => setAddApp(e.target.value)}
            >
              {APPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="add-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowAdd(false)}
              >
                キャンセル
              </button>
              <button className="btn-add" onClick={handleAdd}>
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Sub-components ===

function TodayFlash({
  pct,
  done,
  total,
  month,
  day,
  year,
}: {
  pct: number;
  done: number;
  total: number;
  month: number;
  day: number;
  year: number;
}) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const off = circ - (circ * pct) / 100;
  const rem = total - done;

  return (
    <div
      className="grid-card"
      style={{ display: "flex", alignItems: "center", gap: 16, padding: 18 }}
    >
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <svg viewBox="0 0 50 50" width="56" height="56">
          <circle
            cx="25"
            cy="25"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r={r}
            fill="none"
            stroke={pct === 100 ? "var(--green)" : "var(--accent)"}
            strokeWidth="4"
            strokeLinecap="round"
            transform="rotate(-90 25 25)"
            strokeDasharray={circ}
            strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset .6s" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
          {month}/{day}, {year} — Today
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
          {done}/{total} done · {rem} remaining
        </div>
      </div>
    </div>
  );
}

function ProgressChart({
  rates,
  today,
}: {
  rates: number[];
  today: number;
}) {
  const W = 600;
  const H = 100;
  const pad = { t: 12, r: 10, b: 20, l: 6 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const n = rates.length;

  const gx = (d: number) => pad.l + (cw * d) / (n - 1 || 1);
  const gy = (v: number) => pad.t + ch - ch * v;

  // smooth path
  let path = `M ${gx(0)} ${gy(rates[0])}`;
  for (let i = 1; i < n; i++) {
    const x = gx(i);
    const y = gy(rates[i]);
    const px = gx(i - 1);
    const py = gy(rates[i - 1]);
    path += ` C ${px + (x - px) * 0.4} ${py} ${px + (x - px) * 0.6} ${y} ${x} ${y}`;
  }

  // area fill
  const area = `${path} L ${gx(n - 1)} ${gy(0)} L ${gx(0)} ${gy(0)} Z`;

  // grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) => gy(v));

  // x labels
  const xLabels: { x: number; label: string }[] = [];
  const step = n > 20 ? 3 : n > 14 ? 2 : 1;
  for (let d = 0; d < n; d++) {
    if (d % step === 0 || d === n - 1) {
      xLabels.push({ x: gx(d), label: String(d + 1) });
    }
  }

  // today marker
  const todayX = gx(today - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity=".02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((y, i) => (
        <line
          key={i}
          x1={pad.l}
          y1={y}
          x2={W - pad.r}
          y2={y}
          stroke="var(--border2)"
          strokeWidth=".7"
          strokeDasharray="4,4"
        />
      ))}

      {/* Area */}
      <path d={area} fill="url(#areaGrad)" />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Today vertical line */}
      <line
        x1={todayX}
        y1={pad.t}
        x2={todayX}
        y2={pad.t + ch}
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity=".5"
      />

      {/* X labels */}
      {xLabels.map(({ x, label }) => (
        <text
          key={label}
          x={x}
          y={H - 3}
          textAnchor="middle"
          fill="var(--text4)"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="7"
        >
          {label}
        </text>
      ))}

      {/* Y labels */}
      <text
        x={pad.l}
        y={gy(1) - 3}
        textAnchor="start"
        fill="var(--text4)"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="7"
      >
        100%
      </text>
      <text
        x={pad.l}
        y={gy(0) - 3}
        textAnchor="start"
        fill="var(--text4)"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="7"
      >
        0%
      </text>
    </svg>
  );
}
