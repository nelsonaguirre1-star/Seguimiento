export default function ProgressBar({ pct = 0, color }) {
  const barColor = color || (pct >= 75 ? '#2D6A4F' : pct >= 40 ? '#B96B11' : '#A02B2B');
  return (
    <div className="w-full bg-ink/8 rounded-sm h-1.5 overflow-hidden">
      <div
        className="h-full rounded-sm transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: barColor }}
      />
    </div>
  );
}
