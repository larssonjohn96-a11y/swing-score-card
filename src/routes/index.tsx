import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, ChevronDown, ChevronRight, Gauge, Share2, Swords, Target, Trophy, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { computeEstimatedHandicap, hcpLabel, loadRealHandicap, type CategoryHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { useSessionsVersion } from "@/lib/sessions/use-sessions";
import { loadCardProfile } from "@/lib/rating-card";
import { pushPlayerSnapshot, listFriendships } from "@/lib/friends-cloud";
import { loadFriends } from "@/lib/friends";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";
import { recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Spela. Tävla. Bli bättre." },
      { name: "description", content: "Golf som spel – head to head, botmatcher, cuper och progression." },
      { property: "og:title", content: "SG4 – Spela. Tävla. Bli bättre." },
      { property: "og:description", content: "Golf som spel – head to head, botmatcher, cuper och progression." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type HomeData = { real: number | null; cats: CategoryHandicap[]; estimated: number | undefined };

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats) };
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [ageSaved, setAgeSaved] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const sessionsVersion = useSessionsVersion();
  const profile = loadCardProfile();

  useEffect(() => {
    recordRecommendationImpressions(["play-friend", "play-bot", "play-cup"]);
  }, []);

  useEffect(() => {
    setData(loadHomeData());
    setFriendCount(loadFriends().length);
    if (user) {
      void pushPlayerSnapshot();
      void listFriendships().then((f) => setFriendCount(loadFriends().length + f.accepted.length));
    }
  }, [user, sessionsVersion]);

  function shareProfile() {
    const shareData = {
      title: "SG4",
      text: `Spela mot mig i SG4${data?.real !== null && data ? ` · HCP ${hcpLabel(data.real ?? data.estimated ?? 0)}` : ""}.`,
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    };
    if (typeof navigator !== "undefined" && navigator.share) navigator.share(shareData).catch(() => {});
    else if (typeof navigator !== "undefined" && navigator.clipboard && shareData.url) void navigator.clipboard.writeText(shareData.url);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl leading-none tracking-wide text-foreground">SG4</span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={shareProfile} aria-label="Dela" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"><Share2 className="h-4 w-4" /></button>
          {user ? (
            <div className="relative">
              <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} className="flex items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground">{displayName ?? "Konto"}<ChevronDown className={`h-3.5 w-3.5 ${profileMenuOpen ? "rotate-180" : ""}`} /></button>
              {profileMenuOpen ? <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"><Link to="/konto" onClick={() => setProfileMenuOpen(false)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-muted-foreground">Konto</Link></div> : null}
            </div>
          ) : <Link to="/konto" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground">Logga in</Link>}
        </div>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <Link to="/konto" className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">{profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}</Link>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.17em] text-muted-foreground">Redo att spela?</p><h1 className="truncate font-display text-3xl leading-none">{displayName ?? "Golfspelare"}</h1></div>
        <div className="shrink-0 text-right"><p className="text-[9px] font-black uppercase tracking-[.14em] text-muted-foreground">HCP</p><p className="font-display text-2xl text-primary">{data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–"}</p></div>
      </div>

      <ActiveMultiplayerBanner />

      <section className="mt-5">
        <Link to="/spela" onClick={() => recordRecommendationOpen("play-friend")} className="group block overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_44px_-30px_rgba(15,23,42,.22)] active:scale-[.99]">
          <div className="grid grid-cols-[1fr_76px_1fr] border-b border-slate-200">
            <div className="flex min-h-[108px] items-center gap-3 bg-gradient-to-br from-blue-100 via-blue-50 to-white px-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-100 text-blue-600 shadow-sm"><User className="h-5 w-5" /></span>
              <span className="text-sm font-black uppercase tracking-[.12em] text-blue-600">Du</span>
            </div>
            <div className="flex min-h-[108px] items-center justify-center bg-[#071b14] font-display text-2xl text-white">VS</div>
            <div className="flex min-h-[108px] items-center justify-end gap-3 bg-gradient-to-bl from-red-100 via-red-50 to-white px-4">
              <span className="text-sm font-black uppercase tracking-[.12em] text-red-600">Rival</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-400 bg-red-100 text-red-600 shadow-sm"><User className="h-5 w-5" /></span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/55 via-white to-red-50/55 px-5 py-6">
            <div className="absolute inset-y-0 left-0 w-[22%] bg-blue-50/30" />
            <div className="relative flex items-end gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.19em]"><span className="text-blue-600">Head</span><span className="text-slate-500">-to-</span><span className="text-red-600">Head</span></p>
                <h2 className="mt-2 font-display text-4xl leading-none text-[#071b14]">SPELA EN MATCH</h2>
                <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-slate-600">Mot vän, bot eller lag. Välj spel och börja direkt.</p>
              </div>
              <span className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-red-500 shadow-sm transition-transform group-active:translate-x-1"><ChevronRight className="h-5 w-5" /></span>
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-border bg-white">
        <Link to="/match-bot" onClick={() => recordRecommendationOpen("play-bot")} className="flex items-center gap-3 px-4 py-4 active:bg-muted/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Bot className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-black text-foreground">Mot bot</span><span className="mt-0.5 block text-xs text-muted-foreground">Välj rival och spela direkt</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="mx-4 border-t border-border" />
        <Link to="/cup" onClick={() => recordRecommendationOpen("play-cup")} className="flex items-center gap-3 px-4 py-4 active:bg-muted/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Trophy className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-black text-foreground">Putting Cup</span><span className="mt-0.5 block text-xs text-muted-foreground">Kvartsfinal → semifinal → final</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      <section className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/traning" className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-3 text-sm font-bold text-muted-foreground"><Target className="h-4 w-4" /><span className="truncate">Träning</span></Link>
          <Link to="/tester" className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-sm font-bold text-muted-foreground"><Gauge className="h-4 w-4" /><span className="truncate">Tester</span></Link>
          <Link to="/utveckling" className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-2xl px-2 py-3 text-sm font-bold text-muted-foreground"><Gauge className="h-4 w-4" /><span className="truncate">Utveckling</span></Link>
        </div>
      </section>

      <section className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <Link to="/vanner" className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-primary" />{friendCount ?? "–"} vänner</Link>
        <Link to="/trophy" className="flex items-center gap-2 font-bold"><Trophy className="h-4 w-4 text-amber-500" />Trophy Room</Link>
      </section>

      {data && data.real === null && data.cats.every((c) => c.count === 0) ? <Link to="/konto" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"><Gauge className="h-5 w-5 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Ange ditt officiella HCP</span><span className="block text-xs text-muted-foreground">Få en direkt baslinje för SG4.</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link> : null}
      {profile.age === undefined && !ageSaved ? <div className="mt-4"><AgeInlinePrompt title="Ange din ålder" description="Jämför din ball speed med jämnåriga golfare" onSaved={() => setAgeSaved(true)} /></div> : null}
    </main>
  );
}
