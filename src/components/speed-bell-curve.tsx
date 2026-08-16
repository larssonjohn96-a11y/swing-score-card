import { ballSpeedDensity, ballSpeedPercentile } from "@/lib/speed";

type Group = {
  label: string;
  note: string;
  mean: number;
  sd: number;
};

/**
 * En kombinerad bellcurve som visar BÅDE "alla golfare" och (om ålder är
 * satt) åldersgruppen i samma graf, istället för två separata kort. Löser
 * layoutbuggen där en "Bäst resultat"-badge kolliderade med rubriktexten
 * på det smalare kortet – all information ligger nu i en tydlig
 * legend-rad ovanför grafen med gott om utrymme.
 *
 * Samma grundprincip som Approach-testets HcpBellCurve/DrivingHcpBellCurve:
 * centrerad graf, delen du slår upplyst, delen som är bättre än dig
 * nedtonad. Ball speed: HÖGRE är bättre, så bäst hamnar till höger.
 * Den grupp som faktiskt ger bäst resultat (högst percentil) ritas med
 * fylld area och tjockare linje, den andra bara som en tunn kontur, så
 * skillnaden syns direkt i själva grafen också.
 */
export function SpeedComparisonBellCurve({
  ballSpeed,
  allGolfers,
  ageGroup,
}: {
  ballSpeed: number;
  allGolfers: Group;
  ageGroup?: Group;
}) {
  const allPct = ballSpeedPercentile(ballSpeed, allGolfers.mean, allGolfers.sd);
  const agePct = ageGroup ? ballSpeedPercentile(ballSpeed, ageGroup.mean, ageGroup.sd) : undefined;
  const ageIsBest = agePct !== undefined && agePct > allPct;

  const groups = [
    { ...allGolfers, pct: allPct, color: "var(--primary)", best: !ageIsBest },
    ...(ageGroup && agePct !== undefined
      ? [{ ...ageGroup, pct: agePct, color: "var(--flag)", best: ageIsBest }]
      : []),
  ];

  // Gemensam x-axel som ryms båda fördelningarna.
  const MIN = Math.min(...groups.map((g) => g.mean - 3 * g.sd));
  const MAX = Math.max(...groups.map((g) => g.mean + 3 * g.sd));
  const W = 320;
  const H = 160;
  const baseline = H - 24;

  const x = (v: number) => ((v - MIN) / (MAX - MIN)) * W;
  const clamped = Math.max(MIN, Math.min(MAX, ballSpeed));
  const px = x(clamped);

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Var du ligger till
      </p>

      {/* Legend – båda grupperna, med gott om utrymme, ingen överlappning */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {groups.map((g) => (
          <span key={g.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: g.color }}
            />
            <span className="text-muted-foreground">{g.label}</span>
            <span
              className="font-[family-name:var(--font-display)] text-base"
              style={{ color: g.color }}
            >
              {g.pct}%
            </span>
            {g.best && groups.length > 1 && (
              <span className="rounded-full bg-flag/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-flag">
                Bäst
              </span>
            )}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto mt-3 block w-full"
        role="img"
        aria-label="Din ball speed jämfört med alla golfare och din åldersgrupp"
      >
        <defs>
          {groups.map((g) => (
            <linearGradient key={g.label} id={`grad-${g.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g.color} stopOpacity={g.best ? 0.4 : 0.12} />
              <stop offset="100%" stopColor={g.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        <line x1={0} y1={baseline} x2={W} y2={baseline} className="stroke-border" strokeWidth="1" />

        {groups.map((g) => {
          const y = (d: number) => baseline - d * (baseline - 16);
          const points: string[] = [];
          for (let v = MIN; v <= MAX; v += 0.5) {
            points.push(`${x(v).toFixed(1)},${y(ballSpeedDensity(v, g.mean, g.sd)).toFixed(1)}`);
          }
          const line = `M ${points.join(" L ")}`;
          const area = `${line} L ${W},${baseline} L 0,${baseline} Z`;
          return (
            <g key={g.label}>
              <path d={area} fill={`url(#grad-${g.label})`} />
              <path
                d={line}
                fill="none"
                stroke={g.color}
                strokeWidth={g.best ? 2.5 : 1.5}
                strokeOpacity={g.best ? 1 : 0.55}
                strokeDasharray={g.best ? undefined : "4 3"}
              />
            </g>
          );
        })}

        {/* Din markör – samma mph-position oavsett grupp */}
        <line
          x1={px}
          y1={10}
          x2={px}
          y2={baseline}
          className="stroke-foreground/60"
          strokeWidth="2"
        />
        <circle
          cx={px}
          cy={baseline}
          r="10"
          className="fill-foreground/10 opacity-60"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "sg4-speed-bell-pulse 1.8s ease-out infinite",
          }}
        />
        <circle cx={px} cy={10} r="4.5" className="fill-foreground" />
      </svg>
      <style>{`
        @keyframes sg4-speed-bell-pulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      <p className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
        Du · {ballSpeed.toFixed(0)} mph
      </p>
      <div className="mt-2 space-y-0.5">
        {groups.map((g) => (
          <p key={g.label} className="text-center text-[10px] text-muted-foreground">
            {g.note}
          </p>
        ))}
      </div>
    </div>
  );
}
