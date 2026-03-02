import { loadTracking, getRecentDays, computeStreak } from "../lib/tracking";
import SummaryCards from "../components/dashboard/SummaryCards";
import ActivityChart from "../components/dashboard/ActivityChart";
import StreakCard from "../components/dashboard/StreakCard";
import HeatmapCalendar from "../components/dashboard/HeatmapCalendar";
import type { AppSnapshot } from "../types/app";

export default function StatsPage() {
  const tracking = loadTracking();
  const days = getRecentDays(30);
  const streak = computeStreak();

  // Aggregate all app snapshots into one combined snapshot
  const snapshotValues = Object.values(tracking.snapshots);
  const combined: AppSnapshot | null =
    snapshotValues.length > 0
      ? {
          total: snapshotValues.reduce((s, v) => s + v.total, 0),
          active: snapshotValues.reduce((s, v) => s + v.active, 0),
          due: snapshotValues.reduce((s, v) => s + v.due, 0),
          mastered: snapshotValues.reduce((s, v) => s + v.mastered, 0),
          streak,
          updatedAt: snapshotValues.reduce(
            (latest, v) => (v.updatedAt > latest ? v.updatedAt : latest),
            "",
          ),
        }
      : null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">統計</h2>

      <SummaryCards snapshot={combined} />

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <StreakCard streak={streak} />
        <ActivityChart days={days} />
      </div>

      <HeatmapCalendar />
    </main>
  );
}
