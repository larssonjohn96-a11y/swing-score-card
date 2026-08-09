import { useEffect, useState } from "react";
import { hcpLabel } from "@/lib/sg-handicap";

export type ApproachPRResult = {
  isFirstTest: boolean;
  hcpPR?: { newHcp: number; previousBest: number };
  scorePR?: { newScore: number; previousBest: number };
};

/**
 * Subtilt "celebration layer" ovanpå den befintliga Approach-analyssidan –
 * ENDAST Approach, ENDAST när ett faktiskt nytt personbästa (HCP och/eller
 * Approach Score) uppnåtts. Renderas ovanför <PrecisionReport>, rör den
 * inte. Ingen blockerande modal: kort konfetti (~1,4 s), sedan lugnar
 * kortet ner sig till en permanent, diskret PR-markering.
 */
export function ApproachCelebration({ pr }: { pr: ApproachPRResult }) {
  const [phase, setPhase] = useState<"pending" | "celebrating" | "settled">("pending");

  useEffect(() => {
    // Kort paus efter att resultatet revealats, sedan konfetti i ~1,4 s,
    // sedan slår kortet om till sitt permanenta, lugna läge.
    const t1 = window.setTimeout(() => setPhase("celebrating"), 350);
    const t2 = window.setTimeout(() => setPhase("settled"), 350 + 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!pr.hcpPR && !pr.scorePR) return null;

  const bothPR = Boolean(pr.hcpPR && pr.scorePR);
  const hcpDelta = pr.hcpPR ? Math.round((pr.hcpPR.previousBest - pr.hcpPR.newHcp) * 10) / 10 : 0;
  const scoreDelta = pr.scorePR ? Math.round(pr.scorePR.newScore - pr.scorePR.previousBest) : 0;
  const settled = phase === "settled";

  return (
    <div className="relative mb-4">
      {phase === "celebrating" && <ConfettiBurst />}

      <div
        className={`animate-in fade-in zoom-in-95 relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/5 text-center transition-all duration-500 ${
          settled ? "p-4" : "p-6"
        }`}
      >
        <p
          className={`font-bold uppercase tracking-[0.25em] text-primary transition-all duration-500 ${
            settled ? "text-[10px]" : "text-xs"
          }`}
        >
          {pr.hcpPR && !pr.scorePR
            ? "Nytt personbästa"
            : !pr.hcpPR && pr.scorePR
              ? "New high score"
              : "Nytt personbästa"}
        </p>

        {pr.hcpPR && (
          <>
            {!settled && (
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">HCP</p>
            )}
            <p
              className={`font-[family-name:var(--font-display)] leading-none text-primary transition-all duration-500 ${
                settled ? "text-3xl" : "mt-1 text-6xl"
              }`}
            >
              {settled ? `HCP ${hcpLabel(pr.hcpPR.newHcp)}` : hcpLabel(pr.hcpPR.newHcp)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {settled ? "Personbästa · " : "Tidigare bästa "}
              {hcpLabel(pr.hcpPR.previousBest)}
              <span className="ml-1 font-semibold text-primary">↓{hcpDelta}</span>
            </p>
          </>
        )}

        {pr.scorePR && (
          <div className={pr.hcpPR ? "mt-4 border-t border-border pt-3" : ""}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Approach Score
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none">
              {pr.scorePR.newScore.toFixed(0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tidigare bästa {pr.scorePR.previousBest.toFixed(0)}
              <span className="ml-1 font-semibold text-primary">+{scoreDelta}</span>
            </p>
          </div>
        )}

        {bothPR && !settled && (
          <p className="mt-3 text-[11px] text-muted-foreground">Två nya rekord på samma test.</p>
        )}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = [
  "var(--primary)",
  "var(--flag)",
  "var(--sand)",
  "var(--chart-3)",
  "var(--chart-4)",
];

function ConfettiBurst() {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 0.9 + Math.random() * 0.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 4,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl">
      <style>{`
        @keyframes approach-confetti-fall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(340%) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            borderRadius: 1,
            animation: `approach-confetti-fall ${p.duration}s ease-in ${p.delay}s 1 both`,
          }}
        />
      ))}
    </div>
  );
}
