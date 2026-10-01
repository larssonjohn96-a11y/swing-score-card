export function HcpTestProgress({
  current,
  total,
  label = "Test",
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(0, Math.min(current, safeTotal));
  const pct = (safeCurrent / safeTotal) * 100;

  return (
    <div className="w-full" aria-label={`${label}: ${safeCurrent} av ${safeTotal}`}>
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</span>
        <span className="text-[11px] font-black tabular-nums text-slate-500">
          {safeCurrent} / {safeTotal}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/90">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
