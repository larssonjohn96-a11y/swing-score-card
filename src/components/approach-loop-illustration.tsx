/**
 * Loopande, stiliserad illustration för Approach-landningssidan (pilot).
 * Samma platta illustrationsspråk som GreenHero (precision-visuals.tsx),
 * animerad: bollar flyger mot green från olika avstånd och landar, sedan
 * börjar loopen om. Ingen röd boll längre – bara grönt och gult, så det
 * aldrig ser ut som en avvikande/felaktig prick i bilden.
 */
export function ApproachLoopIllustration({ className = "h-48 w-full" }: { className?: string }) {
  const green = { cx: 210, cy: 95 };
  const shots = [
    { start: [150, 165], land: [222, 88], tone: "var(--primary)", delay: "0s" },
    { start: [90, 175], land: [190, 72], tone: "var(--sand)", delay: "2.6s" },
  ];

  return (
    <svg
      viewBox="0 0 300 200"
      role="img"
      aria-label="Animation av inspel från olika avstånd som landar mot green"
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
            <circle r="4" fill={s.tone}>
              <animateMotion
                path={path}
                dur="1.1s"
                begin={s.delay}
                repeatCount="indefinite"
                keyPoints="0;1;1"
                keyTimes="0;1;1"
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;1;0"
                keyTimes="0;0.05;0.9;0.97;1"
                dur="5.2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={lx} cy={ly} r="5" fill={s.tone} opacity="0">
              <animate
                attributeName="opacity"
                values="0;0;0.9;0.9;0"
                keyTimes="0;0.21;0.24;0.9;0.97"
                dur="5.2s"
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
