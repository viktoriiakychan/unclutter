import { useState, useEffect, useRef } from "react";

import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Cleanup from './components/Cleanup'
import SyncRangePicker from "./components/SyncRangePicker";

import unreadIcon from "./assets/unread-message.png";
import newsletterIcon from "./assets/newspaper.png";
import promotionIcon from "./assets/promotions.png";
import totalIcon from "./assets/email.png";
import searchIcon from "./assets/search.png";
import clearIcon from "./assets/close.png";
import logoIcon from "./assets/unclutter-mark.svg";


import StatCard from "./components/StatCard";
import CenterMessage from "./components/CenterMessage";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import SyncProgress from "./components/SyncProgress";
import SignIn from "./components/SignIn";

import { API, FILTERS, CATEGORIES } from "./utils/constants";
import { timeAgo } from "./utils/helpers";
import Activity from "./components/ActivityLog";
import InboxStats from "./components/InboxStats";
import TopSenders from "./components/TopSenders";

const BRAND_BLUE = "#2563eb";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function atLeast(ms, promise) {
  const [result] = await Promise.all([promise, sleep(ms)]);
  return result;
}

const PAGE_HEADERS = {
  "/cleanup": { title: "Clean up", subtitle: "Suggested cleanups you can act on now, or filter to find your own" },
  "/activity": { title: "Activity", subtitle: "A record of what you've cleaned up" },
  "/inbox-stats": { title: "Inbox Stats", subtitle: "How your inbox is trending, and where the clutter is coming from" },
  "/top-senders": { title: "Top Senders", subtitle: "Ranked by how much noise they add to your inbox" },
};

function App() {
  const [phase, setPhase] = useState("checking");
  const [emails, setEmails] = useState([]);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState(null);

  const isRefreshing = useRef(false);

  const navigate = useNavigate();

  const location = useLocation();
  const isDashboard = location.pathname === "/";

  useEffect(() => {
    checkLogin();
  }, []);

  const phaseRef = useRef(phase);

  useEffect(() => {
      phaseRef.current = phase;
  }, [phase]);

  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0, running: false, type: null });

  // every 30s: start a sync and watch it until it's done (progress is only checked while a sync runs)
  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current === "ready") {
        syncAndWait();
      }
    }, 30000);
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

  const [manualSyncing, setManualSyncing] = useState(false);

  async function handleSyncNow() {
    setManualSyncing(true);
    await syncAndWait();
    setManualSyncing(false);
  }
    const isSyncing = useRef(false);

  async function syncAndWait(body = {}) {
    if (isSyncing.current) return;   // don't start a second one on top
    isSyncing.current = true;

    try {
      await fetch(`${API}/sync/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // watch it until it's done
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`${API}/sync/progress`);
        const progress = await res.json();
        setSyncProgress(progress);

        if (!progress.running) break;
        if (progress.type === "full") refetchEmails();   // show emails filling in during the big first sync
      }

      refetchEmails();   // one final refresh once it's finished
    } catch (err) {
      console.error("sync failed:", err);
    } finally {
      isSyncing.current = false;
    }
  }

  async function checkLogin() {
    setPhase("checking");
    const res = await atLeast(2000, fetch(`${API}/auth/status`));
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
          setUserName(emailData.name || null);
          ready = true;
      }
    } catch (err) {
      console.error("Failed to fetch user email:", err);
    }

    syncAndWait();
  }

  if (phase === "checking") return <CenterMessage text="Checking login..." />;

  if (phase === "loggedOut") return <SignIn onLogin={handleLogin} />;

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
      setUserName(null);
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

    syncAndWait({ days });
}

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={userEmail} userName={userName} onSignOut={handleSignOut} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          userName={userName}
          lastSynced={syncProgress.last_synced}
          syncing={manualSyncing || (syncProgress.running && syncProgress.type === "full")}
          onSyncNow={handleSyncNow}
          title={PAGE_HEADERS[location.pathname]?.title}
        />  
        <SyncProgress progress={syncProgress}/>
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