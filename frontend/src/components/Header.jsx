import { useState, useEffect, useRef } from "react";
import { Check, RefreshCw, LogOut, ChevronDown, Clock } from "lucide-react";

const FRESH_FOR_MS = 2 * 60 * 1000;

function formatToday(date) {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const dayMonth = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${weekday} · ${dayMonth}`;
}

function timeAgo(timestamp, now) {
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function SyncStatus({ lastSynced, syncing, now }) {
  if (syncing) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
        Syncing...
      </span>
    );
  }
  if (!lastSynced) return null;

  const isFresh = now - lastSynced < FRESH_FOR_MS;
  const exactTime = new Date(lastSynced).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <span
      title={`Last synced at ${exactTime}`}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1"
    >
      {isFresh ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
          Up to date
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.5} />
          Last synced {timeAgo(lastSynced, now)}
        </>
      )}
    </span>
  );
}

export default function Header({ userEmail, userName, lastSynced, syncing, onSyncNow, title, subtitle }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date(now);
  const firstName = userName ? userName.split(" ")[0] : null;

  return (
    <header className="shrink-0 px-8 pt-7 pb-3 bg-canvas">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
        {formatToday(today)}
      </p>

      <div className="flex items-center justify-between gap-4 mt-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 truncate">
          {title ?? (firstName ? `Hey ${firstName}!` : "Hey there!")}
        </h1>

        {userEmail && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <SyncStatus lastSynced={lastSynced} syncing={syncing} now={now} />

            <button
              onClick={onSyncNow}
              disabled={syncing}
              title="Sync now"
              aria-label="Sync now"
              className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            </button>
          </div>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </header>
  );
}