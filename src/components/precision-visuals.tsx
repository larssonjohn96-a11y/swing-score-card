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

type ShotDirection = "long" | "short" | "left" | "right";

/** Vilken riktning som dominerar missen – längd eller sidled, och åt vilket håll. */
function shotDirection(s: PrecisionShot): ShotDirection {
  const len = lengthError(s);
  if (Math.abs(len) >= Math.abs(s.offline)) return len >= 0 ? "long" : "short";
  return s.offline < 0 ? "left" : "right";
}

/** Färg per riktning, samma språk som en klassisk spridningskarta (image 1). */
const DIRECTION_FILL: Record<ShotDirection, string> = {
  long: "fill-chart-4/70",
  short: "fill-chart-4",
  left: "fill-destructive",
  right: "fill-sand",
};

/**
 * Top-down-vy av en smal, djup green med fairway och bunkrar. Fast skala
 * ±40 m från flaggan, ringar på 5/10/15 m och ett märke per slag.
 */
export function DispersionGreen({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  const stats = dispersionStats(shots);

  const offlineVals = filled.map((s) => s.offline);
  const lengthVals = filled.map((s) => lengthError(s));
  const meanOf = (vals: number[]) =>
    vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const stdOf = (vals: number[], mean: number) =>
    vals.length ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) : 0;
  const meanOffline = meanOf(offlineVals);
  const meanLength = meanOf(lengthVals);
  const ellipse = {
    cx: meanOffline,
    cy: meanLength,
    rx: Math.max(2, stdOf(offlineVals, meanOffline) * 1.6),
    ry: Math.max(2, stdOf(lengthVals, meanLength) * 1.6),
  };

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

          {/* Bunkrar runt greenen – två överlappande ellipser ger en mer organisk, njurformad kant */}
          <g className="fill-sand">
            <ellipse
              cx={px(-13.5)}
              cy={py(-8)}
              rx={m(5.5)}
              ry={m(3)}
              transform={`rotate(-28 ${px(-13.5)} ${py(-8)})`}
            />
            <ellipse
              cx={px(-16.5)}
              cy={py(-5.5)}
              rx={m(3.4)}
              ry={m(2.1)}
              transform={`rotate(-10 ${px(-16.5)} ${py(-5.5)})`}
            />
          </g>
          <g className="fill-sand">
            <ellipse
              cx={px(13.5)}
              cy={py(-6)}
              rx={m(5)}
              ry={m(3.2)}
              transform={`rotate(30 ${px(13.5)} ${py(-6)})`}
            />
            <ellipse
              cx={px(16.2)}
              cy={py(-3)}
              rx={m(3)}
              ry={m(2)}
              transform={`rotate(50 ${px(16.2)} ${py(-3)})`}
            />
          </g>
          <g className="fill-sand">
            <ellipse
              cx={px(12)}
              cy={py(13)}
              rx={m(4.6)}
              ry={m(2.8)}
              transform={`rotate(-20 ${px(12)} ${py(13)})`}
            />
            <ellipse cx={px(15)} cy={py(15.5)} rx={m(2.6)} ry={m(1.8)} />
          </g>
          <g className="fill-sand">
            <ellipse cx={px(-4)} cy={py(21)} rx={m(6)} ry={m(2.6)} />
            <ellipse cx={px(-8.5)} cy={py(22.5)} rx={m(2.8)} ry={m(1.7)} />
          </g>

          {/* Träd i hörnen för lite mer verklighetskänsla */}
          {[
            [-38, 36],
            [-33, 38],
            [37, 37],
            [33, 34],
            [-37, -36],
            [38, -35],
          ].map(([x, z], i) => (
            <circle key={i} cx={px(x)} cy={py(z)} r={m(3.2)} className="fill-rough" opacity="0.9" />
          ))}

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

          {/* Slag, färgkodade efter riktning (LONG/SHORT/LEFT/RIGHT) */}
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
                className={DIRECTION_FILL[shotDirection(s)]}
                opacity={clamped ? 0.5 : 0.95}
                stroke="black"
                strokeOpacity="0.25"
              />
            );
          })}

          {/* Spridningsellips + snittpunkt (stjärna) runt träffbilden */}
          {filled.length >= 3 && (
            <>
              <ellipse
                cx={px(ellipse.cx)}
                cy={py(ellipse.cy)}
                rx={m(ellipse.rx)}
                ry={m(ellipse.ry)}
                fill="none"
                className="stroke-chart-5"
                strokeWidth="2"
                strokeDasharray="1 0"
                opacity="0.85"
              />
              <path
                d={starPath(px(ellipse.cx), py(ellipse.cy), 7, 3)}
                className="fill-chart-5 stroke-background"
                strokeWidth="0.75"
              />
            </>
          )}

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

        {/* Riktningsetiketter runt kartan */}
        <text
          x={c}
          y="14"
          textAnchor="middle"
          className="fill-chart-4 text-[10px] font-bold uppercase tracking-wide"
        >
          Long
        </text>
        <text
          x={c}
          y={size - 8}
          textAnchor="middle"
          className="fill-chart-4 text-[10px] font-bold uppercase tracking-wide"
        >
          Short
        </text>
        <text
          x="10"
          y={c + 3}
          textAnchor="start"
          className="fill-destructive text-[10px] font-bold uppercase tracking-wide"
        >
          Left
        </text>
        <text
          x={size - 10}
          y={c + 3}
          textAnchor="end"
          className="fill-sand text-[10px] font-bold uppercase tracking-wide"
        >
          Right
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Legend className="bg-chart-4/70" text="Långt" />
        <Legend className="bg-chart-4" text="Kort" />
        <Legend className="bg-destructive" text="Vänster" />
        <Legend className="bg-sand" text="Höger" />
        <Legend className="bg-chart-5" text="Spridningsellips" />
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

/** SVG path för en enkel 5-uddig stjärna, använd som snittpunktsmarkör i spridningsellipsen. */
function starPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join(" ")} Z`;
}
