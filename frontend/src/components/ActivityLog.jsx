import { useState, useEffect } from "react";
import { API } from "../utils/constants";
import Sidebar from "./Sidebar";
import CenterMessage from "./CenterMessage";
import Header from "./Header";
import { timeAgo } from "../utils/helpers";

const TABS = ["all", "deleted", "archived"];

export default function Activity({ refetchEmails }) {
    const [userEmail, setUserEmail] = useState("");
    const [activityLog, setActivityLog] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isUndoing, setIsUndoing] = useState(false);

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

    const filtered =
        activeTab === "all"
            ? activityLog
            : activityLog.filter((entry) => entry.action_type === activeTab);

    // clear selection whenever the tab changes, so you can't undo something not currently visible
    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    function toggleSelect(id) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map((e) => e.id));
        }
    }

    async function handleUndo(entry) {
        const endpoint = entry.action_type === "deleted" ? "/untrash" : "/unarchive";

        const res = await fetch(`${API}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [entry.email_id] }),
        });

        if (!res.ok) {
            alert("Failed to restore this email.");
            return;
        }

        setActivityLog((prev) => prev.filter((e) => e.id !== entry.id));
        refetchEmails();
    }

    async function handleBulkUndo() {
        if (selectedIds.length === 0) return;

        const entries = activityLog.filter((e) => selectedIds.includes(e.id));
        const deletedIds = entries.filter((e) => e.action_type === "deleted").map((e) => e.email_id);
        const archivedIds = entries.filter((e) => e.action_type === "archived").map((e) => e.email_id);

        setIsUndoing(true);

        try {
            if (deletedIds.length > 0) {
                const res = await fetch(`${API}/untrash`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: deletedIds }),
                });
                if (!res.ok) throw new Error("Failed to restore some deleted emails.");
            }

            if (archivedIds.length > 0) {
                const res = await fetch(`${API}/unarchive`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: archivedIds }),
                });
                if (!res.ok) throw new Error("Failed to restore some archived emails.");
            }

            setActivityLog((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
            setSelectedIds([]);
            refetchEmails();
        } catch (err) {
            alert(err.message || "Failed to restore selected emails.");
        } finally {
            setIsUndoing(false);
        }
    }

    if (!userEmail || !activityLog) {
        return <CenterMessage text="Loading your activity..." />;
    }

    return (
        <div className="h-screen flex bg-gray-50 text-gray-800 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            A record of what you've cleaned up
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div className="flex gap-2">
                                {TABS.map((tab) => {
                                    const isActive = activeTab === tab;
                                    const activeClasses =
                                        tab === "deleted"
                                            ? "bg-red-50 text-red-600 border border-red-200"
                                            : tab === "archived"
                                            ? "bg-gray-200 text-gray-800 border border-gray-300"
                                            : "bg-blue-50 text-blue-600 border border-blue-200";

                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                                                isActive
                                                    ? activeClasses
                                                    : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    );
                                })}
                            </div>
                            {filtered.length === 1 ? (
                                <span className="text-sm text-gray-500">{filtered.length} item</span>
                            ) : (
                                <span className="text-sm text-gray-500">{filtered.length} items</span>
                            )}
                        </div>

                        {filtered.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-600">Select all</span>
                                    {selectedIds.length > 0 && (
                                        <span className="text-sm text-gray-400">
                                            &middot; {selectedIds.length} selected
                                        </span>
                                    )}
                                </label>

                                <button
                                    onClick={handleBulkUndo}
                                    disabled={selectedIds.length === 0 || isUndoing}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                    {isUndoing ? "Restoring..." : `Undo selected${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
                                </button>
                            </div>
                        )}

                        <div className="max-h-[70vh] overflow-y-auto">
                            {filtered.length === 0 ? (
                                <p className="text-gray-400 text-sm px-5 py-6">Nothing here yet.</p>
                            ) : (
                                filtered.map((entry) => {
                                    const isSelected = selectedIds.includes(entry.id);
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`flex items-center gap-4 px-5 py-3 border-b border-gray-100 transition-colors ${
                                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(entry.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0 cursor-pointer"
                                            />

                                            <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold flex-shrink-0">
                                                {entry.sender_name ? entry.sender_name[0].toUpperCase() : "?"}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm truncate text-gray-900">{entry.subject}</div>
                                                <div className="text-xs text-gray-400 truncate">{entry.sender_name}</div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        entry.action_type === "deleted"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-gray-200 text-gray-700"
                                                    }`}
                                                >
                                                    {entry.action_type}
                                                </span>

                                                <button
                                                    onClick={() => handleUndo(entry)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-4 py-2 rounded transition-colors"
                                                >
                                                    Undo
                                                </button>
                                            </div>

                                            <span className="text-[10px] text-gray-400 flex-shrink-0 w-16 text-right">
                                                {timeAgo(entry.internal_date)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}