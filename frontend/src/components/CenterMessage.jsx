export default function CenterMessage({ text = "Loading...", fullScreen = true }) {
  return (
    <div className={`flex items-center justify-center bg-gray-50 ${fullScreen ? "fixed inset-0 z-50" : "h-full"}`}>
      <div className="flex flex-col items-center gap-4">
        {/* spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
        </div>

        {/* text + animated dots */}
        <div className="flex items-center gap-1">
          <p className="text-gray-500 text-sm">{text}</p>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
          </span>
        </div>
      </div>
    </div>
  );
}