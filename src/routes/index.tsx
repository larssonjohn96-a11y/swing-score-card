import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Crosshair,
  Database,
  Gauge,
  LineChart,
  Ruler,
  Swords,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { computeEstimatedHandicap, hcpLabel, loadRealHandicap, type CategoryHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { useSessionsVersion } from "@/lib/sessions/use-sessions";
import { loadCardProfile } from "@/lib/rating-card";
import { listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import { loadFriends, type Friend } from "@/lib/friends";
import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadShortGameSessions } from "@/lib/shortgame";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadLagPuttSessions } from "@/lib/lagputt";
import { loadSpeedSessions } from "@/lib/speed";
import {
  getBehaviorRecommendationScore,
  recordRecommendationImpressions,
  recordRecommendationOpen,
} from "@/lib/sg4-recommender";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Hem" },
      { name: "description", content: "Spela, testa, träna och följ din utveckling i SG4." },
    ],
  }),
  component: Home,
});

type HomeData = { real: number | null; cats: CategoryHandicap[]; estimated: number | undefined };
type QuickStart = {
  eyebrow: string;
  title: string;
  detail: string;
  to: "/tester" | "/spela" | "/coach";
  activityId: string;
};
type PosterVisualKind =
  | "putting"
  | "chip"
  | "bunker"
  | "all"
  | "shortgame"
  | "approach"
  | "driving"
  | "tour-putting"
  | "tutor"
  | "consistency"
  | "pei";

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats) };
}

function loadTotalRegisteredShots() {
  const approach = loadPrecisionSessions().reduce((sum, session) => sum + session.shots.length, 0);
  const driving = loadOffTeeSessions().reduce((sum, session) => sum + session.shots.filter((shot) => shot.filled).length, 0);
  const shortGame = loadShortGameSessions().reduce((sum, session) => sum + session.shots.filter((shot) => Boolean(shot.interval)).length, 0);
  const bunker = loadBunkerSessions().reduce((sum, session) => sum + session.shots.filter((shot) => Boolean(shot.interval)).length, 0);
  const shortPutting = loadShortPuttSessions().reduce((sum, session) => sum + session.putts.length, 0);
  const lagPutting = loadLagPuttSessions().reduce((sum, session) => sum + session.putts.filter((putt) => Boolean(putt.interval)).length, 0);
  const speed = loadSpeedSessions().reduce((sum, session) => sum + session.shots.filter((shot) => shot.ballSpeed > 0).length, 0);
  return approach + driving + shortGame + bunker + shortPutting + lagPutting + speed;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function BrowseHeading({ eyebrow, title, action, to }: { eyebrow: string; title: string; action: string; to: "/coach" | "/tester" }) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 text-[24px] font-black leading-none text-foreground">{title}</h2>
      </div>
      <Link to={to} className="shrink-0 text-xs font-bold text-blue-600">{action}</Link>
    </div>
  );
}

const ROW_CLASS = "-mx-5 mt-4 flex touch-pan-x gap-3.5 overflow-x-scroll bg-transparent px-5 pb-3 pt-0.5 scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent";
const POSTER_BASE = "group relative isolate flex h-[220px] w-[164px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/15 text-white shadow-[0_16px_34px_-20px_rgba(15,23,42,.68)] transition duration-200 active:scale-[.975]";

function PosterVisual({ kind }: { kind: PosterVisualKind }) {
  if (kind === "all") {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full border border-white/15" />
        <div className="absolute h-14 w-14 rounded-full border border-white/20" />
        <span className="text-[54px] font-light leading-none text-white/95">＋</span>
      </div>
    );
  }

  if (kind === "bunker") {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute left-[-18px] top-[44px] h-[82px] w-[205px] -rotate-6 rounded-[50%] bg-white/12 blur-[1px]" />
        <div className="absolute left-[18px] top-[64px] h-[54px] w-[132px] rotate-6 rounded-[50%] border border-white/35 bg-white/10" />
        <div className="absolute left-[64px] top-[78px] h-9 w-9 rounded-full border-[3px] border-white/95 bg-white/10 shadow-[0_8px_20px_rgba(0,0,0,.25)]" />
        <div className="absolute left-[78px] top-[88px] h-1.5 w-1.5 rounded-full bg-white/70" />
        <div className="absolute left-[90px] top-[96px] h-1 w-1 rounded-full bg-white/60" />
      </div>
    );
  }

  if (kind === "tutor") {
    return (
      <div className="relative h-full w-full">
        <div className="absolute left-[40px] top-[38px] h-[108px] w-[3px] rounded-full bg-white/70" />
        <div className="absolute right-[40px] top-[38px] h-[108px] w-[3px] rounded-full bg-white/70" />
        <div className="absolute left-1/2 top-[34px] h-[116px] w-px -translate-x-1/2 bg-white/25" />
        <div className="absolute left-1/2 top-[70px] h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-white bg-white/10 shadow-lg" />
        <Ruler className="absolute bottom-2 left-1/2 h-7 w-7 -translate-x-1/2 text-white/80" />
      </div>
    );
  }

  if (kind === "consistency") {
    const dots = [
      [54, 54], [91, 43], [118, 63], [70, 82], [102, 96], [43, 105], [126, 111], [84, 124],
    ];
    return (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-[28px] h-[122px] w-[94px] -translate-x-1/2 rounded-[48%] border border-white/22" />
        <Crosshair className="absolute left-1/2 top-[67px] h-11 w-11 -translate-x-1/2 text-white/55" />
        {dots.map(([x, y], i) => <span key={i} style={{ left: x, top: y }} className="absolute h-2.5 w-2.5 rounded-full border border-white/70 bg-white/25" />)}
      </div>
    );
  }

  if (kind === "tour-putting") {
    return (
      <div className="relative h-full w-full">
        <span className="absolute left-4 top-5 font-display text-[78px] leading-none text-white/12">18</span>
        <div className="absolute bottom-3 left-1/2 h-[92px] w-[132px] -translate-x-1/2 rounded-[50%] border border-white/20 bg-black/10" />
        <div className="absolute bottom-[48px] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-[3px] border-white/90" />
        <Trophy className="absolute right-4 top-8 h-8 w-8 text-white/75" />
      </div>
    );
  }

  const isDriving = kind === "driving";
  const isApproach = kind === "approach" || kind === "pei";
  const isChip = kind === "chip" || kind === "shortgame";
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute left-1/2 top-[64px] h-[92px] w-[152px] -translate-x-1/2 rounded-[50%] border border-white/20 bg-white/[.06]" />
      <div className="absolute left-1/2 top-[84px] h-[52px] w-[92px] -translate-x-1/2 rounded-[50%] border border-white/28" />
      <div className="absolute left-1/2 top-[99px] h-[22px] w-[38px] -translate-x-1/2 rounded-[50%] border border-white/50" />
      {isDriving ? (
        <>
          <div className="absolute left-[26px] top-[28px] h-[90px] w-[112px] rounded-[50%] border-t-2 border-dashed border-white/70 -rotate-6" />
          <Gauge className="absolute right-5 top-5 h-7 w-7 text-white/70" />
          <span className="absolute bottom-6 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-white bg-white/15" />
        </>
      ) : isApproach ? (
        <>
          <div className="absolute left-[32px] top-[32px] h-[70px] w-[112px] rounded-[50%] border-t-2 border-dashed border-white/65 rotate-3" />
          <Target className="absolute left-1/2 top-[75px] h-11 w-11 -translate-x-1/2 text-white/72" />
          <span className="absolute left-[36px] top-[41px] h-6 w-6 rounded-full border-[3px] border-white bg-white/10" />
        </>
      ) : isChip ? (
        <>
          <div className="absolute left-[26px] top-[48px] h-[54px] w-[102px] rounded-[50%] border-t-2 border-dashed border-white/65 rotate-[-8deg]" />
          <span className="absolute left-[34px] top-[63px] h-7 w-7 rounded-full border-[3px] border-white bg-white/10" />
          <Crosshair className="absolute right-5 top-[82px] h-9 w-9 text-white/60" />
        </>
      ) : (
        <>
          <Target className="absolute left-1/2 top-[72px] h-12 w-12 -translate-x-1/2 text-white/70" />
          <span className="absolute left-1/2 top-[89px] h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-white bg-white/10" />
        </>
      )}
    </div>
  );
}

function PosterCard({
  badge,
  eyebrow,
  title,
  visual,
  tone,
  children,
}: {
  badge: string;
  eyebrow: string;
  title: string;
  visual: PosterVisualKind;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${POSTER_BASE} ${tone}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(255,255,255,.22),transparent_28%),linear-gradient(to_top,rgba(0,0,0,.72),rgba(0,0,0,.06)_62%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/10" />
      <span className="absolute left-3 top-3 z-20 rounded-md border border-white/15 bg-black/28 px-2 py-1 text-[9px] font-black uppercase tracking-[.16em] backdrop-blur-md">{badge}</span>
      <div className="relative z-10 min-h-0 flex-1 pt-8"><PosterVisual kind={visual} /></div>
      <div className="relative z-20 px-4 pb-4 pt-1">
        <span className="block text-[9px] font-black uppercase tracking-[.16em] text-white/68">{eyebrow}</span>
        <span className="mt-1 block font-display text-[25px] leading-[.98] text-white">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [cloudFriendCount, setCloudFriendCount] = useState(0);
  const sessionsVersion = useSessionsVersion();
  const profile = loadCardProfile();

  useEffect(() => {
    recordRecommendationImpressions(["play-friend", "play-bot", "play-cup", "hcp-test", "practice"]);
  }, []);

  useEffect(() => {
    setData(loadHomeData());
    setFriends(loadFriends());
    if (user) {
      void pushPlayerSnapshot();
      void listFriendships().then((result) => setCloudFriendCount(result.accepted.length));
    }
  }, [user, sessionsVersion]);

  const quickStart = useMemo<QuickStart>(() => {
    const noBaseline = !!data && data.real === null && data.cats.every((category) => category.count === 0);
    if (!data || noBaseline) {
      return { eyebrow: "Kom igång", title: "Gör ditt första HCP-test", detail: "Få ett första resultat och börja bygga din spelarprofil.", to: "/tester", activityId: "hcp-test" };
    }
    const playScore = Math.max(
      getBehaviorRecommendationScore("play-friend").score,
      getBehaviorRecommendationScore("play-bot").score,
      getBehaviorRecommendationScore("play-cup").score,
    );
    const practiceScore = getBehaviorRecommendationScore("practice").score;
    const testScore = getBehaviorRecommendationScore("hcp-test").score;
    if (practiceScore >= playScore && practiceScore >= testScore) {
      return { eyebrow: "Snabbstart", title: "Träna med coach", detail: "Tillbaka till Practice Mode.", to: "/coach", activityId: "practice" };
    }
    if (testScore > playScore) {
      return { eyebrow: "Snabbstart", title: "Gör ett nytt HCP-test", detail: "Få ett nytt resultat direkt.", to: "/tester", activityId: "hcp-test" };
    }
    return { eyebrow: "Snabbstart", title: "Spela en match", detail: "Hoppa direkt tillbaka till spel.", to: "/spela", activityId: "play-friend" };
  }, [data, sessionsVersion]);

  const totalFriends = friends.length + cloudFriendCount;
  const previewFriends = friends.slice(0, 4);
  const hcpValue = data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–";
  const totalShots = useMemo(() => loadTotalRegisteredShots(), [sessionsVersion]);
  const knownCategories = data?.cats.filter((category) => category.count > 0) ?? [];
  const strongest = knownCategories.length ? [...knownCategories].sort((a, b) => a.handicap - b.handicap)[0] : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 px-5 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-3">
          <Link to="/konto" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[19px] font-black leading-none text-foreground">{displayName ?? "Golfspelare"}</span>
              <span className="mt-1 block text-xs font-semibold text-muted-foreground">HCP {hcpValue}</span>
            </span>
          </Link>
          <button type="button" aria-label="Notiser" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground">
            <Bell className="h-[18px] w-[18px]" />
          </button>
        </div>
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Snabbnavigering">
          <Link to="/spela" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black active:scale-[.97]">Spela</Link>
          <Link to="/tester" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black active:scale-[.97]">Train &amp; Test</Link>
          <Link to="/utveckling" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black active:scale-[.97]">Utveckling</Link>
          <Link to="/vanner" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black active:scale-[.97]">Vänner</Link>
        </nav>
      </header>

      <div className="px-5 pt-5">
        <section className="grid grid-cols-[1fr_auto] overflow-hidden rounded-[24px] border border-border bg-card">
          <Link to="/utveckling" className="flex min-w-0 items-center gap-3 px-5 py-4 active:bg-muted/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Slagbank</span>
              <span className="mt-0.5 block text-[30px] font-black leading-none tabular-nums text-foreground">{totalShots.toLocaleString("sv-SE")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">registrerade slag</span>
            </span>
          </Link>
          <Link to="/vanner" className="flex min-w-[92px] flex-col items-center justify-center border-l border-border px-4 py-4 text-center active:bg-muted/30">
            <Users className="h-4 w-4 text-blue-600" /><span className="mt-1 text-xl font-black tabular-nums text-foreground">{totalFriends}</span><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">vänner</span>
          </Link>
        </section>

        <div className="mt-4"><ActiveMultiplayerBanner /></div>

        <section className="mt-4">
          <Link to={quickStart.to} onClick={() => recordRecommendationOpen(quickStart.activityId)} className="group flex items-center gap-4 rounded-[26px] border border-blue-200 bg-blue-50/70 px-5 py-5 active:scale-[.99]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{quickStart.eyebrow}</p>
              <h1 className="mt-1.5 text-[22px] font-black leading-tight text-foreground">{quickStart.title}</h1>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{quickStart.detail}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-transform group-active:translate-x-0.5"><ChevronRight className="h-5 w-5" /></span>
          </Link>
        </section>

        <section className="mt-4">
          <Link to="/spela" onClick={() => recordRecommendationOpen("play-friend")} className="block overflow-hidden rounded-[26px] border border-border bg-card active:scale-[.99]">
            <div className="grid grid-cols-[1fr_62px_1fr] border-b border-border">
              <div className="flex h-[72px] items-center gap-2 bg-blue-50 px-4 text-blue-600"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300"><User className="h-4 w-4" /></span><span className="text-xs font-black uppercase tracking-[.12em]">Du</span></div>
              <div className="flex h-[72px] items-center justify-center bg-[#071b14] text-sm font-black text-white">VS</div>
              <div className="flex h-[72px] items-center justify-end gap-2 bg-red-50 px-4 text-red-500"><span className="text-xs font-black uppercase tracking-[.12em]">Vän</span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-red-300"><User className="h-4 w-4" /></span></div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Spela</p>
                <h2 className="mt-1 text-xl font-black text-foreground">Utmana en vän</h2>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {previewFriends.length ? previewFriends.map((friend) => <span key={friend.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-black text-foreground">{initials(friend.name)}</span>) : <><span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" /><span className="h-8 w-8 rounded-full border-2 border-background bg-slate-300" /><span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" /></>}
                  </div>
                  <span className="text-xs text-muted-foreground">{totalFriends > 0 ? `${totalFriends} vänner` : "Hitta någon att spela mot"}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        </section>

        <section className="mt-7">
          <BrowseHeading eyebrow="Practice Mode" title="Träna med coach" action="Alla pass" to="/coach" />
          <div className={ROW_CLASS} style={{ WebkitOverflowScrolling: "touch" }}>
            <Link to="/coach" search={{ category: "putting" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0">
              <PosterCard badge="Practice" eyebrow="Coachträning" title="Puttning" visual="putting" tone="bg-gradient-to-br from-indigo-500 via-violet-700 to-purple-950">{null}</PosterCard>
            </Link>
            <Link to="/coach" search={{ category: "around-the-green" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0">
              <PosterCard badge="Practice" eyebrow="Coachträning" title="Chippning" visual="chip" tone="bg-gradient-to-br from-emerald-400 via-emerald-650 to-teal-950">{null}</PosterCard>
            </Link>
            <Link to="/coach" search={{ category: "bunker" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0">
              <PosterCard badge="Practice" eyebrow="Coachträning" title="Bunker" visual="bunker" tone="bg-gradient-to-br from-amber-300 via-orange-500 to-stone-950">{null}</PosterCard>
            </Link>
            <Link to="/coach" onClick={() => recordRecommendationOpen("practice")} className="block shrink-0">
              <PosterCard badge="Practice" eyebrow="Practice Mode" title="Alla pass" visual="all" tone="bg-gradient-to-br from-slate-500 via-slate-700 to-slate-950">{null}</PosterCard>
            </Link>
          </div>
        </section>

        <section className="mt-7">
          <BrowseHeading eyebrow="HCP Test" title="Testa din nivå" action="Alla tester" to="/tester" />
          <div className={ROW_CLASS} style={{ WebkitOverflowScrolling: "touch" }}>
            <Link to="/kategori/$slug" params={{ slug: "puttning" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0">
              <PosterCard badge="HCP Test" eyebrow="På green" title="Putting" visual="putting" tone="bg-gradient-to-br from-fuchsia-500 via-violet-700 to-indigo-950">{null}</PosterCard>
            </Link>
            <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0">
              <PosterCard badge="HCP Test" eyebrow="Short game" title="Around the Green" visual="shortgame" tone="bg-gradient-to-br from-lime-400 via-emerald-600 to-emerald-950">{null}</PosterCard>
            </Link>
            <Link to="/kategori/$slug" params={{ slug: "approach" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0">
              <PosterCard badge="HCP Test" eyebrow="Inspel" title="Approach" visual="approach" tone="bg-gradient-to-br from-cyan-400 via-sky-600 to-blue-950">{null}</PosterCard>
            </Link>
            <Link to="/kategori/$slug" params={{ slug: "driving" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0">
              <PosterCard badge="HCP Test" eyebrow="Utslag" title="Off the Tee" visual="driving" tone="bg-gradient-to-br from-slate-400 via-slate-700 to-black">{null}</PosterCard>
            </Link>
          </div>
        </section>

        <section className="mt-7">
          <div className="px-0.5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Benchmarks & challenges</p><h2 className="mt-1 text-[24px] font-black leading-none text-foreground">Mät precision och nivå</h2></div>
          <div className={ROW_CLASS} style={{ WebkitOverflowScrolling: "touch" }}>
            <Link to="/pga-tour-18-puttar" className="block shrink-0"><PosterCard badge="Benchmark" eyebrow="Putting" title="18 puttar" visual="tour-putting" tone="bg-gradient-to-br from-rose-500 via-red-700 to-red-950">{null}</PosterCard></Link>
            <Link to="/tutor-test" className="block shrink-0"><PosterCard badge="Benchmark" eyebrow="Startlinje" title="Tutor Test" visual="tutor" tone="bg-gradient-to-br from-violet-500 via-indigo-700 to-slate-950">{null}</PosterCard></Link>
            <Link to="/driver-konsekvens" className="block shrink-0"><PosterCard badge="Challenge" eyebrow="Driver" title="Konsekvens" visual="consistency" tone="bg-gradient-to-br from-orange-400 via-amber-600 to-stone-950">{null}</PosterCard></Link>
            <Link to="/approach-pei-valj" className="block shrink-0"><PosterCard badge="Benchmark" eyebrow="Approach" title="PEI Approach" visual="pei" tone="bg-gradient-to-br from-teal-400 via-cyan-700 to-blue-950">{null}</PosterCard></Link>
          </div>
        </section>

        <section className="mt-4">
          <Link to="/utveckling" className="flex items-center gap-4 rounded-[22px] border border-border bg-card px-4 py-4 active:bg-muted/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><LineChart className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.17em] text-muted-foreground">Analys</span><span className="mt-1 block text-base font-black text-foreground">Din utveckling</span><span className="mt-0.5 block text-xs text-muted-foreground">{strongest ? `Starkast just nu: ${strongest.label}` : "Se styrkor, svagheter och framsteg"}</span></span>
            <span className="flex items-center gap-2 text-muted-foreground"><span className="hidden h-8 w-8 items-center justify-center rounded-full bg-violet-50 sm:flex"><LineChart className="h-4 w-4" /></span><ChevronRight className="h-5 w-5" /></span>
          </Link>
        </section>

        <section className="mt-5 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <Link to="/vanner" className="flex items-center gap-1.5"><Users className="h-4 w-4" />Vänner</Link>
          <Link to="/spela" className="flex items-center gap-1.5"><Swords className="h-4 w-4" />Alla spellägen</Link>
        </section>
      </div>
    </main>
  );
}
