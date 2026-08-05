import type { Direction, ShortPuttDistance } from "@/lib/shortputt";

/** Hero: top-down-vy av en green med fyra startlinjer (klockan 12/3/6/9) runt hålet. */
export function PuttingHero() {
  const c = 150;
  const cy = 95;
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en green ovanifrån med fyra startlinjer runt hålet"
      className="h-44 w-full"
    >
      <circle cx={c} cy={cy} r="82" className="fill-fairway" />
      <circle
        cx={c}
        cy={cy}
        r="82"
        className="fill-none stroke-rough"
        strokeWidth="1"
        opacity="0.4"
      />

      {[
        [c, cy - 60, c, cy - 12],
        [c + 60, cy, c + 12, cy],
        [c, cy + 60, c, cy + 12],
        [c - 60, cy, c - 12, cy],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="stroke-flag"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
      ))}

      {[
        [c, cy - 55],
        [c, cy - 38],
        [c, cy - 20],
        [c + 55, cy],
        [c + 38, cy],
        [c + 20, cy],
        [c, cy + 55],
        [c, cy + 38],
        [c, cy + 20],
        [c - 55, cy],
        [c - 38, cy],
        [c - 20, cy],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="3.5"
          className="fill-background stroke-foreground/70"
          strokeWidth="1.2"
        />
      ))}

      <circle cx={c} cy={cy} r="7" className="fill-foreground" />
      <circle cx={c} cy={cy} r="7" className="fill-none stroke-background" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Visar vilken av de 12 positionerna (4 riktningar × 1/2/3 m) som gäller
 * för det aktuella slaget – samma korsformade layout som green-illustrationen,
 * men med den aktiva positionen tydligt markerad i rött.
 */
export function PuttingPositionDiagram({
  activeDirection,
  activeDistance,
}: {
  activeDirection: Direction;
  activeDistance: ShortPuttDistance;
}) {
  const cx = 130;
  const cy = 110;
  const R = [22, 40, 58];

  const arms: { direction: Direction; dx: number; dy: number }[] = [
    { direction: "12", dx: 0, dy: -1 },
    { direction: "3", dx: 1, dy: 0 },
    { direction: "6", dx: 0, dy: 1 },
    { direction: "9", dx: -1, dy: 0 },
  ];

  return (
    <svg
      viewBox="0 0 260 220"
      className="h-40 w-full"
      role="img"
      aria-label={`Puttposition: klockan ${activeDirection}, ${activeDistance} meter`}
    >
      <circle cx={cx} cy={cy} r="100" className="fill-fairway" />

      {arms.map(({ direction, dx, dy }) => {
        const points = R.map((r) => ({ x: cx + dx * r, y: cy + dy * r }));
        return (
          <g key={direction}>
            <line
              x1={cx}
              y1={cy}
              x2={points[2].x}
              y2={points[2].y}
              className="stroke-flag"
              strokeWidth="2"
              strokeDasharray="4 5"
            />
            {points.map((p, i) => {
              const distance = (i + 1) as ShortPuttDistance;
              const active = direction === activeDirection && distance === activeDistance;
              return (
                <circle
                  key={distance}
                  cx={p.x}
                  cy={p.y}
                  r={active ? 7 : 5.5}
                  className={
                    active
                      ? "fill-destructive stroke-destructive"
                      : "fill-background stroke-foreground/70"
                  }
                  strokeWidth={active ? 2 : 1.5}
                />
              );
            })}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="7" className="fill-foreground" />
      <circle cx={cx} cy={cy} r="7" className="fill-none stroke-background" strokeWidth="1.5" />
    </svg>
  );
}
