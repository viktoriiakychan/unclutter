import { timeAgo } from "../utils/helpers";

export default function EmailList({
    emails,
    title,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onArchiveClick,
    onDeleteClick,
    isArchiving,
    isDeleting,
}) {
    const allSelected = emails.length > 0 && emails.every((e) => selectedIds.includes(e.id));

    return (
        <div className="min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">{title}</h2>
                <span className="text-sm text-gray-500">{emails.length} shown</span>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {emails.map((email) => (
                    <div
                        key={email.id}
                        className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(email.id)}
                            onChange={() => onToggleSelect(email.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0 cursor-pointer"
                        />

                        <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                email.unread ? "bg-blue-500" : "bg-transparent"
                            }`}
                        ></span>

                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                            {email.sender_name ? email.sender_name[0].toUpperCase() : "?"}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-400 truncate">{email.sender_name}</div>
                            <div className={`text-sm truncate ${email.unread ? "font-medium text-gray-900" : "font-normal text-gray-600"}`}>
                                {email.subject}
                            </div>
                        </div>

                        {email.is_newsletter ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex-shrink-0">
                                newsletter
                            </span>
                        ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                email.category === "promotions" ? "bg-yellow-100 text-yellow-700" :
                                email.category === "social"     ? "bg-purple-100 text-purple-700" :
                                email.category === "updates"    ? "bg-green-100 text-green-700" :
                                "bg-gray-100 text-gray-700"
                            }`}>
                                {email.category}
                            </span>
                        )}

                        <span className="text-[10px] py-0.5 text-gray-400 flex-shrink-0">
                            {timeAgo(email.internal_date)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={onToggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                        />
                        <span className="text-sm text-gray-600">Select all</span>
                    </label>
                    {selectedIds.length > 0 && (
                        <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        disabled={selectedIds.length === 0 || isArchiving || isDeleting}
                        onClick={onArchiveClick}
                        className="px-10 py-1 rounded-lg border border-gray-600/40 bg-gray-600/10 text-gray-600 text-sm font-medium hover:bg-gray-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-600/10"
                    >
                        {isArchiving ? "Archiving..." : "Archive"}
                    </button>

                    <button
                        onClick={onDeleteClick}
                        disabled={selectedIds.length === 0 || isArchiving || isDeleting}
                        className="px-10 py-1 rounded-lg border border-red-600/40 bg-red-600/10 text-red-600 text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/10"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}