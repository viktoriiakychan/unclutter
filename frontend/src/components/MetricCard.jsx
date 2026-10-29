import { blurWhile } from "../utils/pending";

export default function MetricCard({ label, value, sub, dotClass, valueClass = "text-gray-950", onClick, active = false, pending = false }) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-2xl p-5 transition ${
        onClick ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""
      } ${active ? "ring-2 ring-blue-500/40" : ""}`}
    >
      <p className="flex items-center gap-1.5 text-sm text-gray-500">
        {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
        {label}
      </p>
      <p className={`text-4xl font-bold tracking-tight tabular-nums mt-1.5 ${valueClass} ${blurWhile(pending)}`}>{value}</p>
        {sub && <p className={`text-xs text-gray-400 mt-1 ${blurWhile(pending)}`}>{sub}</p>}
    </Tag>
  );
}