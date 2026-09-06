import { Trophy } from "lucide-react";
import {
  handicapFromPct,
  handicapLabel,
  hcpPercentile,
  precisionResult,
  proximityPct,
  type PrecisionShot,
} from "@/lib/precision";
import { HcpBellCurve } from "@/components/hcp-bell-curve";

/**
 * HCP-testresultat ska vara en belöningsskärm, inte en analysdashboard:
 * 1) din score/HCP, 2) var du placerar dig, 3) bästa slaget som ego-boost.
 * Djupare analys hör hemma i Utveckling.
 */
export function PrecisionReport({
  shots,
}: {
  shots: PrecisionShot[];
  prevScore?: number | null;
  compact?: boolean;
}) {
  const result = precisionResult(shots);
  const percentile = hcpPercentile(result.handicap);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-border bg-card px-5 py-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
          Din Approach-nivå
        </p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">HCP</p>
        <div className="mx-auto mt-5 inline-flex items-center rounded-full bg-primary/10 px-4 py-2">
          <span className="text-sm font-bold text-primary">Score {result.score}/100</span>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Du slår
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none text-foreground">
          {percentile} %
        </p>
        <p className="mt-1 text-sm text-muted-foreground">av golfarna på den här skalan</p>
        <div className="mt-3">
          <HcpBellCurve hcp={result.handicap} />
        </div>
      </section>

      <BestShotHighlight shots={shots} />
    </div>
  );
}

function BestShotHighlight({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) return null;

  const best = filled.reduce((a, b) => (proximityPct(a) < proximityPct(b) ? a : b));
  const bestHcp = handicapFromPct(proximityPct(best));
  const distance = Math.sqrt((best.carry - best.target) ** 2 + best.offline ** 2);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-flag/30 bg-flag/5 p-5 text-center">
      <div
        className="pointer-events-none absolute -top-12 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-flag/20 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-flag/15 text-flag">
          <Trophy className="h-5 w-5" strokeWidth={2} />
        </span>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-flag">Bästa slaget</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
          HCP {handicapLabel(bestHcp)}
        </p>
        <p className="mt-2 text-sm font-semibold">{best.target} m · {distance.toFixed(1).replace(".", ",")} m från flaggan</p>
        <p className="mt-1 text-xs text-muted-foreground">Det slaget höll HCP {handicapLabel(bestHcp)}-nivå.</p>
      </div>
    </section>
  );
}
