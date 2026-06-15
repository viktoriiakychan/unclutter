import { useState, useEffect } from "react";
import unreadIcon from "./assets/unread-message.png";
import newsletterIcon from "./assets/newspaper.png";
import promotionIcon from "./assets/promotions.png";
import totalIcon from "./assets/email.png";

const API = "http://localhost:5000";

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


function CenterMessage({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
      {text}
    </div>
  );
}

function Dashboard({ emails }) {
  // stats computed from the real data
  const unreadCount = emails.filter((e) => e.unread).length;
  const promotionsCount = emails.filter((e) => e.category === "promotions").length;
  const newsletterCount = emails.filter((e) => e.is_newsletter).length;
  const senderCount = new Set(emails.map((e) => e.sender_email)).size; 

  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "Newsletter", "Promotions", "Updates", "Older than 30 days"];

  const filterColors = {
    "All": "bg-green-50 text-green-500 border-green-300",
    "Newsletter": "bg-blue-50 text-blue-500 border-blue-300",
    "Promotions": "bg-yellow-50 text-yellow-600 border-yellow-300",
    "Updates": "bg-orange-50 text-orange-500 border-orange-300",
    "Older than 30 days": "bg-gray-100 text-gray-600 border-gray-400",
  };

  const filterHovers = {
    "All": "hover:bg-green-50 hover:text-green-600 hover:border-green-200",
    "Newsletter": "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200",
    "Promotions": "hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200",
    "Updates": "hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200",
    "Older than 30 days": "hover:bg-gray-100 hover:text-gray-800 hover:border-gray-400",
  };

  const filteredEmails = emails.filter((email) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Newsletter") return email.is_newsletter;
    if (activeFilter === "Promotions") return email.category === "promotions" && !email.is_newsletter;
    if (activeFilter === "Updates") return email.category === "updates" && !email.is_newsletter;
    if (activeFilter === "Older than 30 days") {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return Number(email.internal_date) < thirtyDaysAgo;
    }
    return true;
  });

  function timeAgo(internalDate) {
    const ageMs = Date.now() - Number(internalDate);
    const mins = Math.floor(ageMs / (60 * 1000));
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const weeks = Math.floor(ageMs / (7* 24 * 60 * 60 * 1000));

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${weeks}w ago`;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800 overflow-x-hidden">
      {/* -------- SIDEBAR -------- */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">

        {/* ----- LOGO -----*/}
        <div className="px-6 py-5 flex items-center ">
          <span className="font-bold text-2xl tracking-tight">unclutter<span className="text-blue-600">.</span></span>
        </div>

        <nav className="px-3 mt-2 space-y-1">
          {/* group 1 - clean */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Clean
            </p>

            <div className="space-y-1">
              <a className="flex text-sm items-center justify-between px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">
                <span>Dashboard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-400 text-green-900 font-semibold">new</span>
              </a>
              <a className="flex text-sm  items-center justify-between px-3 py-2 rounded-lg text-red-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                <span>Bulk Delete</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">2,847</span>
              </a>
              <a className="flex text-sm items-center justify-between px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                <span>Unsubscribe</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">24</span>
              </a>
              <a className="flex text-sm items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                Archive
              </a>
            </div>
          </div>

          {/* group 2 - analyse */}
          <div>
            <p className="px-3 mt-8 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Analyse
            </p>

            <div className="space-y-1">
              <a className="flex items-center text-sm px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                Inbox Stats
              </a>
              <a className="flex items-center text-sm px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                Top Senders
              </a>
            </div>
          </div>

        </nav>
      </aside>


      {/* RIGHT SIDE */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <input
            type="text"
            placeholder="Search..."
            className="px-3 py-2 rounded-lg bg-gray-100 text-sm w-72 outline-none"
          />

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
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`text-[10px] px-4 py-0.5 rounded-full font-medium flex-shrink-0 border ${
                      activeFilter === filter
                        ? filterColors[filter] // if match it gets the colour
                        : `text-gray-700 border-gray-500 ${filterHovers[filter]}` // if not match go grey 
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Search by sender"
                  className="px-3 py-1 rounded-lg bg-gray-100 text-sm max-w-40 max-h-6 outline-none text-[10px]"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredEmails.map((email) => {

                  
                  
                  return (
                    <div
                      key={email.id}
                      className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          email.unread ? "bg-blue-500" : "bg-transparent"
                        }`}
                      ></span>

                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
                        {email.sender_name ? email.sender_name[0].toUpperCase() : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        
                        <div className="text-xs text-gray-400 truncate">{email.sender_email}</div>
                        {email.unread ? (
                            <div className="text-sm font-medium text-gray truncate">{email.subject}</div>
                          ) : (
                            <div className="text-sm font-normal text-gray truncate">{email.subject}</div>
                          )}
                      </div>
                      
                      {email.is_newsletter ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                          newsletter
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            email.category === "promotions" ? "bg-yellow-100 text-yellow-700" :
                            email.category === "social"     ? "bg-purple-100 text-purple-700" :
                            email.category === "updates"    ? "bg-orange-100 text-orange-700" :
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

            {/* RIGHT — two stacked panels */}
            <div className="space-y-4">

              {/* panel 1 — by category */}
              <div className="bg-white rounded-xl border border-gray-200 p-5  min-h-48">
                <h3 className="font-semibold text-gray-900 mb-4">By category</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Newsletters</span>
                    <span className="font-medium text-gray-900">{newsletterCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unread</span>
                    <span className="font-medium text-gray-900">{unreadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Senders</span>
                    <span className="font-medium text-gray-900">{senderCount}</span>
                  </div>
                </div>
              </div>

              {/* panel 2 — unsubscribe */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-72">
                <h3 className="font-semibold text-gray-900 mb-4">Unsubscribe</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-500">Newsletter senders will appear here.</p>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      {icon && <img src={icon} alt={label} className="w-6 h-6 mb-4" />}
      <div className={`text-4xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
export default App;