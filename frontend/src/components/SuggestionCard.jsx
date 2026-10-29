// colours per suggestion type. Promotions use the same pink as everywhere else in the app
const STYLES = {
  "top offender": { pill: "bg-red-50 text-red-600", icon: "bg-red-100 text-red-600" },
  promotion: { pill: "bg-pink-50 text-pink-700", icon: "bg-pink-100 text-pink-700" },
  unread: { pill: "bg-blue-50 text-blue-700", icon: "bg-blue-100 text-blue-700" },
};
const FALLBACK = { pill: "bg-gray-100 text-gray-600", icon: "bg-gray-100 text-gray-600" };

export default function SuggestionCard({ suggestion, onDeleteClick }) {
  const s = STYLES[suggestion.badge] || FALLBACK;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col min-w-0 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${s.icon}`}>
          {(suggestion.sender || "?")[0].toUpperCase()}
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${s.pill}`}>
          {suggestion.badge}
        </span>
      </div>

      <h3 className="font-semibold text-gray-950 mt-4 truncate">{suggestion.title}</h3>
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{suggestion.subtitle}</p>

      {/* mt-auto keeps the bottom rows lined up even if one subtitle wraps to 2 lines */}
      <div className="flex items-end justify-between gap-3 mt-auto pt-5">
        <p className="text-gray-950">
          <span className="text-3xl font-bold tracking-tight tabular-nums">{suggestion.count}</span>
          <span className="text-sm text-gray-400 ml-1.5">{suggestion.count === 1 ? "email" : "emails"}</span>
        </p>
        <button
          onClick={onDeleteClick}
          className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}