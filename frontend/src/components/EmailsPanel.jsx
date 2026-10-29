import LoadingOverlay from "./LoadingOverlay";
import { EMAIL_FILTERS, getCategory, getCategoryStyle } from "../utils/categories";
import { timeAgo } from "../utils/helpers";

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5 17 17" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

function EmailRow({ email, isSelected, onToggle }) {
  const style = getCategoryStyle(email);

  return (
    <div
      onClick={onToggle}
      className={`group flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
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

export default function EmailsPanel({
  emails,
  filteredEmails,
  activeFilter,
  onFilterChange,
  search,
  onSearchChange,
  selectedIds,
  onToggle,
  allSelected,
  onToggleAll,
  isArchiving,
  isDeleting,
  listRef,
}) {
  const hasSelection = selectedIds.length > 0;

  return (
    <div ref={listRef} className="relative bg-white rounded-2xl flex flex-col overflow-hidden lg:h-[620px]">

      {/* header */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-950">My emails</h2>
          <p className="text-xs text-gray-400 mt-0.5">{emails.length.toLocaleString()} total</p>
        </div>

        <label className="relative flex items-center w-66">
          <span className="absolute left-3 text-gray-400 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails"
            className="w-full bg-gray-50 rounded-lg pl-9 pr-8 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 p-1 rounded text-gray-400 hover:text-gray-700"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
      </div>

      {/* filter chips with counts */}
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-3 overflow-x-auto">
        {EMAIL_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.name;
          const count = emails.filter(filter.test).length;
          return (
            <button
              key={filter.name}
              onClick={() => onFilterChange(filter.name)}
              className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-full transition ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              {filter.dot && <span className={`w-1.5 h-1.5 rounded-full ${filter.dot}`} />}
              {filter.name}
              <span className={`tabular-nums ${isActive ? "text-blue-500" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* select all */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-y border-gray-100 bg-gray-50/60">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={filteredEmails.length === 0}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
          />
          {hasSelection ? `${selectedIds.length} selected` : "Select all"}
        </label>
      </div>

      {/* the list scrolls inside the card */}
      <div className="relative flex-1 min-h-0">
        {isDeleting && <LoadingOverlay action="delete" />}
        {isArchiving && <LoadingOverlay action="archive" />}

        <div className={`h-full overflow-y-auto divide-y divide-gray-50 ${hasSelection ? "pb-16" : ""}`}>
          {emails.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Waiting for your first emails to sync...</p>
          ) : filteredEmails.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Nothing matches. Try another filter.</p>
          ) : (
            filteredEmails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                isSelected={selectedIds.includes(email.id)}
                onToggle={() => onToggle(email.id)}
              />
            ))
          )}
        </div>
      </div>

    </div>
  );
}