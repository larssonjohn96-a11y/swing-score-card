import { useEffect, useRef, useState } from "react";

/**
 * Visuell representation av ett enskilt approach-slag under själva testet
 * (pilot, endast Approach).
 *
 * Fungerar som en enkel top-down-karta med flaggan i centrum. Tre fasta
 * riktningsetiketter (↑ LÅNG, ← VÄNSTER, HÖGER →) rör sig ALDRIG beroende
 * på slagets utfall. "Kort" har medvetet ingen egen etikett – den låg
 * annars i vägen för slagpunkten vid korta slag; riktningen framgår ändå
 * tydligt av att punkten rör sig nedåt.
 *
 * Endast landningspunkten (bollen/den röda punkten) rör sig:
 *   diff > 0 (långt)  → punkten flyttas uppåt
 *   diff < 0 (kort)   → punkten flyttas nedåt
 *   side "vänster"    → punkten flyttas åt vänster
 *   side "höger"      → punkten flyttas åt höger
 *
 * Visualiseringen innehåller medvetet inget annat än axeletiketter, green,
 * flagga och slagpunkt – ingen distansskala eller annan konkurrerande
 * grafik, för att hålla fokus på slagets riktning och utfall.
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
  const w = 300;
  const h = 176;
  const flag = { x: 150, y: 78 };

  // Startpunkten (spelarens position) ligger fast rakt under flaggan, på
  // Kort-sidan av kartan – bollen flyger alltid uppåt/åt sidan därifrån.
  const launchPoint = { x: flag.x, y: h - 14 };

  const PX_PER_M_LEN = 3.2;
  const PX_PER_M_SIDE = 3.2;
  const clampedDiff = Math.max(-30, Math.min(30, diff));
  const clampedOffset = Math.max(-24, Math.min(24, offset));

  // ↑ Långt flyttar uppåt (mindre y), ↓ Kort flyttar nedåt (större y).
  const landingY = flag.y - clampedDiff * PX_PER_M_LEN;
  // Vänster flyttar åt vänster (mindre x), höger flyttar åt höger (större x).
  const landingX = flag.x + side * clampedOffset * PX_PER_M_SIDE;

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
  const flightDist = Math.hypot(flightEnd.x - launchPoint.x, flightEnd.y - launchPoint.y);
  const arcWidth =
    Math.min(46, Math.max(16, flightDist * 0.3)) * (flightEnd.x >= launchPoint.x ? 1 : -1);
  const ctrl = {
    x: (launchPoint.x + flightEnd.x) / 2 + arcWidth,
    y: (launchPoint.y + flightEnd.y) / 2,
  };
  const bezier = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * launchPoint.x + 2 * mt * t * ctrl.x + t * t * flightEnd.x,
      y: mt * mt * launchPoint.y + 2 * mt * t * ctrl.y + t * t * flightEnd.y,
    };
  };
  const ball = bezier(progress);
  // Bollen visas hela flygningen, men tonas mjukt bort under sista biten
  // (istället för att abrupt försvinna vid progress===1) så den "landar"
  // istället för att flimra bort.
  const ballOpacity = flying ? (progress > 0.9 ? Math.max(0, (1 - progress) / 0.1) : 1) : 0;
  const ballVisible = flying;

  return (
    <div className="rounded-2xl bg-primary/[0.04] px-2 py-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full"
        role="img"
        aria-label="Slagvisualisering – top-down-karta"
      >
        {/* Fasta axeletiketter – rör sig aldrig. Kort är medvetet borttagen:
            den låg annars i vägen för slagpunkten vid korta slag. */}
        <text
          x={flag.x}
          y="14"
          textAnchor="middle"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          ↑ Lång
        </text>
        <text
          x="4"
          y={flag.y + 3}
          textAnchor="start"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          ← Vänster
        </text>
        <text
          x={w - 4}
          y={flag.y + 3}
          textAnchor="end"
          className="fill-muted-foreground text-[9px] font-semibold uppercase tracking-wide"
        >
          Höger →
        </text>

        {/* Green: koncentriska, mjuka ringar kring flaggan */}
        <ellipse cx={flag.x} cy={flag.y} rx="70" ry="60" className="fill-primary/10" />
        <ellipse cx={flag.x} cy={flag.y} rx="51" ry="44" className="fill-primary/16" />
        <ellipse cx={flag.x} cy={flag.y} rx="32" ry="27" className="fill-primary/24" />
        <ellipse
          cx={flag.x}
          cy={flag.y}
          rx="15"
          ry="13"
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

        {/* Flagga */}
        <line
          x1={flag.x}
          y1={flag.y}
          x2={flag.x}
          y2={flag.y - 34}
          className="stroke-foreground"
          strokeWidth="1.5"
        />
        <path
          d={`M${flag.x} ${flag.y - 34} L${flag.x + 13} ${flag.y - 29.5} L${flag.x} ${flag.y - 25} Z`}
          className="fill-flag"
        />
        <circle cx={flag.x} cy={flag.y} r="2.5" className="fill-foreground" />

        {/* Spelarens fasta position, rakt under flaggan på Kort-sidan */}
        <circle
          cx={launchPoint.x}
          cy={launchPoint.y}
          r={touched || flying ? 5 : 7}
          className={
            touched || flying ? "fill-background stroke-muted-foreground/50" : "fill-destructive"
          }
          strokeWidth={touched || flying ? 1.5 : 0}
        />

        {/* Måldistans, direkt till höger om startpunkten – inbyggd i kartan
            istället för ett eget block under, för att hålla sidan kompakt. */}
        <text
          x={launchPoint.x + 16}
          y={launchPoint.y - 4}
          textAnchor="start"
          className="fill-muted-foreground text-[7px] font-semibold uppercase tracking-wide"
        >
          Måldistans
        </text>
        <text
          x={launchPoint.x + 16}
          y={launchPoint.y + 12}
          textAnchor="start"
          className="fill-flag font-[family-name:var(--font-display)] text-[18px]"
        >
          {target}
          <tspan className="fill-muted-foreground text-[10px]"> m</tspan>
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
    const dist = 20 + (i % 3) * 7;
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
        r="22"
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
