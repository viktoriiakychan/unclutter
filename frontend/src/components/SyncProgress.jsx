import { useState, useEffect } from "react";

export default function SyncProgress({ API }) {
  const [progress, setProgress] = useState({ synced: 0, total: 0, running: false });

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API}/sync/progress`)
        .then((r) => r.json())
        .then(setProgress);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!progress.running) return null;

  const pct = progress.total ? Math.round((progress.synced / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-5 right-5 z-40 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-md w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Syncing your inbox</span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-gray-400">
        {progress.synced.toLocaleString()} / {progress.total.toLocaleString()} emails
      </div>
    </div>
  );
}