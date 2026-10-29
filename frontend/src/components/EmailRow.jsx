import { getCategory, getCategoryStyle } from "../utils/Categories";
import { timeAgo } from "../utils/helpers";

// one email in a list. Shared by the Dashboard and Clean up, so they always look the same
export default function EmailRow({ email, isSelected, onToggle }) {
  const style = getCategoryStyle(email);

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50/70" : "hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0 cursor-pointer"
      />

      {/* unread dot, keeps its space when read so rows stay aligned */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${email.unread ? "bg-blue-600" : "bg-transparent"}`} />

      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${style.avatar}`}>
        {(email.sender_name || email.sender_email || "?")[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{email.sender_name || email.sender_email}</p>
        <p className={`text-sm truncate ${email.unread ? "font-semibold text-gray-950" : "text-gray-600"}`}>
          {email.subject || "(no subject)"}
        </p>
      </div>

      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${style.pill}`}>
        {getCategory(email)}
      </span>

      <span className="w-14 text-right text-xs text-gray-400 tabular-nums flex-shrink-0">
        {timeAgo(email.internal_date)}
      </span>
    </div>
  );
}