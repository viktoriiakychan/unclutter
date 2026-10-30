import { useState, useEffect } from "react";
import CenterMessage from "./CenterMessage";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";
import { timeAgo } from "../utils/helpers";
import { API } from "../utils/constants";

const TABS = [
    { key: "all", label: "All", test: () => true },
    { key: "high_noise", label: "High noise", test: (s) => s.is_flagged },
    { key: "rarely_opened", label: "Rarely opened", test: (s) => s.unread_rate >= 50 },
];

// same column widths for the header row and every sender row, so they line up
const COLUMNS = "grid grid-cols-[minmax(200px,1.3fr)_minmax(160px,2fr)_64px_72px_148px] items-center gap-6";

const plural = (n) => `${n} ${n === 1 ? "email" : "emails"}`;

// pastel avatar, picked from the name so the same sender always gets the same colour
const AVATARS = [
    "bg-red-100 text-red-600",
    "bg-blue-100 text-blue-600",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-600",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-600",
];
function avatarClass(name) {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997; // *31 spreads similar names apart
    return AVATARS[hash % AVATARS.length];
}

// bar + number colour: red is "deal with this", amber "keep an eye on it", green "fine"
function noiseTone(score) {
    if (score >= 75) return { bar: "bg-red-500", text: "text-red-500" };
    if (score >= 45) return { bar: "bg-amber-500", text: "text-amber-500" };
    return { bar: "bg-emerald-500", text: "text-emerald-600" };
}

function unreadTone(rate) {
    if (rate >= 75) return "text-red-500";
    if (rate >= 50) return "text-amber-500";
    return "text-gray-950";
}

function ChevronIcon({ open }) {
    return (
        <svg
            viewBox="0 0 20 20"
            className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path d="M5.5 8l4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// the part that opens under a row: their latest emails + clean-up buttons
function SenderDetails({ inboxEmails, busy, onArchiveAll, onDeleteAll }) {
    if (inboxEmails.length === 0) {
        return (
            <p className="text-xs text-gray-400 py-2">
                Nothing from them in your inbox right now. Their older emails are already archived or deleted.
            </p>
        );
    }

    const unread = inboxEmails.filter((e) => e.unread).length;
    const preview = inboxEmails;
    const more = inboxEmails.length - preview.length;

    return (
        <div>
            <p className="text-xs text-gray-400 mb-2">
                {plural(inboxEmails.length)} in your inbox{unread > 0 && ` · ${unread} unread`}
            </p>

            <ul className="bg-white overflow-y-auto max-h-[200px] rounded-lg border border-gray-100 divide-y divide-gray-50">
                {preview.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                        {/* unread dot, an empty one keeps the subjects lined up */}
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.unread ? "bg-blue-600" : ""}`} />
                        <span className={`flex-1 min-w-0 truncate text-sm ${e.unread ? "font-semibold text-gray-950" : "text-gray-600"}`}>
                            {e.subject || "(no subject)"}
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">{timeAgo(e.internal_date)}</span>
                    </li>
                ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <span/>

                <div className="flex gap-2">
                    <button
                        onClick={onArchiveAll}
                        disabled={busy}
                        className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                        Archive all {inboxEmails.length}
                    </button>
                    <button
                        onClick={onDeleteAll}
                        disabled={busy}
                        className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                        {busy ? "Cleaning..." : `Delete all ${inboxEmails.length}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SenderRow({ sender, inboxEmails, striped, open, onToggle, busy, unsubscribing, onUnsubscribe, onArchiveAll, onDeleteAll }) {
    const name = sender.sender_name || sender.sender_email || "?";
    const score = Math.round(sender.noise_score);
    const unread = Math.round(sender.unread_rate);
    const tone = noiseTone(score);

    return (
        <div
            className={`rounded-xl transition-colors ${
                open ? "bg-blue-50/60 ring-1 ring-blue-100" : striped ? "bg-gray-50 hover:bg-blue-50/50" : "hover:bg-blue-50/50"
            }`}
        >
            {/* the row itself: click anywhere to open/close */}
            <div
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={onToggle}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}
                className={`${COLUMNS} px-4 py-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl`}
            >
                {/* sender */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarClass(name)}`}>
                        {name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-950 truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{sender.sender_email}</p>
                    </div>
                </div>

                {/* noise bar + score */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, score)}%` }} />
                    </div>
                    <span className={`w-8 text-right text-xs font-semibold tabular-nums ${tone.text}`}>{score}</span>
                </div>

                <span className="text-sm font-semibold text-gray-950 tabular-nums">{sender.total_emails}</span>
                <span className={`text-sm font-semibold tabular-nums ${unreadTone(unread)}`}>{unread}%</span>

                <div className="flex items-center justify-end gap-2">
                    {sender.can_unsubscribe && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // don't also open the row
                                onUnsubscribe(sender);
                            }}
                            disabled={unsubscribing}
                            className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                            {unsubscribing ? "..." : "Unsubscribe"}
                        </button>
                    )}
                    <span className={`p-1 rounded-md ${open ? "text-blue-600" : "text-gray-400"}`}>
                        <ChevronIcon open={open} />
                    </span>
                </div>
            </div>

            {/* pl-[64px] lines the details up with the sender's name (16px padding + 36px avatar + 12px gap) */}
            {open && (
                <div className="pl-[64px] pr-4 pb-4">
                    <SenderDetails inboxEmails={inboxEmails} busy={busy} onArchiveAll={onArchiveAll} onDeleteAll={onDeleteAll} />
                </div>
            )}
        </div>
    );
}

export default function TopSenders({ emails, refetchEmails }) {
    const [senders, setSenders] = useState(null); // null = still loading
    const [activeTab, setActiveTab] = useState("all");
    const [openEmail, setOpenEmail] = useState(null); // sender_email of the opened row
    const [unsubscribingEmail, setUnsubscribingEmail] = useState(null);
    const [busyEmail, setBusyEmail] = useState(null); // sender currently being deleted/archived
    const [confirm, setConfirm] = useState(null); // { action, sender, ids, unread }

    const showToast = useToast();

    function loadSenders() {
        return fetch(`${API}/noise-scores`)
            .then((r) => r.json())
            .then((data) => setSenders(data))
            .catch(() => setSenders((prev) => prev ?? []));
    }

    useEffect(() => {
        loadSenders();
    }, []);

    if (!senders) {
        return <CenterMessage text="Loading your top senders..." />;
    }

    const counts = Object.fromEntries(TABS.map((t) => [t.key, senders.filter(t.test).length]));
    const tab = TABS.find((t) => t.key === activeTab);
    const visible = senders.filter(tab.test);

    const flagged = senders.filter((s) => s.is_flagged);
    const unreadFromFlagged = flagged.reduce((total, s) => total + (s.unread_count || 0), 0);

    // newest first, only what's still in the inbox (the noise score also counts archived ones)
    function inboxEmailsFrom(senderEmail) {
        return emails
            .filter((e) => e.sender_email === senderEmail && !e.is_archived)
            .sort((a, b) => Number(b.internal_date) - Number(a.internal_date));
    }

    function askToClean(action, sender) {
        const list = inboxEmailsFrom(sender.sender_email);
        setConfirm({
            action,
            sender,
            ids: list.map((e) => e.id),
            unread: list.filter((e) => e.unread).length,
        });
    }

    async function post(endpoint, ids) {
        const res = await fetch(`${API}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) {
            const err = new Error(`${endpoint} failed`);
            err.status = res.status;
            throw err;
        }
    }

    // keep refetching until the backend no longer returns these ids
    async function waitUntilGone(ids, { intervalMs = 1500, maxAttempts = 15 } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await refetchEmails();
            if (!latest?.some((e) => ids.includes(e.id))) return;
            await new Promise((r) => setTimeout(r, intervalMs));
        }
    }

    async function undo(endpoint, ids) {
        await post(endpoint, ids);
        await refetchEmails();
        loadSenders();
    }

    async function runClean({ action, sender, ids }) {
        const isDelete = action === "delete";
        setBusyEmail(sender.sender_email);

        try {
            await post(isDelete ? "/trash" : "/archive", ids);
            await waitUntilGone(ids);
            loadSenders(); // their noise score changes after a clean up

            const name = sender.sender_name || sender.sender_email;
            showToast({
                message: isDelete ? `Moved ${plural(ids.length)} from ${name} to Trash` : `Archived ${plural(ids.length)} from ${name}`,
                onUndo: () => undo(isDelete ? "/untrash" : "/unarchive", ids),
            });
        } catch (err) {
            alert(
                err.status === 429
                    ? "Gmail is busy right now, try again in a minute."
                    : `Failed to ${action} these emails.`
            );
        } finally {
            setBusyEmail(null);
        }
    }

    async function handleUnsubscribe(sender) {
        const { sender_email } = sender;
        setUnsubscribingEmail(sender_email);

        try {
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

            // the button goes away, but the sender stays: their old emails still count as noise
            setSenders((prev) => prev.map((s) => (s.sender_email === sender_email ? { ...s, can_unsubscribe: false } : s)));
            showToast({ message: `Unsubscribed from ${sender.sender_name || sender_email}` });
        } catch {
            alert("Couldn't unsubscribe right now, try again in a minute.");
        } finally {
            setUnsubscribingEmail(null);
        }
    }

    return (
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-canvas px-8 pt-4 pb-6">
            <ConfirmDialog
                open={!!confirm}
                action={confirm?.action}
                count={confirm?.ids.length ?? 0}
                unreadCount={confirm?.unread ?? 0}
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                    const job = confirm;
                    setConfirm(null);
                    runClean(job);
                }}
            />

            <div className="bg-white rounded-2xl p-5">
                {/* tabs + summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-1.5">
                        {TABS.map((t) => {
                            const isActive = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                    }`}
                                >
                                    {t.label}
                                    <span className={`tabular-nums ${isActive ? "text-blue-500" : "text-gray-400"}`}>{counts[t.key]}</span>
                                </button>
                            );
                        })}
                    </div>

                    {flagged.length > 0 && (
                        <p className="text-xs text-gray-400">
                            <span className="font-semibold text-red-500">{flagged.length} flagged</span>
                            {" · "}
                            {unreadFromFlagged.toLocaleString()} unread from them
                        </p>
                    )}
                </div>

                {/* on narrow screens the table scrolls sideways instead of squashing */}
                <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                        <div className={`${COLUMNS} px-4 pb-2 text-[11px] font-semibold tracking-wider uppercase text-gray-400`}>
                            <span>Sender</span>
                            <span>Noise</span>
                            <span>Emails</span>
                            <span>Unread</span>
                            <span />
                        </div>

                        {visible.length === 0 ? (
                            <div className="py-14 text-center">
                                <p className="text-sm font-semibold text-gray-900">No senders here</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {senders.length === 0 ? "Sync some emails first." : "Nobody matches this filter right now."}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {visible.map((s, i) => (
                                    <SenderRow
                                        key={s.sender_email}
                                        sender={s}
                                        inboxEmails={openEmail === s.sender_email ? inboxEmailsFrom(s.sender_email) : []}
                                        striped={i % 2 === 0}
                                        open={openEmail === s.sender_email}
                                        onToggle={() => setOpenEmail((cur) => (cur === s.sender_email ? null : s.sender_email))}
                                        busy={busyEmail === s.sender_email}
                                        unsubscribing={unsubscribingEmail === s.sender_email}
                                        onUnsubscribe={handleUnsubscribe}
                                        onArchiveAll={() => askToClean("archive", s)}
                                        onDeleteAll={() => askToClean("delete", s)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}