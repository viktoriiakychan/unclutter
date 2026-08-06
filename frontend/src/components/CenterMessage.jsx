const BRAND_BLUE = "#2563eb";

export default function CenterMessage({ text = "Loading...", fullScreen = true, showBrand = true }) {
  return (
    <div className={`flex items-center justify-center bg-gray-50 ${fullScreen ? "fixed inset-0 z-50" : "h-full"}`}>
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease-out; }
      `}</style>

      <div className="fade-up flex flex-col items-center gap-5">
        {showBrand && (
          <span className="font-bold text-xl tracking-tight text-gray-900">
            unclutter<span style={{ color: BRAND_BLUE }}>.</span>
          </span>
        )}

        <div className="relative w-11 h-11">
          <div className="absolute inset-0 border-[3px] border-gray-100 rounded-full" />
          <div
            className="absolute inset-0 border-[3px] border-transparent rounded-full animate-spin"
            style={{ borderTopColor: BRAND_BLUE }}
          />
        </div>

        <div className="flex items-center gap-1">
          <p className="text-gray-500 text-sm font-medium">{text}</p>
          <span className="flex gap-0.5">
            <span
              className="w-1 h-1 rounded-full animate-bounce [animation-delay:-0.3s]"
              style={{ backgroundColor: BRAND_BLUE, opacity: 0.5 }}
            />
            <span
              className="w-1 h-1 rounded-full animate-bounce [animation-delay:-0.15s]"
              style={{ backgroundColor: BRAND_BLUE, opacity: 0.5 }}
            />
            <span
              className="w-1 h-1 rounded-full animate-bounce"
              style={{ backgroundColor: BRAND_BLUE, opacity: 0.5 }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}