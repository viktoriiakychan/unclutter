import { createContext, useContext, useState, useCallback, useRef } from "react";

// One toast for the whole app.
// Wrap the app in <ToastProvider>, then any page can do:
//   const showToast = useToast();
//   showToast({ message: "Archived 3 emails", onUndo: () => ... });

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 10.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, onUndo, duration }
  const [undoing, setUndoing] = useState(false);
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showToast = useCallback(({ message, onUndo, duration = 6000 }) => {
    clearTimeout(timer.current); // a new toast replaces the old one
    const id = Date.now();
    setUndoing(false);
    setToast({ id, message, onUndo, duration });
    // only hide *this* toast, in case a newer one has replaced it by then
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), duration);
  }, []);

  async function handleUndo() {
    clearTimeout(timer.current);
    setUndoing(true);
    try {
      await toast.onUndo();
    } catch (err) {
      console.error("Undo failed:", err);
    } finally {
      setUndoing(false);
      setToast(null);
    }
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {toast && (
        // full-width strip that ignores clicks, so only the toast itself is clickable
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 pointer-events-none">
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateY(12px) scale(0.98); }
              to { opacity: 1; transform: none; }
            }
            @keyframes toastTimer { from { transform: scaleX(1); } to { transform: scaleX(0); } }
            .toast-in { animation: toastIn 0.2s ease-out both; }
          `}</style>

          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="toast-in pointer-events-auto relative overflow-hidden flex items-center gap-3 bg-white rounded-xl ring-1 ring-gray-100 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)] pl-3 pr-2 py-2"
          >
            <span className="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <CheckIcon />
            </span>
            <span className="text-sm font-semibold text-gray-900">{toast.message}</span>

            {toast.onUndo && (
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="ml-1 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {undoing ? "Undoing..." : "Undo"}
              </button>
            )}
            <button
              onClick={hide}
              aria-label="Dismiss"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <CloseIcon />
            </button>

            {/* thin blue line that shrinks: shows how long Undo is still available */}
            <span
              className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600/70 origin-left"
              style={{ animation: `toastTimer ${toast.duration}ms linear both` }}
            />
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}