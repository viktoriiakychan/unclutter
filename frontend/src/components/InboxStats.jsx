import { useState, useEffect } from "react";

import Heatmap from "./Heatmap";
import EmailVolumeChart from "./EmailVolumeChart";
import CenterMessage from "./CenterMessage";
import { API } from "../utils/constants";

const RANGE_OPTIONS = [
  { short: "30d", label: "last 30 days", days: 30 },
  { short: "3m", label: "last 3 months", days: 90 },
  { short: "6m", label: "last 6 months", days: 180 },
  { short: "1y", label: "last year", days: 365 },
  { short: "2y", label: "last 2 years", days: 730 },
];

// same colours as the rest of the app. `stroke` is used by the donut (SVG stroke = currentColor)
const CATEGORY_COLORS = {
  newsletter: { dot: "bg-amber-500", stroke: "text-amber-500" },
  promotions: { dot: "bg-pink-500", stroke: "text-pink-500" },
  updates: { dot: "bg-sky-500", stroke: "text-sky-500" },
  social: { dot: "bg-violet-500", stroke: "text-violet-500" },
  forums: { dot: "bg-teal-500", stroke: "text-teal-500" },
  other: { dot: "bg-gray-400", stroke: "text-gray-400" },
};

const TYPE_STYLES = {
  PDF: { bar: "bg-red-500", chip: "bg-red-50 text-red-600", tag: "PDF" },
  Image: { bar: "bg-blue-500", chip: "bg-blue-50 text-blue-600", tag: "IMG" },
  Doc: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", tag: "DOC" },
  Spreadsheet: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600", tag: "XLS" },
  Archive: { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-600", tag: "ZIP" },
  Other: { bar: "bg-gray-400", chip: "bg-gray-100 text-gray-500", tag: "FILE" },
};

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

// largest attachments come back with a mime type, turn it into the same buckets the backend uses
function typeFromMime(mime = "") {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("image")) return "Image";
  if (mime.includes("word") || mime.includes("document")) return "Doc";
  if (mime.includes("sheet") || mime.includes("excel")) return "Spreadsheet";
  if (mime.includes("zip") || mime.includes("compressed")) return "Archive";
  return "Other";
}

// turns [{count}, ...] into donut slices: each one is a dash of the right length, starting where the last ended
function buildDonutSegments(data, radius) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return [];

  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  return data.map((item) => {
    const length = (item.count / total) * circumference;
    const segment = {
      ...item,
      pct: Math.round((item.count / total) * 100),
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -cursor,
    };
    cursor += length;
    return segment;
  });
}

/* ---------- small pieces ---------- */

function Card({ title, right, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-gray-950">{title}</h3>
        {right && <span className="text-xs text-gray-400">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value, valueClass = "text-gray-950" }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-3xl font-bold tracking-tight tabular-nums mt-1.5 ${valueClass}`}>{value}</p>
    </div>
  );
}

function Donut({ segments, size = 150, stroke = 18, children }) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className={`${s.stroke} transition-all duration-700`}
            strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
          />
        ))}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}

function ProgressRow({ dot, label, value, fraction, barClass }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="font-semibold text-gray-950 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
        <div className={`h-full rounded-full ${barClass} transition-all duration-700`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-10 text-center text-sm text-gray-400">{text}</p>;
}

/* ---------- page ---------- */

export default function InboxStats() {
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`)
      .then((r) => r.json())
      .then((data) => setUserEmail(data.email));
  }, []);

  // start on the range you synced, so the numbers cover everything you've got
  useEffect(() => {
    fetch(`${API}/sync-range`)
      .then((r) => r.json())
      .then((data) => {
        if (data.days && RANGE_OPTIONS.some((o) => o.days === data.days)) setRangeDays(data.days);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/stats?days=${rangeDays}`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [rangeDays]);

  if (!userEmail || !stats) {
    return <CenterMessage text="Loading your stats..." />;
  }

  const range = RANGE_OPTIONS.find((o) => o.days === rangeDays) || RANGE_OPTIONS[0];

  // categories donut
  const categoryData = [...stats.categoriesStats]
    .sort((a, b) => b.count - a.count)
    .map((c) => {
      const key = c.name ?? "other"; // guards the NULL-category row
      return { key, name: capitalise(key), count: c.count, ...(CATEGORY_COLORS[key] || CATEGORY_COLORS.other) };
    });
  const categorySegments = buildDonutSegments(categoryData, 66);

  // read vs unread donut: just the unread slice, on a light track
  const readTotal = stats.unread + stats.read;
  const unreadSegments = buildDonutSegments(
    [
      { key: "unread", count: stats.unread, stroke: "text-blue-600" },
      { key: "read", count: stats.read, stroke: "text-blue-100" },
    ],
    66
  );

  // attachments
  const typeRows = Object.entries(stats.attachmentBreakdown)
    .map(([type, count]) => ({ type, count, ...(TYPE_STYLES[type] || TYPE_STYLES.Other) }))
    .sort((a, b) => b.count - a.count);
  const maxTypeCount = Math.max(1, ...typeRows.map((t) => t.count));
  const totalFiles = typeRows.reduce((sum, t) => sum + t.count, 0);

  const oldest = stats.oldestUnreadDays;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-canvas px-8 pt-4 pb-6">
      {/* range picker */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Overview · {range.label}</p>
        <div className="flex items-center gap-0.5 bg-white rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                rangeDays === opt.days ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {opt.short}
            </button>
          ))}
        </div>
      </div>

      {/* everything fades slightly while a new range loads, instead of jumping */}
      <div className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
        {/* stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatTile label="Total emails" value={stats.totalEmails.toLocaleString()} />
          <StatTile label="Unread" value={`${stats.percentageUnread}%`} valueClass="text-blue-600" />
          <StatTile label="Cleaned up" value={stats.cleanedUp.toLocaleString()} valueClass="text-emerald-600" />
          <StatTile label="Avg emails / day" value={stats.averageEmailsPerDay} />
          <StatTile
            label="Oldest unread"
            value={oldest == null ? "None" : `${oldest}d`}
            valueClass={oldest == null ? "text-gray-300" : oldest > 30 ? "text-red-500" : "text-gray-950"}
          />
        </div>

        {/* donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card title="Email categories" right={`${stats.totalEmails.toLocaleString()} total`}>
            {categorySegments.length === 0 ? (
              <Empty text="No emails in this range." />
            ) : (
              <div className="flex items-center gap-8 mt-5">
                <Donut segments={categorySegments} />
                <div className="flex-1 space-y-2.5">
                  {categorySegments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2.5 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <span className="flex-1 font-medium text-gray-700">{s.name}</span>
                      <span className="text-xs text-gray-400 tabular-nums">{s.count}</span>
                      <span className="w-10 text-right font-semibold text-gray-950 tabular-nums">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Read vs unread" right={range.label}>
            {readTotal === 0 ? (
              <Empty text="No emails in this range." />
            ) : (
              <div className="flex items-center gap-8 mt-5">
                <Donut segments={unreadSegments}>
                  <span className="text-2xl font-bold text-blue-600 tabular-nums">{stats.percentageUnread}%</span>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">unread</span>
                </Donut>
                <div className="flex-1 space-y-5">
                  <ProgressRow dot="bg-blue-600" label="Unread" value={stats.unread} fraction={stats.unread / readTotal} barClass="bg-blue-600" />
                  <ProgressRow dot="bg-blue-200" label="Read" value={stats.read} fraction={stats.read / readTotal} barClass="bg-blue-300" />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* chart + heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <EmailVolumeChart data={stats.emailVolume} days={rangeDays} rangeLabel={range.label} />
          <Heatmap cells={stats.heatmap} />
        </div>

        {/* attachments */}
        <Card
          className="mt-4"
          title="Attachments"
          right={
            stats.emailsWithAttachment > 0
              ? `${totalFiles} ${totalFiles === 1 ? "file" : "files"} in ${stats.emailsWithAttachment} ${
                  stats.emailsWithAttachment === 1 ? "email" : "emails"
                } · ${formatBytes(stats.totalAttachmentSize)}`
              : null
          }
        >
          {stats.emailsWithAttachment === 0 ? (
            <Empty text="No attachments in this range." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-5">
              {/* types */}
              <div className="space-y-4">
                {typeRows.map((t) => (
                  <div key={t.type}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-gray-700">
                        <span className={`w-2 h-2 rounded-full ${t.bar}`} />
                        {t.type}
                      </span>
                      <span className="text-gray-500 tabular-nums">
                        {t.count} {t.count === 1 ? "file" : "files"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                      <div className={`h-full rounded-full ${t.bar} transition-all duration-700`} style={{ width: `${(t.count / maxTypeCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* biggest files */}
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Largest attachments</p>
                <div className="divide-y divide-gray-50">
                  {stats.largestAttachments.slice(0, 5).map((a, i) => {
                    const style = TYPE_STYLES[typeFromMime(a.mime_type)];
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <span className={`w-10 h-8 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${style.chip}`}>
                          {style.tag}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-950 truncate">{a.filename}</p>
                          <p className="text-xs text-gray-400 truncate">from {a.sender_name || "unknown sender"}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 tabular-nums flex-shrink-0">{formatBytes(a.size_bytes)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}