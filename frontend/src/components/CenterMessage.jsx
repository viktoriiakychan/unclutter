import SweepLoader from "./SweepLoader";

export default function CenterMessage({ text = "Loading...", fullScreen = true, showBrand = true }) {
  return (
    <div
      className={`flex items-center justify-center bg-white ${fullScreen ? "fixed inset-0 z-50" : "h-full"}`}
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease-out both; }
      `}</style>

      <div className="fade-up flex flex-col items-center text-center px-8">
        <SweepLoader />

        {showBrand && (
          <span className="mt-3 font-bold text-2xl tracking-tight text-gray-950">
            unclutter<span className="text-blue-600">.</span>
          </span>
        )}

        <p className="mt-1.5 text-sm text-gray-400">{text}</p>
      </div>
    </div>
  );
}