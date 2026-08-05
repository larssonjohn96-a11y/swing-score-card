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
