const ICONS = {
  delete: {
    color: "#dc2626", // red-600, matches your delete buttons
    render: () => (
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none">
        <rect x="6" y="12" width="28" height="30" rx="3" fill="#fecaca" />
        <rect x="2" y="7" width="36" height="6" rx="2" fill="#dc2626" />
        <rect x="15" y="0" width="10" height="6" rx="2" fill="#dc2626" />
        <line x1="14" y1="18" x2="14" y2="36" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="18" x2="20" y2="36" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="18" x2="26" y2="36" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  archive: {
    color: "#6b7280", // gray-500
    render: () => (
      <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
        <rect x="2" y="0" width="40" height="12" rx="3" fill="#6b7280" />
        <rect x="4" y="12" width="36" height="26" rx="3" fill="#e5e7eb" />
        <rect x="16" y="20" width="12" height="4" rx="2" fill="#6b7280" />
      </svg>
    ),
  },
};

export default function LoadingOverlay({ action = "delete", message, fullScreen = false }) {
  const icon = ICONS[action] || ICONS.delete;
  const defaultMessage = action === "archive" ? "Archiving your emails..." : "Cleaning up your inbox...";

  const positionClasses = fullScreen
    ? "fixed inset-0 z-50"
    : "absolute inset-0 max-h-80 z-40";

  return (
    <div className={`${positionClasses} bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center`}>
        <style>{`
            @keyframes bounce-in {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
            }
            @keyframes flyIn {
            0% { transform: translateY(-16px) scale(0.5); opacity: 0; }
            60% { opacity: 1; }
            100% { transform: translateY(4px) scale(0.3); opacity: 0; }
            }
            .icon-bounce { animation: bounce-in 1s ease-in-out infinite; }
            .item-1 { animation: flyIn 1.2s ease-in infinite; animation-delay: 0s; }
            .item-2 { animation: flyIn 1.2s ease-in infinite; animation-delay: 0.4s; }
      `}</style>

      <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
        <div className="absolute -top-2 left-3 item-1 w-2 h-2 rounded-sm" style={{ backgroundColor: icon.color }}></div>
        <div className="absolute -top-2 right-3 item-2 w-2 h-2 rounded-sm" style={{ backgroundColor: icon.color }}></div>
        <div className="icon-bounce">{icon.render()}</div>
      </div>

      <p className="text-gray-700 text-sm font-medium">{message || defaultMessage}</p>
      <p className="text-gray-400 text-xs mt-1">This'll just take a moment</p>
    </div>
  );
}