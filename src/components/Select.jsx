export default function Select({ label, value, onChange, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium text-ink-mute">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-ink/15 rounded-sm focus:outline-none focus:ring-2 focus:ring-navy-deep/30 focus:border-navy-deep bg-paper"
      >
        {children}
      </select>
    </div>
  );
}
