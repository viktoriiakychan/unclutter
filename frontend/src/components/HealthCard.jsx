import { Link } from "react-router-dom";
import { blurWhile } from "../utils/pending";

// one look per health band: ring, pill, background tint, headline
const BANDS = [
  {
    min: 80,
    pill: "Healthy",
    headline: "Your inbox is in good shape.",
    ring: "#2563eb",
    track: "#e0e7ff",
    pillClass: "bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
    tint: "from-blue-50/80",
  },
  {
    min: 50,
    pill: "Needs a tidy",
    headline: "Your inbox could use a tidy.",
    ring: "#f59e0b",
    track: "#fef3c7",
    pillClass: "bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
    tint: "from-amber-50/80",
  },
  {
    min: 0,
    pill: "Cluttered",
    headline: "Your inbox needs some love.",
    ring: "#ef4444",
    track: "#fee2e2",
    pillClass: "bg-red-50 text-red-700",
    dotClass: "bg-red-500",
    tint: "from-red-50/80",
  },
];

function getBand(score) {
  return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
}

function HealthRing({ score, color, track, pending}) {
  const size = 160;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative w-40 h-40 flex-shrink-0">
      {/* rotate so the ring starts at the top, like a clock */}
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Health</span>
        <span className={`text-5xl font-bold tracking-tight text-gray-950 tabular-nums leading-none mt-1 ${blurWhile(pending)}`}>
          {score}
        </span>
        <span className="text-xs text-gray-400 mt-1.5">/ 100</span>
      </div>
    </div>
  );
}

export default function HealthCard({ score, worstOffender, onCleanNow , pending=false}) {
  const rounded = Math.round(score);
  const band = getBand(rounded);

  const showSuggestion = Boolean(worstOffender?.sender_email);

  return (
    <div className={`h-full bg-gradient-to-r ${band.tint} to-white bg-white rounded-2xl p-8 flex items-center gap-10`}>
      <HealthRing score={pending ? 0 : rounded} pending={pending} color={band.ring} track={band.track} />

      <div className="min-w-0">
        {pending ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                Calculating...
            </span>
            ) : (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${band.pillClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${band.dotClass}`} />
                    {band.pill}
                    </span>
            )}
                
        <h2 className={`text-2xl font-bold tracking-tight text-gray-950 mt-3 ${blurWhile(pending)}`}>{band.headline}</h2>

        <p className={`text-sm text-gray-500 mt-2 leading-relaxed max-w-sm ${blurWhile(pending)}`}>
          {showSuggestion ? (
            <>
              <span className="font-semibold text-gray-900">{worstOffender.sender_name || worstOffender.sender_email}</span>{" "}
              is your worst offender: {worstOffender.total_emails} emails, {Math.round(worstOffender.unread_rate)}% unread.
            </>
          ) : (
            "No single sender is dragging your inbox down right now."
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          {showSuggestion && (
            <button
              onClick={onCleanNow}
              className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-8 py-1.5 rounded-lg shadow-sm transition"
            >
              Clean now
            </button>
          )}
          <Link
            to="/top-senders"
            className="bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium px-5 py-1.5 rounded-lg   transition"
          >
            See top senders →
          </Link>
        </div>
      </div>
    </div>
  );
}