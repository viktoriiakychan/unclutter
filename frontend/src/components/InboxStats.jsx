import { useState, useEffect } from "react";

import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import Heatmap from "./Heatmap";
import Header from "./Header";
import CenterMessage from "./CenterMessage";

import { API } from "../utils/constants";
import EmailVolumeChart from "./EmailVolumeChart";

const CATEGORY_STYLES = {
  promotions: { dot: "bg-yellow-500", stroke: "text-yellow-500" },
  updates: { dot: "bg-green-400", stroke: "text-green-400" },
  social: { dot: "bg-purple-500", stroke: "text-purple-500" },
  newsletter: { dot: "bg-orange-400", stroke: "text-orange-400" }, // matches your orange newsletter badge
  other: { dot: "bg-gray-400", stroke: "text-gray-400" },
};
const FALLBACK_STYLE = { dot: "bg-gray-300", stroke: "text-gray-300" };

const READ_UNREAD_STYLES = {
  unread: { dot: "bg-blue-500", stroke: "text-blue-500" },
  read: { dot: "bg-green-300", stroke: "text-green-300" },
};

function toDisplayName(category) {
  const safe = category ?? "other"; // guards the NULL-category row in your DB
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

function buildDonutSegments(data, radius) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return [];

  const circumference = 2 * Math.PI * radius;
  let cursor = 0;

  return data.map((item) => {
    const fraction = item.count / total;
    const length = fraction * circumference;
    const segment = {
      ...item,
      pct: Math.round(fraction * 100),
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -cursor,
    };
    cursor += length;
    return segment;
  });
}

const CATEGORY_RADIUS = 70;
const READ_UNREAD_RADIUS = 55;

const STRIP_COLORS = {
  totalEmails: "text-red-500",
  percentageUnread: "text-green-500",
  cleanedUp: "text-blue-500",
  averageEmailsPerDay: "text-gray-700",
  oldestUnreadDays: "text-red-500",
};

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
];

function formatHour(hour){
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

const TYPE_STYLES = {
  PDF: { dot: "bg-red-500", stroke: "text-red-500" },
  Image: { dot: "bg-blue-500", stroke: "text-blue-500" },
  Doc: { dot: "bg-green-500", stroke: "text-green-500" },
  Spreadsheet: { dot: "bg-amber-500", stroke: "text-amber-500" },
  Archive: { dot: "bg-purple-500", stroke: "text-purple-500" },
  Other: { dot: "bg-gray-400", stroke: "text-gray-400" },
};

function InboxStats() {
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState(null);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    fetch(`${API}/auth/me`)
      .then((r) => r.json())
      .then((data) => setUserEmail(data.email));
  }, []);

  useEffect(() => {
    fetch(`${API}/stats?days=${rangeDays}`)
      .then((r) => r.json())
      .then((data) => setStats(data));
  }, [rangeDays]);

  if (!userEmail || !stats) {
    return <CenterMessage text="Loading your stats..." />;
  }

  const categoryData = stats.categoriesStats.map((c) => {
    const key = c.name ?? "other";
    const style = CATEGORY_STYLES[key] ?? FALLBACK_STYLE;
    return {
      key,
      name: toDisplayName(c.name),
      count: c.count,
      dot: style.dot,
      stroke: style.stroke,
    };
  });

  const readUnreadData = [
    { key: "unread", name: "Unread", count: stats.unread, ...READ_UNREAD_STYLES.unread },
    { key: "read", name: "Read", count: stats.read, ...READ_UNREAD_STYLES.read },
  ];

  const categorySegments = buildDonutSegments(categoryData, CATEGORY_RADIUS);
  const readUnreadSegments = buildDonutSegments(readUnreadData, READ_UNREAD_RADIUS);

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  const attachmentTypeData = Object.entries(stats.attachmentBreakdown).map(([type, count]) => {
  const style = TYPE_STYLES[type] ?? FALLBACK_STYLE;
  return { key: type, name: type, count, dot: style.dot, stroke: style.stroke };
});

const attachmentTypeSegments = buildDonutSegments(attachmentTypeData, 70);

  return (
    <div className="h-screen flex bg-gray-50 text-gray-800 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={userEmail} />

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">

          {/* PAGE HEAD */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-l font-bold text-gray-900">Inbox Stats</h2>
              <p className="text-sm text-gray-500 mt-1">
                How your inbox is trending, and where the clutter is coming from.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                    key={opt.days}
                    onClick={() => setRangeDays(opt.days)}
                    className={`text-[10px] px-3 py-1 rounded-full font-medium border ${
                    rangeDays === opt.days
                        ? "bg-green-100 text-green-700 border-green-500"
                        : "text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                >
                    {opt.label}
                </button>
                ))}
            </div>
          </div>

          {/* STAT STRIP */}
          <div className="flex bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
            <StripItem
              value={stats.totalEmails.toLocaleString()}
              label="total emails"
              color={STRIP_COLORS.totalEmails}
            />
            <StripItem
              value={`${stats.percentageUnread}%`}
              label="unread"
              color={STRIP_COLORS.percentageUnread}
            />
            <StripItem
              value={stats.cleanedUp}
              label="cleaned up"
              color={STRIP_COLORS.cleanedUp}
            />
            <StripItem
              value={stats.averageEmailsPerDay}
              label="average emails per day "
              color={STRIP_COLORS.averageEmailsPerDay}
            />
            <StripItem
              value={`${stats.oldestUnreadDays}d`}
              label="oldest unread"
              color={STRIP_COLORS.oldestUnreadDays}
              last
            />
          </div>

          {/* DONUT ROW */}
          <div className="grid grid-cols-3 gap-6 items-start">

            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Email categories</h3>
                <span className="text-sm text-gray-500">
                  {stats.totalEmails.toLocaleString()} total
                </span>
              </div>
              <div className="flex items-center gap-7">
                <Donut segments={categorySegments} radius={CATEGORY_RADIUS} size={180} />
                <div className="flex-1 flex flex-col gap-3">
                  {categorySegments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2.5 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${s.dot}`} />
                      <span className="flex-1 font-medium text-gray-700">{s.name}</span>
                      <span className="text-xs text-gray-400 w-9 text-right">{s.count}</span>
                      <span className="font-semibold text-gray-900">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Read vs unread</h3>
                <span className="text-sm text-gray-500">this month</span>
              </div>
              <div className="flex items-center gap-7">
                <div className="relative">
                  <Donut segments={readUnreadSegments} radius={READ_UNREAD_RADIUS} size={140} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">
                      {stats.percentageUnread}%
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">UNREAD</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  {readUnreadSegments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2.5 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${s.dot}`} />
                      <span className="flex-1 font-medium text-gray-700">{s.name}</span>
                      <span className="font-semibold text-gray-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>


          </div>
            <div className="mt-6">
                <Heatmap cells={stats.heatmap} days={rangeDays}/>
            </div>

            <div className="mt-6">
                  <EmailVolumeChart data={stats.emailVolume} days = {rangeDays} />
            </div>

          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Attachments</h3>
              </div>

              <div className="flex items-start gap-6 mb-6">
                  <div className="flex-1 flex gap-4">
                      <div className="flex-1">
                          <StatCard value={stats.emailsWithAttachment} label="emails with attachments" color="text-blue-500" />
                      </div>
                      <div className="flex-1">
                          <StatCard value={formatBytes(stats.totalAttachmentSize)} label="attachment space" color="text-blue-500" />
                      </div>
                      <div className="flex-1">
                          <StatCard 
                              value={formatBytes(stats.totalAttachmentSize / stats.emailsWithAttachment)} 
                              label="average attachment size" 
                              color="text-blue-500" 
                          />
                      </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                      <Donut segments={attachmentTypeSegments} radius={50} size={130} />
                      <div className="flex flex-col gap-2">
                          {attachmentTypeSegments.map((s) => (
                              <div key={s.key} className="flex items-center gap-2 text-sm">
                                  <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${s.dot}`} />
                                  <span className="font-medium text-gray-700">{s.name}</span>
                                  <span className="text-xs text-gray-400">{s.count}</span>
                                  <span className="font-semibold text-gray-900">{s.pct}%</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-700 mb-2">Largest Attachments</h4>
              <div className="divide-y divide-gray-100">
                  {stats.largestAttachments.map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-3">
                          <div>
                              <div className="text-sm font-medium text-gray-900">{a.filename}</div>
                              <div className="text-xs text-gray-500">{a.sender_name} · {a.subject}</div>
                          </div>
                          <div className="text-sm font-semibold text-purple-600">{formatBytes(a.size_bytes)}</div>
                      </div>
                  ))}
              </div>  
          </div>

        </main>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */

function StripItem({ value, label, last, color }) {
  return (
    <div className={`flex-1 px-5 py-4 ${last ? "" : "border-r border-gray-200"}`}>
      <div className={`text-xl font-bold ${color || "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Donut({ segments, radius, size }) {
  const center = size / 2;
  const strokeWidth = radius > 60 ? 22 : 20;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${center} ${center})`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F0F1F4"
          strokeWidth={strokeWidth}
        />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className={s.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
          />
        ))}
      </g>
    </svg>
  );
}

export default InboxStats;