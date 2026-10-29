import { useState, useEffect } from "react";
import { timeAgo } from "../utils/helpers";

const ACTIONS = {
  delete: {
    verb: "moved to Trash",
    button: "Delete",
    buttonClass: "bg-red-500 hover:bg-red-600",
    iconClass: "bg-red-50 text-red-600",
  },
  archive: {
    verb: "archived",
    button: "Archive",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
    iconClass: "bg-blue-50 text-blue-600",
  },
};

function AlertIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5v4.5M10 13.5v.01" strokeLinecap="round" />
    </svg>
  );
}

const plural = (n) => (n === 1 ? "email" : "emails");

// "here's exactly what a suggestion will delete, untick anything you want to keep"
export default function BulkActionsPreview({ title, emails, action = "delete", onCancel, onConfirm }) {
  const [keepIds, setKeepIds] = useState([]); // ids the user unticked (everything starts ticked)
  const a = ACTIONS[action] || ACTIONS.delete;

  const toRemove = emails.filter((e) => !keepIds.includes(e.id));
  const allChecked = keepIds.length === 0;

  function toggle(id) {
    setKeepIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setKeepIds(allChecked ? emails.map((e) => e.id) : []);
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-[2px] p-4 preview-fade"
      onClick={onCancel}
    >
      <style>{`
        @keyframes previewFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes previewPop { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .preview-fade { animation: previewFade 0.15s ease-out both; }
        .preview-pop { animation: previewPop 0.18s ease-out both; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="preview-pop w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        <div className="p-6 pb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.iconClass}`}>
            <AlertIcon />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-gray-950 mt-4">{title}</h3>
          <p className="text-sm text-gray-500 mt-1.5">
            <span className="font-semibold text-gray-900 tabular-nums">{toRemove.length}</span> of {emails.length}{" "}
            {plural(emails.length)} will be {a.verb}. Untick any you want to keep.
          </p>
        </div>

        <label className="flex items-center gap-3 px-6 py-2.5 border-y border-gray-100 bg-gray-50/60 cursor-pointer text-xs font-medium text-gray-500">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
          />
          {allChecked ? "Deselect all" : "Select all"}
        </label>

        <ul className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {emails.map((email) => {
            const checked = !keepIds.includes(email.id);
            return (
              <li key={email.id}>
                <label className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${checked ? "hover:bg-gray-50" : "bg-gray-50/80"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(email.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0"
                  />
                  <div className={`min-w-0 flex-1 ${checked ? "" : "opacity-50"}`}>
                    <p className={`text-sm truncate ${email.unread ? "font-semibold text-gray-950" : "text-gray-600"}`}>
                      {email.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{email.sender_name || email.sender_email}</p>
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">{timeAgo(email.internal_date)}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            autoFocus
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            Cancel
          </button>
          <button
            disabled={toRemove.length === 0}
            onClick={() => onConfirm(toRemove.map((e) => e.id))}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-40 ${a.buttonClass}`}
          >
            {a.button} {toRemove.length}
          </button>
        </div>
      </div>
    </div>
  );
}