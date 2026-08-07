import { SHORTGAME_DISTANCES, type ShortGameShot } from "@/lib/shortgame";
import { INTERVALS } from "@/lib/shortgame";

/** Hero: top-down-vy av en green med flagga och chip-/pitch-slag som landar från olika håll. */
export function ShortGameHero({ className = "h-44 w-full" }: { className?: string }) {
  const hits: [number, number][] = [
    [150, 70],
    [175, 95],
    [130, 110],
    [160, 130],
    [110, 90],
    [185, 115],
  ];
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en green med flagga och spridda chip-/pitchslag runt hålet"
      className={className}
    >
      <circle cx="150" cy="100" r="70" className="fill-fairway" />
      <circle
        cx="150"
        cy="100"
        r="70"
        className="fill-none stroke-rough"
        strokeWidth="1"
        opacity="0.4"
      />

      {hits.map(([x, y], i) => (
        <g key={i}>
          <line
            x1={x}
            y1={y}
            x2="150"
            y2="100"
            className="stroke-flag"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
          <circle
            cx={x}
            cy={y}
            r="4"
            className="fill-background stroke-foreground/70"
            strokeWidth="1.2"
          />
        </g>
      ))}

      <line x1="150" y1="100" x2="150" y2="60" className="stroke-foreground" strokeWidth="1.5" />
      <path d="M150 60 L172 68 L150 76 Z" className="fill-flag" />
      <circle cx="150" cy="100" r="4" className="fill-foreground" />
    </svg>
  );
}

/**
 * Spridningsbild: varje slags proximity som avstånd från en central flagga.
 * Ingen riktningsdata samlas in (bara avstånd), så varje slag placeras på
 * en egen, fast vinkel runt hålet – avståndet från centrum är det som
 * faktiskt representerar resultatet.
 */
function dispersionTone(proximity: number): string {
  if (proximity <= 1) return "fill-primary";
  if (proximity <= 2) return "fill-chart-4";
  if (proximity <= 3) return "fill-sand";
  return "fill-destructive";
}

export function ShortGameDispersion({ shots }: { shots: ShortGameShot[] }) {
  const size = 260;
  const c = size / 2;
  const maxRadius = c - 24;
  const maxProximity = 7; // "6+ m"-intervallets mittvärde

  const played = shots.filter((s) => s.interval);
  const angleStep = (2 * Math.PI) / Math.max(1, played.length);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full"
      role="img"
      aria-label="Spridningsbild för närspelstestet"
    >
      <circle cx={c} cy={c} r={maxRadius} className="fill-fairway" />
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle
          key={f}
          cx={c}
          cy={c}
          r={maxRadius * f}
          fill="none"
          className="stroke-background/40"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {played.map((s, i) => {
        const interval = INTERVALS.find((iv) => iv.key === s.interval);
        const proximity = interval?.midpoint ?? 0;
        const r = Math.min(maxRadius, (proximity / maxProximity) * maxRadius);
        const angle = i * angleStep - Math.PI / 2;
        const x = c + r * Math.cos(angle);
        const y = c + r * Math.sin(angle);
        return (
          <circle
            key={s.index}
            cx={x}
            cy={y}
            r="6"
            className={dispersionTone(proximity)}
            stroke="black"
            strokeOpacity="0.25"
          />
        );
      })}
      <circle cx={c} cy={c} r="4" className="fill-foreground" />
    </svg>
  );
}

/**
 * Visar aktuellt slags måldistans på en linjär skala mellan testets kortaste
 * och längsta avstånd (8–20 m), med en boll placerad vid rätt punkt och
 * hålet i ena änden – samma princip som Short Putting Tests positionsbild,
 * fast för avstånd istället för klockposition.
 */
export function ShortGamePositionDiagram({ distance }: { distance: number }) {
  const w = 300;
  const h = 130;
  const min = SHORTGAME_DISTANCES[0];
  const max = SHORTGAME_DISTANCES[SHORTGAME_DISTANCES.length - 1];
  const trackX1 = 40;
  const trackX2 = w - 40;
  const y = h / 2;

  const xFor = (d: number) => trackX1 + ((max - d) / (max - min)) * (trackX2 - trackX1);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full"
      role="img"
      aria-label={`Måldistans: ${distance} meter från hål`}
    >
      <line
        x1={trackX1}
        y1={y}
        x2={trackX2}
        y2={y}
        className="stroke-rough"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {SHORTGAME_DISTANCES.map((d) => (
        <circle
          key={d}
          cx={xFor(d)}
          cy={y}
          r={d === distance ? 9 : 4}
          className={
            d === distance
              ? "fill-destructive stroke-destructive"
              : "fill-background stroke-foreground/50"
          }
          strokeWidth={d === distance ? 2 : 1.2}
        />
      ))}

      {SHORTGAME_DISTANCES.map((d) => (
        <text
          key={`label-${d}`}
          x={xFor(d)}
          y={y + 26}
          textAnchor="middle"
          className={`text-[10px] ${d === distance ? "fill-destructive font-bold" : "fill-muted-foreground"}`}
        >
          {d}m
        </text>
      ))}

      <circle cx={trackX2 + 14} cy={y} r="7" className="fill-foreground" />
      <circle
        cx={trackX2 + 14}
        cy={y}
        r="7"
        className="fill-none stroke-background"
        strokeWidth="1.5"
      />
      <line
        x1={trackX2 + 14}
        y1={y - 6}
        x2={trackX2 + 14}
        y2={y - 22}
        className="stroke-foreground"
        strokeWidth="1.5"
      />
      <path
        d={`M${trackX2 + 14} ${y - 22} L${trackX2 + 26} ${y - 18} L${trackX2 + 14} ${y - 14} Z`}
        className="fill-flag"
      />
    </svg>
  );
}
