import { useState, useEffect } from "react";
import unreadIcon from "./assets/unread-message.png";
import newsletterIcon from "./assets/newspaper.png";
import promotionIcon from "./assets/promotions.png";
import totalIcon from "./assets/email.png";
import searchIcon from "./assets/search.png";
import clearIcon from "./assets/close.png";



// components etc.
import StatCard from "./components/StatCard";
import CenterMessage from "./components/CenterMessage";
import Dashboard from "./components/Dashboard";

// constants 
import { API, FILTERS, CATEGORIES} from "./utils/constants";

import { timeAgo } from "./utils/helpers";


// GET = retrieve data / get data -> backend just sends the stuff 
// POST = do something / want the server to acc do something or create / update data

function App() {
  // checking → loading → loggedOut → ready
  const [phase, setPhase] = useState("checking");
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API}/sync`, { method: "POST" })
        .then(() => fetch(`${API}/emails`))
        .then((r) => r.json())
        .then((fresh) => setEmails(fresh));
    }, 30000);  // every 30 seconds

    return () => clearInterval(interval);
  }, []);

  async function checkLogin() {
    setPhase("checking");
    const res = await fetch(`${API}/auth/status`);
    const { logged_in } = await res.json(); // true or false

    if (logged_in) {
      fetch(`${API}/auth/me`)
      .then((r) => r.json())
      .then((data) => setUserEmail(data.email));

      await loadEverything();
    } else {
      setPhase("loggedOut");
    }
  }

  async function handleLogin() {
    setPhase("loading");
    await fetch(`${API}/auth/login`, { method: "POST" }); // Google popup
    await loadEverything();
  }

  async function loadEverything() {
    setPhase("loading");
    // 1. show db data immediately
    const res = await fetch(`${API}/emails`);
    setEmails(await res.json());
    setPhase("ready"); // dashboard shows nowfrom db

    // 2. sync in the background 
    fetch(`${API}/sync`, { method: "POST" })
    .then(() => fetch(`${API}/emails`))
    .then((r) => r.json())
    .then((fresh) => setEmails(fresh)); 
  }

  // ---- what to show, based on phase ----
  if (phase === "checking") {
    return <CenterMessage text="Checking login..." />;
  }

  if (phase === "loading") {
    return <CenterMessage text="Loading your inbox..." />;
  }

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

  return <Dashboard emails={emails} />;
}

export default App;