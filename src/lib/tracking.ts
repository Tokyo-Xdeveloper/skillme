import type { DailyRecord, AppSnapshot, AppTaskCache, TrackingData, TaskGridData, GridTask, WeeklyGoals } from "../types/app";

const STORAGE_KEY = "skillme-tracking";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Resolve goal for a specific date, considering weeklyGoals */
export function getGoalForDate(task: GridTask, date: string): number {
  if (!task.weeklyGoals) return task.goal;
  const dow = new Date(date + "T00:00:00").getDay(); // 0=Sun
  return task.weeklyGoals[DOW_KEYS[dow]];
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

function migrateGrid(data: TaskGridData): TaskGridData {
  // Migrate old boolean marks → counts, old tasks without goal/eventType
  for (const task of data.tasks) {
    if (!task.goal) task.goal = task.label === "Review" ? 5 : 3;
    if (!task.eventType) task.eventType = task.label === "Review" ? "task:review" : "task:activation";
  }
  if (!data.counts) {
    // Migrate from old `marks` (boolean) to `counts`
    const old = (data as Record<string, unknown>).marks as Record<string, Record<string, boolean>> | undefined;
    data.counts = {};
    if (old) {
      for (const [date, dayMarks] of Object.entries(old)) {
        data.counts[date] = {};
        for (const [taskId, val] of Object.entries(dayMarks)) {
          if (val) data.counts[date][taskId] = 1;
        }
      }
    }
    delete (data as Record<string, unknown>).marks;
  }
  return data;
}

export function loadTaskGrid(): TaskGridData {
  try {
    const raw = localStorage.getItem(GRID_KEY);
    if (raw) {
      const data = JSON.parse(raw) as TaskGridData;
      if (!data.tasks) data.tasks = [];
      if (!data.counts) data.counts = {};
      return migrateGrid(data);
    }
  } catch { /* ignore */ }
  return { tasks: getDefaultTasks(), counts: {} };
}

function getDefaultTasks(): GridTask[] {
  return [
    { id: "default-new", appId: "vocab-master", label: "New", goal: 3, eventType: "task:activation" },
    { id: "default-review", appId: "vocab-master", label: "Review", goal: 5, eventType: "task:review" },
  ];
}

export function saveTaskGrid(data: TaskGridData): void {
  localStorage.setItem(GRID_KEY, JSON.stringify(data));
}

export function addGridTask(appId: string, label: string, goal: number, eventType: string, weeklyGoals?: WeeklyGoals): TaskGridData {
  const data = loadTaskGrid();
  const task: GridTask = { id: `task-${Date.now()}`, appId, label, goal, eventType };
  if (weeklyGoals) task.weeklyGoals = weeklyGoals;
  data.tasks.push(task);
  saveTaskGrid(data);
  return data;
}

export function removeGridTask(taskId: string): TaskGridData {
  const data = loadTaskGrid();
  data.tasks = data.tasks.filter((t) => t.id !== taskId);
  for (const date of Object.keys(data.counts)) {
    delete data.counts[date][taskId];
  }
  saveTaskGrid(data);
  return data;
}

export function updateGridTaskGoal(taskId: string, goal: number, weeklyGoals?: WeeklyGoals): TaskGridData {
  const data = loadTaskGrid();
  const task = data.tasks.find((t) => t.id === taskId);
  if (task) {
    task.goal = goal;
    if (weeklyGoals) {
      task.weeklyGoals = weeklyGoals;
    } else {
      delete task.weeklyGoals;
    }
  }
  saveTaskGrid(data);
  return data;
}

/** Increment count for matching tasks when an app event fires */
export function incrementGridCount(appId: string, eventType: EventType): TaskGridData {
  const data = loadTaskGrid();
  const d = today();
  if (!data.counts[d]) data.counts[d] = {};
  // task:mastery also counts toward "task:review" tasks
  const matchTypes = eventType === "task:mastery" ? ["task:review", "task:mastery"] : [eventType];
  for (const task of data.tasks) {
    if (task.appId === appId && matchTypes.includes(task.eventType)) {
      data.counts[d][task.id] = (data.counts[d][task.id] || 0) + 1;
    }
  }
  saveTaskGrid(data);
  return data;
}

/** Reorder tasks by moving from one index to another */
export function reorderGridTasks(fromIndex: number, toIndex: number): TaskGridData {
  const data = loadTaskGrid();
  const [moved] = data.tasks.splice(fromIndex, 1);
  data.tasks.splice(toIndex, 0, moved);
  saveTaskGrid(data);
  return data;
}

/** Manual +1 / -1 on a cell */
export function adjustGridCount(date: string, taskId: string, delta: number): TaskGridData {
  const data = loadTaskGrid();
  if (!data.counts[date]) data.counts[date] = {};
  const cur = data.counts[date][taskId] || 0;
  data.counts[date][taskId] = Math.max(0, cur + delta);
  saveTaskGrid(data);
  return data;
}

/** Get the completion rate for a day (tasks with goal>0 where count >= goal / active tasks) */
export function getGridRate(date: string, tasks: GridTask[], counts: Record<string, Record<string, number>>): number {
  if (tasks.length === 0) return 0;
  const dayCounts = counts[date] || {};
  let active = 0;
  let done = 0;
  for (const t of tasks) {
    const g = getGoalForDate(t, date);
    if (g <= 0) continue;
    active++;
    if ((dayCounts[t.id] || 0) >= g) done++;
  }
  return active > 0 ? done / active : 0;
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
