import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

import { API } from "../utils/constants";



const FLAGGED_THRESHOLD = 60;

function StatCard_TopSenders({ icon, value, valueSuffix, label, variant }) {
  if (variant === "red") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 bg-red-100 text-red-500">
          {icon}
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-red-500">{value}</span>
            {valueSuffix && <span className="text-sm text-gray-400 font-medium">{valueSuffix}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        </div>
      </div>
    );
  }
  if (variant === "yellow") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 bg-yellow-100 text-yellow-600">
          {icon}
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-yellow-600">{value}</span>
            {valueSuffix && <span className="text-sm text-gray-400 font-medium">{valueSuffix}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        </div>
      </div>
    );
  }
  // blue
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center gap-4 flex-1">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0 bg-blue-100 text-blue-500">
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-blue-500">{value}</span>
          {valueSuffix && <span className="text-sm text-gray-400 font-medium">{valueSuffix}</span>}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "px-3.5 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-colors border-blue-400 bg-blue-50 text-blue-500"
          : "px-3.5 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-colors border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }
    >
      {label}
    </button>
  );
}


export default function TopSenders() {
    const [filter, setFilter] = useState("all");
    const [healthScore, setHealthScore] = useState([]);
    const [noiseScores, setNoiseScores] = useState([]);

    useEffect(()=> {
        fetch(`${API}/health-score`)
        .then((r) => r.json())
        .then((data) => setHealthScore(data.health_score));
    }, []);

    useEffect(()=> {
        fetch(`${API}/noise-scores`)
        .then((r) => r.json())
        .then((data) => setNoiseScores(data));
    }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="px-10 py-8 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 m-0">Top Senders</h1>
          <p className="text-sm text-gray-500 mt-1.5 mb-6">
            Ranked by how much noise they add to your inbox
          </p>

          <div className="flex gap-4 mb-5">
            <StatCard_TopSenders variant="red" icon="%" value={Math.round(healthScore)} valueSuffix="/100" label="inbox health score" />
            <StatCard_TopSenders variant="yellow" icon="!" value={33} label="senders flagged" />
            <StatCard_TopSenders variant="blue" icon="#" value={33} label="unread from them" />
          </div>

          <div className="flex gap-2 mb-5">
            <FilterTab label="All" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterTab label="High noise" active={filter === "high_noise"} onClick={() => setFilter("high_noise")} />
            <FilterTab label="Rarely opened" active={filter === "rarely_opened"} onClick={() => setFilter("rarely_opened")} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <span className="text-[15px] font-semibold text-gray-900">Senders</span>
              <span className="text-[13px] text-gray-400">{33} flagged</span>
            </div>

            {noiseScores.map((s) => (
                <div className="flex items-center gap-4 px-6 py-[18px] border-b border-gray-100">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold flex-shrink-0 bg-blue-100 text-blue-500">
                        {s.sender_email ? s.sender_email[0].toUpperCase() : "?"}
                    </div>

                    <div className="min-w-0 w-[220px]">
                        <div className="text-sm font-semibold text-gray-900">{s.sender_name}</div>
                        <div className="text-[13px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                        {s.sender_email}
                        </div>
                    </div>

                    <div className="flex-1 min-w-[160px]">
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${s.noise_score}%` }} />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">noise {s.noise_score}</div>
                    </div>

                    <div className="w-[90px] text-xs text-gray-500 text-right">{s.total_emails} emails</div>
                    <div className="w-[90px] text-xs text-gray-500 text-right">{s.unread_rate}% unread</div>

                    <button className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-orange-300 bg-orange-100 text-orange-700 cursor-pointer whitespace-nowrap hover:bg-orange-200">
                        Unsubscribe
                    </button>
                    </div>
            ))}

            {noiseScores.length === 0 && (
              <div className="p-10 text-center text-gray-400 text-sm">
                No senders match this filter.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}