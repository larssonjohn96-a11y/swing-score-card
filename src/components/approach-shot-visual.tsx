/**
 * Visuell representation av ett enskilt approach-slag under själva testet
 * (pilot, endast Approach). Innan spelaren justerat Längd/Sidled visas en
 * neutral startpunkt till vänster med måldistansen i en liten bubbla. Så
 * fort Längd och/eller Sidled justeras flyttas punkten i realtid till en
 * beräknad landningsposition relativt greenen. Ingen linje, inga
 * hjälpmarkeringar – bara den röda punkten, som specat.
 */
export function ApproachShotVisual({
  target,
  diff,
  offset,
  side,
  touched,
}: {
  /** måldistans i meter */
  target: number;
  /** carry - target: negativt = kort, positivt = långt */
  diff: number;
  /** sidled i meter, alltid positivt */
  offset: number;
  side: -1 | 1;
  /** false = ingen justering gjord än denna gång, visa neutral startpunkt */
  touched: boolean;
}) {
  const w = 380;
  const h = 220;
  const green = { x: 270, y: 108 };
  const PX_PER_M_LEN = 4;
  const PX_PER_M_SIDE = 4;

  const clampedDiff = Math.max(-30, Math.min(30, diff));
  const clampedOffset = Math.max(-25, Math.min(25, offset));

  const startPoint = { x: 58, y: 158 };
  const dot = touched
    ? {
        x: green.x + side * clampedOffset * PX_PER_M_SIDE,
        y: green.y - clampedDiff * PX_PER_M_LEN,
      }
    : startPoint;

  return (
    <div className="rounded-3xl bg-primary/[0.04] p-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-52 w-full"
        role="img"
        aria-label="Slagvisualisering"
      >
        {/* Green: koncentriska, mjuka ringar */}
        <ellipse cx={green.x} cy={green.y} rx="105" ry="75" className="fill-primary/10" />
        <ellipse cx={green.x} cy={green.y} rx="78" ry="55" className="fill-primary/16" />
        <ellipse cx={green.x} cy={green.y} rx="50" ry="35" className="fill-primary/24" />
        <ellipse cx={green.x} cy={green.y} rx="24" ry="17" className="fill-primary/34" />

        {/* Flagga */}
        <line
          x1={green.x}
          y1={green.y}
          x2={green.x}
          y2={green.y - 58}
          className="stroke-foreground"
          strokeWidth="1.5"
        />
        <path
          d={`M${green.x} ${green.y - 58} L${green.x + 22} ${green.y - 51} L${green.x} ${green.y - 44} Z`}
          className="fill-flag"
        />
        <circle cx={green.x} cy={green.y} r="3" className="fill-foreground" />

        {/* Röd punkt: startläge eller beräknad landningsposition */}
        <circle cx={dot.x} cy={dot.y} r="7" className="fill-destructive" />
        <circle
          cx={dot.x}
          cy={dot.y}
          r="7"
          fill="none"
          className="stroke-destructive/30"
          strokeWidth="5"
        />

        {!touched && (
          <>
            <rect
              x={startPoint.x - 30}
              y={startPoint.y + 16}
              width="60"
              height="24"
              rx="12"
              className="fill-primary/12"
            />
            <text
              x={startPoint.x}
              y={startPoint.y + 32}
              textAnchor="middle"
              className="fill-foreground text-[13px] font-semibold"
            >
              {target} m
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
