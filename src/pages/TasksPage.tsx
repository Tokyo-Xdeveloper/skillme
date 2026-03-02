import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getTaskCache } from "../lib/tracking";
import { getRecentDays } from "../lib/tracking";
import { APPS } from "../data/apps";
import TodaySummary from "../components/tasks/TodaySummary";
import TaskCard from "../components/tasks/TaskCard";

function formatDate(d: Date): string {
  const months = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${months[d.getMonth()]}${d.getDate()}日（${days[d.getDay()]}）`;
}

export default function TasksPage() {
  const caches = getTaskCache();
  const todayRecord = getRecentDays(1)[0];
  const todayCompleted =
    todayRecord.activations + todayRecord.reviews + todayRecord.masteries;

  const appTasks = useMemo(() => {
    return APPS.map((app) => {
      const cache = caches[app.id];
      return {
        app,
        tasks: cache?.tasks ?? [],
        cachedAt: cache?.cachedAt ?? null,
      };
    }).filter((entry) => entry.tasks.length > 0 || entry.cachedAt);
  }, [caches]);

  const totalTasks = appTasks.reduce((s, e) => s + e.tasks.length, 0);
  const newCount = appTasks.reduce(
    (s, e) => s + e.tasks.filter((t) => t.taskType === "activation").length,
    0,
  );
  const reviewCount = appTasks.reduce(
    (s, e) => s + e.tasks.filter((t) => t.taskType === "review").length,
    0,
  );

  const now = new Date();

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Date header */}
      <h2 className="text-xl font-bold text-gray-900">{formatDate(now)}</h2>

      {/* Summary ring */}
      <TodaySummary
        total={totalTasks + todayCompleted}
        completed={todayCompleted}
        newCount={newCount}
        reviewCount={reviewCount}
      />

      {/* App-grouped task lists */}
      {appTasks.map(({ app, tasks, cachedAt }) => (
        <section key={app.id}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📚</span>
            <h3 className="text-base font-semibold text-gray-900">
              {app.name}
            </h3>
            {cachedAt && (
              <span className="text-[10px] text-gray-400 ml-auto">
                {new Date(cachedAt).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                に同期
              </span>
            )}
          </div>

          {tasks.length > 0 ? (
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} appId={app.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
              タスクなし
            </div>
          )}
        </section>
      ))}

      {/* Empty state / sync prompt */}
      {appTasks.length === 0 && (
        <div className="text-center py-12 space-y-3">
          {totalTasks === 0 && todayCompleted > 0 ? (
            <>
              <div className="text-4xl">🎉</div>
              <div className="text-lg font-bold text-gray-900">All done!</div>
              <div className="text-sm text-gray-500">
                今日のタスクをすべて完了しました
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl">📋</div>
              <div className="text-sm text-gray-500">
                アプリを開いてタスクを同期してください
              </div>
              <Link
                to="/apps"
                className="inline-block mt-2 text-sm text-blue-600 font-medium hover:underline"
              >
                アプリ一覧へ →
              </Link>
            </>
          )}
        </div>
      )}
    </main>
  );
}
