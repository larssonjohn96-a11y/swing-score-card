import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DISPERSION_RANGE,
  DISTANCE_RINGS,
  GREEN_HALF_DEPTH,
  GREEN_HALF_WIDTH,
  dispersionStats,
  lengthError,
  proximity,
  type PrecisionShot,
} from "@/lib/precision";

/** Hero: top-down-vy av en green med flagga, slaglinje och spridda träffar. */
export function GreenHero({ className = "h-44 w-full" }: { className?: string }) {
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
      className={className}
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

/** Kompakt sifferfält med manuell inmatning, finjustering och en diskret
 *  uppdateringsanimation (färgmarkering + mjuk skalning) när värdet ändras. */
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
  const atMin = value <= min;

  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 260);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className="rounded-2xl border border-border bg-card p-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={atMin}
          aria-label={`Minska ${label}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <label className="flex flex-1 items-baseline justify-center gap-1">
          <span className="sr-only">{label}</span>
          <input
            type="number"
            inputMode="numeric"
            value={String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => set(Number(e.target.value) || 0)}
            className={`w-full bg-transparent text-center font-[family-name:var(--font-display)] text-3xl leading-none outline-none transition-[color,transform] duration-200 ${
              flash ? "scale-110 text-flag" : "scale-100 text-foreground"
            }`}
          />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </label>
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label={`Öka ${label}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        className="mt-1.5 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((d) => {
          const disabled = d < 0 && atMin;
          return (
            <button
              key={d}
              type="button"
              onClick={() => set(value + d)}
              disabled={disabled}
              className="rounded-lg border border-border py-1 text-xs font-semibold text-muted-foreground active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const nf = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/** Visningsområde i meter från flaggan (slag utanför klampas mot kanten). */
const VIEW_RANGE = 25;

/** Färg per närhet till flaggan – få färger, slagen är det starkaste i bilden. */
function shotFill(p: number): string {
  if (p <= 5) return "fill-primary";
  if (p <= 10) return "fill-flag";
  return "fill-muted-foreground";
}

/**
 * Stiliserad green rakt ovanifrån i samma illustrationsspråk som testets
 * introbild: bara green, flagga, avståndsringar och landningspunkter.
 */
export function DispersionGreen({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  const stats = dispersionStats(shots);

  const size = 320;
  const c = size / 2;
  const pad = 10;
  const scale = (c - pad) / VIEW_RANGE; // px per meter
  const m = (v: number) => v * scale;
  const px = (x: number) => c + m(x);
  const py = (z: number) => c - m(z);

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label="Spridningskarta ovanifrån: green, flagga och dina landningspunkter"
      >
        {/* Green – stor, enkel och stiliserad */}
        <ellipse
          cx={c}
          cy={c}
          rx={m(GREEN_HALF_WIDTH * 1.55)}
          ry={m(GREEN_HALF_DEPTH * 1.35)}
          className="fill-primary/10"
        />
        <ellipse
          cx={c}
          cy={c}
          rx={m(GREEN_HALF_WIDTH)}
          ry={m(GREEN_HALF_DEPTH)}
          className="fill-primary/25"
        />

        {/* Avståndsringar – subtila referenser */}
        {DISTANCE_RINGS.map((d) => (
          <g key={d}>
            <circle
              cx={c}
              cy={c}
              r={m(d)}
              fill="none"
              strokeWidth="1"
              strokeDasharray="3 5"
              className="stroke-foreground/25"
            />
            <text
              x={c + 3}
              y={py(d) + 10}
              className="fill-foreground/40 text-[9px] font-semibold"
            >
              {d} m
            </text>
          </g>
        ))}

        {/* Landningspunkter – bildens starkaste element */}
        {filled.map((s) => {
          const p = proximity(s);
          const clamped = p > VIEW_RANGE;
          const k = clamped ? VIEW_RANGE / p : 1;
          return (
            <circle
              key={s.index}
              cx={px(s.offline * k)}
              cy={py(lengthError(s) * k)}
              r="5.5"
              className={`${shotFill(p)} stroke-background`}
              strokeWidth="1.75"
              opacity={clamped ? 0.55 : 1}
            />
          );
        })}

        {/* Flagga i mitten */}
        <line x1={c} y1={c} x2={c} y2={c - 26} className="stroke-foreground" strokeWidth="1.5" />
        <path d={`M${c} ${c - 26} L${c + 15} ${c - 21} L${c} ${c - 16} Z`} className="fill-flag" />
        <circle cx={c} cy={c} r="3" className="fill-background stroke-foreground" strokeWidth="1" />

        {/* Riktningsmarkörer – sekundära men läsbara */}
        <text
          x={c}
          y="12"
          textAnchor="middle"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em]"
        >
          Långt
        </text>
        <text
          x={c}
          y={size - 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em]"
        >
          Kort
        </text>
        <text
          x="4"
          y={c + 3}
          textAnchor="start"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em]"
        >
          V
        </text>
        <text
          x={size - 4}
          y={c + 3}
          textAnchor="end"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em]"
        >
          H
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend className="bg-primary" text="Inom 5 m" />
        <Legend className="bg-flag" text="5–10 m" />
        <Legend className="bg-muted-foreground" text="Över 10 m" />
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Kort {stats.missShort} · Långt {stats.missLong} · Vänster {stats.missLeft} · Höger{" "}
        {stats.missRight} · Snitt {nf(stats.avg)} m
      </p>
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
