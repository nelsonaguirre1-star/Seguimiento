export default function Card({ children, onClick, className = '', ...rest }) {
  return (
    <div
      onClick={onClick}
      {...rest}
      className={`bg-paper border border-ink/10 rounded-sm ${onClick ? 'cursor-pointer hover:border-ink/25 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
