import { useState, useEffect } from "react";
import { API } from "../utils/constants";

import Sidebar from "./Sidebar";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import SuggestionCard from "./SuggestionCard";
import FilterPanel from "./FilterPanel";
import { timeAgo } from "../utils/helpers";

export default function Cleanup({ emails}) {
    const [userEmail, setUserEmail] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [pendingDelete, setPendingDelete] = useState(null); // hold what to delete
    const [isDeleting, setIsDeleting] = useState(false);
    const [filteredEmails, setFilteredEmails] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeletingMain, setIsDeletingMain] = useState(false);
    const [deletingIds, setDeletingIds] = useState([]); 

    const [isArchiving, setIsArchiving] = useState(false);
    const [archivingIds, setArchivingIds] = useState([]); 


    useEffect(()=> {
        fetch(`${API}/auth/me`)
        .then((r) => r.json())
        .then((data) => setUserEmail(data.email));
    }, []);

    useEffect(() => {
        fetch(`${API}/suggestions`)
        .then((r) => r.json())
        .then((data) => setSuggestions(data));
    }, []);

    async function confirmDelete() {
        const target_emails = pendingDelete;
        setPendingDelete(null);
        setIsDeleting(true);

        try {
            const res = await fetch(`${API}/trash`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: target_emails.ids }),
            });

            if (!res.ok) {
                alert("Failed to delete these emails.");
                return;
            }

             const freshRes = await fetch(`${API}/suggestions`);
            const fresh = await freshRes.json();
            setSuggestions(fresh);

        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
        }
    }

    function toggleSelect(id) 
    {
        // prev is what the selectedId is right now
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    const allSelected = filteredEmails.length > 0 && filteredEmails.every(e => selectedIds.includes(e.id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmails.map(e => e.id));
        }
    }
  
    return(
        <>
        {pendingDelete && (
            <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        You're deleting{" "}
                        <span className="font-semibold text-gray-900">{pendingDelete.count} emails</span>{" "}
                        — {pendingDelete.title.toLowerCase()}.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
                            onClick={() => setPendingDelete(null)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                            onClick={confirmDelete}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="min-h-screen flex bg-gray-50 text-gray-800 overflow-x-hidden">
            <Sidebar/>

            <div className="flex-1 flex flex-col min-w-0">
                <Header userEmail={userEmail} />
                
                <main className="p-6 overflow-y-auto overflow-x-hidden">
                    {isDeleting && <LoadingOverlay action="delete" />}
                    {/* page title */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Clean up</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Suggested cleanups you can act on now, or filter to find your own.
                        </p>
                    </div>

                    {/* suggestion cards*/}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-900">Suggested for you</h2>
                            <span className="text-sm text-gray-400">Based on your inbox activity</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {suggestions.length > 0 ? (
                                suggestions.map((s) => (
                                    <SuggestionCard key={s.title} suggestion={s} onDeleteClick={() => setPendingDelete(s)} />
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">No suggestions right now.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 mt-8">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Or filter your own</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>            

                    <FilterPanel emails={emails} onFilteredChange={setFilteredEmails} />

                    {/* email list card — header + rows wrapped together */}
                    <div className="mt-6 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Matching Emails</h2>
                            <span className="text-sm text-gray-500">{filteredEmails.length} shown</span>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {filteredEmails.map((email) => (
                                <div
                                    key={email.id}
                                    className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(email.id)}
                                        onChange={() => toggleSelect(email.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 flex-shrink-0 cursor-pointer"
                                    />

                                    <span
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            email.unread ? "bg-blue-500" : "bg-transparent"
                                        }`}
                                    ></span>

                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                                        {email.sender_name ? email.sender_name[0].toUpperCase() : "?"}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-400 truncate">{email.sender_name}</div>
                                        <div className={`text-sm truncate ${email.unread ? "font-medium text-gray-900" : "font-normal text-gray-600"}`}>
                                            {email.subject}
                                        </div>
                                    </div>

                                    {email.is_newsletter ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex-shrink-0">
                                            newsletter
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                            email.category === "promotions" ? "bg-yellow-100 text-yellow-700" :
                                            email.category === "social"     ? "bg-purple-100 text-purple-700" :
                                            email.category === "updates"    ? "bg-green-100 text-green-700" :
                                            "bg-gray-100 text-gray-700"
                                        }`}>
                                            {email.category}
                                        </span>
                                    )}

                                    <span className="text-[10px] py-0.5 text-gray-400 flex-shrink-0">
                                        {timeAgo(email.internal_date)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                                />
                                <span className="text-sm text-gray-600">Select all</span>
                            </label>
                            <span className="text-m text-gray-500"></span>
                            {selectedIds.length > 0 && (
                                <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                disabled={selectedIds.length === 0 || isArchiving || isDeletingMain}
                                onClick={() => setShowArchiveConfirm(true)}
                                className="px-10 py-1 rounded-lg border border-gray-600/40 bg-gray-600/10 text-gray-600 text-sm font-medium hover:bg-gray-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-600/10"

                            >
                            {isArchiving ? "Archiving..." : "Archive"}
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={selectedIds.length === 0 || isArchiving || isDeletingMain}
                                className="px-10 py-1 rounded-lg border border-red-600/40 bg-red-600/10 text-red-600 text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/10"
                            >
                            {isDeletingMain ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                    </div>
                    
                </main>

            </div>
        </div>
        </>
    );
}