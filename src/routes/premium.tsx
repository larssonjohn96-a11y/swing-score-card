import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LineChart, Sparkles, Users } from "lucide-react";
import { useSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [{ title: "SG4+ – Förstå ditt spel på djupet" }],
  }),
  component: PremiumPage,
});

const PILLARS = [
  {
    icon: LineChart,
    title: "Track",
    body: "Följ hela din utveckling över tid – varje test, inte bara de senaste tre.",
  },
  {
    icon: Sparkles,
    title: "Analyze",
    body: "Förstå vad som håller ditt spel tillbaka, avstånd för avstånd.",
  },
  {
    icon: Users,
    title: "Compare",
    body: "Jämför ditt spel på djupet – mot HCP-nivåer och mot kompisar.",
  },
];

function PremiumPage() {
  const navigate = useNavigate();
  const { isPlus, setDeveloperPlan } = useSubscription();

  function handleTry() {
    // Ingen riktig betalinfrastruktur finns ännu – i Developer Preview
    // simulerar CTA:n SG4+ genom samma entitlement-system som resten av
    // appen redan läser från.
    if (import.meta.env.DEV) setDeveloperPlan("plus");
    navigate({ to: "/" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-6">
      <button
        onClick={() => navigate({ to: "/" })}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-primary">SG4+</p>
      <h1 className="mt-1 text-5xl leading-none">FÖRSTÅ DITT SPEL PÅ DJUPET</h1>

      <div className="mt-8 space-y-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-3xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl leading-none">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Enkel visuell smakbit av vad som väntar, ingen lång funktionslista */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Approach HCP</p>
        <p className="mt-1 flex items-baseline gap-2 font-[family-name:var(--font-display)] text-2xl">
          16,2
          <span className="text-white/30">→</span>
          12,7
          <span className="text-white/30">→</span>
          <span className="text-primary">8,7</span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[85%] rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Full historik, breakdown per avstånd och detaljerad jämförelse mot valfri HCP-nivå eller
          kompis.
        </p>
      </div>

      {isPlus ? (
        <p className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center text-sm font-semibold text-primary">
          Du har redan SG4+
        </p>
      ) : (
        <button
          onClick={handleTry}
          className="mt-8 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          PROVA SG4+
        </button>
      )}

      <button
        onClick={() => navigate({ to: "/" })}
        className="mt-3 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Fortsätt med SG4
      </button>

      {!import.meta.env.DEV && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Betalning är inte aktiverad ännu.
        </p>
      )}
    </main>
  );
}
