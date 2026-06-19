export default function StatCard({ value, label, color, icon }) {
  return (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            {icon && <img src={icon} alt={label} className="w-6 h-6 mb-4" />}
            <div className={`text-4xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-gray-600 mt-1">{label}</div>
        </div>
  );
}