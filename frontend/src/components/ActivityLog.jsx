import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API } from "../utils/constants";
import CenterMessage from "./CenterMessage";
import { timeAgo } from "../utils/helpers";
import { getCategoryStyle } from "../utils/Categories";
import { useToast } from "./Toast";

const TABS = [
    { key: "all", label: "All" },
    { key: "deleted", label: "Deleted" },
    { key: "archived", label: "Archived" },
];

const BADGES = {
    deleted: "bg-red-50 text-red-600",
    archived: "bg-gray-100 text-gray-600",
};

// SQLite gives "2026-10-29 13:45:02" in UTC, turn it into milliseconds
function toMs(sqliteTimestamp) {
    return Date.parse(sqliteTimestamp.replace(" ", "T") + "Z");
}

const plural = (n) => `${n} ${n === 1 ? "email" : "emails"}`;

export default function Activity({ refetchEmails }) {
    const [userEmail, setUserEmail] = useState("");
    const [activityLog, setActivityLog] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isUndoing, setIsUndoing] = useState(false);
    const [undoingId, setUndoingId] = useState(null); // single-row undo in progress

    const showToast = useToast();

    useEffect(() => {
        fetch(`${API}/auth/me`)
            .then((r) => r.json())
            .then((data) => setUserEmail(data.email));
    }, []);

    useEffect(() => {
        fetch(`${API}/activity`)
            .then((r) => r.json())
            .then((data) => setActivityLog(data));
    }, []);

    // clear selection whenever the tab changes, so you can't undo something not currently visible
    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    if (!userEmail || !activityLog) {
        return <CenterMessage text="Loading your activity..." />;
    }

    const counts = {
        all: activityLog.length,
        deleted: activityLog.filter((e) => e.action_type === "deleted").length,
        archived: activityLog.filter((e) => e.action_type === "archived").length,
    };

    const filtered = activeTab === "all" ? activityLog : activityLog.filter((e) => e.action_type === activeTab);
    const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));

    function toggleSelect(id) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : filtered.map((e) => e.id));
    }

    async function post(endpoint, ids) {
        const res = await fetch(`${API}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error(`${endpoint} failed`);
    }

    async function handleUndo(entry) {
        setUndoingId(entry.id);
        try {
            await post(entry.action_type === "deleted" ? "/untrash" : "/unarchive", [entry.email_id]);
            setActivityLog((prev) => prev.filter((e) => e.id !== entry.id));
            setSelectedIds((prev) => prev.filter((x) => x !== entry.id));
            refetchEmails();
            showToast({ message: `Restored "${entry.subject || "(no subject)"}"` });
        } catch {
            alert("Failed to restore this email.");
        } finally {
            setUndoingId(null);
        }
    }

    async function handleBulkUndo() {
        if (selectedIds.length === 0) return;

        const entries = activityLog.filter((e) => selectedIds.includes(e.id));
        const deletedIds = entries.filter((e) => e.action_type === "deleted").map((e) => e.email_id);
        const archivedIds = entries.filter((e) => e.action_type === "archived").map((e) => e.email_id);

        setIsUndoing(true);
        try {
            if (deletedIds.length > 0) await post("/untrash", deletedIds);
            if (archivedIds.length > 0) await post("/unarchive", archivedIds);

            setActivityLog((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
            setSelectedIds([]);
            refetchEmails();
            showToast({ message: `Restored ${plural(entries.length)}` });
        } catch (err) {
            alert(err.message || "Failed to restore selected emails.");
        } finally {
            setIsUndoing(false);
        }
    }

    return (
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-canvas px-8 pt-4 pb-6">
            <div className="bg-white rounded-2xl flex flex-col overflow-hidden max-h-[calc(100vh-10rem)]">
                {/* tabs + bulk actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
                    <div className="flex items-center gap-1.5">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                    }`}
                                >
                                    {tab.key === "deleted" && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                    {tab.key === "archived" && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                                    {tab.label}
                                    <span className={`tabular-nums ${isActive ? "text-blue-500" : "text-gray-400"}`}>{counts[tab.key]}</span>
                                </button>
                            );
                        })}
                    </div>

                    {filtered.length > 0 && (
                        <button
                            onClick={handleBulkUndo}
                            disabled={selectedIds.length === 0 || isUndoing}
                            className="text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            {isUndoing ? "Restoring..." : `Undo selected${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
                        </button>
                    )}
                </div>

                {filtered.length === 0 ? (
                    <div className="border-t border-gray-100 py-16 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <circle cx="10" cy="10" r="7" />
                                <path d="M10 6.5V10l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-4">
                            {activeTab === "all" ? "Nothing cleaned yet" : `Nothing ${activeTab} yet`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Emails you archive or delete show up here, so you can undo them.</p>
                        <Link
                            to="/cleanup"
                            className="mt-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                        >
                            Start cleaning up
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center px-5 py-2.5 border-y border-gray-100">
                            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-500">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                                />
                                {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select all"}
                            </label>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
                            {filtered.map((entry) => {
                                const isSelected = selectedIds.includes(entry.id);
                                const style = getCategoryStyle(entry);
                                const name = entry.sender_name || entry.sender_email || "?";
                                return (
                                    <div
                                        key={entry.id}
                                        onClick={() => toggleSelect(entry.id)}
                                        className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                                            isSelected ? "bg-blue-50/70" : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(entry.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0 cursor-pointer"
                                        />

                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${style.avatar}`}>
                                            {name[0].toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-950 truncate">{entry.subject || "(no subject)"}</p>
                                            <p className="text-xs text-gray-400 truncate">{name}</p>
                                        </div>

                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${BADGES[entry.action_type] || BADGES.archived}`}>
                                            {entry.action_type}
                                        </span>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // don't also tick the row
                                                handleUndo(entry);
                                            }}
                                            disabled={undoingId === entry.id}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                                        >
                                            {undoingId === entry.id ? "..." : "Undo"}
                                        </button>

                                        <span className="w-16 text-right text-xs text-gray-400 tabular-nums flex-shrink-0">
                                            {entry.timestamp ? timeAgo(toMs(entry.timestamp)) : ""}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}