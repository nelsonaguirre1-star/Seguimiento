import { useEffect } from 'react';

export default function Modal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        className={`relative bg-paper rounded-2xl shadow-lg p-6 max-h-[90vh] overflow-auto
          ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-navy-deep">{title}</h3>
          <button onClick={onClose} className="text-ink-mute hover:text-ink text-xl leading-none cursor-pointer">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
