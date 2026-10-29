import { useEffect } from "react";

function AlertIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5v4.5M10 13.5v.01" strokeLinecap="round" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="14" height="4" rx="1" />
      <path d="M4.5 8v7.5h11V8M8.5 11h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const plural = (n) => (n === 1 ? "email" : "emails");

// everything that differs between delete and archive lives here
const VARIANTS = {
  delete: {
    icon: <AlertIcon />,
    iconClass: "bg-red-50 text-red-600",
    title: (n) => `Delete ${n} ${plural(n)}?`,
    body: "They'll be moved to Gmail Trash. You can restore them within 30 days.",
    confirmLabel: (n) => `Delete ${n}`,
    confirmClass: "bg-red-500 hover:bg-red-600",
  },
  archive: {
    icon: <ArchiveIcon />,
    iconClass: "bg-blue-50 text-blue-600",
    title: (n) => `Archive ${n} ${plural(n)}?`,
    body: "They'll leave your inbox but stay in Gmail under All Mail. You can undo this from Activity.",
    confirmLabel: (n) => `Archive ${n}`,
    confirmClass: "bg-blue-600 hover:bg-blue-700",
  },
};

export default function ConfirmDialog({ open, action, count, unreadCount = 0, onCancel, onConfirm }) {
  // Escape closes it, like most dialogs
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const v = VARIANTS[action] || VARIANTS.delete;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-[2px] p-4 dialog-fade"
      onClick={onCancel} // clicking the dark background cancels
    >
      <style>{`
        @keyframes dialogFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogPop { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .dialog-fade { animation: dialogFade 0.15s ease-out both; }
        .dialog-pop { animation: dialogPop 0.18s ease-out both; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()} // clicks inside the box don't cancel
        className="dialog-pop w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.iconClass}`}>{v.icon}</div>

        <h3 id="confirm-title" className="text-lg font-bold tracking-tight text-gray-950 mt-4">
          {v.title(count)}
        </h3>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {v.body}
          {unreadCount > 0 && (
            <>
              {" "}
              <span className="font-semibold text-gray-900">{unreadCount} still unread.</span>
            </>
          )}
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            autoFocus // Enter on a dialog that just opened = Cancel, the safe choice
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${v.confirmClass}`}
          >
            {v.confirmLabel(count)}
          </button>
        </div>
      </div>
    </div>
  );
}