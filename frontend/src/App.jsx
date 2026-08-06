import { useState, useEffect, useRef } from "react";

import { Routes, Route, useNavigate } from 'react-router-dom'
import Cleanup from './components/Cleanup'
import SyncRangePicker from "./components/SyncRangePicker";

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
import SyncProgress from "./components/SyncProgress";

import { API, FILTERS, CATEGORIES } from "./utils/constants";
import { timeAgo } from "./utils/helpers";
import Activity from "./components/ActivityLog";
import InboxStats from "./components/InboxStats";
import TopSenders from "./components/TopSenders";

const BRAND_BLUE = "#2563eb";

function App() {
  const [phase, setPhase] = useState("checking");
  const [emails, setEmails] = useState([]);

  const [userEmail, setUserEmail] = useState("");

  const isRefreshing = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    checkLogin();
  }, []);

  const phaseRef = useRef(phase);

  useEffect(() => {
      phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current === "ready") {
        triggerSync().then(() => refetchEmails());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);



  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`${API}/sync/progress`);
      const progress = await res.json();
      if (progress.running) {
        refetchEmails();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0, running: false, type: null });

useEffect(() => {
    function checkProgress() {
      fetch(`${API}/sync/progress`)
        .then((r) => r.json())
        .then(setSyncProgress);
    }
    checkProgress();
    const interval = setInterval(checkProgress, 1000);
    return () => clearInterval(interval);
}, []);

const syncMostlyDone = !(syncProgress.running && syncProgress.type === "full");

  // cheap — just reads your own DB, safe to poll often
  async function refetchEmails() {
    const res = await fetch(`${API}/emails`);
    const data = await res.json();
    setEmails(data);
    return data;
  }

  // expensive — talks to Gmail, only call when you actually mean to sync
  async function triggerSync() {
    await fetch(`${API}/sync/start`, { method: "POST" });
  }

  async function checkLogin() {
    setPhase("checking");
    const res = await fetch(`${API}/auth/status`);
    const { logged_in } = await res.json();

    if (logged_in) {
      setPhase("restoring");
      await loadEverything();
    } else {
      setPhase("loggedOut");
    }
  }

  async function handleLogin() {
    setPhase("loading");
    await fetch(`${API}/auth/login`, { method: "POST" });
    setPhase("pickingRange");
  }

 async function loadEverything() {
    const res = await fetch(`${API}/emails`);
    setEmails(await res.json());
    setPhase("ready");

    try {
      const emailRes = await fetch(`${API}/auth/me`);
      const emailData = await emailRes.json();
      if (emailData.email) {
        setUserEmail(emailData.email);
      }
    } catch (err) {
      console.error("Failed to fetch user email:", err);
    }

    triggerSync();
  }

  if (phase === "checking") return <CenterMessage text="Checking login..." />;

  if (phase === "loggedOut") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
        <style>{`
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes softDrift {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(15px, -10px) scale(1.05); }
          }
          .fade-up { animation: fadeUp 0.5s ease-out; }
          .fade-up-delay { animation: fadeUp 0.5s ease-out 0.15s both; }
          .blob { animation: softDrift 8s ease-in-out infinite; }
        `}</style>

        {/* soft background blobs, purely decorative */}
        <div
          className="blob absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl"
          style={{ backgroundColor: BRAND_BLUE, opacity: 0.08 }}
        />
        <div
          className="blob absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: BRAND_BLUE, opacity: 0.06, animationDelay: "2s" }}
        />

        <div className="fade-up bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-sm w-full relative">
          <span className="font-bold text-3xl tracking-tight">
            unclutter<span style={{ color: BRAND_BLUE }}>.</span>
          </span>

          <p className="text-gray-500 mt-3 mb-5 text-sm leading-relaxed">
            See what's cluttering your inbox, and clear it out in a few clicks.
          </p>

          <div className="fade-up-delay flex items-center justify-center gap-5 mb-6 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
              Smart cleanup
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
              Inbox insights
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
              Auto sync
            </span>
          </div>

          <button
            onClick={handleLogin}
            className="w-full px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            Sign in with Google
          </button>

          
        </div>
      </div>
    );
  }

  if (phase === "pickingRange") {
    return <SyncRangePicker onSelect={handleRangeSelected} />;
  }

  if (phase === "loading") return <CenterMessage text="Signing you in..." />;
  //if (phase === "restoring") return <CenterMessage text="Loading your inbox..." />;

  const handleSignIn = () => {
    window.location.href = "/api/auth/login";
  };

  

const handleSignOut = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST" });
      setUserEmail(null);
      setEmails([]);
      setPhase("loggedOut");
      navigate("/");

      localStorage.removeItem("healthScore");
      localStorage.removeItem("flaggedCount");
      localStorage.removeItem("worstOffender");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
};

async function handleRangeSelected(days) {
    setPhase("loading");
    const res = await fetch(`${API}/emails`);
    setEmails(await res.json());
    setPhase("ready");

    // poll until the backend genuinely confirms it's ready, instead of guessing a delay
    let ready = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const emailRes = await fetch(`${API}/auth/me`);
        const emailData = await emailRes.json();
        if (emailData.email) {
          setUserEmail(emailData.email);
          ready = true;
          break;
        }
      } catch (err) {
        console.error("auth/me check failed:", err);
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      console.error("Gave up waiting for backend to be ready");
      return;
    }

    await fetch(`${API}/sync/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
}

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-hidden">
        <Header userEmail={userEmail} onSignIn={handleSignIn} onSignOut={handleSignOut} />
        <SyncProgress API={API}/>
        <Routes>
          <Route path="/" element={<Dashboard emails={emails} refetchEmails={refetchEmails} userEmail={userEmail} syncMostlyDone={syncMostlyDone} />} />
          <Route path="/cleanup" element={<Cleanup emails={emails} refetchEmails={refetchEmails}/>} />
          <Route path="/activity" element={<Activity refetchEmails={refetchEmails} />} />
          <Route path="/inbox-stats" element={<InboxStats />} />
          <Route path="/top-senders" element={<TopSenders refetchEmails={refetchEmails} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;