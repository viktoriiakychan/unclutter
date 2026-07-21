import { useState, useMemo, useEffect } from "react";

const AGE_OPTIONS = [
  { label: "Any age", value: "any" },
  { label: "Older than 7 days", value: "7" },
  { label: "Older than 30 days", value: "30" },
  { label: "Older than 60 days", value: "60" },
  { label: "Older than 90 days", value: "90" },
];

export default function FilterPanel({ emails, onFilteredChange }) {
  const [sender, setSender] = useState("any");
  const [category, setCategory] = useState("any");
  const [readStatus, setReadStatus] = useState("any");
  const [age, setAge] = useState("any");

  
  const uniqueSenders = useMemo(() => {
    const map = new Map();
    emails.forEach((e) => map.set(e.sender_email, e.sender_name));
    return Array.from(map.entries());
  }, [emails]);

  const categories = useMemo(() => {
    return Array.from(new Set(emails.map((e) => e.category))).filter(Boolean);
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

  function resetFilters() {
    setSender("any");
    setCategory("any");
    setReadStatus("any");
    setAge("any");
  }
   useEffect(() => {
    onFilteredChange?.(filtered);
  }, [filtered, onFilteredChange]);


  const hasActiveFilters = sender !== "any" || category !== "any" || readStatus !== "any" || age !== "any";

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Sender</label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="any">Any sender</option>
            {uniqueSenders.map(([email, name]) => (
              <option key={email} value={email}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="any">Any category</option>
            {categories.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
            <option value="newsletter">Newsletter</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Read status</label>
          <select
            value={readStatus}
            onChange={(e) => setReadStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="any">Any</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Age</label>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            {AGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span> {buildSummary()}.
        </p>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-sm text-blue-600 hover:underline">
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}