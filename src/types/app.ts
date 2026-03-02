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
