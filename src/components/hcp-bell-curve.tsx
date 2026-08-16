import { HCP_DISTRIBUTION_MEAN, hcpCohortLabel, hcpDensity, hcpPercentile } from "@/lib/precision";

/**
 * Bellcurve som visar var spelarens Approach-HCP ligger i förhållande till
 * golfares handicapfördelning. Ren presentation – all matematik ligger i
 * src/lib/precision.ts.
 */
export function HcpBellCurve({ hcp }: { hcp: number }) {
  const MIN = -6;
  const MAX = 40;
  const W = 320;
  const H = 140;

  const x = (v: number) => W - ((v - MIN) / (MAX - MIN)) * W;
  const y = (d: number) => H - d * (H - 18);

  const points: string[] = [];
  for (let v = MIN; v <= MAX; v += 0.5)
    points.push(`${x(v).toFixed(1)},${y(hcpDensity(v)).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${W},${H} L 0,${H} Z`;

  const clamped = Math.max(MIN, Math.min(MAX, hcp));
  const px = x(clamped);
  const py = y(hcpDensity(clamped));
  const pct = hcpPercentile(hcp);

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Din nivå i handicapfördelningen"
      >
        <defs>
          <linearGradient id="bell-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="text-muted-foreground">
          <path d={area} fill="url(#bell-fill)" />
          <path d={line} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
        </g>
        <line
          x1={x(HCP_DISTRIBUTION_MEAN)}
          y1={y(1)}
          x2={x(HCP_DISTRIBUTION_MEAN)}
          y2={H}
          className="stroke-muted-foreground/30"
          strokeDasharray="3 4"
        />
        <line x1={px} y1={py} x2={px} y2={H} className="stroke-primary" strokeWidth="2" />
        <circle cx={px} cy={py} r="6" className="fill-primary" />
      </svg>

      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>40</span>
        <span>HCP 20</span>
        <span>+6</span>
      </div>

      <p className="mt-3 text-center text-sm">
        Du är bättre än <span className="font-semibold text-primary">{pct} %</span> av golfarna på
        dina inspel.
      </p>
      <p className="mt-0.5 text-center text-xs text-muted-foreground">{hcpCohortLabel(hcp)}</p>
    </div>
  );
}
