import { useState, useEffect, useCallback } from "react";
import { API } from "../utils/constants";

import CenterMessage from "./CenterMessage";
import LoadingOverlay from "./LoadingOverlay";
import SuggestionCard from "./SuggestionCard";
import FilterPanel from "./FilterPanel";
import BulkActionsPreview from "./BulkActionsPreview";
import EmailRow from "./EmailRow";
import SelectionBar from "./SelectionBar";
import ConfirmDialog from "./ConfirmDialog";

function SectionLabel({ children, right }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">{children}</p>
            {right && <p className="text-xs text-gray-400">{right}</p>}
        </div>
    );
}

export default function Cleanup({ emails, refetchEmails }) {
    const [userEmail, setUserEmail] = useState("");
    const [suggestions, setSuggestions] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null); // suggestion-card delete target
    const [isDeleting, setIsDeleting] = useState(false); // suggestion-card delete only
    const [filteredEmails, setFilteredEmails] = useState([]);
    const [filterSummary, setFilterSummary] = useState("emails");
    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeletingMain, setIsDeletingMain] = useState(false); // bulk checkbox delete
    const [isArchiving, setIsArchiving] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    useEffect(() => {
        fetch(`${API}/auth/me`)
            .then((r) => r.json())
            .then((data) => setUserEmail(data.email));
    }, []);

    // refresh suggestions whenever the inbox changes (e.g. after a delete or a sync)
    useEffect(() => {
        fetch(`${API}/suggestions`)
            .then((r) => r.json())
            .then((data) => setSuggestions(data));
    }, [emails.length]);

    // useCallback keeps this the same function between renders, so FilterPanel's effect doesn't re-run for nothing
    const handleFilteredChange = useCallback((list, summary) => {
        setFilteredEmails(list);
        setFilterSummary(summary);
    }, []);

    if (!userEmail || !suggestions) {
        return <CenterMessage text="Loading your clean up..." />;
    }

    // ---- suggestion cards ----
    async function confirmDelete(ids) {
        setPendingDelete(null);
        setIsDeleting(true);

        try {
            const res = await fetch(`${API}/trash`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });

            if (!res.ok) {
                alert("Failed to delete these emails.");
                return;
            }

            await refetchEmails(); // the suggestions effect re-runs because emails.length changes
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
        }
    }

    // ---- bulk checkbox selection ----
    function toggleSelect(id) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    const allSelected = filteredEmails.length > 0 && filteredEmails.every((e) => selectedIds.includes(e.id));
    const selectedUnread = selectedIds.filter((id) => emails.find((e) => e.id === id)?.unread).length;
    const busy = isArchiving || isDeletingMain;

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : filteredEmails.map((e) => e.id));
    }

    async function waitUntilGone(ids, onDone, { intervalMs = 1500, maxAttempts = 15 } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await refetchEmails();
            const stillPresent = latest?.some((e) => ids.includes(e.id));

            if (!stillPresent) {
                onDone();
                return;
            }
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        onDone(); // safety cap
    }

    // shared by delete and archive: same steps, different endpoint
    async function runBulk(endpoint, setBusy, failMessage) {
        if (selectedIds.length === 0) return;

        const ids = selectedIds;
        setBusy(true);
        setSelectedIds([]);

        try {
            const res = await fetch(`${API}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });

            if (!res.ok) {
                alert(failMessage);
                setBusy(false);
                return;
            }

            await waitUntilGone(ids, () => setBusy(false));
        } catch (err) {
            console.error(`${endpoint} failed:`, err);
            setBusy(false);
        }
    }

    const handleDelete = () => runBulk("/trash", setIsDeletingMain, "Failed to delete selected emails.");
    const handleArchive = () => runBulk("/archive", setIsArchiving, "Failed to archive selected emails.");

    return (
        <>
            {pendingDelete && (
                <BulkActionsPreview
                    title={pendingDelete.title}
                    emails={emails.filter((e) => pendingDelete.ids.includes(e.id))}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={confirmDelete}
                />
            )}

            <ConfirmDialog
                open={showDeleteConfirm}
                action="delete"
                count={selectedIds.length}
                unreadCount={selectedUnread}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                }}
            />
            <ConfirmDialog
                open={showArchiveConfirm}
                action="archive"
                count={selectedIds.length}
                unreadCount={selectedUnread}
                onCancel={() => setShowArchiveConfirm(false)}
                onConfirm={() => {
                    setShowArchiveConfirm(false);
                    handleArchive();
                }}
            />

            {isDeleting && <LoadingOverlay action="delete" fullScreen />}

            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-canvas px-8 pt-4 pb-6">
                {/* suggestions */}
                <SectionLabel right="Based on your inbox activity">Suggested for you</SectionLabel>

                {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {suggestions.map((s) => (
                            <SuggestionCard key={s.title} suggestion={s} onDeleteClick={() => setPendingDelete(s)} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl px-5 py-8 text-center">
                        <p className="text-sm font-medium text-gray-700">Nothing to suggest right now</p>
                        <p className="text-xs text-gray-400 mt-1">Your inbox is looking tidy.</p>
                    </div>
                )}

                {/* filter your own: filters card on the left, results card on the right */}
                <div className="mt-8">
                    <SectionLabel>Or filter your own</SectionLabel>

                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-stretch">
                        <div className="bg-white rounded-2xl p-5">
                            <FilterPanel emails={emails} onFilteredChange={handleFilteredChange} />
                        </div>

                        <section className="relative overflow-clip min-w-0">
                            <div className="bg-white rounded-2xl flex flex-col overflow-hidden h-[calc(100vh-12rem)] min-h-[420px]">
                                <div className="px-5 pt-5 pb-4">
                                    <h2 className="text-lg font-bold tracking-tight text-gray-950">Matching emails</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Showing <span className="font-semibold text-gray-700 tabular-nums">{filteredEmails.length}</span> {filterSummary}
                                    </p>
                                </div>

                                <div className="flex items-center px-5 py-2.5 border-y border-gray-100 bg-white">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-500">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            disabled={filteredEmails.length === 0}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                                        />
                                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select all"}
                                    </label>
                                </div>

                                <div className="relative flex-1 min-h-0">
                                    {isDeletingMain && <LoadingOverlay action="delete" />}
                                    {isArchiving && <LoadingOverlay action="archive" />}

                                    <div className={`h-full overflow-y-auto divide-y divide-gray-50 ${selectedIds.length > 0 ? "pb-16" : ""}`}>
                                        {filteredEmails.length === 0 ? (
                                            <p className="py-16 text-center text-sm text-gray-400">No emails match these filters.</p>
                                        ) : (
                                            filteredEmails.map((email) => (
                                                <EmailRow
                                                    key={email.id}
                                                    email={email}
                                                    isSelected={selectedIds.includes(email.id)}
                                                    onToggle={() => toggleSelect(email.id)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedIds.length > 0 && (
                                <SelectionBar
                                    count={selectedIds.length}
                                    onArchive={() => setShowArchiveConfirm(true)}
                                    onDelete={() => setShowDeleteConfirm(true)}
                                    onClear={() => setSelectedIds([])}
                                    disabled={busy}
                                />
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}