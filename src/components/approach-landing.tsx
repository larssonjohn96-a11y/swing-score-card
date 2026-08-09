import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ApproachLoopIllustration } from "@/components/approach-loop-illustration";
import { ApproachStoryLink } from "@/components/approach-story";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

/**
 * Approach-landningssidans PILOT-version: kraftigt förenklad, ingen
 * "Efter testet får du"/"Så går testet till"-sektion, CTA:n synlig utan
 * scroll. Se dokumentet 'Uppdatera ENDAST Approach / Inspelstestet' – detta
 * mönster gäller bara Approach tills vidare, inte de andra sex testerna.
 */
export function ApproachLanding() {
  useHideBottomNav(true);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "approach" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-2">
        <ApproachLoopIllustration />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">Approach</p>
      <h1 className="mt-1 text-5xl leading-none">Inspelstest</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">55–165 meter</p>

      <ApproachStoryLink />

      <Link
        to="/precision"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta inspelstest
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
