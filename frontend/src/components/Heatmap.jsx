import { useState } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(hour) {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

// 5 steps, light to dark blue. Same order is used in the legend
const SCALE = ["bg-gray-100", "bg-blue-100", "bg-blue-300", "bg-blue-500", "bg-blue-700"];

function getHeatColor(count, maxCount) {
  if (count === 0) return SCALE[0];
  const fraction = count / maxCount;
  if (fraction <= 0.25) return SCALE[1];
  if (fraction <= 0.5) return SCALE[2];
  if (fraction <= 0.75) return SCALE[3];
  return SCALE[4];
}

// expects 168 cells: [{ day: 0-6, hour: 0-23, count }], ordered by day then hour
export default function Heatmap({ cells }) {
  const [hovered, setHovered] = useState(null);
  const maxCount = Math.max(1, ...cells.map((c) => c.count));
  const rows = DAY_LABELS.map((_, day) => cells.slice(day * 24, day * 24 + 24));

  // the single busiest slot, shown as a one-line insight
  const busiest = cells.reduce((best, c) => (c.count > (best?.count ?? 0) ? c : best), null);

  return (
    <div className="bg-white rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-gray-950">When emails arrive</h3>
        <span className="text-xs text-gray-400">
          {busiest ? `Busiest: ${DAY_LABELS[busiest.day]} around ${formatHour(busiest.hour)}` : "by day & hour"}
        </span>
      </div>

      <div className="mt-5 flex-1">
        {/* hour labels every 6 hours, a half-width card is too narrow for more */}
        <div className="flex gap-[3px] pl-10 mb-1.5">
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="flex-1 text-[10px] text-gray-400 font-medium">
              {hour % 6 === 0 ? formatHour(hour) : ""}
            </div>
          ))}
        </div>

        {rows.map((row, day) => (
          <div key={day} className="flex items-center gap-[3px] mb-[3px]">
            <div className="w-10 text-[11px] font-medium text-gray-400 flex-shrink-0">{DAY_LABELS[day]}</div>
            {row.map((cell) => (
              <div
                key={cell.hour}
                className={`flex-1 aspect-square rounded-[3px] transition-transform hover:scale-125 ${getHeatColor(cell.count, maxCount)}`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHovered({ day, hour: cell.hour, count: cell.count, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {hovered && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium pointer-events-none -translate-x-1/2 -translate-y-full shadow-lg"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          {DAY_LABELS[hovered.day]} {formatHour(hovered.hour)} · {hovered.count} {hovered.count === 1 ? "email" : "emails"}
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 mt-4">
        <span className="text-[11px] text-gray-400 mr-0.5">less</span>
        {SCALE.map((c) => (
          <div key={c} className={`w-3 h-3 rounded-[3px] ${c}`} />
        ))}
        <span className="text-[11px] text-gray-400 ml-0.5">more</span>
      </div>
    </div>
  );
}