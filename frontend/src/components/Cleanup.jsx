import { useState, useEffect } from "react";
import { API } from "../utils/constants";

import Sidebar from "./Sidebar";
import Header from "./Header";
import SuggestionCard from "./SuggestionCard";


export default function Cleanup() {
    const [userEmail, setUserEmail] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [pendingDelete, setPendingDelete] = useState(null); // hold what to delete


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

            setSuggestions((prev) => prev.filter((s) => s.title !== target_emails.title)); // removes the emails just delete
        } catch (err) {
            console.error("Delete failed:", err);
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

            <div className="flex-1 flex flex-col">
                <Header userEmail={userEmail} />
                
                <main className="p-6 overflow-y-auto overflow-x-hidden">
                    
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
                    
                </main>

            </div>
        </div>
        </>
    );
}