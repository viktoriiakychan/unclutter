export default function StatCard({ value, label, color, icon, size = "default" }) {
  const isSm = size === "sm";

  return (
        <div className={`bg-white rounded-xl border border-gray-200 ${isSm ? "px-4 py-3" : "px-5 py-4"}`}>
            {icon && <img src={icon} alt={label} className={`${isSm ? "w-4 h-4 mb-2" : "w-6 h-6 mb-4"}`} />}
            <div className={`${isSm ? "text-2xl" : "text-4xl"} font-bold ${color} ${!icon ? "mt-0" : ""}`}>{value}</div>
            <div className={`${isSm ? "text-xs" : "text-sm"} text-gray-600 mt-1`}>{label}</div>
        </div>
  );
}