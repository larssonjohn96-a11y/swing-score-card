import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TeeHero } from "@/components/offtee-visuals";
import { TestHowItWorksLink } from "@/components/test-story";
import { OFFTEE_STORY } from "@/lib/test-story-content";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

/**
 * Förenklad landningssida, samma format som Approach-pilotens: illustration,
 * eyebrow + titel, kort beskrivning, "Första gången?"-kort, CTA. Ingen
 * "Efter testet får du"/"Så går testet till"-sektion längre.
 */
export function OffTeeLanding() {
  useHideBottomNav(true);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-6">
      <Link
        to="/kategori/$slug"
        params={{ slug: "driving" }}
        aria-label="Tillbaka"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="mt-2">
        <TeeHero />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">Off the Tee</p>
      <h1 className="mt-1 text-5xl leading-none">Off the Tee Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">6 drives</p>

      <TestHowItWorksLink config={OFFTEE_STORY} />

      <Link
        to="/offtee"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Off the Tee Test
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
