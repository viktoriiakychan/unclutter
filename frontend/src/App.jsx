import { useState, useEffect } from "react";

function App() {
  const [emails, setEmails] = useState([]);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/emails")
      .then((res) => res.json())
      .then((data) => setEmails(data));
  }, []);

  // simple stats from your real data
  const unreadCount = emails.filter((e) => e.unread).length;
  const newsletterCount = emails.filter((e) => e.is_newsletter).length;
  const senderCount = new Set(emails.map((e) => e.sender_email)).size;



  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800 overflow-x-hidden">
      {/* -------- SIDEBAR -------- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        
        {/* ----- LOGO -----*/}
        <div className="px-6 py-5 flex items-center ">
          <span className="font-bold text-3xl tracking-tight">unclutter<span className="text-blue-600">.</span></span>
        </div>

        <nav className="px-3 mt-2 space-y-1">
          {/* group 1 - clean */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Clean
            </p> 
              
            
            <div className="space-y-1">
              <a className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">
                <span>Dashboard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-400 text-green-900 font-semibold">new</span>
              </a>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg text-red-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                <span>Bulk Delete</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">2,847</span>
              </a>
              <a className="flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                <span>Unsubscribe</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">24</span>
              </a>
              <a className="flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                Archive
              </a>
            </div>
          </div>

          {/* group 2 - analyse */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Analyse
            </p>

            <div className="space-y-1">
              <a className="flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
                Inbox Stats
              </a>
              <a className="flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700">
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
                <h2 className="text-xl font-bold text-gray-900">
                  Hey Viktoriia 👋 — you've got {unreadCount} unread emails
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
            <StatCard value={unreadCount} label="unread emails" color="text-green-500" />
            <StatCard value={newsletterCount} label="newsletters" color="text-blue-500" />
            <StatCard value={senderCount} label="senders" color="text-yellow-500" />
            <StatCard value={emails.length} label="total emails" color="text-red-500" />
          </div>

         {/* TWO COLUMN: email list (left) + panels (right) */}
<div className="grid grid-cols-3 gap-6">

  {/* LEFT — email list */}
{/* LEFT */}
<div className="col-span-2 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
      <h2 className="font-semibold text-gray-900">My Emails</h2>
      <span className="text-sm text-gray-500">{emails.length} total</span>
    </div>

    <div>
      {emails.map((email) => (
        <div
          key={email.id}
          className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">
            {email.sender_name ? email.sender_name[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate">{email.sender_email}</div>
            <div className="text-sm font-medium text-gray-900 truncate">{email.subject}</div>
          </div>
          {email.is_newsletter && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium flex-shrink-0">
              newsletter
            </span>
          )}
          {email.unread && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* RIGHT — two stacked panels */}
  {/* RIGHT */}
<div className="space-y-4">

    {/* panel 1 — by category */}
    <div className="bg-white rounded-xl border border-gray-200 p-5">
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
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

// small reusable card component
function StatCard({ value, label, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-10">
      <div className={`text-5xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

export default App;