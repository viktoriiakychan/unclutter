import { useState, useEffect } from "react";
import { API } from "../utils/constants";

const RANGE_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "3 months", days: 90, badge: "Recommended" },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "2 years", days: 730 },
  { label: "Everything", days: null },
];

// estimates are rough, so round them: 137 -> ~140
function formatEstimate(n, exact) {
  if (exact) return `${n.toLocaleString()} emails`;
  const rounded = n < 100 ? n : Math.round(n / 10) * 10;
  return `~${rounded.toLocaleString()} emails`;
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.01" strokeLinecap="round" />
    </svg>
  );
}

export default function SyncRangePicker({ onSelect }) {
  const [estimates, setEstimates] = useState(null); // { "30": 140, ..., "all": 823 }
  const [selected, setSelected] = useState(90);     // default: 3 months

  useEffect(() => {
    fetch(`${API}/range-estimates`)
      .then((r) => r.json())
      .then(setEstimates)
      .catch((err) => console.error("Failed to load estimates:", err));
  }, []);

  const total = estimates?.all;
  const isEverything = selected === null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
      `}</style>

      <header className="px-8 py-6">
        <span className="font-bold text-2xl tracking-tight text-gray-950">
          unclutter<span className="text-blue-600">.</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="fade-up w-full max-w-2xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-600">Almost there</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-950 mt-3">
            How far back should we look?
          </h1>
          <p className="text-gray-500 mt-3 leading-relaxed">
            {total !== undefined ? (
              <>
                You have about <span className="font-semibold text-gray-900">{total.toLocaleString()} emails</span> in
                your inbox. Nothing gets touched without your say-so.
              </>
            ) : (
              "Checking your inbox size..."
            )}
          </p>

          {/* range options */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
            {RANGE_OPTIONS.map((opt) => {
              const isSelected = selected === opt.days;
              const key = opt.days === null ? "all" : String(opt.days);
              const count = estimates?.[key];

              return (
                <button
                  key={opt.label}
                  onClick={() => setSelected(opt.days)}
                  className={`relative text-left rounded-xl px-4 py-3.5 border transition-all ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 ring-4 ring-blue-500/10"
                      : "bg-gray-50 border-transparent hover:bg-gray-100"
                  }`}
                >
                  {opt.badge && (
                    <span className="absolute -top-2.5 right-3 text-[10px] font-semibold uppercase tracking-wide bg-blue-600 text-white rounded-full px-2 py-0.5">
                      {opt.badge}
                    </span>
                  )}

                  <span className={`block font-semibold ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                    {opt.label}
                  </span>

                  {count !== undefined ? (
                    <span className={`block text-sm mt-0.5 tabular-nums ${isSelected ? "text-blue-500" : "text-gray-400"}`}>
                      {formatEstimate(count, opt.days === null)}
                    </span>
                  ) : (
                    <span className="block h-3.5 w-20 mt-1.5 rounded bg-gray-200 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* hint, changes for "Everything" */}
          <div
            className={`flex gap-2.5 rounded-xl px-4 py-3 mt-4 text-sm transition-colors ${
              isEverything ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"
            }`}
          >
            <InfoIcon />
            <p>
              {isEverything
                ? "Syncing everything can take a while for big inboxes. You can keep using the app while it runs."
                : "Longer ranges take a bit more time to sync, but give you a fuller picture of your inbox."}
            </p>
          </div>

          <button
            onClick={() => onSelect(selected)}
            className="group mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl shadow-sm transition"
          >
            Start syncing
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}