import { useState, useEffect } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(hour) {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function getHeatColor(count, maxCount) {
  if (count === 0) return "bg-gray-100";
  const fraction = count / maxCount;
  if (fraction <= 0.2) return "bg-blue-200";
  if (fraction <= 0.4) return "bg-blue-400";
  if (fraction <= 0.7) return "bg-blue-600";
  return "bg-blue-800";
}

export default function Heatmap({ cells , days}) {
  const maxCount = Math.max(...cells.map((c) => c.count));
  const [hovered, setHovered] = useState(null);

  // chunk the flat 168-item array into 7 rows of 24 —
  // safe because the backend guarantees day 0-6, hour 0-23 order
  const rows = DAY_LABELS.map((_, day) => cells.slice(day * 24, day * 24 + 24));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">When emails arrive</h3>
        <span className="text-sm text-gray-500">by day &amp; hour, last {days} days</span>
      </div>

      {/* hour header — only label every 3rd hour, 24 columns is too tight for all 24 */}
      <div className="flex mb-1 pl-10">
        {Array.from({ length: 24 }).map((_, hour) => (
          <div key={hour} className="flex-1 text-center text-[10px] text-gray-400 font-medium">
            {hour % 3 === 0 ? formatHour(hour) : ""}
          </div>
        ))}
      </div>

      {/* grid rows */}
            {rows.map((row, day) => (
        <div key={day} className="flex items-center gap-[3px] mb-[3px]">
          <div className="w-10 text-xs font-semibold text-gray-500 flex-shrink-0">
            {DAY_LABELS[day]}
          </div>
          {row.map((cell) => (
            <div
              key={cell.hour}
              className={`flex-1 aspect-square rounded ${getHeatColor(cell.count, maxCount)}`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHovered({ day, hour: cell.hour, count: cell.count, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </div>
      ))}

      {hovered && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-gray-900 text-white text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: hovered.x, top: hovered.y - 6 }}
        >
         {hovered.count === 1 ? (
          <>{DAY_LABELS[hovered.day]} {formatHour(hovered.hour)} — {hovered.count} email</>
        ) : (
          <>{DAY_LABELS[hovered.day]} {formatHour(hovered.hour)} — {hovered.count} emails</>
        )}
        </div>
      )}

      {/* legend */}
      <div className="flex items-center justify-end gap-1.5 mt-4">
        <span className="text-xs text-gray-400">less</span>
        <div className="w-3 h-3 rounded bg-gray-100" />
        <div className="w-3 h-3 rounded bg-blue-200" />
        <div className="w-3 h-3 rounded bg-blue-400" />
        <div className="w-3 h-3 rounded bg-blue-600" />
        <div className="w-3 h-3 rounded bg-blue-800" />
        <span className="text-xs text-gray-400">more</span>
      </div>
    </div>
  );
}