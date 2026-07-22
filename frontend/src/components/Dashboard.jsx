import { useState, useEffect, useRef } from "react";

import unreadIcon from "../assets/unread-message.png";
import newsletterIcon from "../assets/newspaper.png";
import promotionIcon from "../assets/promotions.png";
import totalIcon from "../assets/email.png";
import searchIcon from "../assets/search.png";
import clearIcon from "../assets/close.png";
import rightArrowIcon from "../assets/right-arrow-blue.png";

import StatCard from "./StatCard";
import Header from "./Header";
import CenterMessage from "./CenterMessage";
import Sidebar from "./Sidebar";
import LoadingOverlay from "./LoadingOverlay";


import { API, FILTERS, CATEGORIES } from "../utils/constants";
import { timeAgo } from "../utils/helpers";

function Dashboard({ emails, refetchEmails }) {
  // stats computed from the real data
    const unreadCount = emails.filter((e) => e.unread).length;
    const promotionsCount = emails.filter((e) => e.category === "promotions").length;
    const newsletterCount = emails.filter((e) => e.is_newsletter).length;
    const senderCount = new Set(emails.map((e) => e.sender_email)).size; 

    const [activeFilter, setActiveFilter] = useState("All");

    const [senderSearch, setSenderSearch] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [unsubscribeList, setUnsubscribeList] = useState([]);

    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingIds, setDeletingIds] = useState([]); 

    const [isArchiving, setIsArchiving] = useState(false);
    const [archivingIds, setArchivingIds] = useState([]); 

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    useEffect(()=> {
        fetch(`${API}/auth/me`)
        .then((r) => r.json())
        .then((data) => setUserEmail(data.email));
    }, []);

        useEffect(()=> {
        fetch(`${API}/unsubscribe-list`)
        .then((r) => r.json())
        .then((data) => setUnsubscribeList(data));
    }, []);

    console.log(userEmail);

    if (!userEmail) {
        return <CenterMessage text="Loading your inbox..." />;
    }

    const filteredEmails = emails.filter((email) => {
        let matchesFilter = true;

        if (activeFilter === "Unread") {
        matchesFilter = email.unread;
        } 
        else if (activeFilter === "Newsletter") {
        matchesFilter = email.is_newsletter;
        } 
        else if (activeFilter === "Promotions") {
        matchesFilter = email.category === "promotions" && !email.is_newsletter;
        } 
        else if (activeFilter === "Updates") {
        matchesFilter = email.category === "updates" && !email.is_newsletter;
        } 
        else if (activeFilter === "Older than 30 days") {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        matchesFilter = Number(email.internal_date) < thirtyDaysAgo;
        }

        const search = senderSearch.toLowerCase();
        const matchesSearch =
        (email.sender_name || "").toLowerCase().includes(search) ||
        (email.subject || "").toLowerCase().includes(search) ||
        (email.sender_email || "").toLowerCase().includes(search);

        return matchesFilter && matchesSearch;

        return true;
    });

    function getCount(category)
    {
        if(category === "Newsletter")
        {
        return newsletterCount;
        }
        return emails.filter((email) => email.category === category.toLowerCase() && !email.is_newsletter).length;
    }

        function getPercentage(categoryCount, category)
        {
            return ((categoryCount / emails.length) * 100).toFixed(0);
        }

    function toggleSelect(id) 
    {
        // prev is what the selectedId is right now
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
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
        } 
        catch (err) {
            console.error("Delete failed:", err);
            setIsDeleting(false);
            setDeletingIds([]);
        }
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

  return (
    <>
        {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Are you sure?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    You're deleting {selectedIds.length} emails, including{" "}
                    <span className="font-semibold text-gray-900">
                        {selectedIds.filter(id => emails.find(e => e.id === id)?.unread).length} unread
                    </span>{" "}
                    emails
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                        onClick={() => {
                            setShowDeleteConfirm(false);
                            handleDelete();
                        }}                   
                    >
                        Confirm
                    </button>
                </div>
                </div>
            </div>
        )}

        {showArchiveConfirm && (
            <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Are you sure?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    You're deleting {selectedIds.length} emails, including{" "}
                    <span className="font-semibold text-gray-900">
                        {selectedIds.filter(id => emails.find(e => e.id === id)?.unread).length} unread
                    </span>{" "}
                    emails
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
                        onClick={() => setShowArchiveConfirm(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                        onClick={() => {
                            setShowArchiveConfirm(false);
                            handleArchive();
                        }}                   
                    >
                        Confirm
                    </button>
                </div>
                </div>
            </div>
        )}

        <div className="min-h-screen flex bg-gray-50 text-gray-800 overflow-x-hidden">
        
            <Sidebar/>

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col">
           <Header userEmail={userEmail} />
            {/* MAIN CONTENT */}
            <main className="p-6 overflow-y-auto overflow-x-hidden">

            {/* WELCOME BANNER */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white text-2xl">
                    ✓
                </div>
                <div>
                    <h2 className="text-l font-bold text-gray-900">
                    Hey there! — you've got {unreadCount} unread emails
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                    We've tidied through your inbox. Ready when you are.
                    </p>
                </div>
                </div>
                <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100">
                    Review first
                </button>
                <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-green-600">
                    Clean now →
                </button>
                </div>
            </div>

                {/* 4 STAT CARDS */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <StatCard value={unreadCount} label="unread emails" color="text-green-500" icon={unreadIcon}/>
                    <StatCard value={newsletterCount} label="newsletters" color="text-blue-500" icon={newsletterIcon} />
                    <StatCard value={promotionsCount} label="promotions" color="text-yellow-500" icon={promotionIcon}/>
                    <StatCard value={emails.length} label="total emails" color="text-red-500" icon={totalIcon}/>
                </div>

            {/* TWO COLUMN: email list (left) + panels (right) */}
            <div className="grid grid-cols-3 gap-6">

                {/* LEFT — email list */}
                <div className="col-span-2 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
                   
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">My Emails</h2>
                        <span className="text-sm text-gray-500">{emails.length} total</span>
                    </div>

                    <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200">
                        {FILTERS.map((filter) => (
                        <button
                            key={filter.name}
                            onClick={() => setActiveFilter(filter.name)}
                            className={`text-[10px] px-3 py-0.5 rounded-full font-medium flex-shrink-0 border ${
                            activeFilter === filter.name
                                ? filter.active // if match it gets the colour
                                : `text-gray-700 border-gray-500 ${filter.hover}` // if not match go grey 
                            }`}
                        >
                            {filter.name}
                        </button>
                        ))}
                        <div className="relative max-w-40">

                        <input
                            type="text"
                            value={senderSearch}
                            onChange={(e) => setSenderSearch(e.target.value)}
                            placeholder="Search by sender"
                            className="px-2 py-1 text-sm max-w-40 max-h-6 outline-none text-[10px] text-gray-500 border-b border-gray-400 focus:border-blue-400"
                        />
                        {senderSearch ? (
                            <img
                            src={clearIcon}
                            alt="search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                            />
                        ):
                        (
                            <img
                            src={searchIcon}
                            alt="search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                            />
                        )}
                        </div>
                    </div>

                    <div className="relative">
                        {isDeleting && <LoadingOverlay action="delete" />}
                        {isArchiving && <LoadingOverlay action="archive" />}
                        <div className="relative max-h-79 overflow-y-auto">

                            {filteredEmails.map((email) => {
                            return (
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
                                    {email.unread ? (
                                        <div className="text-sm font-medium text-gray truncate">{email.subject}</div>
                                    ) : (
                                        <div className="text-sm font-normal text-gray truncate">{email.subject}</div>
                                    )}
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

                                <span className="text-[10px] py-0.5 font-small text-gray-400 flex-shrink-0">
                                    {timeAgo(email.internal_date)}
                                    </span>
                                
                                </div>
                            );
                            })}
                        </div>
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
                                disabled={selectedIds.length === 0 || isArchiving || isDeleting}
                                onClick={() => setShowArchiveConfirm(true)}
                                className="px-10 py-1 rounded-lg border border-gray-600/40 bg-gray-600/10 text-gray-600 text-sm font-medium hover:bg-gray-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-600/10"

                            >
                            {isArchiving ? "Archiving..." : "Archive"}
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={selectedIds.length === 0 || isArchiving || isDeleting}
                                className="px-10 py-1 rounded-lg border border-red-600/40 bg-red-600/10 text-red-600 text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/10"
                            >
                            {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>

                </div>

                {/* RIGHT — two stacked panels */}
                <div className="space-y-4">

                    {/* panel 1 — inbox health */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Inbox health</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                X flagged
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-4xl font-bold text-red-500">X</span>
                            <span className="text-sm text-gray-400 font-medium">/100</span>
                        </div>
                        {/*do colors - red orange green*/}
                        <p className="text-sm text-gray-500 mb-4"> 
                            <span className="font-semibold text-gray-800">X</span> is your worst offender — X emails, X% unread.
                        </p>

                        <a
                            href="#"
                            className="flex items-center justify-between w-full px-4 py-2 rounded-lg border border-blue-400 text-blue-500 text-sm font-medium hover:bg-blue-50"
                        >
                            See top senders
                            <img src={rightArrowIcon} alt="" className="w-5 h-5" />
                        </a>
                    </div>


                    {/* panel 2 — unsubscribe */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-60">
                        <h3 className="font-semibold text-gray-900 mb-4">Unsubscribe</h3>
                        <div className="space-y-3 text-sm">
                            {unsubscribeList.map((item) =>(
                                <div key={item.sender_email} className="flex items-center justify-between gap-2">
                                {/* name block — left */}
                                <div className="min-w-0">
                                    <div className="text-[12px] text-gray-700 truncate">{item.sender_name}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{item.sender_email}</div>
                                </div>

                                {/* count + button — grouped together on the right */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="w-6 text-right text-xs text-gray-400">{item.count}</span>
                                    <a
                                    href={item.unsubscribe}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg border border-blue-400 text-blue-500 text-xs font-medium hover:bg-blue-50"
                                    >
                                    Unsubscribe
                                    </a>
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            </main>
        </div>
        </div>
    </>
  );
}

export default Dashboard;