import type { ShortGameShot } from "@/lib/shortgame";
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
export function ShortGameDispersion({ shots }: { shots: ShortGameShot[] }) {
  const size = 260;
  const c = size / 2;
  const maxRadius = c - 24;
  const maxProximity = 8; // "7+ m"-intervallets mittvärde

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
        const good = proximity <= 2;
        return (
          <circle
            key={s.index}
            cx={x}
            cy={y}
            r="6"
            className={good ? "fill-primary" : "fill-destructive"}
            stroke="black"
            strokeOpacity="0.25"
          />
        );
      })}
      <circle cx={c} cy={c} r="4" className="fill-foreground" />
    </svg>
  );
}
