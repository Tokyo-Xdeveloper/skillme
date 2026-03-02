import { Link } from "react-router-dom";
import type { TaskItem } from "../../types/app";

interface TaskCardProps {
  task: TaskItem;
  appId: string;
}

export default function TaskCard({ task, appId }: TaskCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {task.title}
        </div>
        <div className="text-xs text-gray-500 truncate">{task.subtitle}</div>
      </div>

      {/* Badge */}
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          task.taskType === "activation"
            ? "bg-blue-50 text-blue-600"
            : task.isOverdue
              ? "bg-orange-50 text-orange-600"
              : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {task.taskType === "activation"
          ? "New"
          : `Review R${task.reviewStage}`}
      </span>

      {/* Play button */}
      <Link
        to={`/app/${appId}`}
        className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 no-underline hover:bg-blue-700 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </Link>
    </div>
  );
}
