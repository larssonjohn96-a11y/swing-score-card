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
  flying = false,
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
  /** true under den korta boll-flyger-animationen precis innan nästa slag */
  flying?: boolean;
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

  // Perfekt slag: ingen justering av varken längd eller sidled – bollen ska
  // flyga rakt i koppen (flaggan) med lite konfetti, istället för till en
  // landningspunkt som annars skulle hamna exakt på flaggan ändå.
  const isPerfect = diff === 0 && offset === 0;
  const flightEnd = isPerfect ? flag : { x: landingX, y: landingY };
  const flightPath = `M${startPoint.x} ${startPoint.y} L${flightEnd.x} ${flightEnd.y}`;

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
          r={touched || flying ? 5 : 7}
          className={
            touched || flying ? "fill-background stroke-muted-foreground/50" : "fill-destructive"
          }
          strokeWidth={touched || flying ? 1.5 : 0}
        />
        <text
          x={startPoint.x}
          y={startPoint.y + 22}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-semibold"
        >
          {target} m
        </text>

        {/* Aktuellt slags landningspunkt – bara efter att något justerats, dold under flygningen */}
        {touched && !flying && (
          <circle cx={landingX} cy={landingY} r="7" className="fill-destructive" />
        )}

        {/* Boll som flyger från startpunkten till landningen/koppen när slaget registreras */}
        {flying && (
          <circle r="6" className="fill-destructive">
            <animateMotion path={flightPath} dur="0.55s" fill="freeze" calcMode="linear" />
          </circle>
        )}

        {flying && isPerfect && <ConfettiBurstSvg cx={flag.x} cy={flag.y} />}
      </svg>

      {flying && isPerfect && (
        <p className="animate-in fade-in zoom-in-95 -mt-1 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary duration-300">
          Perfect shot
        </p>
      )}
    </div>
  );
}

/** Mycket kort, diskret SVG-konfetti kring koppen för ett perfekt slag. */
function ConfettiBurstSvg({ cx, cy }: { cx: number; cy: number }) {
  const pieces = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2;
    const dist = 22 + (i % 3) * 6;
    const colors = ["var(--primary)", "var(--flag)", "var(--sand)", "var(--chart-4)"];
    return {
      id: i,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      color: colors[i % colors.length],
      delay: (i % 4) * 0.03,
      rot: (angle * 180) / Math.PI,
    };
  });

  return (
    <g>
      {pieces.map((p) => (
        <rect
          key={p.id}
          x={cx - 2}
          y={cy - 1}
          width="4"
          height="2"
          fill={p.color}
          opacity="0"
          transform={`rotate(${p.rot} ${cx} ${cy})`}
        >
          <animate
            attributeName="x"
            values={`${cx - 2};${p.x - 2}`}
            dur="0.5s"
            begin={`${p.delay}s`}
            fill="freeze"
            calcMode="linear"
          />
          <animate
            attributeName="y"
            values={`${cy - 1};${p.y - 1}`}
            dur="0.5s"
            begin={`${p.delay}s`}
            fill="freeze"
            calcMode="linear"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.1;0.7;1"
            dur="0.6s"
            begin={`${p.delay}s`}
            fill="freeze"
          />
        </rect>
      ))}
    </g>
  );
}
