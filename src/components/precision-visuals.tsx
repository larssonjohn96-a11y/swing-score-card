import { Minus, Plus } from "lucide-react";
import { lengthError, proximity, type PrecisionShot } from "@/lib/precision";

/** Hero: top-down-vy av en green med flagga, slaglinje och spridda träffar. */
export function GreenHero() {
  const hits = [
    [148, 96],
    [178, 118],
    [122, 130],
    [166, 74],
    [136, 68],
    [190, 96],
    [110, 104],
    [158, 140],
  ];
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en green ovanifrån med flagga i mitten och spridda inspel runt hålet"
      className="h-44 w-full"
    >
      <ellipse cx="150" cy="100" rx="118" ry="74" className="fill-primary/15" />
      <ellipse cx="150" cy="100" rx="86" ry="54" className="fill-primary/25" />
      <ellipse cx="150" cy="100" rx="44" ry="28" className="fill-primary/40" />
      <path
        d="M20 178 Q 90 150 150 106"
        className="stroke-flag"
        strokeWidth="2"
        strokeDasharray="5 6"
        fill="none"
      />
      <circle cx="20" cy="178" r="5" className="fill-foreground" />
      {hits.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className="fill-foreground/70" />
      ))}
      <circle cx="150" cy="100" r="5" className="fill-background" />
      <line x1="150" y1="100" x2="150" y2="52" className="stroke-foreground" strokeWidth="2" />
      <path d="M150 52 L178 60 L150 68 Z" className="fill-flag" />
    </svg>
  );
}

/** Sifferfält med manuell inmatning och finjustering (−5 / −1 / +1 / +5). */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  hint,
  steps = [-5, -1, 1, 5],
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit: string;
  min?: number;
  hint?: string;
  steps?: number[];
}) {
  const set = (n: number) => onChange(Math.max(min, Math.round(n)));

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => set(value - 1)}
          aria-label={`Minska ${label}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border active:bg-muted"
        >
          <Minus className="h-5 w-5" />
        </button>
        <label className="flex flex-1 items-baseline justify-center gap-1">
          <span className="sr-only">{label}</span>
          <input
            type="number"
            inputMode="numeric"
            value={String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => set(Number(e.target.value) || 0)}
            className="w-full bg-transparent text-center font-[family-name:var(--font-display)] text-5xl leading-none outline-none"
          />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </label>
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label={`Öka ${label}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border active:bg-muted"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >

        {steps.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => set(value + d)}
            className="rounded-xl border border-border py-2 text-sm font-semibold text-muted-foreground active:bg-muted"
          >
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>

    </div>
  );
}

/** Spridningsbild: green ovanifrån med flaggan i mitten och alla slag utplottade. */
export function DispersionGreen({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  const max = Math.max(8, ...filled.map((s) => proximity(s))) * 1.15;
  const size = 300;
  const c = size / 2;
  const r = c - 14;
  const pos = (s: PrecisionShot) => ({
    x: c + (s.offline / max) * r,
    y: c - (lengthError(s) / max) * r,
  });

  return (
    <div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label="Spridningsbild">
        <circle cx={c} cy={c} r={r} className="fill-primary/15" />
        <circle cx={c} cy={c} r={r * 0.66} className="fill-primary/25" />
        <circle cx={c} cy={c} r={r * 0.33} className="fill-primary/40" />
        <line x1={c} y1={c - r} x2={c} y2={c + r} className="stroke-border" strokeWidth="1" />
        <line x1={c - r} y1={c} x2={c + r} y2={c} className="stroke-border" strokeWidth="1" />
        {filled.map((s) => {
          const p = pos(s);
          return <circle key={s.index} cx={p.x} cy={p.y} r="5" className="fill-foreground/70" />;
        })}
        <circle cx={c} cy={c} r="4" className="fill-background" />
        <line x1={c} y1={c} x2={c} y2={c - 40} className="stroke-foreground" strokeWidth="2" />
        <path d={`M${c} ${c - 40} L${c + 24} ${c - 33} L${c} ${c - 26} Z`} className="fill-flag" />
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Ytterkanten ≈ {max.toFixed(0)} m från flaggan · uppåt = långt, nedåt = kort
      </p>
    </div>
  );
}
