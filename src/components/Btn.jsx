const variants = {
  primary: 'bg-navy-deep hover:bg-navy-deep/90 text-paper',
  secondary: 'bg-paper border border-ink/15 hover:bg-ink/5 text-ink',
  danger: 'bg-[#A02B2B] hover:bg-[#8B2424] text-paper',
  ghost: 'bg-transparent hover:bg-ink/5 text-ink-mute',
  ochre: 'bg-ochre hover:bg-ochre/85 text-paper',
};

export default function Btn({ children, variant = 'primary', small = false, disabled = false, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-sm transition-colors
        ${variants[variant] || variants.primary}
        ${small ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
    >
      {children}
    </button>
  );
}
