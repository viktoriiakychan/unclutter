import { useState, useEffect, useRef } from "react";
import { Check, RefreshCw, LogOut, ChevronDown, Clock } from "lucide-react";

const FRESH_FOR_MS = 2 * 60 * 1000;

function formatToday(date) {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const dayMonth = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${weekday} · ${dayMonth}`;
}

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

// 1714400000000 -> "just now" / "2m ago" / "3h ago" / "29 Oct"
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

function AccountMenu({ userEmail, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // close when clicking anywhere outside, or pressing Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative " ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-1 p-1 pr-1.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
          {userEmail[0].toUpperCase()}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg p-1.5 z-50">
          <div className="px-3 py-2">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{userEmail}</p>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({ userEmail, onSignOut, lastSynced, syncing, onSyncNow }) {
  // re-render every 30s so "2m ago" keeps counting up on its own
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date(now);

  return (
    <header className="px-8 pt-8 pb-1 min-w-0 bg-slate-50">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
        {formatToday(today)}
      </p>

      {/* greeting and controls share one row, centred on each other */}
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 truncate">
          {greeting(today)}
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

            <AccountMenu userEmail={userEmail} onSignOut={onSignOut} />
          </div>
        )}
      </div>
    </header>
  );
}