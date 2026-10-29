import { useState } from "react";
import { CATEGORY_STYLES } from "../utils/categories";

const PREVIEW_COUNT = 3;

export default function UnsubscribeCard({ list, emails, onUnsubscribe }) {
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState(null); // sender currently being unsubscribed

  const visible = showAll ? list : list.slice(0, PREVIEW_COUNT);

  // unread count per sender, from the emails we already have
  function unreadFrom(senderEmail) {
    return emails.filter((e) => e.sender_email === senderEmail && e.unread).length;
  }

  async function handleClick(senderEmail) {
    setPending(senderEmail);
    try {
      await onUnsubscribe(senderEmail);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="h-full bg-white rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Unsubscribe</p>
        {list.length > 0 && (
          <span className="text-xs text-gray-400">
            {list.length} {list.length === 1 ? "newsletter" : "newsletters"}
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-sm font-medium text-gray-700">No newsletters to unsubscribe from</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up here.</p>
        </div>
      ) : (
        <>
          <div className={`mt-3 -mx-2 flex-1 ${showAll ? "max-h-56 overflow-y-auto" : ""}`}>
            {visible.map((item) => {
              const unread = unreadFrom(item.sender_email);
              const name = item.sender_name || item.sender_email;
              return (
                <div key={item.sender_email} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${CATEGORY_STYLES.newsletter.avatar}`}>
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400">
                      {item.count} {item.count === 1 ? "email" : "emails"}
                      {unread > 0 && ` · ${unread} unread`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClick(item.sender_email)}
                    disabled={pending === item.sender_email}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {pending === item.sender_email ? "..." : "Unsubscribe"}
                  </button>
                </div>
              );
            })}
          </div>

          {list.length > PREVIEW_COUNT && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="mt-3 w-full text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg py-2 transition"
            >
              {showAll ? "Show less" : `See all ${list.length} →`}
            </button>
          )}
        </>
      )}
    </div>
  );
}