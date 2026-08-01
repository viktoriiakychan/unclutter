import { useState, useEffect, useRef } from "react";

import { Routes, Route } from 'react-router-dom'
import Cleanup from './components/Cleanup'

import unreadIcon from "./assets/unread-message.png";
import newsletterIcon from "./assets/newspaper.png";
import promotionIcon from "./assets/promotions.png";
import totalIcon from "./assets/email.png";
import searchIcon from "./assets/search.png";
import clearIcon from "./assets/close.png";

import StatCard from "./components/StatCard";
import CenterMessage from "./components/CenterMessage";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

import { API, FILTERS, CATEGORIES } from "./utils/constants";
import { timeAgo } from "./utils/helpers";
import Activity from "./components/ActivityLog";
import InboxStats from "./components/InboxStats";
import TopSenders from "./components/TopSenders";

function App() {
  const [phase, setPhase] = useState("checking");
  const [emails, setEmails] = useState([]);

  const [userEmail, setUserEmail] = useState("");


  const isRefreshing = useRef(false);

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchEmails();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(()=> {
        fetch(`${API}/auth/me`)
        .then((r) => r.json())
        .then((data) => setUserEmail(data.email));
    }, []);

   


  // one function, used for both the 30s poll and delete-checking
  async function refetchEmails() {
    await fetch(`${API}/sync`, { method: "POST" });
    const res = await fetch(`${API}/emails`);
    const data = await res.json();
    setEmails(data);
    return data;
  }

  async function checkLogin() {
    setPhase("checking");
    const res = await fetch(`${API}/auth/status`);
    const { logged_in } = await res.json();

    if (logged_in) {
      await loadEverything();
    } else {
      setPhase("loggedOut");
    }
  }

  async function handleLogin() {
    setPhase("loading");
    await fetch(`${API}/auth/login`, { method: "POST" });
    await loadEverything();
  }

  async function loadEverything() {
    setPhase("loading");
    const res = await fetch(`${API}/emails`);
    setEmails(await res.json());
    setPhase("ready");

    refetchEmails();
  }

  if (phase === "checking") return <CenterMessage text="Checking login..." />;

  if (phase === "loggedOut") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <span className="font-bold text-3xl tracking-tight">
            unclutter<span className="text-blue-600">.</span>
          </span>
          <p className="text-gray-500 mt-4 mb-6">Sign in to load your inbox.</p>
          <button
            onClick={handleLogin}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSignIn = () => {
  window.location.href = "/api/auth/login";
};

const handleSignOut = async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserEmail(null);
  } catch (err) {
    console.error("Sign out failed:", err);
  }
};


  return (
    // App.jsx or a Layout.jsx
<div className="flex h-screen overflow-hidden">
  <Sidebar />
  <div className="flex-1 min-w-0 overflow-hidden">
    <Header userEmail={userEmail} onSignIn={handleSignIn} onSignOut={handleSignOut} />
    <Routes>
            <Route path="/" element={<Dashboard emails={emails} refetchEmails ={refetchEmails} />} />
            <Route path="/cleanup" element={<Cleanup emails={emails} refetchEmails ={refetchEmails}/>} />
            <Route path="/activity" element={<Activity refetchEmails ={refetchEmails} />} />
            <Route path="/inbox-stats" element={<InboxStats />} />
            <Route path="/top-senders" element={<TopSenders refetchEmails ={refetchEmails} />} />
    </Routes>
  </div>
</div>
  );
}

export default App;