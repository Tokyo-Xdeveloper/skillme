export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
}

export interface AppUsageEntry {
  appId: string;
  startedAt: string; // ISO 8601
}

export interface PlatformData {
  appUsageLog: AppUsageEntry[];
}

// --- Tracking types (skillme × english-expression) ---

export interface DailyRecord {
  date: string;           // 'YYYY-MM-DD'
  activations: number;    // new完了数
  reviews: number;        // review完了数
  masteries: number;      // マスタリー数
}

export interface AppSnapshot {
  total: number;
  active: number;
  due: number;
  mastered: number;
  streak: number;
  updatedAt: string;      // ISO 8601
}

export interface TrackingData {
  daily: DailyRecord[];
  snapshots: Record<string, AppSnapshot>;  // keyed by appId
  taskCache: Record<string, AppTaskCache>; // keyed by appId
}

export interface TaskItem {
  id: string;
  title: string;          // expression名
  subtitle: string;       // meaning
  taskType: "review" | "activation";
  reviewStage: number | null;  // 1-5, activationはnull
  isOverdue: boolean;
  dueDate: string | null;
}

export interface AppTaskCache {
  appId: string;
  appName: string;
  tasks: TaskItem[];
  cachedAt: string;       // ISO 8601
}

// --- Task Grid (Daily-Tracker style) ---

export interface GridTask {
  id: string;
  appId: string;
  label: string;          // "New", "Review", etc.
  goal: number;           // daily target count
  eventType: string;      // "task:activation" | "task:review"
}

export interface TaskGridData {
  tasks: GridTask[];
  counts: Record<string, Record<string, number>>; // "YYYY-MM-DD" -> taskId -> count
}
