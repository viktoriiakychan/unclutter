import { useState, useEffect } from "react";
import { API } from "../utils/constants";

const BRAND_BLUE = "#2563eb";

const RANGE_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "Last 2 years", days: 730 },
  { label: "Everything", days: null },
];

export default function SyncRangePicker({ onSelect }) {
  const [totalCount, setTotalCount] = useState(null);
  const [selected, setSelected] = useState(90); // default: 3 months

  useEffect(() => {
    fetch(`${API}/message-count`)
      .then((r) => r.json())
      .then((data) => setTotalCount(data.count));
  }, []);

  const selectedOption = RANGE_OPTIONS.find((o) => o.days === selected);
  const isEverything = selectedOption?.days === null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-md text-center">
        <span className="font-bold text-2xl tracking-tight">
          unclutter<span style={{ color: BRAND_BLUE }}>.</span>
        </span>

        <h2 className="text-base font-semibold text-gray-900 mt-5">
          How far back should we look?
        </h2>

        <p className="text-sm text-gray-500 mt-1.5 mb-6">
          {totalCount !== null
            ? `You have about ${totalCount.toLocaleString()} emails in your inbox.`
            : "Checking your inbox size..."}
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setSelected(opt.days)}
              className={`text-sm font-medium px-4 py-3 rounded-lg border transition-colors ${
                selected === opt.days
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isEverything && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
            Syncing your entire inbox can take a while for large accounts — you can keep using the app while it runs in the background.
          </p>
        )}

        <button
          onClick={() => onSelect(selected)}
          className="w-full px-5 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          Start syncing
        </button>
      </div>
    </div>
  );
}