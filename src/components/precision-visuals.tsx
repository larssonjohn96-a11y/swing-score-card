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
    <div className="rounded-2xl border border-border bg-card p-3">
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
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
            className={`w-full bg-transparent text-center font-[family-name:var(--font-display)] text-4xl leading-none outline-none transition-[color,transform] duration-200 ${
              flash ? "scale-110 text-flag" : "scale-100 text-foreground"
            }`}
          />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </label>
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label={`Öka ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        className="mt-2 grid gap-1.5"
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
              className="rounded-lg border border-border py-1.5 text-xs font-semibold text-muted-foreground active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RING_STYLE: Record<number, string> = {
  5: "stroke-background/80",
  10: "stroke-background/55",
  15: "stroke-background/40",
};

const nf = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/** Färg per misstyp så spridningen går att läsa direkt. */
function shotTone(s: PrecisionShot): string {
  const p = proximity(s);
  if (p < 5) return "fill-primary";
  if (Math.abs(s.offline) > Math.abs(lengthError(s))) return "fill-chart-4";
  return "fill-flag";
}

/**
 * Top-down-vy av en smal, djup green med fairway och bunkrar. Fast skala
 * ±40 m från flaggan, ringar på 5/10/15 m och ett märke per slag.
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
      <div className="mb-4 grid grid-cols-3 gap-2">
        <MiniStat label="Greenträffar" value={`${stats.greens}/${stats.count}`} />
        <MiniStat label="Birdiechanser" value={`${stats.birdieChances}`} />
        <MiniStat label="Snitt" value={`${nf(stats.avg)} m`} />
        <MiniStat label="Miss vänster" value={`${stats.missLeft}`} />
        <MiniStat label="Miss höger" value={`${stats.missRight}`} />
        <MiniStat label="Kort / lång" value={`${stats.missShort} / ${stats.missLong}`} />
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label="Spridningskarta med fast skala, 80 gånger 80 meter runt flaggan"
      >
        <defs>
          <clipPath id="dispersion-clip">
            <rect x="0" y="0" width={size} height={size} rx="20" />
          </clipPath>
          <radialGradient id="green-shade" cx="45%" cy="35%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="black" stopOpacity="0.12" />
          </radialGradient>
          <radialGradient id="rough-shade" cx="50%" cy="20%" r="90%">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </radialGradient>
        </defs>
        <g clipPath="url(#dispersion-clip)">
          <rect x="0" y="0" width={size} height={size} className="fill-rough" />

          {/* Fairway som leder in mot greenen */}
          <path
            d={`M${px(-10)} ${py(-14)} Q ${px(-14)} ${py(-30)} ${px(-11)} ${py(-46)}
                L${px(11)} ${py(-46)} Q ${px(14)} ${py(-30)} ${px(10)} ${py(-14)} Z`}
            className="fill-fairway"
          />
          {/* Klippränder i fairway */}
          {[-40, -32, -24, -18].map((z) => (
            <rect
              key={z}
              x={px(-13)}
              y={py(z)}
              width={m(26)}
              height={m(4)}
              className="fill-foreground/[0.04]"
            />
          ))}

          {/* Bunkrar runt greenen */}
          <ellipse
            cx={px(-13.5)}
            cy={py(-8)}
            rx={m(5.5)}
            ry={m(3)}
            transform={`rotate(-28 ${px(-13.5)} ${py(-8)})`}
            className="fill-sand"
          />
          <ellipse
            cx={px(13.5)}
            cy={py(-6)}
            rx={m(5)}
            ry={m(3.2)}
            transform={`rotate(30 ${px(13.5)} ${py(-6)})`}
            className="fill-sand"
          />
          <ellipse
            cx={px(12)}
            cy={py(13)}
            rx={m(4.6)}
            ry={m(2.8)}
            transform={`rotate(-20 ${px(12)} ${py(13)})`}
            className="fill-sand"
          />
          <ellipse cx={px(-4)} cy={py(21)} rx={m(6)} ry={m(2.6)} className="fill-sand" />

          {/* Smal, djup green */}
          <ellipse
            cx={c}
            cy={c}
            rx={m(GREEN_HALF_WIDTH)}
            ry={m(GREEN_HALF_DEPTH)}
            className="fill-green-surface"
          />
          <ellipse
            cx={c}
            cy={c}
            rx={m(GREEN_HALF_WIDTH)}
            ry={m(GREEN_HALF_DEPTH)}
            fill="url(#green-shade)"
          />
          <ellipse
            cx={c}
            cy={c}
            rx={m(GREEN_HALF_WIDTH)}
            ry={m(GREEN_HALF_DEPTH)}
            fill="none"
            className="stroke-fairway"
            strokeWidth="2"
          />

          {/* Avståndsringar 5 / 10 / 15 m */}
          {DISTANCE_RINGS.map((d) => (
            <g key={d}>
              <circle
                cx={c}
                cy={c}
                r={m(d)}
                fill="none"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className={RING_STYLE[d]}
              />
              <text
                x={c + m(d) * 0.72}
                y={py(d * 0.72) - 2}
                className="fill-background/85"
                fontSize="8"
                fontWeight="600"
                textAnchor="middle"
              >
                {d}
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
                className={shotTone(s)}
                opacity={clamped ? 0.5 : 0.95}
                stroke="black"
                strokeOpacity="0.25"
              />
            );
          })}

          {/* Flagga – kort stång så 5-metersringen syns */}
          <line x1={c} y1={c} x2={c} y2={c - 15} className="stroke-foreground" strokeWidth="1.5" />
          <path d={`M${c} ${c - 15} L${c + 13} ${c - 11} L${c} ${c - 7} Z`} className="fill-flag" />
          <circle
            cx={c}
            cy={c}
            r="3"
            className="fill-background stroke-foreground"
            strokeWidth="1"
          />

          <rect x="0" y="0" width={size} height={size} fill="url(#rough-shade)" />
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

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend className="bg-primary" text="Inom 5 m" />
        <Legend className="bg-flag" text="Längdmiss" />
        <Legend className="bg-chart-4" text="Sidledsmiss" />
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
