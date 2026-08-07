/** Hero: top-down-vy av en green med flagga och en bunker med spridda slag ut mot hålet. */
export function BunkerHero({ className = "h-44 w-full" }: { className?: string }) {
  const hits: [number, number][] = [
    [155, 78],
    [175, 92],
    [140, 100],
    [165, 112],
    [120, 90],
    [180, 100],
  ];
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en green med flagga och en bunker med spridda slag mot hålet"
      className={className}
    >
      <circle cx="160" cy="95" r="72" className="fill-fairway" />
      <ellipse cx="90" cy="120" rx="46" ry="30" className="fill-sand" />
      <ellipse cx="70" cy="128" rx="26" ry="17" className="fill-sand" />

      {hits.map(([x, y], i) => (
        <g key={i}>
          <line
            x1="90"
            y1="120"
            x2={x}
            y2={y}
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

      <line x1="160" y1="95" x2="160" y2="55" className="stroke-foreground" strokeWidth="1.5" />
      <path d="M160 55 L182 63 L160 71 Z" className="fill-flag" />
      <circle cx="160" cy="95" r="4" className="fill-foreground" />
    </svg>
  );
}
