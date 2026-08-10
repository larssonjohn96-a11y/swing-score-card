import { useEffect, useRef, useState } from "react";
import { PRECISION_TARGETS } from "@/lib/precision";

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
 * och en ny röd punkt visar var slaget faktiskt landade.
 *
 * Boll-animationen och konfettin drivs av requestAnimationFrame/React-state
 * respektive rena CSS-keyframes, istället för SVG SMIL (<animate>/
 * <animateMotion>) som visade sig inte spela upp pålitligt i alla miljöer.
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
  const flag = { x: 340, y: 75 };

  // Distansskalan: alla 9 avstånden som en rad punkter, samma princip som
  // positionsdiagrammen i Närspelstest/Short Putting Test. Bara den
  // aktuella punkten (index för "target") är röd/vit med sin etikett –
  // övriga är små, grå, utan text. Den aktuella punktens position blir
  // också startpunkten bollen flyger ifrån.
  const trackY = flag.y;
  const trackX1 = 118;
  const trackX2 = 234;
  const currentIndex = Math.max(
    0,
    PRECISION_TARGETS.indexOf(target as (typeof PRECISION_TARGETS)[number]),
  );
  // Omvänd mappning: kortast avstånd (55 m) ligger närmast flaggan (trackX2),
  // längst avstånd (165 m) ligger längst bort (trackX1) – matchar att man i
  // verkligheten står närmare green ju kortare inspelet är.
  const trackXFor = (i: number) =>
    trackX2 - (i / (PRECISION_TARGETS.length - 1)) * (trackX2 - trackX1);
  const startPoint = { x: trackXFor(currentIndex), y: trackY };

  const PX_PER_M_LEN = 3.4;
  const PX_PER_M_SIDE = 3.4;
  const clampedDiff = Math.max(-40, Math.min(40, diff));
  const clampedOffset = Math.max(-30, Math.min(30, offset));

  const landingX = flag.x + clampedDiff * PX_PER_M_LEN;
  const landingY = flag.y + side * clampedOffset * PX_PER_M_SIDE;

  const isPerfect = diff === 0 && offset === 0;
  const flightEnd = isPerfect ? flag : { x: landingX, y: landingY };
  // Verklig landningsdistans i meter (Pythagoras), inte pixlar – avgör
  // vilken av de tre nivåerna (normal/birdie/perfekt) som gäller.
  const landingDistanceM = Math.sqrt(diff * diff + offset * offset);
  const isBirdieRange = !isPerfect && landingDistanceM <= 4;

  const FLIGHT_MS = 650;
  const [progress, setProgress] = useState(0); // 0–1 under flygningen
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBirdie, setShowBirdie] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flying) {
      setProgress(0);
      setShowConfetti(false);
      setShowBirdie(false);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FLIGHT_MS);
      setProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (isPerfect) {
        setShowConfetti(true);
      } else if (isBirdieRange) {
        setShowBirdie(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying]);

  // Kvadratisk Bézier – mjuk båge som ett riktigt golfslag, inte en rak linje.
  const flightDist = Math.hypot(flightEnd.x - startPoint.x, flightEnd.y - startPoint.y);
  const arcHeight = Math.min(60, Math.max(24, flightDist * 0.35));
  const ctrl = {
    x: (startPoint.x + flightEnd.x) / 2,
    y: (startPoint.y + flightEnd.y) / 2 - arcHeight,
  };
  const bezier = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * startPoint.x + 2 * mt * t * ctrl.x + t * t * flightEnd.x,
      y: mt * mt * startPoint.y + 2 * mt * t * ctrl.y + t * t * flightEnd.y,
    };
  };
  const ball = bezier(progress);
  // Bollen visas hela flygningen, men tonas mjukt bort under sista biten
  // (istället för att abrupt försvinna vid progress===1) så den "landar"
  // istället för att flimra bort.
  const ballOpacity = flying ? (progress > 0.9 ? Math.max(0, (1 - progress) / 0.1) : 1) : 0;
  const ballVisible = flying;

  return (
    <div className="relative rounded-2xl bg-primary/[0.04] px-2 py-1.5">
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
        <ellipse
          cx={flag.x}
          cy={flag.y}
          rx="14"
          ry="12"
          className="fill-primary/34"
          style={
            showBirdie
              ? ({
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "sg4-birdie-ring-pulse 1.3s ease-out 1",
                } as React.CSSProperties)
              : undefined
          }
        />
        {showBirdie && (
          <style>{`
            @keyframes sg4-birdie-ring-pulse {
              0% { transform: scale(1); filter: brightness(1); }
              25% { transform: scale(1.35); filter: brightness(1.6); }
              55% { transform: scale(1.1); filter: brightness(1.25); }
              100% { transform: scale(1); filter: brightness(1); }
            }
            @keyframes sg4-birdie-dot-pop {
              0% { transform: scale(1); }
              30% { transform: scale(1.6); }
              60% { transform: scale(0.9); }
              100% { transform: scale(1); }
            }
          `}</style>
        )}

        {/* Diskret spellinje: hela distansskalan genom flaggan, längs KORT/LÅNGT-axeln */}
        <line
          x1={trackX1}
          y1={flag.y}
          x2={w - 14}
          y2={flag.y}
          className="stroke-foreground/15"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Övriga åtta avstånd i testet: små grå punkter utan etikett – bara
            den aktuella (röd/vit nedan) visar sin distans. */}
        {PRECISION_TARGETS.map((t, i) =>
          i === currentIndex ? null : (
            <circle
              key={t}
              cx={trackXFor(i)}
              cy={trackY}
              r="3"
              className="fill-muted-foreground/30"
            />
          ),
        )}

        {/* Axeletiketter – "Kort" följer label-gruppen (prick + distans) så den
            ligger på samma avstånd från flaggan som Långt/Vänster/Höger. */}
        <text
          x={startPoint.x}
          y={flag.y - 14}
          textAnchor="middle"
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

        {/* Aktuellt slags landningspunkt – målet bollen flyger mot, synlig hela tiden */}
        {(touched || flying) && !isPerfect && (
          <circle
            cx={landingX}
            cy={landingY}
            r="7"
            className="fill-destructive"
            style={
              showBirdie
                ? ({
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: "sg4-birdie-dot-pop 0.5s ease-out 1",
                  } as React.CSSProperties)
                : undefined
            }
          />
        )}

        {/* Vit golfboll, animerad steg-för-steg via React-state längs en Bézier-båge,
            tonas mjukt bort i slutet istället för att abrupt försvinna */}
        {ballVisible && (
          <circle
            cx={ball.x}
            cy={ball.y}
            r="5.5"
            className="fill-white stroke-foreground/40"
            strokeWidth="1"
            opacity={ballOpacity}
          />
        )}

        {showConfetti && <ConfettiBurstSvg cx={flag.x} cy={flag.y} />}
      </svg>

      {flying && isPerfect && progress > 0.15 && (
        <p className="animate-in fade-in zoom-in-95 -mt-1 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary duration-300">
          Perfect shot
        </p>
      )}
      {showBirdie && (
        <p className="animate-in fade-in zoom-in-95 -mt-1 text-center text-xs font-bold uppercase tracking-[0.2em] text-tier-gold duration-300">
          Birdie läge
        </p>
      )}
    </div>
  );
}

const CONFETTI_COLORS = ["var(--primary)", "var(--flag)", "var(--sand)", "var(--chart-4)"];

/** Kort "fyrverkeri" (blixtring + konfettibitar) med rena CSS-keyframes –
 *  pålitligare över webbläsare/webviews än SVG SMIL. */
function ConfettiBurstSvg({ cx, cy }: { cx: number; cy: number }) {
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 24 + (i % 3) * 8;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (i % 4) * 20,
    };
  });

  return (
    <g>
      <style>{`
        @keyframes sg4-firework-ring {
          0% { transform: scale(0.15); opacity: 0.9; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes sg4-firework-piece {
          0% { transform: translate(0px, 0px); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
      `}</style>
      <circle
        cx={cx}
        cy={cy}
        r="26"
        fill="none"
        className="stroke-flag"
        strokeWidth="2"
        style={
          {
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "sg4-firework-ring 0.45s ease-out forwards",
          } as React.CSSProperties
        }
      />
      {pieces.map((p) => (
        <rect
          key={p.id}
          x={cx - 2}
          y={cy - 1}
          width="4"
          height="2"
          fill={p.color}
          style={
            {
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "sg4-firework-piece 0.55s ease-out forwards",
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </g>
  );
}
