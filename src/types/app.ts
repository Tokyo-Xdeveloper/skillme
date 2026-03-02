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
}
