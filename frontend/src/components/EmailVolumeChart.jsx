import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// expects data = [{ date: "2026-06-28", count: 12 }, { date: "2026-06-29", count: 4 }, ...]
export default function EmailVolumeChart({ data, days }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Emails over time</h3>
        <span className="text-sm text-gray-500">last {days} days</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
          <Tooltip
            labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            formatter={(value) => [`${value} emails`, ""]}
          />
          <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}