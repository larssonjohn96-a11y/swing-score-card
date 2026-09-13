import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Flag, Trophy, User } from "lucide-react";
import { useEffect } from "react";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";

export const Route = createFileRoute("/spela")({
  head: () => ({ meta: [{ title: "Spela – SG4" }] }),
  component: PlayPage,
});

function VersusMark() {
  return (
    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-foreground px-1.5 text-[9px] font-black uppercase tracking-[.08em] text-background">
      VS
    </span>
  );
}

function PlayerDot({ side, small = false }: { side: "blue" | "red"; small?: boolean }) {
  const tone = side === "blue" ? "border-blue-400/50 bg-blue-500/[.10] text-blue-600" : "border-red-400/50 bg-red-500/[.10] text-red-500";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full border ${tone} ${small ? "h-8 w-8" : "h-10 w-10"}`}>
      <User className={small ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
    </span>
  );
}

function MatchCard({
  href,
  onClick,
  title,
  description,
  visual,
}: {
  href: string;
  onClick: () => void;
  title: string;
  description: string;
  visual: React.ReactNode;
}) {
  const classes = "group flex min-h-[118px] items-center gap-4 overflow-hidden rounded-[28px] border border-blue-400/25 bg-gradient-to-r from-blue-500/[.075] via-card to-red-500/[.075] px-4 py-4 shadow-[0_14px_34px_-26px_rgba(15,23,42,.30)] active:scale-[.99]";
  const content = (
    <>
      <span className="flex w-[106px] shrink-0 items-center justify-center">{visual}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl leading-none">{title}</span>
        <span className="mt-2 block text-sm leading-snug text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-red-500/70 transition-transform group-active:translate-x-1" />
    </>
  );

  return href.includes("?") ? (
    <a href={href} onClick={onClick} className={classes}>{content}</a>
  ) : (
    <Link to={href} onClick={onClick} className={classes}>{content}</Link>
  );
}

function PlayPage() {
  useEffect(() => {
    recordRecommendationImpressions(["play-bot", "play-friend", "play-team", "play-cup"]);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4 · Head to Head</p>
        <h1 className="mt-1 font-display text-4xl">Spela</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Välj hur du vill tävla.</p>
      </header>

      <section className="mt-6 space-y-3">
        <MatchCard
          href="/match-bot"
          onClick={() => recordRecommendationOpen("play-bot")}
          title="Mot bot"
          description="Välj rival och spela direkt."
          visual={
            <div className="flex items-center">
              <span className="z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-card bg-blue-500/[.10] text-xl shadow-sm">👩🏼</span>
              <span className="-ml-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-card bg-red-500/[.10] text-xl shadow-sm">👴🏻</span>
              <span className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-card bg-muted text-xl shadow-sm">🧑🏽</span>
            </div>
          }
        />

        <MatchCard
          href="/match?flow=friend"
          onClick={() => recordRecommendationOpen("play-friend")}
          title="Mot vän"
          description="1 mot 1. Samma spel, sida vid sida."
          visual={
            <div className="flex items-center gap-2">
              <PlayerDot side="blue" />
              <VersusMark />
              <PlayerDot side="red" />
            </div>
          }
        />

        <MatchCard
          href="/match?flow=team"
          onClick={() => recordRecommendationOpen("play-team")}
          title="Lagspel"
          description="2 mot 2 · Fourball eller Foursomes."
          visual={
            <div className="flex items-center gap-1.5">
              <span className="flex -space-x-2">
                <PlayerDot side="blue" small />
                <PlayerDot side="blue" small />
              </span>
              <VersusMark />
              <span className="flex -space-x-2">
                <PlayerDot side="red" small />
                <PlayerDot side="red" small />
              </span>
            </div>
          }
        />
      </section>

      <section className="mt-7 border-t border-border pt-5">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">Fler sätt att spela</p>
        <div className="overflow-hidden rounded-[24px] border border-border bg-card">
          <Link to="/cup" onClick={() => recordRecommendationOpen("play-cup")} className="flex items-center gap-3 px-4 py-4 active:bg-muted/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400/25 bg-gradient-to-br from-blue-500/[.08] to-red-500/[.08]"><Trophy className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-lg">Putting Cup</span><span className="block text-xs text-muted-foreground">Kvartsfinal → semifinal → final</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="mx-4 border-t border-border" />
          <Link to="/utmaningar" className="flex items-center gap-3 px-4 py-4 active:bg-muted/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><Flag className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-lg">Utmaningar</span><span className="block text-xs text-muted-foreground">Korta spel, scoring och PB-jakt</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </main>
  );
}
