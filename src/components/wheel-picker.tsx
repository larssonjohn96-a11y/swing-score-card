import { useEffect, useRef } from "react";

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

type WheelPickerProps = {
  label: string;
  value: number;
  values: number[];
  unit: string;
  onChange: (value: number) => void;
};

/**
 * Native-feeling vertical scroll wheel. No keyboard input needed:
 * the centered row is the selected value and scrolling snaps to it.
 */
export function WheelPicker({ label, value, values, unit, onChange }: WheelPickerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settle = useRef<number | null>(null);
  const height = ITEM_HEIGHT * VISIBLE;
  const pad = (height - ITEM_HEIGHT) / 2;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const index = values.indexOf(value);
    if (index < 0) return;
    const top = index * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - top) > 1) el.scrollTop = top;
  }, [value, values]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const index = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
      const next = values[index];
      if (next != null && next !== value) onChange(next);
    }, 90);
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="font-display text-lg tabular-nums text-foreground">{value} {unit}</span>
      </div>
      <div className="relative mt-2" style={{ height }}>
        <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-primary/40 bg-primary/5" style={{ height: ITEM_HEIGHT }} />
        <div
          ref={ref}
          role="listbox"
          aria-label={label}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-none touch-pan-y"
          style={{ scrollbarWidth: "none", paddingTop: pad, paddingBottom: pad }}
        >
          {values.map((item) => (
            <div
              key={item}
              role="option"
              aria-selected={item === value}
              onClick={() => onChange(item)}
              className={`flex snap-center items-center justify-center text-sm tabular-nums transition ${item === value ? "font-semibold text-foreground" : "text-muted-foreground/70"}`}
              style={{ height: ITEM_HEIGHT }}
            >
              {item} {unit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
