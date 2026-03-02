import type { DailyRecord, AppSnapshot, TrackingData } from "../types/app";

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
      return data;
    }
  } catch {
    // ignore
  }
  return { daily: [], snapshots: {} };
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
