import { NavLink } from "react-router-dom";
import { LayoutGrid, Sparkles, History, ChartColumn, Users, LogOut } from "lucide-react";
import Logo from "./Logo";

// one place to add/rename/reorder pages
const SECTIONS = [
  {
    title: "Clean",
    links: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
      { to: "/cleanup", label: "Clean up", icon: Sparkles },
      { to: "/activity", label: "Activity", icon: History },
    ],
  },
  {
    title: "Analyse",
    links: [
      { to: "/inbox-stats", label: "Inbox Stats", icon: ChartColumn },
      { to: "/top-senders", label: "Top Senders", icon: Users },
    ],
  },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} strokeWidth={2} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function UserCard({ userEmail, onSignOut }) {
  if (!userEmail) return null;

  // "vvkychan@gmail.com" -> "vvkychan" + "@gmail.com"
  const at = userEmail.indexOf("@");
  const name = at > -1 ? userEmail.slice(0, at) : userEmail;
  const domain = at > -1 ? userEmail.slice(at) : "";

  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl p-2.5">
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
        {name[0]?.toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400 truncate">{domain}</p>
      </div>

      <button
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Sidebar({ userEmail, onSignOut }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-slate-50 flex flex-col">
      <div className="px-5 py-6">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 px-3 space-y-7">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3">
        <UserCard userEmail={userEmail} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}