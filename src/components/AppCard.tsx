import { Link } from "react-router-dom";
import type { AppDefinition } from "../types/app";

interface AppCardProps {
  app: AppDefinition;
}

export default function AppCard({ app }: AppCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* サムネイル（プレースホルダー） */}
      <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
        <span className="text-4xl">📚</span>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{app.name}</h3>
        <p className="text-sm text-gray-500 mb-3">{app.description}</p>

        {/* タグ */}
        <div className="flex gap-2 mb-4">
          {app.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={`/app/${app.id}`}
          className="block w-full text-center bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl no-underline hover:bg-blue-700 transition-colors"
        >
          プレイ
        </Link>
      </div>
    </div>
  );
}
