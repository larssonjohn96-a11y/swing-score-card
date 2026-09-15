import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, GraduationCap, UserRound, UsersRound } from "lucide-react";
import { useEffect } from "react";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";

export const Route = createFileRoute("/spela")({
  head: () => ({ meta: [{ title: "Spela – SG4" }] }),
  component: PlayPage,
});

type PlayCardProps = {
  href: string;
  title: string;
  visual: React.ReactNode;
  recommendationId?: string;
};

function PlayCard({ href, title, visual, recommendationId }: PlayCardProps) {
  return (
    <a
      href={href}
      onClick={() => recommendationId && recordRecommendationOpen(recommendationId)}
      className="group relative flex min-h-[104px] items-center overflow-hidden rounded-[30px] border border-white/90 bg-white/58 px-4 shadow-[0_18px_50px_-32px_rgba(37,99,235,.34),inset_0_1px_0_rgba(255,255,255,.96)] backdrop-blur-2xl transition-transform active:scale-[.985]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.72)_0%,rgba(219,238,255,.52)_48%,rgba(191,222,255,.30)_100%)]"
      />
      <span className="relative flex h-[76px] w-[82px] shrink-0 items-center justify-center rounded-[24px] border border-white/90 bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_10px_26px_-20px_rgba(37,99,235,.45)] backdrop-blur-xl">
        {visual}
      </span>
      <span className="relative min-w-0 flex-1 px-4 text-center font-display text-[24px] leading-none tracking-[-0.02em] text-[#071b3a]">
        {title}
      </span>
      <ChevronRight className="relative h-6 w-6 shrink-0 text-[#6e89ad] transition-transform group-active:translate-x-0.5" strokeWidth={2.6} />
    </a>
  );
}

function FriendVisual() {
  return (
    <span className="relative flex h-14 w-16 items-center justify-center">
      <span className="absolute left-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-red-400 to-red-500 text-white shadow-[0_8px_20px_-12px_rgba(239,68,68,.85)]">
        <UserRound className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_8px_20px_-12px_rgba(37,99,235,.85)]">
        <UserRound className="h-5 w-5" strokeWidth={2.4} />
      </span>
    </span>
  );
}

function PlayPage() {
  useEffect(() => {
    recordRecommendationImpressions(["play-coach", "play-bot", "play-friend", "play-team"]);
  }, []);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-[#f7fbff] px-5 pb-28 pt-8 text-[#071b3a]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-200/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-[36%] h-80 w-80 rounded-full bg-sky-200/25 blur-3xl" />

      <header className="relative grid grid-cols-[48px_1fr_48px] items-center">
        <Link
          to="/"
          aria-label="Tillbaka"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/90 bg-white/64 text-[#49698f] shadow-[0_12px_30px_-22px_rgba(37,99,235,.5)] backdrop-blur-xl active:scale-95"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.6} />
        </Link>
        <h1 className="text-center font-display text-[42px] leading-none tracking-[-0.035em] text-[#071b3a]">Spela</h1>
        <span />
      </header>

      <section className="relative mt-12 space-y-3.5">
        <PlayCard
          href="/utmaningar"
          title="Spela själv"
          visual={
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,.75)]">
              <UserRound className="h-6 w-6" strokeWidth={2.5} />
            </span>
          }
        />

        <PlayCard
          href="/match?flow=friend"
          title="Spela med vän"
          recommendationId="play-friend"
          visual={<FriendVisual />}
        />

        <PlayCard
          href="/match-bot"
          title="Spela mot bot"
          recommendationId="play-bot"
          visual={<span className="text-[42px] leading-none" role="img" aria-label="Bot">🤖</span>}
        />

        <PlayCard
          href="/coach"
          title="Spela med coach"
          recommendationId="play-coach"
          visual={
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="text-[40px] leading-none" role="img" aria-label="Coach">🧑🏻‍🏫</span>
              <GraduationCap className="absolute -right-1 -top-1 h-4 w-4 text-blue-500/70" />
            </span>
          }
        />

        <PlayCard
          href="/match?flow=team"
          title="Spela i lag"
          recommendationId="play-team"
          visual={
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-200/90 to-blue-500/90 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,.75)]">
              <UsersRound className="h-7 w-7" strokeWidth={2.3} />
            </span>
          }
        />
      </section>
    </main>
  );
}
