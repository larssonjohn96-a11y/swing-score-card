import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SpeedHero } from "@/components/speed-visuals";
import { TestHowItWorksLink } from "@/components/test-story";
import { SPEED_STORY } from "@/lib/test-story-content";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

const BALL_SPEED_STORY = {
  ...SPEED_STORY,
  level: {
    ...SPEED_STORY.level,
    title: "SE DIN BALL SPEED-NIVÅ",
    metricLabel: "Ball Speed HCP",
  },
};

export function SpeedLanding() {
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
        <SpeedHero />
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">Ball Speed</p>
      <h1 className="mt-1 text-5xl leading-none">Ball Speed Test</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Testa din bollhastighet på 3 drives och se hur du står dig mot andra HCP-nivåer.
      </p>

      <TestHowItWorksLink config={BALL_SPEED_STORY} />

      <Link
        to="/speed"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta Ball Speed Test
        <ArrowRight className="h-5 w-5" />
      </Link>
    </main>
  );
}
