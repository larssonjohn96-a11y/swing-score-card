/**
 * Generisk, sammanslagen bellcurve för HCP-jämförelser mot flera grupper
 * samtidigt (t.ex. "alla golfare" + en åldersgrupp) i EN graf. Samma
 * grundprincip som Approach-testets HcpBellCurve: den grupp som faktiskt
 * ger bäst resultat lyser upp med fylld, färgad area, den andra ligger
 * nedtonad bakom i grått. Bäst hamnar till höger.
 *
 * BUGGFIX: gradient-id:na byggdes tidigare direkt av grupp-etiketten
 * (t.ex. "70 år") – ogiltigt id med mellanslag, som gjorde att
 * url(#...)-referensen aldrig matchade och webbläsaren föll tillbaka på
 * svart fyllning. Använder nu index-baserade id:n som alltid är giltiga.
 */

type Group = {
  label: string;
  mean: number;
  sd: number;
};

/** Abramowitz & Stegun-approximation av felfunktionen erf(x). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Andel (0–100) med SÄMRE (högre) HCP än `hcp` – dvs andelen man slår. */
function betterThanPct(hcp: number, mean: number, sd: number): number {
  const worseFraction = 1 - 0.5 * (1 + erf((hcp - mean) / (sd * Math.SQRT2)));
  return Math.max(1, Math.min(99, Math.round(worseFraction * 100)));
}

function gaussian(x: number, mean: number, sd: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
}

export function HcpComparisonBellCurve({
  hcp,
  allGolfers,
  ageGroup,
}: {
  hcp: number;
  allGolfers: Group;
  ageGroup?: Group;
}) {
  const allPct = betterThanPct(hcp, allGolfers.mean, allGolfers.sd);
  const agePct = ageGroup ? betterThanPct(hcp, ageGroup.mean, ageGroup.sd) : undefined;
  const ageIsBest = agePct !== undefined && agePct > allPct;

  const groups = [
    { ...allGolfers, pct: allPct, color: "var(--primary)", best: !ageIsBest },
    ...(ageGroup && agePct !== undefined
      ? [{ ...ageGroup, pct: agePct, color: "var(--flag)", best: ageIsBest }]
      : []),
  ];

  const MIN = Math.min(...groups.map((g) => g.mean - 3 * g.sd));
  const MAX = Math.max(...groups.map((g) => g.mean + 3 * g.sd));
  const W = 320;
  const H = 160;
  const baseline = H - 24;

  const x = (v: number) => W - ((v - MIN) / (MAX - MIN)) * W;
  const clamped = Math.max(MIN, Math.min(MAX, hcp));
  const px = x(clamped);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-flag/15 blur-3xl"
        aria-hidden
      />
      <p className="relative text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Var du ligger till
      </p>

      <div className="relative mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {groups.map((g) => (
          <span key={g.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: g.color }}
            />
            <span className="text-muted-foreground">{g.label}</span>
            <span
              className="font-[family-name:var(--font-display)] text-xl"
              style={{ color: g.color }}
            >
              {g.pct}/100
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
        className="relative mx-auto mt-3 block w-full"
        role="img"
        aria-label="Din HCP jämfört med alla golfare och din åldersgrupp"
      >
        <defs>
          {groups.map((g, i) => (
            <linearGradient key={g.label} id={`hcp-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g.color} stopOpacity={g.best ? 0.5 : 0.1} />
              <stop offset="100%" stopColor={g.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        <line x1={0} y1={baseline} x2={W} y2={baseline} className="stroke-border" strokeWidth="1" />

        {groups.map((g, i) => {
          const peak = gaussian(g.mean, g.mean, g.sd);
          const y = (density: number) => baseline - (density / peak) * (baseline - 16);
          const points: string[] = [];
          for (let v = MIN; v <= MAX; v += (MAX - MIN) / 80) {
            points.push(`${x(v).toFixed(1)},${y(gaussian(v, g.mean, g.sd)).toFixed(1)}`);
          }
          const line = `M ${points.join(" L ")}`;
          const area = `${line} L ${W},${baseline} L 0,${baseline} Z`;
          return (
            <g key={g.label}>
              <path d={area} fill={`url(#hcp-grad-${i})`} />
              <path
                d={line}
                fill="none"
                stroke={g.color}
                strokeWidth={g.best ? 2.5 : 1.5}
                strokeOpacity={g.best ? 1 : 0.5}
                strokeDasharray={g.best ? undefined : "4 3"}
              />
            </g>
          );
        })}

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
          className="fill-flag/20 opacity-70"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "sg4-hcp-bell-pulse 1.8s ease-out infinite",
          }}
        />
        <circle cx={px} cy={10} r="4.5" className="fill-foreground" />
      </svg>
      <style>{`
        @keyframes sg4-hcp-bell-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>

      <p className="relative mt-1 text-center text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
        Du · HCP {hcp < 0 ? "+" : ""}
        {Math.abs(Math.round(hcp * 10) / 10)
          .toFixed(1)
          .replace(".", ",")}
      </p>
    </div>
  );
}
