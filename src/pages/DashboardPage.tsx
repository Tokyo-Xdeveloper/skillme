import { useParams, Link } from "react-router-dom";
import { APPS } from "../data/apps";
import { loadTracking, getRecentDays, computeStreak } from "../lib/tracking";
import SummaryCards from "../components/dashboard/SummaryCards";
import ActivityChart from "../components/dashboard/ActivityChart";
import StreakCard from "../components/dashboard/StreakCard";
import HeatmapCalendar from "../components/dashboard/HeatmapCalendar";

export default function DashboardPage() {
  const { appId } = useParams<{ appId: string }>();
  const app = APPS.find((a) => a.id === appId);
  const tracking = loadTracking();
  const snapshot = appId ? tracking.snapshots[appId] ?? null : null;
  const days = getRecentDays(30);
  const streak = computeStreak();

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">アプリが見つかりません</p>
          <Link to="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビバー */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-10">
        <Link
          to={`/app/${app.id}`}
          className="text-blue-600 hover:text-blue-700 no-underline mr-4 text-lg"
        >
          ← 戻る
        </Link>
        <span className="font-semibold text-gray-900">{app.name}</span>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-gray-500 text-sm">Dashboard</span>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Summary cards */}
        <SummaryCards snapshot={snapshot} />

        {/* Streak + Activity chart side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <StreakCard streak={streak} />
          <ActivityChart days={days} />
        </div>

        {/* Heatmap calendar */}
        <HeatmapCalendar />
      </main>
    </div>
  );
}
