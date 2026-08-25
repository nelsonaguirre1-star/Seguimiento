export default function Badge({ children, color = '#555B6E', bg = '#E6E5DD' }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-tight"
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}
