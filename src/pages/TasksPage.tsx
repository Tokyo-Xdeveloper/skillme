import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  loadTaskGrid,
  addGridTask,
  removeGridTask,
  updateGridTaskGoal,
  getGridRate,
} from "../lib/tracking";
import { APPS } from "../data/apps";
import type { TaskGridData } from "../types/app";

const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TASK_PRESETS = [
  { label: "New", eventType: "task:activation", defaultGoal: 3 },
  { label: "Review", eventType: "task:review", defaultGoal: 5 },
];

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
  const [addPreset, setAddPreset] = useState(0);
  const [addGoal, setAddGoal] = useState(TASK_PRESETS[0].defaultGoal);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editGoalVal, setEditGoalVal] = useState(0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const days = daysInMonth(year, month);

  // sync scroll refs
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

  // Reload grid from storage periodically (to pick up auto-increments from AppPlayerPage)
  useEffect(() => {
    const iv = setInterval(() => setGrid(loadTaskGrid()), 2000);
    return () => clearInterval(iv);
  }, []);

  // Cells are read-only — counts auto-sync from app events

  const handleAdd = useCallback(() => {
    if (!addApp) return;
    const preset = TASK_PRESETS[addPreset];
    setGrid(addGridTask(addApp, preset.label, addGoal, preset.eventType));
    setShowAdd(false);
  }, [addApp, addPreset, addGoal]);

  const handleRemove = useCallback((taskId: string) => {
    setGrid(removeGridTask(taskId));
  }, []);

  const handleGoalSave = useCallback(() => {
    if (editGoalId && editGoalVal > 0) {
      setGrid(updateGridTaskGoal(editGoalId, editGoalVal));
    }
    setEditGoalId(null);
  }, [editGoalId, editGoalVal]);

  // today stats
  const todayKey = fmtDate(year, month, today);
  const todayDone = grid.tasks.filter(
    (t) => (grid.counts[todayKey]?.[t.id] || 0) >= t.goal,
  ).length;
  const todayTotal = grid.tasks.length;
  const todayPct =
    todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // daily rates
  const dailyRates = useMemo(() => {
    const rates: number[] = [];
    for (let d = 1; d <= days; d++) {
      const dk = fmtDate(year, month, d);
      rates.push(getGridRate(dk, grid.tasks, grid.counts));
    }
    return rates;
  }, [grid, days, year, month]);

  return (
    <div className="p-5 max-w-[1100px] mx-auto">
      {/* Today flash */}
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
        {/* Header */}
        <div className="grid-scroll" ref={headRef}>
          <table className="grid-table">
            <thead>
              <tr className="grid-head">
                <th>#</th>
                <th>Task (Goal)</th>
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

        {/* Body */}
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
                          {app?.name?.slice(0, 10) ?? task.appId}
                        </span>
                        <span className="grid-task-label">{task.label}</span>
                        <span
                          className="grid-goal-badge"
                          onClick={() => {
                            setEditGoalId(task.id);
                            setEditGoalVal(task.goal);
                          }}
                        >
                          /{task.goal}
                        </span>
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
                      const count = grid.counts[dk]?.[task.id] || 0;
                      const met = count >= task.goal && task.goal > 0;
                      const isT = d === today;
                      return (
                        <td
                          key={d}
                          className={`grid-cell readonly ${isT ? "today-col" : ""} ${met ? "m-met" : count > 0 ? "m-partial" : ""}`}
                        >
                          {count > 0 && (
                            <span className="mark">{count}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Add row */}
              <tr>
                <td className="grid-num" style={{ borderBottom: "none" }} />
                <td className="grid-task-name" style={{ borderBottom: "none" }}>
                  <button
                    className="grid-add-btn"
                    onClick={() => {
                      setAddPreset(0);
                      setAddGoal(TASK_PRESETS[0].defaultGoal);
                      setShowAdd(true);
                    }}
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

        {/* Summary */}
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

        {/* Chart */}
        <div className="chart-section">
          <div className="chart-title">Progress</div>
          <ProgressChart rates={dailyRates} today={today} />
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: "var(--text4)",
          textAlign: "center",
        }}
      >
        Goal badge: edit goal · Counts auto-sync from apps
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="add-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>タスクを追加</h3>
            <label className="add-modal-label">アプリ</label>
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
            <label className="add-modal-label">タスク種別</label>
            <select
              value={addPreset}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setAddPreset(idx);
                setAddGoal(TASK_PRESETS[idx].defaultGoal);
              }}
            >
              {TASK_PRESETS.map((p, i) => (
                <option key={i} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
            <label className="add-modal-label">1日の目標数</label>
            <input
              type="number"
              min={1}
              max={99}
              value={addGoal}
              onChange={(e) => setAddGoal(Math.max(1, Number(e.target.value)))}
              className="add-modal-input"
            />
            <div className="add-modal-actions">
              <button className="btn-cancel" onClick={() => setShowAdd(false)}>
                キャンセル
              </button>
              <button className="btn-add" onClick={handleAdd}>
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit goal modal */}
      {editGoalId && (
        <div
          className="add-modal-overlay"
          onClick={() => setEditGoalId(null)}
        >
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>目標を変更</h3>
            <label className="add-modal-label">1日の目標数</label>
            <input
              type="number"
              min={1}
              max={99}
              value={editGoalVal}
              onChange={(e) =>
                setEditGoalVal(Math.max(1, Number(e.target.value)))
              }
              className="add-modal-input"
              autoFocus
            />
            <div className="add-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setEditGoalId(null)}
              >
                キャンセル
              </button>
              <button className="btn-add" onClick={handleGoalSave}>
                保存
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
          <circle cx="25" cy="25" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
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
          {done}/{total} goals met · {rem} remaining
        </div>
      </div>
    </div>
  );
}

function ProgressChart({ rates, today }: { rates: number[]; today: number }) {
  const W = 600;
  const H = 100;
  const pad = { t: 12, r: 10, b: 20, l: 6 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const n = rates.length;
  const gx = (d: number) => pad.l + (cw * d) / (n - 1 || 1);
  const gy = (v: number) => pad.t + ch - ch * v;

  let path = `M ${gx(0)} ${gy(rates[0])}`;
  for (let i = 1; i < n; i++) {
    const x = gx(i);
    const y = gy(rates[i]);
    const px = gx(i - 1);
    const py = gy(rates[i - 1]);
    path += ` C ${px + (x - px) * 0.4} ${py} ${px + (x - px) * 0.6} ${y} ${x} ${y}`;
  }
  const area = `${path} L ${gx(n - 1)} ${gy(0)} L ${gx(0)} ${gy(0)} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) => gy(v));
  const xLabels: { x: number; label: string }[] = [];
  const step = n > 20 ? 3 : n > 14 ? 2 : 1;
  for (let d = 0; d < n; d++) {
    if (d % step === 0 || d === n - 1) xLabels.push({ x: gx(d), label: String(d + 1) });
  }
  const todayX = gx(today - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity=".02" />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--border2)" strokeWidth=".7" strokeDasharray="4,4" />
      ))}
      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1={todayX} y1={pad.t} x2={todayX} y2={pad.t + ch} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" opacity=".5" />
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 3} textAnchor="middle" fill="var(--text4)" fontFamily="'JetBrains Mono', monospace" fontSize="7">{label}</text>
      ))}
      <text x={pad.l} y={gy(1) - 3} textAnchor="start" fill="var(--text4)" fontFamily="'JetBrains Mono', monospace" fontSize="7">100%</text>
      <text x={pad.l} y={gy(0) + 8} textAnchor="start" fill="var(--text4)" fontFamily="'JetBrains Mono', monospace" fontSize="7">0%</text>
    </svg>
  );
}
