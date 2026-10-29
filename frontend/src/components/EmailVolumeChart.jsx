import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// "2026-10-29" -> local midnight (new Date("2026-10-29") would be UTC midnight)
const toDate = (iso) => new Date(`${iso}T00:00:00`);
const short = (iso) => toDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// past a month, one point per day is too spiky to read, so add them up per week
function groupByWeek(data) {
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7);
    weeks.push({ date: chunk[0].date, count: chunk.reduce((sum, d) => sum + d.count, 0) });
  }
  return weeks;
}

function ChartTooltip({ active, payload, weekly }) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 shadow-lg">
      {weekly ? `Week of ${short(date)}` : toDate(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      <span className="text-gray-400"> · </span>
      {count} {count === 1 ? "email" : "emails"}
    </div>
  );
}

// expects data = [{ date: "2026-06-28", count: 12 }, ...], one entry per day
export default function EmailVolumeChart({ data, days, rangeLabel }) {
  const weekly = days > 30;
  const points = weekly ? groupByWeek(data) : data;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-gray-950">Emails over time</h3>
        <span className="text-xs text-gray-400">
          {total.toLocaleString()} in the {rangeLabel} · {weekly ? "per week" : "per day"}
        </span>
      </div>

      <div className="flex-1 min-h-[220px] mt-4 -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={short}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={36}
            />
            <Tooltip content={<ChartTooltip weekly={weekly} />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#volumeFill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}