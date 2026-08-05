import type { Direction, ShortPuttDirectionStat, ShortPuttDistance } from "@/lib/shortputt";

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

/**
 * Resultatets "Träffbild": träffprocent per riktning, grönt/orange beroende
 * på nivå. Samma korsformade layout som PuttingPositionDiagram, men visar
 * ett aggregerat resultat per riktning istället för en aktiv position.
 */
export function PuttingResultCompass({ byDirection }: { byDirection: ShortPuttDirectionStat[] }) {
  const cx = 130;
  const cy = 115;
  const R = 62;

  const arms: { direction: Direction; dx: number; dy: number }[] = [
    { direction: "12", dx: 0, dy: -1 },
    { direction: "3", dx: 1, dy: 0 },
    { direction: "6", dx: 0, dy: 1 },
    { direction: "9", dx: -1, dy: 0 },
  ];

  return (
    <svg
      viewBox="0 0 260 230"
      className="h-44 w-full"
      role="img"
      aria-label="Träffprocent per riktning"
    >
      <circle cx={cx} cy={cy} r="70" className="fill-fairway" />
      {arms.map(({ direction, dx, dy }) => (
        <line
          key={direction}
          x1={cx}
          y1={cy}
          x2={cx + dx * R}
          y2={cy + dy * R}
          className="stroke-flag"
          strokeWidth="2"
          strokeDasharray="4 5"
        />
      ))}
      <circle cx={cx} cy={cy} r="6" className="fill-foreground" />

      {arms.map(({ direction, dx, dy }) => {
        const stat = byDirection.find((d) => d.direction === direction);
        if (!stat) return null;
        const pct = Math.round(stat.pct);
        const good = pct >= 45;
        const x = cx + dx * (R + 22);
        const y = cy + dy * (R + 18);
        return (
          <text
            key={direction}
            x={x}
            y={y}
            textAnchor="middle"
            className={`font-[family-name:var(--font-display)] text-[22px] ${
              good ? "fill-primary" : "fill-sand"
            }`}
          >
            {pct}%
          </text>
        );
      })}
    </svg>
  );
}

/** Cirkulär progress-ring för score, t.ex. 56/72 poäng. */
export function ScoreRing({ value, max }: { value: number; max: number }) {
  const size = 100;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const dash = circumference * pct;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-24 w-24"
      role="img"
      aria-label={`${value} av ${max} poäng`}
    >
      <circle cx={c} cy={c} r={r} className="fill-none stroke-muted" strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        className="fill-none stroke-primary"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text
        x={c}
        y={c - 4}
        textAnchor="middle"
        className="fill-foreground font-[family-name:var(--font-display)] text-[26px]"
      >
        {value}
      </text>
      <text x={c} y={c + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        /{max}
      </text>
    </svg>
  );
}
