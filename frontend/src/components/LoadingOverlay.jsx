import SweepLoader from "./SweepLoader";

const COPY = {
  delete: { eyebrow: "Moving to trash", title: "Cleaning up your inbox..." },
  archive: { eyebrow: "Archiving", title: "Tidying your emails away..." },
};

export default function LoadingOverlay({ action = "delete", message, fullScreen = false }) {
  const copy = COPY[action] || COPY.delete;

  const positionClasses = fullScreen
    ? "fixed inset-0 z-50"
    : "absolute inset-0 z-40";

  return (
    <div
      className={`${positionClasses} bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6`}
      role="status"
      aria-live="polite"
    >
      <SweepLoader />

      <p className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-blue-600">
        {copy.eyebrow}
      </p>
      <p className="mt-1.5 text-lg font-bold tracking-tight text-gray-950">
        {message || copy.title}
      </p>
      <p className="mt-1 text-sm text-gray-400">This'll just take a moment.</p>
    </div>
  );
}