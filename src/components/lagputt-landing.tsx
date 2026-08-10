import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LagPuttHero } from "@/components/lagputt-visuals";
import { TestHowItWorksLink } from "@/components/test-story";
import { LAGPUTT_STORY } from "@/lib/test-story-content";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export function LagPuttLanding() {
  useHideBottomNav(true);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "puttning" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-2">
        <LagPuttHero />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">Puttning</p>
      <h1 className="mt-1 text-5xl leading-none">Lag Putt</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">8–18 meter</p>

      <TestHowItWorksLink config={LAGPUTT_STORY} />

      <Link
        to="/lagputt"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Lag Putt
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
