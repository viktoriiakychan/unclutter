// "clutter" dots in your category colours get swept into one calm blue dot (the logo mark)
const DOTS = [
  { x: "-42px", y: "-24px", color: "#f472b6", delay: "0s" },     // promotions (pink)
  { x: "38px", y: "-34px", color: "#fbbf24", delay: "0.26s" },   // newsletters (amber)
  { x: "46px", y: "16px", color: "#60a5fa", delay: "0.52s" },    // updates (blue)
  { x: "-34px", y: "32px", color: "#a78bfa", delay: "0.78s" },   // social (violet)
  { x: "-4px", y: "-48px", color: "#d1d5db", delay: "1.04s" },   // other (grey)
  { x: "8px", y: "46px", color: "#f472b6", delay: "1.3s" },
  { x: "-48px", y: "6px", color: "#fbbf24", delay: "1.56s" },
  { x: "30px", y: "38px", color: "#a78bfa", delay: "1.82s" },
];

export default function SweepLoader() {
  return (
    <div className="relative w-28 h-28" aria-hidden="true">
      <style>{`
        @keyframes sweep {
          0%   { transform: translate(var(--x), var(--y)) scale(1);   opacity: 0; }
          15%  { transform: translate(var(--x), var(--y)) scale(1);   opacity: 1; }
          70%  { transform: translate(0, 0) scale(0.4);               opacity: 1; }
          80%, 100% { transform: translate(0, 0) scale(0.2);          opacity: 0; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes halo {
          0%   { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .sweep-dot  { animation: sweep 2.1s cubic-bezier(0.55, 0, 0.35, 1) infinite both; }
        .sweep-core { animation: breathe 1.05s ease-in-out infinite; }
        .sweep-halo { animation: halo 2.1s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sweep-dot, .sweep-core, .sweep-halo { animation: none; }
          .sweep-dot { opacity: 0.6; transform: translate(var(--x), var(--y)); }
        }
      `}</style>

      {/* soft ripple behind the core */}
      <div className="sweep-halo absolute inset-0 m-auto w-14 h-14 rounded-full bg-blue-200" />

      {/* the clutter */}
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className="sweep-dot absolute w-3 h-3 rounded-full"
          style={{
            left: "calc(50% - 6px)",
            top: "calc(50% - 6px)",
            backgroundColor: dot.color,
            animationDelay: dot.delay,
            "--x": dot.x,
            "--y": dot.y,
          }}
        />
      ))}

      {/* the calm, tidy core */}
      <div className="sweep-core absolute inset-0 m-auto w-5 h-5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.12)]" />
    </div>
  );
}