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

const RING_STYLE: Record<number, string> = {
  3: "stroke-primary/70",
  6: "stroke-flag/70",
  10: "stroke-chart-4/70",
  20: "stroke-muted-foreground/50",
  30: "stroke-destructive/50",
};

const nf = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/**
 * Spridningsbild med fast skala: ±40 m från flaggan, standardgreen med
 * fairway och bunkrar, samt fasta avståndsringar.
 */
export function DispersionGreen({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  const stats = dispersionStats(shots);

  const size = 320;
  const c = size / 2;
  const pad = 8;
  const scale = (c - pad) / DISPERSION_RANGE; // px per meter
  const m = (v: number) => v * scale;
  const px = (x: number) => c + m(x);
  const py = (z: number) => c - m(z);

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label="Spridningsbild med fast skala, 80 gånger 80 meter runt flaggan"
      >
        <defs>
          <clipPath id="dispersion-clip">
            <rect x="0" y="0" width={size} height={size} rx="20" />
          </clipPath>
        </defs>
        <g clipPath="url(#dispersion-clip)">
          <rect x="0" y="0" width={size} height={size} className="fill-rough" />

          {/* Fairway framför green */}
          <path
            d={`M${px(-11)} ${py(-16)} Q ${px(-13)} ${py(-32)} ${px(-9)} ${py(-46)} L${px(9)} ${py(-46)} Q ${px(13)} ${py(-32)} ${px(11)} ${py(-16)} Z`}
            className="fill-fairway"
          />

          {/* Bunkrar */}
          <ellipse
            cx={px(-15.5)}
            cy={py(-11)}
            rx={m(5.5)}
            ry={m(3.2)}
            transform={`rotate(-25 ${px(-15.5)} ${py(-11)})`}
            className="fill-sand"
          />
          <ellipse
            cx={px(15.5)}
            cy={py(-11)}
            rx={m(5.5)}
            ry={m(3.2)}
            transform={`rotate(25 ${px(15.5)} ${py(-11)})`}
            className="fill-sand"
          />
          <ellipse cx={px(2)} cy={py(17.5)} rx={m(6)} ry={m(2.8)} className="fill-sand" />

          {/* Green */}
          <ellipse
            cx={c}
            cy={c}
            rx={m(GREEN_HALF_WIDTH)}
            ry={m(GREEN_HALF_DEPTH)}
            className="fill-green-surface"
          />

          {/* Avståndsringar */}
          {DISTANCE_RINGS.map((d) => (
            <g key={d}>
              <circle
                cx={c}
                cy={c}
                r={m(d)}
                fill="none"
                strokeWidth="1"
                strokeDasharray="3 4"
                className={RING_STYLE[d]}
              />
              <text
                x={c + 2}
                y={py(d) - 3}
                className="fill-foreground/50"
                fontSize="8"
                textAnchor="start"
              >
                {d} m
              </text>
            </g>
          ))}

          {/* Slag */}
          {filled.map((s) => {
            const p = proximity(s);
            const clamped = p > DISPERSION_RANGE;
            const k = clamped ? DISPERSION_RANGE / p : 1;
            return (
              <circle
                key={s.index}
                cx={px(s.offline * k)}
                cy={py(lengthError(s) * k)}
                r="4.5"
                className={clamped ? "fill-foreground/35" : "fill-foreground/70"}
                stroke="currentColor"
                strokeOpacity="0.15"
              />
            );
          })}

          {/* Flagga */}
          <line x1={c} y1={c} x2={c} y2={c - 34} className="stroke-foreground" strokeWidth="1.5" />
          <path d={`M${c} ${c - 34} L${c + 19} ${c - 28.5} L${c} ${c - 23} Z`} className="fill-flag" />
          <circle cx={c} cy={c} r="3" className="fill-background stroke-foreground" strokeWidth="1" />
        </g>
        <rect
          x="0.5"
          y="0.5"
          width={size - 1}
          height={size - 1}
          rx="20"
          fill="none"
          className="stroke-border"
        />
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Genomsnitt" value={`${nf(stats.avg)} m`} />
        <MiniStat label="Median" value={`${nf(stats.median)} m`} />
        <MiniStat label="Närmast" value={`${nf(stats.best)} m`} />
        <MiniStat label="Längst bort" value={`${nf(stats.worst)} m`} />
        <MiniStat label="Greener träffade" value={`${stats.greens}/${stats.count}`} />
        <MiniStat label="Spridning" value={`${nf(stats.spread, 0)} m`} />
        <MiniStat label="Birdiechanser (<6 m)" value={`${stats.birdieChances}`} />
        <MiniStat label="Inom 10 m" value={`${stats.within10}`} />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend className="bg-primary" text="0–3 m" />
        <Legend className="bg-flag" text="3–6 m" />
        <Legend className="bg-chart-4" text="6–10 m" />
        <Legend className="bg-muted-foreground" text="10–20 m" />
        <Legend className="bg-destructive" text="20 m+" />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Fast skala 80 × 80 m · uppåt = långt, nedåt = kort
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {text}
    </span>
  );
}

