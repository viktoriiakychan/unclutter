import { useState, useEffect, useRef } from "react";

import unreadIcon from "../assets/unread-message.png";
import newsletterIcon from "../assets/newspaper.png";
import promotionIcon from "../assets/promotions.png";
import totalIcon from "../assets/email.png";
import searchIcon from "../assets/search.png";
import clearIcon from "../assets/close.png";

import StatCard from "./StatCard";
import CenterMessage from "./CenterMessage";
import Sidebar from "./Sidebar";

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

    const [showConfirm, setShowConfirm] = useState(false);

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

        await waitUntilGone(idsToDelete);
        } catch (err) {
        console.error("Delete failed:", err);
        setIsDeleting(false);
        setDeletingIds([]);
        }
    }

    function showDeleteWindow()
    {
        setShowConfirm(true);
    }

    async function waitUntilGone(ids, { intervalMs = 30000, maxAttempts = 10 } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) 
        {
            const latest = await refetchEmails(); 
            const stillPresent = latest?.some((e) => ids.includes(e.id)); // if lastesy isnt null/undefined + goes through every email e in the new fresh list and checkes if that email's id is in the ones we try to delete -> some returns true when finds match

            if (!stillPresent) { // if none of the emails i try to delete shows up in fresh list
                setIsDeleting(false);
                setDeletingIds([]);
                return;
            }
            await new Promise((r) => setTimeout(r, intervalMs)); // if the emails are still present we wait
        }

        // if loop is done  but nothing found 
        setIsDeleting(false);
        setDeletingIds([]);
    }


  return (
    <>
        {showConfirm && (
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
                        onClick={() => setShowConfirm(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                        onClick={() => {
                            setShowConfirm(false);
                            handleDelete();
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
            {/* TOP BAR */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 rounded-4xl border-blue-200 border px-4 py-1">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs bg-gradient-to-l from-blue-50 to-blue-200 flex items-center justify-center font-semibold flex-shrink-0">
                {userEmail ? userEmail[0].toUpperCase() : "?"}
                </div>
                <span className="text-blue-700 font-semibold text-xs">{userEmail}</span>
            </div>

            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                Sign In
            </button>

            </header>

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

                <div className="max-h-96 overflow-y-auto">
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
                <div className="grid grid-cols-4 gap-5 px-6 py-2">
                    <span className="">{selectedIds.length} selected</span>

                    <button className="px-2 py-1 rounded-lg border border-amber-700/40 bg-amber-700/10 text-amber-700 text-sm font-medium hover:bg-amber-700/20 transition-colors">
                        Unsubscribe
                    </button>

                    <button className="px-2 py-1 rounded-lg border border-slate-500/40 bg-slate-500/10 text-slate-600 text-sm font-medium hover:bg-slate-500/20 transition-colors">
                        Archive
                    </button>

                    <button
                        onClick={showDeleteWindow} // used to be handleDelete 
                        disabled={selectedIds.length === 0 || isDeleting}
                        className="px-2 py-1 rounded-lg border border-red-600/40 bg-red-600/10 text-red-600 text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/10"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>

                </div>

                {/* RIGHT — two stacked panels */}
                <div className="space-y-4">

                {/* panel 1 — by category */}
                <div className="bg-white rounded-xl border border-gray-200 p-5  min-h-48">
                    <h3 className="font-semibold text-gray-900 mb-4">By category</h3>

                    {CATEGORIES.map((category) => (
                    <div className="flex items-center gap-3 py-1" key={category.name}>
                        <span className="w-20 text-[12px] text-gray-500 flex-shrink-0">{category.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100">
                        <div className={`h-2 rounded-full min-w-[8px] ${category.style}`}
                            style={{ width: `${getPercentage(getCount(category.name), category.name)}%` }}></div>
                        </div>
                        <span className="w-8 text-right text-xs text-gray-400 flex-shrink-0">{getCount(category.name)}</span>
                        <span className={`w-10 text-right text-xs font-semibold ${category.text_color} flex-shrink-0`}>{getPercentage(getCount(category.name), category.name)}%</span>
                    </div>
                    ))}
                    
                    
                </div>

                {/* panel 2 — unsubscribe */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-72">
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