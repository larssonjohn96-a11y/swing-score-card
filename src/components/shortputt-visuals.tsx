import type { Direction, ShortPuttDirectionStat, ShortPuttDistance } from "@/lib/shortputt";

/** Hero: top-down-vy av en green med tre startlinjer (klockan 12/3/6/9) runt hålet. */
export function PuttingHero({ className = "h-44 w-full" }: { className?: string }) {
  const c = 150;
  const cy = 95;
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en green ovanifrån med tre startlinjer runt hålet"
      className={className}
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

/** Visar aktuell putt och historiken för samtliga nio positioner. */
export function PuttingPositionDiagram({
  activeDirection,
  activeDistance,
  putts = [],
  currentIndex = 0,
}: {
  activeDirection: Direction;
  activeDistance: ShortPuttDistance;
  putts?: { direction: Direction; distance: ShortPuttDistance; holed: boolean }[];
  currentIndex?: number;
}) {
  const cx = 130;
  const cy = 110;
  const radii = [30, 56, 82];
  const angles: Record<Direction, number> = { "12": -Math.PI / 2, "4": Math.PI / 6, "8": 5 * Math.PI / 6 };
  return (
    <svg viewBox="0 0 260 220" className="h-52 w-full" role="img"
      aria-label={`Aktuell putt klockan ${activeDirection}, ${activeDistance} meter. Fylld blå är aktuell, bock är satt och kryss är missad.`}>
      <circle cx={cx} cy={cy} r="101" className="fill-fairway" />
      {radii.map(r => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeDasharray="3 5" />)}
      {(Object.keys(angles) as Direction[]).map(direction => {
        const a = angles[direction];
        return <g key={direction}>
          <line x1={cx} y1={cy} x2={cx + Math.cos(a)*85} y2={cy + Math.sin(a)*85} stroke="currentColor" strokeOpacity=".26" strokeDasharray="3 4"/>
          {radii.map((r,i) => {
            const distance = (i+1) as ShortPuttDistance;
            const x = cx + Math.cos(a)*r, y=cy + Math.sin(a)*r;
            const active = direction===activeDirection && distance===activeDistance;
            const shotIndex=putts.findIndex(p=>p.direction===direction&&p.distance===distance);
            const done=shotIndex>=0 && shotIndex<currentIndex;
            const made=done&&putts[shotIndex].holed;
            return <g key={distance}>
              {active && <circle cx={x} cy={y} r="16" fill="none" stroke="#2563eb" strokeWidth="2.5"/>}
              <circle cx={x} cy={y} r="11" fill={active?"#2563eb":done?(made?"#16a34a":"#dc2626"):"#e2e8f0"} stroke={active?"#1d4ed8":"#94a3b8"} strokeWidth="1"/>
              <text x={x} y={y+3.5} textAnchor="middle" fontSize="11" fontWeight="700" fill={active||done?"white":"#334155"}>{done?(made?"✓":"×"):distance}</text>
            </g>;
          })}
        </g>;
      })}
      <circle cx={cx} cy={cy} r="10" fill="#1e293b" stroke="white" strokeWidth="2"/>
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
    { direction: "4", dx: 0.866, dy: 0.5 },
    { direction: "8", dx: -0.866, dy: 0.5 },
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
