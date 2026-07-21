import { useState } from "react";
import { API } from "../utils/constants";

const BADGE_STYLES = {
  "top offender": { badge: "bg-red-100 text-red-700", icon: "bg-red-50 text-red-700" },
  "promotion": { badge: "bg-yellow-100 text-yellow-700", icon: "bg-yellow-50 text-yellow-700" },
  "unread": { badge: "bg-blue-100 text-blue-700", icon: "bg-blue-50 text-blue-700" },
};

export default function SuggestionCard({ suggestion, onDeleteClick }) {
  const styles = BADGE_STYLES[suggestion.badge] || {
    badge: "bg-gray-100 text-gray-700",
    icon: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${styles.icon}`}>
          {suggestion.sender[0].toUpperCase()}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
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

        <button 
          onClick={onDeleteClick}
          className="px-4 py-1.5 rounded-lg border border-red-400 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}