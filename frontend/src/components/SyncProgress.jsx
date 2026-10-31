// roughly how fast a full sync goes (Gmail's quota: ~20 units per email, ~90 units a second)
const EMAILS_PER_MINUTE = 225;

export default function SyncProgress({ progress }) {

  if (!progress.running || progress.type !== "full") return null;

  const pct = progress.total ? Math.round((progress.synced / progress.total) * 100) : 0;
  const minutesLeft = Math.ceil((progress.total - progress.synced) / EMAILS_PER_MINUTE);

  return (
    <div className="fixed bottom-5 right-5 z-40 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-md w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Loading your inbox</span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progress.total === 0 ? (
        // the backend is still getting the list of email ids, so we don't know the total yet
        <div className="text-[11px] text-gray-400">Finding your emails...</div>
      ) : (
        <>
          <div className="text-[11px] text-gray-400">
            {progress.synced.toLocaleString()} / {progress.total.toLocaleString()} emails
            {minutesLeft > 0 && ` · about ${minutesLeft} min left`}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">You can start cleaning, stats update as emails load</div>
        </>
      )}
    </div>
  );
}