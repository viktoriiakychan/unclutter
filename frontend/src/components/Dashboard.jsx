import { useState, useEffect, useRef } from "react";

import CenterMessage from "./CenterMessage";

import HealthCard from "./HealthCard";
import MetricCard from "./MetricCard";
import EmailsPanel from "./EmailsPanel";
import SelectionBar from "./SelectionBar";
import UnsubscribeCard from "./UnsubscribeCard";
import WorstOffenderCard from "./WorstOffenderCard";
import { EMAIL_FILTERS } from "../utils/categories";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";

import { API } from "../utils/constants";

function Dashboard({ emails, refetchEmails, userEmail, syncMostlyDone }) {
// stats computed from the real data
    const unreadCount = emails.filter((e) => e.unread).length;
    const promotionsCount = emails.filter((e) => e.category === "promotions" && !e.is_newsletter).length;
    const unreadPct = emails.length ? Math.round((unreadCount / emails.length) * 100) : 0;
    const newsletterSenders = new Set(emails.filter((e) => e.is_newsletter).map((e) => e.sender_email)).size;
    const promotionSenders = new Set(
    emails.filter((e) => e.category === "promotions" && !e.is_newsletter).map((e) => e.sender_email)
    ).size;
    const newsletterCount = emails.filter((e) => e.is_newsletter).length;
    const senderCount = new Set(emails.map((e) => e.sender_email)).size; 

    const [activeFilter, setActiveFilter] = useState("All");

    const [senderSearch, setSenderSearch] = useState("");
    const [unsubscribeList, setUnsubscribeList] = useState([]);

    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingIds, setDeletingIds] = useState([]); 

    const [isArchiving, setIsArchiving] = useState(false);
    const [archivingIds, setArchivingIds] = useState([]); 

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    const [activityLog, setActivityLog] = useState([]);

    const listRef = useRef(null);
    const showToast = useToast();

    const [healthScore, setHealthScore] = useState(() => {
    const cached = localStorage.getItem("healthScore");
        return cached ? Number(cached) : null;
    });
    const [flaggedCount, setFlaggedCount] = useState(() => {
        const cached = localStorage.getItem("flaggedCount");
        return cached ? Number(cached) : 0;
    });
    const [worstOffender, setWorstOffender] = useState(() => {
        const cached = localStorage.getItem("worstOffender");
        return cached ? JSON.parse(cached) : null;
    });

    useEffect(()=> {
        fetch(`${API}/unsubscribe-list`)
        .then((r) => r.json())
        .then((data) => setUnsubscribeList(data));
    }, [emails.length]);

    useEffect(() => {
        fetch(`${API}/activity`)
        .then((r) => r.json())
        .then((data) => setActivityLog(data));
    }, [emails.length]);
    
    useEffect(()=> {
        fetch(`${API}/health-score`)
        .then((r) => r.json())
        .then((data) => {
            setHealthScore(data.health_score);
            localStorage.setItem("healthScore", data.health_score);
        });
    }, [emails.length]);

    useEffect(()=> {
        fetch(`${API}/worst-offender`)
        .then((r) => r.json())
        .then((data) => {
            setWorstOffender(data);
            localStorage.setItem("worstOffender", JSON.stringify(data));
        });
    }, [emails.length]);

    useEffect(()=> {
        fetch(`${API}/noise-scores`)
        .then((r) => r.json())
        .then((data) => {
            const flaggedSenders = data.filter((s) => s.is_flagged);
            setFlaggedCount(flaggedSenders.length);
            localStorage.setItem("flaggedCount", flaggedSenders.length);
        });
    }, [emails.length]);

    if (!userEmail || !activityLog || healthScore == null || flaggedCount == null) {
            return <CenterMessage text="Loading your dashboard..." />;
    }

    const selectedUnread = selectedIds.filter((id) => emails.find((e) => e.id === id)?.unread).length;

    // async function handleUnsubscribeClick(e, sender_email, link) {
    //     e.preventDefault(); // stop the <a> from navigating immediately

    //     try {
    //         await fetch(`${API}/dismiss-sender`, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ sender_email }),
    //         });
    //     } catch (err) {
    //         console.error("Failed to dismiss sender:", err);
    //     }

    //     window.open(link, "_blank", "noopener,noreferrer");
    //     setUnsubscribeList((prev) => prev.filter((item) => item.sender_email !== sender_email));

    // }

    const currentFilter = EMAIL_FILTERS.find((f) => f.name === activeFilter) || EMAIL_FILTERS[0];
    const search = senderSearch.toLowerCase();

    const filteredEmails = emails.filter((email) => {
        const matchesSearch =
            (email.sender_name || "").toLowerCase().includes(search) ||
            (email.subject || "").toLowerCase().includes(search) ||
            (email.sender_email || "").toLowerCase().includes(search);

        return currentFilter.test(email) && matchesSearch;
    });

    function toggleSelect(id) 
    {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }   

    const plural = (n) => `${n} ${n === 1 ? "email" : "emails"}`;

    async function undo(endpoint, ids) {
        await fetch(`${API}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        });
        await refetchEmails();
    }

    async function handleDelete() {
        if (selectedIds.length === 0) return;

        const idsToDelete = selectedIds;
        setDeletingIds(idsToDelete);
        setIsDeleting(true);
        setSelectedIds([]);

        try {
            const res = await fetch(`${API}/trash`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: idsToDelete }),
            });

            if (!res.ok) {
                alert("Failed to delete selected emails.");
                setIsDeleting(false);
                setDeletingIds([]);
                return;
            }

            await waitUntilGone(idsToDelete, () => {
                setIsDeleting(false);
                setDeletingIds([]);
            });
            showToast({
                message: `Moved ${plural(idsToDelete.length)} to Trash`,
                onUndo: () => undo("/untrash", idsToDelete),
            });
        } 
        catch (err) {
            console.error("Delete failed:", err);
            setIsDeleting(false);
            setDeletingIds([]);
        }
    }

    function showFilter(name) {
        setActiveFilter(name);
        setSenderSearch("");
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    
    function handleCleanWorst() {
        if (!worstOffender) return;
        const ids = emails
            .filter((e) => e.sender_email === worstOffender.sender_email)
            .map((e) => e.id);

        setActiveFilter("All");
        setSenderSearch(worstOffender.sender_email);   // show only their emails
        setSelectedIds(ids);                           // tick them all, the action bar pops up
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function showFilter(name) {
        setActiveFilter(name);
        setSenderSearch(""); // clear any search, e.g. one left over from "Clean now"
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function handleArchive() {
        if (selectedIds.length === 0) return;

        const idsArchive = selectedIds;
        setArchivingIds(idsArchive);
        setIsArchiving(true);   
        setSelectedIds([]);

        try {
            const res = await fetch(`${API}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: idsArchive }),
            });

            if (!res.ok) {
                alert("Failed to archive selected emails.");
                setIsArchiving(false);
                setArchivingIds([]);
                return;
            }

            await waitUntilGone(idsArchive, () => {
                setIsArchiving(false);
                setArchivingIds([]);
            });
            showToast({
                message: `Archived ${plural(idsArchive.length)}`,
                onUndo: () => undo("/unarchive", idsArchive),
            });
        } 
        catch (err) {
            console.error("Archive failed:", err);
            setIsArchiving(false);
            setArchivingIds([]);
        }
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

    console.warn("waitUntilGone: gave up after max attempts, emails may still be present");
    onDone();
}

    const allSelected = filteredEmails.length > 0 && filteredEmails.every(e => selectedIds.includes(e.id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmails.map(e => e.id));
        }
    }

    async function handleUnsubscribeClick(sender_email) {
        const res = await fetch(`${API}/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender_email }),
        });
        const data = await res.json();

        if (data.method === "link") {
            // sender doesn't support one-click: user finishes on their site
            window.open(data.url, "_blank", "noopener,noreferrer");
            await fetch(`${API}/dismiss-sender`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender_email }),
            });
        }

        setUnsubscribeList((prev) => prev.filter((item) => item.sender_email !== sender_email));
    }

return (
    <>
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

        <div className="flex-1 min-h-0 flex bg-slate-50 text-gray-800 overflow-hidden">
        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* MAIN CONTENT */}
            <main className="flex-1 p-6 px-8 pb-6 overflow-y-auto overflow-x-hidden">

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                <div className="lg:col-span-3">
                    <HealthCard score={healthScore} worstOffender={worstOffender} onCleanNow={handleCleanWorst} />
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <MetricCard label="Total" value={emails.length} sub="in your inbox"
                    onClick={() => showFilter("All")} active={activeFilter === "All"} />
                    <MetricCard label="Unread" dotClass="bg-blue-600" valueClass="text-blue-600"
                    value={unreadCount} sub={`${unreadPct}% of inbox`}
                    onClick={() => showFilter("Unread")} active={activeFilter === "Unread"} />
                    <MetricCard label="Newsletters" dotClass="bg-amber-500"
                    value={newsletterCount} sub={`${newsletterSenders} ${newsletterSenders === 1 ? "sender" : "senders"}`}
                    onClick={() => showFilter("Newsletter")} active={activeFilter === "Newsletter"} />
                    <MetricCard label="Promotions" dotClass="bg-pink-500"
                    value={promotionsCount} sub={`${promotionSenders} ${promotionSenders === 1 ? "sender" : "senders"}`}
                    onClick={() => showFilter("Promotions")} active={activeFilter === "Promotions"} />
                </div>
                </div>

            {/* ROW 2: worst offender (same 3/5 width as the health card) + unsubscribe */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 items-stretch">
                <div className="lg:col-span-3">
                    <WorstOffenderCard
                        offender={worstOffender}
                        inboxTotal={emails.length}
                        onCleanNow={handleCleanWorst}
                        onUnsubscribe={() => handleUnsubscribeClick(worstOffender.sender_email)}
                        canUnsubscribe={unsubscribeList.some((u) => u.sender_email === worstOffender?.sender_email)}
                    />
                </div>
                <div className="lg:col-span-2">
                    <UnsubscribeCard
                        list={unsubscribeList}
                        emails={emails}
                        onUnsubscribe={handleUnsubscribeClick}
                    />
                </div>
            </div>

            {/* ROW 3: emails, full width. The section keeps the floating bar inside the emails area */}
            <section className="relative overflow-clip">
                <EmailsPanel
                    emails={emails}
                    filteredEmails={filteredEmails}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    search={senderSearch}
                    onSearchChange={setSenderSearch}
                    selectedIds={selectedIds}
                    onToggle={toggleSelect}
                    allSelected={allSelected}
                    onToggleAll={toggleSelectAll}
                    isArchiving={isArchiving}
                    isDeleting={isDeleting}
                    listRef={listRef}
                />

                {/* outside the email card on purpose: sticky keeps it on screen while you scroll the page */}
                {selectedIds.length > 0 && (
                    <SelectionBar
                        count={selectedIds.length}
                        onArchive={() => setShowArchiveConfirm(true)}
                        onDelete={() => setShowDeleteConfirm(true)}
                        onClear={() => setSelectedIds([])}
                        disabled={isArchiving || isDeleting}
                    />
                )}
            </section>
            </main>
        </div>
        </div>
    </>
);
}

export default Dashboard;