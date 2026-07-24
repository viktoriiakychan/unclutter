import { useState, useEffect } from "react";
import { API } from "../utils/constants";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { timeAgo } from "../utils/helpers";

const TABS = ["all", "deleted", "archived"];

export default function Activity({ refetchEmails }) {
    const [userEmail, setUserEmail] = useState("");
    const [activityLog, setActivityLog] = useState([]);
    const [activeTab, setActiveTab] = useState("all");

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

        // remove this entry from the activity log view once restored
        setActivityLog((prev) => prev.filter((e) => e.id !== entry.id));
        refetchEmails();
    }

    return (
        <div className="h-screen flex bg-gray-50 text-gray-800 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header userEmail={userEmail} />

                <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            A record of what you've cleaned up.
                        </p>
                    </div>

                    <div    className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div className="flex gap-2">
    {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const activeClasses =
            tab === "deleted"
                ? "bg-red-50 text-red-600 border border-red-200"
                : tab === "archived"
                ? "bg-gray-100 text-gray-600 border border-gray-300"
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

                        <div className="max-h-[70vh] overflow-y-auto">
                            {filtered.length === 0 ? (
                                <p className="text-gray-400 text-sm px-5 py-6">Nothing here yet.</p>
                            ) : (
                                filtered.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
                                    >
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
                                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-4 py-1 rounded transition-colors"
                                            >
                                                Undo
                                            </button>
                                        </div>

                                        <span className="text-[10px] text-gray-400 flex-shrink-0 w-16 text-right">
                                            {timeAgo(entry.internal_date)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}