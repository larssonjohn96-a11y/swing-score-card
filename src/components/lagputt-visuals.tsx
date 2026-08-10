/** Hero: top-down-vy av en green med en lång, böjd puttlinje mot hålet. */
export function LagPuttHero({ className = "h-44 w-full" }: { className?: string }) {
  const hole = { x: 210, y: 95 };
  const start = { x: 40, y: 150 };

  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="Illustration av en lång puttlinje mot hålet"
      className={className}
    >
      <ellipse cx={hole.x} cy={hole.y} rx="70" ry="46" className="fill-primary/15" />
      <ellipse cx={hole.x} cy={hole.y} rx="46" ry="30" className="fill-primary/25" />

      <path
        d={`M${start.x} ${start.y} Q ${(start.x + hole.x) / 2} ${start.y - 60} ${hole.x} ${hole.y}`}
        fill="none"
        className="stroke-foreground/25"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <circle cx={start.x} cy={start.y} r="4" className="fill-foreground/50" />
      <circle cx={hole.x} cy={hole.y} r="3.5" className="fill-foreground" />
    </svg>
  );
}
