export default function Header({ userEmail }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 rounded-4xl border-blue-200 border px-4 py-1">
        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs bg-gradient-to-l from-blue-50 to-blue-200 flex items-center justify-center font-semibold flex-shrink-0">
          {userEmail ? userEmail[0].toUpperCase() : "?"}
        </div>
        <span className="text-blue-700 font-semibold text-xs">{userEmail}</span>
      </div>

      <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
        Sign In
      </button>
    </header>
  );
}