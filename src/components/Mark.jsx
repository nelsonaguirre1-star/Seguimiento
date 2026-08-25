export default function Mark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#1A3A6B" />
      <g fill="none" stroke="#F4F0E6" strokeLinecap="round">
        <ellipse cx="50" cy="50" rx="38" ry="36" strokeWidth="1.2" strokeOpacity=".55" />
        <ellipse cx="50" cy="50" rx="30" ry="28.5" strokeWidth="1.2" strokeOpacity=".7" />
        <ellipse cx="50" cy="50" rx="22" ry="21" strokeWidth="1.4" strokeOpacity=".85" />
        <ellipse cx="50" cy="50" rx="14" ry="13" strokeWidth="1.6" />
        <ellipse cx="50" cy="50" rx="7.5" ry="7" strokeWidth="1.6" />
      </g>
      <line x1="22" y1="86" x2="78" y2="14" stroke="#B8893A" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="2.4" fill="#B8893A" />
    </svg>
  );
}
