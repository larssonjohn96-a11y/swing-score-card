/** Hero: launch monitor-vy med en boll som lämnar klubban och hastighetsstreck. */
export function SpeedHero() {
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en golfboll som slås iväg med hastighetsstreck"
      className="h-44 w-full"
    >
      <rect x="20" y="130" width="260" height="12" rx="6" className="fill-rough" />
      <circle cx="70" cy="132" r="5" className="fill-foreground/70" />

      {[
        { y: 60, w: 90, o: 0.25 },
        { y: 78, w: 130, o: 0.4 },
        { y: 96, w: 175, o: 0.6 },
        { y: 114, w: 210, o: 0.9 },
      ].map((line, i) => (
        <line
          key={i}
          x1="70"
          y1={line.y}
          x2={70 + line.w}
          y2={line.y}
          className="stroke-flag"
          strokeWidth="3"
          strokeLinecap="round"
          opacity={line.o}
        />
      ))}

      <circle
        cx={70 + 210 + 14}
        cy="114"
        r="7"
        className="fill-background stroke-foreground"
        strokeWidth="2"
      />

      <rect
        x="30"
        y="20"
        width="46"
        height="30"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <circle cx="53" cy="35" r="7" className="fill-none stroke-flag" strokeWidth="2" />
      <circle cx="53" cy="35" r="2.5" className="fill-flag" />
    </svg>
  );
}
