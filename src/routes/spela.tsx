import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";

export const Route = createFileRoute("/spela")({
  head: () => ({ meta: [{ title: "Spela – SG4" }] }),
  component: PlayPage,
});

type PlayCardProps = {
  href: string;
  title: string;
  recommendationId?: string;
};

function PlayCard({ href, title, recommendationId }: PlayCardProps) {
  return (
    <a
      href={href}
      onClick={() => recommendationId && recordRecommendationOpen(recommendationId)}
      className="group flex min-h-[108px] items-center rounded-[28px] border border-[#d8e1ee] bg-white px-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,.24)] transition-all active:scale-[.99] active:border-blue-400 active:bg-blue-50"
    >
      <span className="min-w-0 flex-1 font-display text-[26px] leading-none tracking-[-0.02em] text-[#061126]">
        {title}
      </span>
      <ChevronRight className="h-6 w-6 shrink-0 text-[#7b8da7] transition-transform group-active:translate-x-0.5" strokeWidth={2.5} />
    </a>
  );
}

function PlayPage() {
  useEffect(() => {
    recordRecommendationImpressions(["play-coach", "play-bot", "play-friend", "play-team"]);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#fcfcfa] px-5 pb-28 pt-8 text-[#061126]">
      <header className="grid grid-cols-[52px_1fr_52px] items-center">
        <Link
          to="/"
          aria-label="Tillbaka"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8e1ee] bg-white text-[#061126] active:scale-95"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.6} />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#667b99]">SG4 Match</p>
          <p className="mt-1 text-sm font-semibold text-[#314563]">Spela</p>
        </div>
        <span />
      </header>

      <section className="mt-12">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#667b99]">Match</p>
        <h1 className="mt-2 font-display text-[42px] leading-[0.96] tracking-[-0.035em] text-[#03170f]">
          Vad vill du spela idag?
        </h1>
      </section>

      <section className="mt-8 space-y-3.5">
        <PlayCard href="/utmaningar" title="Spela själv" />
        <PlayCard href="/match?flow=friend" title="Spela med vän" recommendationId="play-friend" />
        <PlayCard href="/match-bot" title="Spela mot bot" recommendationId="play-bot" />
        <PlayCard href="/coach" title="Spela med coach" recommendationId="play-coach" />
        <PlayCard href="/match?flow=team" title="Spela i lag" recommendationId="play-team" />
      </section>
    </main>
  );
}
