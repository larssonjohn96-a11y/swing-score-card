import { ballSpeedDensity, ballSpeedPercentile } from "@/lib/speed";

/**
 * Bellcurve som visar var spelarens ball speed ligger jämfört med en
 * jämförelsegrupp (jämnåriga ELLER alla golfare – styrs av mean/sd/
 * groupLabel/note som skickas in). Samma visuella princip som Approach-
 * testets HcpBellCurve: centrerad kring gruppens medelvärde, delen du
 * slår (långsammare än dig) upplyst i primary-färg, delen som är
 * snabbare än dig nedtonad i grått. Ball speed: HÖGRE är bättre
 * (tvärtemot HCP), så bäst hamnar liksom i HcpBellCurve till höger.
 *
 * `highlighted`: true för kurvan som ger bäst resultat av de två som
 * visas – får en tydlig badge och färgad kant istället för att bara
 * vara en av flera likvärdiga kort.
 */
export function SpeedBellCurve({
  ballSpeed,
  groupLabel,
  note,
  mean,
  sd,
  highlighted = false,
}: {
  ballSpeed: number;
  groupLabel: string;
  note: string;
  mean: number;
  sd: number;
  highlighted?: boolean;
}) {
  const MIN = mean - 3 * sd;
  const MAX = mean + 3 * sd;
  const W = 320;
  const H = 150;
  const baseline = H - 20;

  const x = (v: number) => ((v - MIN) / (MAX - MIN)) * W;
  const y = (d: number) => baseline - d * (baseline - 14);

  const clamped = Math.max(MIN, Math.min(MAX, ballSpeed));
  const px = x(clamped);
  const py = y(ballSpeedDensity(clamped, mean, sd));
  const pct = ballSpeedPercentile(ballSpeed, mean, sd);

  // Höger om markören (snabbare än dig) – nedtonad grå.
  const grayPoints: string[] = [];
  for (let v = clamped; v <= MAX; v += 0.4) {
    grayPoints.push(`${x(v).toFixed(1)},${y(ballSpeedDensity(v, mean, sd)).toFixed(1)}`);
  }
  const grayLine = `M ${grayPoints.join(" L ")}`;
  const grayArea = `${grayLine} L ${x(MAX)},${baseline} L ${px},${baseline} Z`;

  // Vänster om markören (långsammare än dig, "du slår dem") – lyses upp.
  const litPoints: string[] = [];
  for (let v = MIN; v <= clamped; v += 0.4) {
    litPoints.push(`${x(v).toFixed(1)},${y(ballSpeedDensity(v, mean, sd)).toFixed(1)}`);
  }
  const litLine = `M ${litPoints.join(" L ")}`;
  const litArea = `${litLine} L ${px},${baseline} L ${x(MIN)},${baseline} Z`;

  return (
    <div
      className={`relative rounded-3xl border p-5 ${
        highlighted ? "border-flag/40 bg-flag/[0.04]" : "border-border bg-card"
      }`}
    >
      {highlighted && (
        <span className="absolute right-4 top-4 rounded-full bg-flag/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-flag">
          Bäst resultat
        </span>
      )}
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Var du ligger till – {groupLabel}
      </p>
      <p className="mt-1 text-center">
        <span
          className={`font-[family-name:var(--font-display)] text-4xl leading-none ${
            highlighted ? "text-flag" : "text-primary"
          }`}
        >
          {pct}%
        </span>
      </p>
      <p className="text-center text-sm text-muted-foreground">av gruppen slår du</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto mt-3 block w-full"
        role="img"
        aria-label={`Din ball speed jämfört med ${groupLabel}`}
      >
        <defs>
          <linearGradient id="speed-bell-lit" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={highlighted ? "var(--flag)" : "var(--primary)"}
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor={highlighted ? "var(--flag)" : "var(--primary)"}
              stopOpacity="0.05"
            />
          </linearGradient>
          <radialGradient id="speed-marker-glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={highlighted ? "var(--flag)" : "var(--primary)"}
              stopOpacity="0.55"
            />
            <stop
              offset="100%"
              stopColor={highlighted ? "var(--flag)" : "var(--primary)"}
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        {/* Grå del: gruppen som är snabbare än dig */}
        <path d={grayArea} className="fill-muted-foreground/10" />
        <path d={grayLine} fill="none" className="stroke-muted-foreground/25" strokeWidth="2" />

        {/* Upplyst del: gruppen du slår */}
        <path d={litArea} fill="url(#speed-bell-lit)" />
        <path
          d={litLine}
          fill="none"
          stroke={highlighted ? "var(--flag)" : "var(--primary)"}
          strokeWidth="2.5"
        />

        {/* Markör med glöd – CSS-driven puls, inte SVG SMIL */}
        <circle cx={px} cy={py} r="22" fill="url(#speed-marker-glow)" />
        <line
          x1={px}
          y1={py}
          x2={px}
          y2={baseline}
          stroke={highlighted ? "var(--flag)" : "var(--primary)"}
          strokeWidth="2"
        />
        <circle
          cx={px}
          cy={py}
          r="10"
          className="opacity-40"
          style={{
            fill: highlighted ? "var(--flag)" : "var(--primary)",
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "sg4-speed-bell-pulse 1.8s ease-out infinite",
          }}
        />
        <circle cx={px} cy={py} r="6" fill={highlighted ? "var(--flag)" : "var(--primary)"} />
      </svg>
      <style>{`
        @keyframes sg4-speed-bell-pulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <p
        className={`mt-1 text-center text-xs font-semibold uppercase tracking-[0.15em] ${
          highlighted ? "text-flag" : "text-primary"
        }`}
      >
        Du · {ballSpeed.toFixed(0)} mph
      </p>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">{note}</p>
    </div>
  );
}
