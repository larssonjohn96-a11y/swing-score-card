import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
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
      className="group flex min-h-[104px] items-center rounded-[26px] border border-white/75 bg-white/82 px-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,.24)] backdrop-blur-xl transition-all active:scale-[.99] active:border-blue-300 active:bg-white"
    >
      <span className="min-w-0 flex-1 font-display text-[29px] leading-[0.96] tracking-[-0.025em] text-[#061126]">
        {title}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2c94c] text-[#071b14] shadow-[0_8px_20px_-12px_rgba(0,0,0,.45)] transition-transform group-active:translate-x-0.5">
        <ChevronRight className="h-5 w-5" strokeWidth={2.8} />
      </span>
    </a>
  );
}

function HomeArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function PlayPage() {
  useEffect(() => {
    recordRecommendationImpressions(["play-bot", "play-friend", "play-team"]);

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

  return (
    <main
      className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-[#fcfcfa] px-5 pb-28 pt-6 text-[#061126]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 0% 24%, rgba(37,99,235,.085), transparent 34%), radial-gradient(circle at 100% 30%, rgba(239,68,68,.075), transparent 34%), linear-gradient(180deg, #fcfcfa 0%, #fbfbf8 100%)",
      }}
    >
      <header className="relative z-10 grid grid-cols-[52px_1fr_52px] items-center">
        <Link
          to="/"
          aria-label="Gå till startsidan"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/80 text-[#061126] backdrop-blur-xl active:scale-95"
        >
          <HomeArrowIcon />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#667b99]">SG4 Match</p>
          <p className="mt-1 font-display text-[18px] leading-none text-[#061126]">Spela</p>
        </div>
        <span />
      </header>

      <section className="relative z-10 mt-6 min-h-[238px] overflow-hidden rounded-[28px] border border-black/[.06] shadow-[0_18px_42px_-30px_rgba(15,23,42,.38)]">
        <img
          src="/Red_vs_blue_1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 30%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/[.02] via-black/[.04] to-black/75" />

        <div className="relative z-10 flex min-h-[238px] flex-col justify-end px-5 pb-5 pt-6 text-white">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/82">Spela</p>
          <h1 className="mt-1 font-display text-[36px] leading-[.94] tracking-[-0.03em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,.35)]">
            Välj din match
          </h1>
          <p className="mt-2 max-w-[27ch] text-[13px] font-medium leading-snug text-white/84">
            Spela head-to-head, mot bot eller tillsammans i lag.
          </p>
        </div>
      </section>

      <section className="relative z-10 mt-5 space-y-3.5">
        <PlayCard href="/match?flow=friend" title="Spela mot vän" recommendationId="play-friend" />
        <PlayCard href="/match-bot" title="Spela mot bot" recommendationId="play-bot" />
        <PlayCard href="/match?flow=team" title="Spela i lag" recommendationId="play-team" />
      </section>
    </main>
  );
}
