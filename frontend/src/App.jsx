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

import { API, FILTERS, CATEGORIES } from "./utils/constants";
import { timeAgo } from "./utils/helpers";

function App() {
  const [phase, setPhase] = useState("checking");
  const [emails, setEmails] = useState([]);

  const isRefreshing = useRef(false);

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshEmails();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // one function, used for both the 30s poll and delete-checking
  async function refreshEmails() {
    if (isRefreshing.current) return emails; // skip overlapping calls
    isRefreshing.current = true;
    try {
      await fetch(`${API}/sync`, { method: "POST" });
      const res = await fetch(`${API}/emails`);
      const fresh = await res.json();
      setEmails(fresh);
      return fresh;
    } finally {
      isRefreshing.current = false;
    }
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

    refreshEmails();
  }

  if (phase === "checking") return <CenterMessage text="Checking login..." />;
  if (phase === "loading") return <CenterMessage text="Loading your inbox..." />;

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


  return (
    <Routes>
      <Route path="/" element={<Dashboard emails={emails} refetchEmails ={refreshEmails} />} />
      <Route path="/cleanup" element={<Cleanup emails={emails} refetchEmails ={refreshEmails}/>} />
    </Routes>
  );
}

export default App;