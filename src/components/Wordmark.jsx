import Mark from './Mark';

export default function Wordmark({ size = 32 }) {
  return (
    <div className="flex items-center gap-3">
      <Mark size={size} />
      <div>
        <div className="font-serif text-2xl leading-none tracking-tight text-paper">Veta</div>
        <div className="font-mono text-[10px] tracking-widest mt-1 text-paper/50">SEGUIMIENTO · CDE</div>
      </div>
    </div>
  );
}
