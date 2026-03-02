import type { AppSnapshot } from "../../types/app";

interface SummaryCardsProps {
  snapshot: AppSnapshot | null;
}

const cards = [
  { key: "total" as const, label: "Total", color: "text-gray-900", bg: "bg-gray-50" },
  { key: "active" as const, label: "Active", color: "text-blue-600", bg: "bg-blue-50" },
  { key: "due" as const, label: "Due Today", color: "text-orange-600", bg: "bg-orange-50" },
  { key: "mastered" as const, label: "Mastered", color: "text-emerald-600", bg: "bg-emerald-50" },
];

export default function SummaryCards({ snapshot }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`${c.bg} rounded-2xl p-5 border border-gray-100`}
        >
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {c.label}
          </div>
          <div className={`text-3xl font-extrabold ${c.color} font-mono`}>
            {snapshot ? snapshot[c.key] : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
