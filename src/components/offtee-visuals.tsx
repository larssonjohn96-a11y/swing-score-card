import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TEE_CLUBS, type OffTeeResult, type TeeClub, type TeeHole } from "@/lib/offtee";

/** Hero: top-down-vy av en fairway med tee, dogleg-antydan och spridda utslag. */
export function TeeHero() {
  const hits = [
    [150, 60],
    [136, 74],
    [168, 66],
    [142, 50],
    [160, 82],
    [128, 58],
  ];
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en fairway ovanifrån med tee längst ner och spridda utslag"
      className="h-44 w-full"
    >
      <path d="M150 186 L96 6 Q150 -14 204 6 Z" className="fill-fairway" />
      <path
        d="M150 186 L120 -2"
        className="stroke-rough"
        strokeWidth="26"
        fill="none"
        opacity="0.35"
      />
      <path
        d="M150 186 L180 -2"
        className="stroke-rough"
        strokeWidth="26"
        fill="none"
        opacity="0.35"
      />
      {[40, 76, 112, 148].map((y) => (
        <rect key={y} x="90" y={y} width="120" height="6" className="fill-foreground/[0.05]" />
      ))}
      <path
        d="M150 178 Q142 120 148 62"
        className="stroke-flag"
        strokeWidth="2"
        strokeDasharray="5 6"
        fill="none"
      />
      {hits.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className="fill-foreground/70" />
      ))}
      <circle
        cx="150"
        cy="178"
        r="6"
        className="fill-background stroke-foreground"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Klubbval – kompakt horisontell pill-rad. */
export function ClubPicker({
  value,
  onChange,
}: {
  value: TeeClub;
  onChange: (c: TeeClub) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {TEE_CLUBS.map((club) => (
        <button
          key={club}
          type="button"
          onClick={() => onChange(club)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === club
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          {club}
        </button>
      ))}
    </div>
  );
}

/** Kompakt sifferfält med diskret uppdateringsanimation, delar stil med Approach Test. */
export function TeeNumberField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  hint,
  steps = [-10, -5, 5, 10],
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

/** Kompakt hål-illustration: fairwaybredd, ev. dogleg, ev. maxlandningsavstånd. */
export function HoleIllustration({ hole }: { hole: TeeHole }) {
  const size = 120;
  const c = size / 2;
  const widthPx = Math.min(56, hole.fairwayHalfWidth * 1.9);
  const bend = hole.dogleg === "left" ? -14 : hole.dogleg === "right" ? 14 : 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-24 w-full"
      role="img"
      aria-label={`Illustration av ${hole.label}`}
    >
      <path
        d={`M${c - widthPx / 2} ${size - 6}
            Q ${c - widthPx / 2 + bend} ${c}
              ${c - widthPx / 3} 6
            L ${c + widthPx / 3} 6
            Q ${c + widthPx / 2 + bend} ${c}
              ${c + widthPx / 2} ${size - 6}
            Z`}
        className="fill-fairway"
      />
      {hole.maxLandingDistance ? (
        <line
          x1="4"
          y1={size - 6 - (hole.maxLandingDistance / hole.length) * (size - 16)}
          x2={size - 4}
          y2={size - 6 - (hole.maxLandingDistance / hole.length) * (size - 16)}
          className="stroke-destructive"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      ) : null}
      <circle
        cx={c}
        cy={size - 6}
        r="4"
        className="fill-background stroke-foreground"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Normaliserad spridningsbild – alla 12 slag på en fast skala oavsett hål. */
export function TeeDispersion({ result }: { result: OffTeeResult }) {
  const size = 280;
  const c = size / 2;
  const rangeX = 2.4; // ± multipel av fairwayHalfWidth
  const rangeY = 1.5; // 0 = tee, 1.15 ≈ genomsnittligt idealMin

  const px = (nx: number) => c + (nx / rangeX) * (c - 16);
  const py = (ny: number) => size - 12 - (ny / rangeY) * (size - 24);

  const avgFairwayHalf = result.shots.length
    ? result.shots.reduce((a, s) => a + s.hole.fairwayHalfWidth, 0) / result.shots.length
    : 15;
  const avgRough = result.shots.length
    ? result.shots.reduce((a, s) => a + s.hole.roughDepth, 0) / result.shots.length
    : 12;

  const fairwayXHalf = 1;
  const roughXHalf = 1 + avgRough / avgFairwayHalf;

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label="Normaliserad spridningsbild för alla utslag i testet"
      >
        <defs>
          <clipPath id="tee-dispersion-clip">
            <rect x="0" y="0" width={size} height={size} rx="20" />
          </clipPath>
        </defs>
        <g clipPath="url(#tee-dispersion-clip)">
          <rect x="0" y="0" width={size} height={size} className="fill-destructive/10" />
          <rect
            x={px(-roughXHalf)}
            y="0"
            width={px(roughXHalf) - px(-roughXHalf)}
            height={size}
            className="fill-rough"
          />
          <rect
            x={px(-fairwayXHalf)}
            y="0"
            width={px(fairwayXHalf) - px(-fairwayXHalf)}
            height={size}
            className="fill-fairway"
          />
          <line
            x1={0}
            y1={py(1)}
            x2={size}
            y2={py(1)}
            className="stroke-flag"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          {result.shots.map((s) => {
            const nx = s.offline / s.hole.fairwayHalfWidth;
            const ny = s.total / s.hole.idealMin;
            const color = s.outcome.isOB
              ? "fill-destructive"
              : s.outcome.inRough
                ? "fill-sand"
                : "fill-primary";
            return (
              <circle
                key={s.index}
                cx={px(nx)}
                cy={py(Math.min(ny, rangeY))}
                r="5"
                className={color}
                stroke="var(--background)"
                strokeWidth="1.5"
              />
            );
          })}
          <circle
            cx={px(0)}
            cy={size - 12}
            r="5"
            className="fill-background stroke-foreground"
            strokeWidth="2"
          />
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Legend swatch="bg-primary" label="Fairway" />
        <Legend swatch="bg-sand" label="Ruff" />
        <Legend swatch="bg-destructive" label="OB" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}
