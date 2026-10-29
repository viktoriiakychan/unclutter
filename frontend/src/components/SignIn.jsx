import Logo from "./Logo";

function PreviewCard({ label, labelColor, title, preview, className, delay }) {
  return (
    <div
      className={`float absolute bg-white rounded-2xl shadow-[0_12px_40px_-12px_rgba(37,99,235,0.18)] px-5 py-4 w-60 ${className}`}
      style={{ animationDelay: delay }}
    >
      <p className={`text-[11px] font-semibold tracking-widest uppercase ${labelColor}`}>{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-1.5">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">{preview}</p>
    </div>
  );
}

export default function SignIn({ onLogin }) {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -8px; }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .float { animation: float 6s ease-in-out infinite; }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
      `}</style>

        <div className="fade-up min-h-screen grid md:grid-cols-2">
        {/* LEFT: brand panel (hidden on small screens) */}
        <div className="hidden md:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100 p-11">
            <Logo size="m" />  

          <div className="relative flex-1">
            <PreviewCard
              label="Promotion"
              labelColor="text-pink-500"
              title="30% off everything"
              preview="You've been eyeing these shoes..."
              className="top-8 left-0 -rotate-6"
              delay="0s"
            />
            <PreviewCard
              label="Update"
              labelColor="text-blue-600"
              title="Your order shipped"
              preview="Arriving Tuesday..."
              className="top-24 -right-16"
              delay="1.5s"
            />
            <PreviewCard
              label="Newsletter"
              labelColor="text-amber-500"
              title="The weekly roundup"
              preview="7 things we loved this week..."
              className="top-48 left-36"
              delay="3s"
            />
            <div className="float absolute top-[19rem] right-12 w-16 h-16 rounded-full bg-blue-400/70" style={{ animationDelay: "0.8s" }} />
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-950 leading-tight">
              A quieter inbox
              <br />
              in a few clicks.
            </h1>
            <p className="text-gray-500 mt-3 max-w-sm leading-relaxed">
              See what's cluttering your Gmail, sweep what you don't need, keep an eye on your inbox health.
            </p>
          </div>
        </div>

        {/* RIGHT: sign in */}
        <div className="flex flex-col justify-center p-8 md:p-16">
          {/* logo only shows here on small screens, where the left panel is hidden */}
          <div className="md:hidden mb-10">
            <Logo />
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase text-blue-600">Sign in</p>
          <h2 className="text-4xl font-bold tracking-tight text-gray-950 mt-3">Welcome back.</h2>
          <p className="text-gray-500 mt-4 leading-relaxed">
            Connect your Gmail to see what's cluttering your inbox and clear it out in a few clicks.
          </p>

          <button
            onClick={onLogin}
            className="mt-8 w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3 rounded-xl shadow-sm transition"
          >
            Sign in with Google
          </button>

          <p className="text-center text-sm text-gray-400 mt-5">
            Secure Google sign-in · Revoke access anytime
          </p>
        </div>
      </div>
    </div>
  );
}