/**
 * Loopande, stiliserad illustration för Approach-landningssidan (pilot).
 * Samma platta illustrationsspråk som GreenHero (precision-visuals.tsx),
 * men animerad: tre landningspunkter tänds i sekvens mot green från allt
 * längre avstånd, med gradvis sämre precision (grön → gul → röd), sedan
 * börjar loopen om. Ingen flygande boll-prick – bara landningsmarkeringen
 * tänds/släcks, så det aldrig kan se ut som en lös prick mitt i bilden.
 */
export function ApproachLoopIllustration({ className = "h-48 w-full" }: { className?: string }) {
  const green = { cx: 210, cy: 95 };
  const shots = [
    { start: [150, 165], land: [222, 88], tone: "var(--primary)", delay: "0s" },
    { start: [90, 175], land: [190, 72], tone: "var(--sand)", delay: "2.6s" },
    { start: [30, 182], land: [246, 118], tone: "var(--destructive)", delay: "5.2s" },
  ];

  return (
    <svg
      viewBox="0 0 300 200"
      role="img"
      aria-label="Animation av tre inspel från olika avstånd som landar mot green"
      className={className}
    >
      <ellipse cx={green.cx} cy={green.cy} rx="70" ry="46" className="fill-primary/15" />
      <ellipse cx={green.cx} cy={green.cy} rx="46" ry="30" className="fill-primary/25" />
      <ellipse cx={green.cx} cy={green.cy} rx="22" ry="14" className="fill-primary/40" />
      <line
        x1={green.cx}
        y1={green.cy}
        x2={green.cx}
        y2={green.cy - 46}
        className="stroke-foreground"
        strokeWidth="1.5"
      />
      <path
        d={`M${green.cx} ${green.cy - 46} L${green.cx + 20} ${green.cy - 40} L${green.cx} ${green.cy - 34} Z`}
        className="fill-flag"
      />
      <circle cx={green.cx} cy={green.cy} r="3.5" className="fill-foreground" />

      {shots.map((s, i) => {
        const [sx, sy] = s.start;
        const [lx, ly] = s.land;
        const midX = (sx + lx) / 2;
        const midY = Math.min(sy, ly) - 55;
        const path = `M${sx} ${sy} Q ${midX} ${midY} ${lx} ${ly}`;
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r="3" className="fill-foreground/50" />
            <path
              d={path}
              fill="none"
              className="stroke-foreground/25"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
            <circle cx={lx} cy={ly} r="5" fill={s.tone} opacity="0">
              <animate
                attributeName="opacity"
                values="0;0;0.9;0.9;0"
                keyTimes="0;0.14;0.16;0.9;0.97"
                dur="7.8s"
                begin={s.delay}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
