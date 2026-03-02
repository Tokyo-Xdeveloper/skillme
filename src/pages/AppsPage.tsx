import AppCard from "../components/AppCard";
import { APPS } from "../data/apps";

export default function AppsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">アプリ一覧</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {APPS.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </main>
  );
}
