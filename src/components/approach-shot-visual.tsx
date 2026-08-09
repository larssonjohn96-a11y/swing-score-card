/**
 * Visuell representation av ett enskilt approach-slag under själva testet
 * (pilot, endast Approach).
 *
 * Koordinatsystemet är roterat så spellinjen går horisontellt genom flaggan,
 * som alltid är centrum:
 *   KORT  = vänster om flaggan   (diff < 0 → x minskar)
 *   LÅNGT = höger om flaggan     (diff > 0 → x ökar)
 *   VÄNSTER (sidled) = ovanför flaggan  (side "vänster" → y minskar)
 *   HÖGER   (sidled) = nedanför flaggan (side "höger"   → y ökar)
 *
 * Innan spelaren justerat något visas startpositionen som en RÖD punkt med
 * måldistansen bredvid. Så fort Längd/Sidled justeras byter den punkten till
 * en diskret vit/ljusgrå markering (försvinner aldrig, distansen visas kvar),
 * och en ny röd punkt visar var slaget faktiskt landade – uppdaterad i
 * realtid utifrån diff/sidled, utan några extra streck eller hjälplinjer.
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
  const w = 460;
  const h = 150;
  const flag = { x: 300, y: 75 };
  const startPoint = { x: 62, y: flag.y };

  const PX_PER_M_LEN = 3.4;
  const PX_PER_M_SIDE = 3.4;
  const clampedDiff = Math.max(-40, Math.min(40, diff));
  const clampedOffset = Math.max(-30, Math.min(30, offset));

  // KORT/LÅNGT: alltid horisontellt längs spellinjen.
  const landingX = flag.x + clampedDiff * PX_PER_M_LEN;
  // VÄNSTER (side=-1) flyttar uppåt (mindre y), HÖGER (side=1) flyttar nedåt.
  const landingY = flag.y + side * clampedOffset * PX_PER_M_SIDE;

  return (
    <div className="rounded-2xl bg-primary/[0.04] px-2 py-1.5">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-32 w-full"
        role="img"
        aria-label="Slagvisualisering"
      >
        {/* Green: koncentriska, mjuka ringar kring flaggan */}
        <ellipse cx={flag.x} cy={flag.y} rx="72" ry="60" className="fill-primary/10" />
        <ellipse cx={flag.x} cy={flag.y} rx="52" ry="44" className="fill-primary/16" />
        <ellipse cx={flag.x} cy={flag.y} rx="32" ry="27" className="fill-primary/24" />
        <ellipse cx={flag.x} cy={flag.y} rx="14" ry="12" className="fill-primary/34" />

        {/* Diskret spellinje: startpunkt genom flaggan, längs KORT/LÅNGT-axeln */}
        <line
          x1={startPoint.x}
          y1={flag.y}
          x2={w - 14}
          y2={flag.y}
          className="stroke-foreground/15"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Axeletiketter */}
        <text
          x={flag.x - 60}
          y={flag.y + 5}
          textAnchor="end"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          ← Kort
        </text>
        <text
          x={w - 14}
          y={flag.y + 5}
          textAnchor="end"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          Långt →
        </text>
        <text
          x={flag.x}
          y="16"
          textAnchor="middle"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          ↑ Vänster
        </text>
        <text
          x={flag.x}
          y={h - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          ↓ Höger
        </text>

        {/* Flagga */}
        <line
          x1={flag.x}
          y1={flag.y}
          x2={flag.x}
          y2={flag.y - 40}
          className="stroke-foreground"
          strokeWidth="1.5"
        />
        <path
          d={`M${flag.x} ${flag.y - 40} L${flag.x + 15} ${flag.y - 35} L${flag.x} ${flag.y - 30} Z`}
          className="fill-flag"
        />
        <circle cx={flag.x} cy={flag.y} r="2.5" className="fill-foreground" />

        {/* Ursprunglig startposition: röd innan touched, diskret vit/ljusgrå därefter – försvinner aldrig */}
        <circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={touched ? 5 : 7}
          className={touched ? "fill-background stroke-muted-foreground/50" : "fill-destructive"}
          strokeWidth={touched ? 1.5 : 0}
        />
        <text
          x={startPoint.x}
          y={startPoint.y + 22}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-semibold"
        >
          {target} m
        </text>

        {/* Aktuellt slags landningspunkt – bara efter att något justerats */}
        {touched && <circle cx={landingX} cy={landingY} r="7" className="fill-destructive" />}
      </svg>
    </div>
  );
}
