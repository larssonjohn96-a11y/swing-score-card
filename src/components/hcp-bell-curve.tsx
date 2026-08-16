import {
  HCP_DISTRIBUTION_MEAN,
  HCP_DISTRIBUTION_SD,
  hcpCohortLabel,
  hcpDensity,
  hcpPercentile,
} from "@/lib/precision";

/**
 * Bellcurve som visar var spelarens Approach-HCP ligger i förhållande till
 * golfares handicapfördelning. Centrerad kring populationens medelvärde
 * (symmetriskt intervall ±3 std.avv.), med den del av kurvan du slår
 * (sämre HCP än dig, till vänster efter flippen där bäst ligger till
 * höger) upplyst i primary-färg, och delen som är bättre än dig nedtonad
 * i grått. Ren presentation – all matematik ligger i src/lib/precision.ts.
 */
export function HcpBellCurve({ hcp }: { hcp: number }) {
  const MIN = HCP_DISTRIBUTION_MEAN - 3 * HCP_DISTRIBUTION_SD;
  const MAX = HCP_DISTRIBUTION_MEAN + 3 * HCP_DISTRIBUTION_SD;
  const W = 320;
  const H = 150;
  const baseline = H - 20;

  const x = (v: number) => W - ((v - MIN) / (MAX - MIN)) * W;
  const y = (d: number) => baseline - d * (baseline - 14);

  const clamped = Math.max(MIN, Math.min(MAX, hcp));
  const px = x(clamped);
  const py = y(hcpDensity(clamped));
  const pct = hcpPercentile(hcp);

  // Vänster om markören (sämre HCP än dig, "du slår dem") – lyses upp.
  const litPoints: string[] = [];
  for (let v = clamped; v <= MAX; v += 0.4) {
    litPoints.push(`${x(v).toFixed(1)},${y(hcpDensity(v)).toFixed(1)}`);
  }
  const litLine = `M ${litPoints.join(" L ")}`;
  const litArea = `${litLine} L ${x(MAX)},${baseline} L ${px},${baseline} Z`;

  // Höger om markören (bättre HCP än dig) – grå, nedtonad.
  const grayPoints: string[] = [];
  for (let v = MIN; v <= clamped; v += 0.4) {
    grayPoints.push(`${x(v).toFixed(1)},${y(hcpDensity(v)).toFixed(1)}`);
  }
  const grayLine = `M ${grayPoints.join(" L ")}`;
  const grayArea = `${grayLine} L ${px},${baseline} L ${x(MIN)},${baseline} Z`;

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Var du ligger till
      </p>
      <p className="mt-1 text-center">
        <span className="font-[family-name:var(--font-display)] text-4xl leading-none text-primary">
          {pct}%
        </span>
      </p>
      <p className="text-center text-sm text-muted-foreground">av golfarna slår du</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto mt-3 block w-full"
        role="img"
        aria-label="Din nivå i handicapfördelningen"
      >
        <defs>
          <linearGradient id="bell-lit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="marker-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grå del: golfare som är bättre än dig */}
        <path d={grayArea} className="fill-muted-foreground/10" />
        <path d={grayLine} fill="none" className="stroke-muted-foreground/25" strokeWidth="2" />

        {/* Upplyst del: golfare du slår */}
        <path d={litArea} fill="url(#bell-lit)" />
        <path d={litLine} fill="none" stroke="var(--primary)" strokeWidth="2.5" />

        {/* Markör med glöd – CSS-driven puls, inte SVG SMIL (opålitligt i appens miljö) */}
        <circle cx={px} cy={py} r="22" fill="url(#marker-glow)" />
        <line x1={px} y1={py} x2={px} y2={baseline} className="stroke-primary" strokeWidth="2" />
        <circle
          cx={px}
          cy={py}
          r="10"
          className="fill-primary opacity-40"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "sg4-bell-pulse 1.8s ease-out infinite",
          }}
        />
        <circle cx={px} cy={py} r="6" className="fill-primary" />
      </svg>
      <style>{`
        @keyframes sg4-bell-pulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <p className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        Du
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">{hcpCohortLabel(hcp)}</p>
    </div>
  );
}
