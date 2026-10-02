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
  const safeCurrent = Math.max(1, Math.min(current, safeTotal));
  const completed = Math.max(0, safeCurrent - 1);

  return (
    <div className="w-full" aria-label={`${label}: slag ${safeCurrent} av ${safeTotal}`}>
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
          {label}
        </span>
        <span className="text-[11px] font-black tabular-nums text-slate-500">
          {safeCurrent} / {safeTotal}
        </span>
      </div>

      <div
        className="grid h-2 gap-1"
        style={{ gridTemplateColumns: `repeat(${safeTotal}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: safeTotal }, (_, i) => {
          const isComplete = i < completed;
          const isCurrent = i === completed;
          return (
            <span
              key={i}
              className={`rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                isComplete
                  ? "bg-blue-600"
                  : isCurrent
                    ? "bg-blue-300 ring-1 ring-inset ring-blue-500/60"
                    : "bg-slate-200/90"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
