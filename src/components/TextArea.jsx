export default function TextArea({ label, value, onChange, placeholder = '', rows = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium text-ink-mute">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm border border-ink/15 rounded-sm focus:outline-none focus:ring-2 focus:ring-navy-deep/30 focus:border-navy-deep resize-y"
      />
    </div>
  );
}
