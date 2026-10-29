const SIZES = {
  sm: { mark: "w-6 h-6", text: "text-xl", gap: "gap-1.5" },
  md: { mark: "w-7 h-7", text: "text-2xl", gap: "gap-2" },
  lg: { mark: "w-9 h-9", text: "text-3xl", gap: "gap-2.5" },
};

// the mark: scattered light dots (clutter) and one solid blue dot (calm)
export function LogoMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="18.5 21.5 102 102" className={className} fill="#2563eb" aria-hidden="true">
      <circle cx="34" cy="41" r="8.5" opacity="0.25" />
      <circle cx="106" cy="33" r="6.5" opacity="0.35" />
      <circle cx="66" cy="73.5" r="5.5" opacity="0.5" />
      <circle cx="26" cy="106" r="6.5" opacity="0.4" />
      <circle cx="91" cy="93.5" r="18.5" />
      <circle cx="111" cy="110" r="8.5" fill="#bed1f9" />
    </svg>
  );
}

// the full logo: mark + "unclutter." wordmark
export default function Logo({ size = "md", showMark = true }) {
  const s = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-center ${s.gap}`}>
      {showMark && <LogoMark className={s.mark} />}
      <span className={`font-bold tracking-tight text-gray-950 ${s.text}`}>
        unclutter<span className="text-blue-600">.</span>
      </span>
    </div>
  );
}