import { useState, useEffect, useRef } from "react";

import CenterMessage from "./CenterMessage";
import HealthCard from "./HealthCard";
import MetricCard from "./MetricCard";
import EmailsPanel from "./EmailsPanel";
import SelectionBar from "./SelectionBar";
import ConfirmDialog from "./ConfirmDialog";
import UnsubscribeCard from "./UnsubscribeCard";
import WorstOffenderCard from "./WorstOffenderCard";
import { EMAIL_FILTERS } from "../utils/Categories";
import { API } from "../utils/constants";

// read a number/object cached from the last visit, so the cards aren't empty on load
function cached(key, parse = Number) {
    try {
        const value = localStorage.getItem(key);
        return value == null ? null : parse(value);
    } catch {
        return null;
    }
}

function Dashboard({ emails, refetchEmails, userEmail, syncMostlyDone }) {
    // true while the first sync is still running, the cards show grey blocks
    const pending = !syncMostlyDone;

    // stats computed from the real data
    const unreadCount = emails.filter((e) => e.unread).length;
    const unreadPct = emails.length ? Math.round((unreadCount / emails.length) * 100) : 0;
    const promotions = emails.filter((e) => e.category === "promotions" && !e.is_newsletter);
    const newsletters = emails.filter((e) => e.is_newsletter);
    const promotionSenders = new Set(promotions.map((e) => e.sender_email)).size;
    const newsletterSenders = new Set(newsletters.map((e) => e.sender_email)).size;

    const [activeFilter, setActiveFilter] = useState("All");
    const [senderSearch, setSenderSearch] = useState("");
    const [unsubscribeList, setUnsubscribeList] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    const [healthScore, setHealthScore] = useState(() => cached("healthScore"));
    const [worstOffender, setWorstOffender] = useState(() => cached("worstOffender", JSON.parse));

    const listRef = useRef(null);

    // everything below refetches whenever the number of emails changes (sync, delete, archive)
    useEffect(() => {
        fetch(`${API}/unsubscribe-list`)
            .then((r) => r.json())
            .then((data) => setUnsubscribeList(data));
    }, [emails.length]);

    useEffect(() => {
        fetch(`${API}/health-score`)
            .then((r) => r.json())
            .then((data) => {
                setHealthScore(data.health_score);
                localStorage.setItem("healthScore", data.health_score);
            });
    }, [emails.length]);

    useEffect(() => {
        fetch(`${API}/worst-offender`)
            .then((r) => r.json())
            .then((data) => {
                setWorstOffender(data);
                localStorage.setItem("worstOffender", JSON.stringify(data));
            });
    }, [emails.length]);

    if (!userEmail || healthScore == null) {
        return <CenterMessage text="Loading your dashboard..." />;
    }

    // ---------- filtering ----------
    const currentFilter = EMAIL_FILTERS.find((f) => f.name === activeFilter) || EMAIL_FILTERS[0];
    const search = senderSearch.toLowerCase();

    const filteredEmails = emails.filter((email) => {
        const matchesSearch =
            (email.sender_name || "").toLowerCase().includes(search) ||
            (email.subject || "").toLowerCase().includes(search) ||
            (email.sender_email || "").toLowerCase().includes(search);
        return currentFilter.test(email) && matchesSearch;
    });

    const allSelected = filteredEmails.length > 0 && filteredEmails.every((e) => selectedIds.includes(e.id));
    const selectedUnread = selectedIds.filter((id) => emails.find((e) => e.id === id)?.unread).length;

    function toggleSelect(id) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : filteredEmails.map((e) => e.id));
    }

    // tiles at the top: switch the list's filter, then scroll down to it
    function showFilter(name) {
        setActiveFilter(name);
        setSenderSearch(""); // clear any search, e.g. one left over from "Clean now"
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // worst offender "Clean now": show only their emails and tick them all
    function handleCleanWorst() {
        if (!worstOffender) return;
        const ids = emails.filter((e) => e.sender_email === worstOffender.sender_email).map((e) => e.id);

        setActiveFilter("All");
        setSenderSearch(worstOffender.sender_email);
        setSelectedIds(ids); // the selection bar pops up
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ---------- bulk actions ----------
    // keep refetching until the backend no longer returns these ids
    async function waitUntilGone(ids, { intervalMs = 1500, maxAttempts = 15 } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await refetchEmails();
            if (!latest?.some((e) => ids.includes(e.id))) return;
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        console.warn("waitUntilGone: gave up after max attempts, emails may still be present");
    }

    // shared by delete and archive, only the endpoint and wording differ
    async function runBulk(endpoint, verb, setBusy) {
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
                alert(
                    res.status === 429
                        ? "Gmail is busy right now, try again in a minute."
                        : `Failed to ${verb} selected emails.`
                );
                return;
            }

            await waitUntilGone(ids);
        } catch (err) {
            console.error(`${verb} failed:`, err);
        } finally {
            setBusy(false); // runs on every path above, so the bar never gets stuck
        }
    }

    const handleDelete = () => runBulk("/trash", "delete", setIsDeleting);
    const handleArchive = () => runBulk("/archive", "archive", setIsArchiving);

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

            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-canvas text-gray-800 px-8 pt-4 pb-16">
                {/* ROW 1: health (3/5) + four tiles (2/5) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
                    <div className="lg:col-span-3">
                        <HealthCard
                            score={healthScore}
                            worstOffender={worstOffender}
                            onCleanNow={handleCleanWorst}
                            pending={pending}
                        />
                    </div>

                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <MetricCard
                            label="Total"
                            value={emails.length}
                            sub="in your inbox"
                            onClick={() => showFilter("All")}
                            active={activeFilter === "All"}
                            pending={pending}
                        />
                        <MetricCard
                            label="Unread"
                            dotClass="bg-blue-600"
                            valueClass="text-blue-600"
                            value={unreadCount}
                            sub={`${unreadPct}% of inbox`}
                            onClick={() => showFilter("Unread")}
                            active={activeFilter === "Unread"}
                            pending={pending}
                        />
                        <MetricCard
                            label="Newsletters"
                            dotClass="bg-amber-500"
                            value={newsletters.length}
                            sub={`${newsletterSenders} senders`}
                            onClick={() => showFilter("Newsletter")}
                            active={activeFilter === "Newsletter"}
                            pending={pending}
                        />
                        <MetricCard
                            label="Promotions"
                            dotClass="bg-pink-500"
                            value={promotions.length}
                            sub={`${promotionSenders} senders`}
                            onClick={() => showFilter("Promotions")}
                            active={activeFilter === "Promotions"}
                            pending={pending}
                        />
                    </div>
                </div>

                {/* ROW 2: emails (3/5, under the health card) + insights column (2/5, under the tiles) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                    {/* the section keeps the floating selection bar inside the emails column */}
                    <section className="relative overflow-clip lg:col-span-3">
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

                    {/* order-first: on narrow screens the cards still come before the long list */}
                    <aside className="lg:col-span-2 flex flex-col gap-4 order-first lg:order-none">
                        <WorstOffenderCard
                            offender={worstOffender}
                            inboxTotal={emails.length}
                            onCleanNow={handleCleanWorst}
                            onUnsubscribe={() => handleUnsubscribeClick(worstOffender.sender_email)}
                            canUnsubscribe={unsubscribeList.some((u) => u.sender_email === worstOffender?.sender_email)}
                            pending={pending}
                        />
                        {/* flex-1 soaks up leftover height so the column ends level with the emails card */}
                        <div className="flex-1">
                            <UnsubscribeCard
                                list={unsubscribeList}
                                emails={emails}
                                onUnsubscribe={handleUnsubscribeClick}
                                syncing={pending}
                            />
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}

export default Dashboard;