import type { DailyRecord, AppSnapshot, AppTaskCache, TrackingData, TaskGridData, GridTask } from "../types/app";

const STORAGE_KEY = "skillme-tracking";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadTracking(): TrackingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as TrackingData;
      if (!data.daily) data.daily = [];
      if (!data.snapshots) data.snapshots = {};
      if (!data.taskCache) data.taskCache = {};
      return data;
    }
  } catch {
    // ignore
  }
  return { daily: [], snapshots: {}, taskCache: {} };
}

function saveTracking(data: TrackingData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getOrCreateToday(data: TrackingData): DailyRecord {
  const d = today();
  let rec = data.daily.find((r) => r.date === d);
  if (!rec) {
    rec = { date: d, activations: 0, reviews: 0, masteries: 0 };
    data.daily.push(rec);
  }
  return rec;
}

export type EventType = "task:activation" | "task:review" | "task:mastery";

export function recordEvent(type: EventType): TrackingData {
  const data = loadTracking();
  const rec = getOrCreateToday(data);
  if (type === "task:activation") rec.activations++;
  else if (type === "task:review") rec.reviews++;
  else if (type === "task:mastery") rec.masteries++;
  saveTracking(data);
  return data;
}

export function saveSnapshot(appId: string, snapshot: Omit<AppSnapshot, "updatedAt">): TrackingData {
  const data = loadTracking();
  data.snapshots[appId] = { ...snapshot, updatedAt: new Date().toISOString() };
  saveTracking(data);
  return data;
}

/** Get daily records for the last N days (sorted oldest→newest) */
export function getRecentDays(days: number): DailyRecord[] {
  const data = loadTracking();
  const result: DailyRecord[] = [];
  const d = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const ds = new Date(d);
    ds.setDate(ds.getDate() - i);
    const dk = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, "0")}-${String(ds.getDate()).padStart(2, "0")}`;
    const existing = data.daily.find((r) => r.date === dk);
    result.push(existing ?? { date: dk, activations: 0, reviews: 0, masteries: 0 });
  }
  return result;
}

export function saveTaskCache(cache: AppTaskCache): void {
  const data = loadTracking();
  data.taskCache[cache.appId] = cache;
  saveTracking(data);
}

export function getTaskCache(): Record<string, AppTaskCache> {
  return loadTracking().taskCache;
}

// === Task Grid storage ===

const GRID_KEY = "skillme-taskgrid";

export function loadTaskGrid(): TaskGridData {
  try {
    const raw = localStorage.getItem(GRID_KEY);
    if (raw) {
      const data = JSON.parse(raw) as TaskGridData;
      if (!data.tasks) data.tasks = [];
      if (!data.marks) data.marks = {};
      return data;
    }
  } catch { /* ignore */ }
  return { tasks: getDefaultTasks(), marks: {} };
}

function getDefaultTasks(): GridTask[] {
  return [
    { id: "default-new", appId: "vocab-master", label: "New" },
    { id: "default-review", appId: "vocab-master", label: "Review" },
  ];
}

export function saveTaskGrid(data: TaskGridData): void {
  localStorage.setItem(GRID_KEY, JSON.stringify(data));
}

export function addGridTask(appId: string, label: string): TaskGridData {
  const data = loadTaskGrid();
  data.tasks.push({ id: `task-${Date.now()}`, appId, label });
  saveTaskGrid(data);
  return data;
}

export function removeGridTask(taskId: string): TaskGridData {
  const data = loadTaskGrid();
  data.tasks = data.tasks.filter((t) => t.id !== taskId);
  // clean marks
  for (const date of Object.keys(data.marks)) {
    delete data.marks[date][taskId];
  }
  saveTaskGrid(data);
  return data;
}

export function toggleGridMark(date: string, taskId: string): TaskGridData {
  const data = loadTaskGrid();
  if (!data.marks[date]) data.marks[date] = {};
  data.marks[date][taskId] = !data.marks[date][taskId];
  saveTaskGrid(data);
  return data;
}

export function getGridRate(date: string, tasks: GridTask[], marks: Record<string, Record<string, boolean>>): number {
  if (tasks.length === 0) return 0;
  const dayMarks = marks[date] || {};
  const done = tasks.filter((t) => dayMarks[t.id]).length;
  return done / tasks.length;
}

/** Compute streak (consecutive days with at least 1 activity) */
export function computeStreak(): number {
  const data = loadTracking();
  const dateSet = new Set(data.daily.filter((r) => r.activations + r.reviews + r.masteries > 0).map((r) => r.date));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = new Date(d);
    ds.setDate(ds.getDate() - i);
    const dk = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, "0")}-${String(ds.getDate()).padStart(2, "0")}`;
    if (dateSet.has(dk)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
