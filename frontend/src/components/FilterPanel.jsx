import { useState, useMemo, useEffect } from "react";

const AGE_OPTIONS = [
  { label: "Any age", value: "any" },
  { label: "Older than 7 days", value: "7" },
  { label: "Older than 30 days", value: "30" },
  { label: "Older than 60 days", value: "60" },
  { label: "Older than 90 days", value: "90" },
];

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// a normal <select>, restyled. Turns blue when it's set to something other than "any"
function Select({ label, value, onChange, children }) {
  const active = value !== "any";
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-medium text-gray-500 mb-1.5">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none truncate rounded-lg pl-3 pr-9 py-2.5 text-sm outline-none cursor-pointer transition focus:ring-2 focus:ring-blue-500/30 ${
            active ? "bg-blue-50 text-blue-700" : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          {children}
        </select>
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${active ? "text-blue-500" : "text-gray-400"}`}>
          <ChevronDown />
        </span>
      </span>
    </label>
  );
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function FilterPanel({ emails, onFilteredChange }) {
  const [sender, setSender] = useState("any");
  const [category, setCategory] = useState("any");
  const [readStatus, setReadStatus] = useState("any");
  const [age, setAge] = useState("any");

  // senders sorted by name, so the dropdown is easy to scan
  const uniqueSenders = useMemo(() => {
    const map = new Map();
    emails.forEach((e) => map.set(e.sender_email, e.sender_name || e.sender_email));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [emails]);

  const categories = useMemo(() => {
    return Array.from(new Set(emails.map((e) => e.category))).filter(Boolean).sort();
  }, [emails]);

  const filtered = useMemo(() => {
    const cutoff = age !== "any" ? Date.now() - Number(age) * 24 * 60 * 60 * 1000 : null;

    return emails.filter((e) => {
      if (sender !== "any" && e.sender_email !== sender) return false;

      if (category === "newsletter") {
        if (!e.is_newsletter) return false;
      } else if (category !== "any" && e.category !== category) {
        return false;
      }

      if (readStatus === "unread" && !e.unread) return false;
      if (readStatus === "read" && e.unread) return false;
      if (cutoff !== null && Number(e.internal_date) > cutoff) return false;
      return true;
    });
  }, [emails, sender, category, readStatus, age]);

  useEffect(() => {
    onFilteredChange?.(filtered, buildSummary());
  }, [filtered, onFilteredChange]);

  function resetFilters() {
    setSender("any");
    setCategory("any");
    setReadStatus("any");
    setAge("any");
  }

  const hasActiveFilters = sender !== "any" || category !== "any" || readStatus !== "any" || age !== "any";

  // e.g. "unread promotions older than 30 days from Zara"
  function buildSummary() {
    const parts = [];
    if (readStatus === "unread") parts.push("unread");
    if (readStatus === "read") parts.push("read");
    if (category === "newsletter") parts.push("newsletters");
    else if (category !== "any") parts.push(category);
    parts.push(filtered.length === 1 ? "email" : "emails");
    if (age !== "any") parts.push(`older than ${age} days`);
    if (sender !== "any") {
      const name = uniqueSenders.find(([email]) => email === sender)?.[1] || sender;
      parts.push(`from ${name}`);
    }
    return parts.join(" ");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-950">Filters</p>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Reset
          </button>
        )}
      </div>

      {/* side by side on small screens, stacked in the sidebar on big ones */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <Select label="Sender" value={sender} onChange={setSender}>
          <option value="any">Any sender</option>
          {uniqueSenders.map(([email, name]) => (
            <option key={email} value={email}>{name}</option>
          ))}
        </Select>

        <Select label="Category" value={category} onChange={setCategory}>
          <option value="any">Any category</option>
          <option value="newsletter">Newsletter</option>
          {categories.map((c) => (
            <option key={c} value={c}>{capitalise(c)}</option>
          ))}
        </Select>

        <Select label="Read status" value={readStatus} onChange={setReadStatus}>
          <option value="any">Any</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </Select>

        <Select label="Age" value={age} onChange={setAge}>
          {AGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

    </div>
  );
}