import { CourseCompetition } from "@/components/course-competition";
import { CourseGamePage } from "@/components/course-game-page";
import { useAuth } from "@/hooks/use-auth";
import { parseGame } from "@/lib/short-course";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";

export const Route = createFileRoute("/spela")({
  head: () => ({
    meta: [{ title: "Match – SG4" }],
    links: [{ rel: "preload", href: "/Red_vs_blue_1.png", as: "image" }],
  }),
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
      className="group relative flex min-h-[108px] items-center overflow-hidden rounded-[28px] border border-white/65 bg-white/58 px-6 backdrop-blur-[20px] shadow-[0_18px_40px_-26px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.86),inset_0_-1px_0_rgba(255,255,255,.24)] transition-all active:scale-[.995]"
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/42 via-white/12 to-black/[.035]" />
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <span className="pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-blue-400/8 blur-2xl" />
      <span className="pointer-events-none absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-red-400/8 blur-2xl" />

      <span className="relative z-10 min-w-0 flex-1 font-display text-[29px] leading-[0.96] tracking-[-0.025em] text-[#061126]">
        {title}
      </span>

      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/52 text-[#d8a300] backdrop-blur-[18px] shadow-[0_10px_24px_-14px_rgba(15,23,42,.36),inset_0_1px_0_rgba(255,255,255,.86)] transition-transform group-active:translate-x-0.5">
        <ChevronRight className="h-5 w-5" strokeWidth={2.8} />
      </span>
    </a>
  );
}

function PlayPage() {
  const [courseMode, setCourseMode] = useState<"duel" | "group" | "tournament" | null>(null);
  const [resumeNames, setResumeNames] = useState("");
  const { user, loading } = useAuth();
  useHideBottomNav(courseMode !== null);
  useEffect(() => {
    if (loading || courseMode) return;
    try {
      const game = parseGame(localStorage.getItem(`sg4.course-game.v1:${user?.id ?? "guest"}`));
      setResumeNames(game ? game.names.join(" mot ") : "");
    } catch {
      setResumeNames("");
    }
  }, [user?.id, loading, courseMode]);
  useEffect(() => {
    recordRecommendationImpressions(["play-friend", "play-team"]);

    const root = document.documentElement;
    const body = document.body;
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    const previousColorScheme = root.style.colorScheme;

    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
    root.style.backgroundColor = "#fcfcfa";
    body.style.backgroundColor = "#fcfcfa";

    return () => {
      root.style.backgroundColor = previousRootBackground;
      body.style.backgroundColor = previousBodyBackground;
      root.style.colorScheme = previousColorScheme || "light";
    };
  }, []);

  if (courseMode)
    return (
      <>
        <style>{`[data-activity-sticky-header]{display:none}`}</style>
        {courseMode === "duel" ? (
          <CourseGamePage onBack={() => setCourseMode(null)} />
        ) : (
          <CourseCompetition kind={courseMode} onBack={() => setCourseMode(null)} />
        )}
      </>
    );

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-[#fcfcfa] pb-28 pt-4 text-[#061126]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-8 h-[350px] w-[350px] rounded-full bg-[#377dff]/24 blur-[92px]" />
        <div className="absolute -right-28 top-12 h-[350px] w-[350px] rounded-full bg-[#ff5d67]/22 blur-[92px]" />
        <div className="absolute -left-24 top-[430px] h-[360px] w-[360px] rounded-full bg-[#5b95ff]/17 blur-[105px]" />
        <div className="absolute -right-24 top-[470px] h-[360px] w-[360px] rounded-full bg-[#ff7d86]/16 blur-[105px]" />
        <div className="absolute -left-20 bottom-[-120px] h-[360px] w-[360px] rounded-full bg-[#79a9ff]/12 blur-[110px]" />
        <div className="absolute -right-20 bottom-[-100px] h-[360px] w-[360px] rounded-full bg-[#ff9da3]/12 blur-[110px]" />
      </div>

      <section className="relative z-10 px-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[30px] border border-white/75 bg-gradient-to-br from-[#dfe9ff] via-[#f4f6fb] to-[#ffe5e8] shadow-[0_22px_48px_-30px_rgba(15,23,42,.34),inset_0_1px_0_rgba(255,255,255,.5)] backdrop-blur-[6px]">
          <img
            src="/Red_vs_blue_1.png"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="block h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/35" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/42" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[#2f7dff]/8" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[#ff5e5e]/8" />

          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/82">Match</p>
            <h1 className="mt-1 font-display text-[36px] leading-[.94] tracking-[-0.03em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,.35)]">
              Välj din match
            </h1>
            <p className="mt-2 max-w-[27ch] text-[13px] font-medium leading-snug text-white/84">
              Tävla i ett moment eller spela hela hål på banan.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-5 space-y-3.5 px-5">
        {resumeNames && (
          <button
            onClick={() => setCourseMode("duel")}
            className="w-full rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left text-blue-800"
          >
            <span className="block font-bold">Fortsätt match på bana →</span>
            <span className="mt-1 block text-sm">{resumeNames}</span>
          </button>
        )}
        <PlayCard href="/match?flow=friend" title="Spela mot vän" recommendationId="play-friend" />
        <PlayCard href="/match?flow=team" title="Spela i lag" recommendationId="play-team" />
      </section>
      <section className="relative z-10 mt-7 space-y-3 px-5">
        <div>
          <h2 className="text-xl font-bold">Fler sätt att tävla</h2>
          <p className="mt-1 text-sm text-slate-600">Spela hela hål på valfri bana.</p>
        </div>
        {(
          [
            ["group", "Flera spelare", "2–6 spelare · lägst antal slag vinner"],
            ["tournament", "Turnering", "3–16 spelare · utslagning eller gruppspel + slutspel"],
          ] as const
        ).map(([id, title, detail]) => (
          <button
            key={id}
            onClick={() => setCourseMode(id)}
            className="flex min-h-24 w-full items-center gap-4 rounded-[26px] border border-slate-200 bg-white/80 p-5 text-left shadow-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-bold">{title}</span>
              <span className="mt-1 block text-sm text-slate-500">{detail}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-blue-600" />
          </button>
        ))}
      </section>
    </main>
  );
}
