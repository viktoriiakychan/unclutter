function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

// floating blue bar shown while emails are selected.
// The outer div is a zero-height "anchor" that sticks to the bottom of the screen while you scroll.
// The bar hangs 16px above the anchor. The parent <section> clips anything outside the emails area,
// so the bar can never show up over the rest of the dashboard.
export default function SelectionBar({ count, onArchive, onDelete, onClear, disabled }) {
  return (
    <div className="sticky bottom-0 h-0 z-30">
      <style>{`
        @keyframes barIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .bar-in { animation: barIn 0.2s ease-out both; }
      `}</style>

      <div className="bar-in absolute bottom-4 inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-3xl flex items-center gap-3 bg-blue-600 text-white rounded-xl pl-3 pr-2 py-2 shadow-[0_12px_32px_-8px_rgba(37,99,235,0.55)]">
        <span className="min-w-7 h-7 px-2 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold tabular-nums">
          {count}
        </span>
        <span className="text-sm font-semibold flex-1">{count === 1 ? "email" : "emails"} selected</span>

        <button
          onClick={onArchive}
          disabled={disabled}
          className="text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
        >
          Archive
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white text-red-600 hover:bg-red-50 transition disabled:opacity-50"
        >
          Delete
        </button>
        <button onClick={onClear} aria-label="Clear selection" className="p-1.5 rounded-lg hover:bg-white/15 transition">
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}