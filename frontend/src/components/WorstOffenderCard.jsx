import { blurWhile } from "../utils/pending";

function Stat({ label, value, valueClass = "text-gray-950" }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-400">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

// who, how bad, and the two things you can do about it
export default function WorstOffenderCard({ offender, inboxTotal, onCleanNow, onUnsubscribe, canUnsubscribe, pending = false }) {
  if (!offender?.sender_email) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 flex flex-col">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Worst offender</p>
        <div className="flex-1 flex flex-col justify-center py-6">
          <p className="text-sm font-medium text-gray-700">Nobody stands out right now</p>
          <p className="text-xs text-gray-400 mt-1">No single sender is cluttering your inbox.</p>
        </div>
      </div>
    );
  }

  const name = offender.sender_name || offender.sender_email;
  const unreadRate = Math.round(offender.unread_rate);
  // total_emails counts archived ones too, so cap it at 100%
  const shareOfInbox = inboxTotal ? Math.min(100, Math.round((offender.total_emails / inboxTotal) * 100)) : null;

  return (
    <div className="h-full bg-white rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Worst offender</p>
        <span className="text-[11px] font-semibold uppercase tracking-wide bg-red-50 text-red-600 rounded-full px-2 py-0.5">
          Noise {Math.round(offender.noise_score)}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-semibold flex-shrink-0">
          {name[0].toUpperCase()}
        </div>
        <div className={`min-w-0 ${blurWhile(pending)}`}>
          <p className="font-semibold text-gray-950 truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{offender.sender_email}</p>
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-4 bg-gray-50 rounded-xl px-4 py-3 mt-4 ${blurWhile(pending, false)}`}>
        <Stat label="Emails" value={offender.total_emails} />
        <Stat label="Unread" value={`${unreadRate}%`} valueClass={unreadRate >= 50 ? "text-red-500" : "text-gray-950"} />
        {shareOfInbox !== null && <Stat label="Of your inbox" value={`${shareOfInbox}%`} />}
      </div>

      {/* mt-auto pins the buttons to the bottom, so they line up with "See all" next door */}
      <div className="flex gap-2 mt-auto pt-5">
        <button
            onClick={onCleanNow}
            disabled={pending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
          Clean now
        </button>
        {canUnsubscribe && (
          <button
            onClick={onUnsubscribe}
            className="px-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-medium py-2.5 rounded-lg transition"
          >
            Unsubscribe
          </button>
        )}
      </div>
    </div>
  );
}