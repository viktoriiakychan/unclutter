import { useState } from "react";
import { API } from "../utils/constants";

const BADGE_STYLES = {
  "top offender": "bg-red-100 text-red-700",
  "promotion": "bg-yellow-100 text-yellow-700",
  "unread": "bg-blue-100 text-blue-700",
};

export default function SuggestionCard({ suggestion }) {
  const badgeClass = BADGE_STYLES[suggestion.badge] || "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {suggestion.sender[0].toUpperCase()}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
          {suggestion.badge}
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 text-sm mb-1">{suggestion.title}</h4>
      <p className="text-sm text-gray-500 mb-4 flex-1">{suggestion.subtitle}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm">
          <span className="font-semibold text-gray-900">{suggestion.count}</span>{" "}
          <span className="text-gray-500">emails</span>
        </span>

        <button className="px-4 py-1.5 rounded-lg border border-red-400 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}