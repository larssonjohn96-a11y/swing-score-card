import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, Database, Gauge, LineChart, Swords, Target, User, Users } from "lucide-react";
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

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats) };
}

function loadTotalRegisteredShots() {
  const approach = loadPrecisionSessions().reduce((sum, session) => sum + session.shots.length, 0);
  const driving = loadOffTeeSessions().reduce(
    (sum, session) => sum + session.shots.filter((shot) => shot.filled).length,
    0,
  );
  const shortGame = loadShortGameSessions().reduce(
    (sum, session) => sum + session.shots.filter((shot) => Boolean(shot.interval)).length,
    0,
  );
  const bunker = loadBunkerSessions().reduce(
    (sum, session) => sum + session.shots.filter((shot) => Boolean(shot.interval)).length,
    0,
  );
  const shortPutting = loadShortPuttSessions().reduce((sum, session) => sum + session.putts.length, 0);
  const lagPutting = loadLagPuttSessions().reduce(
    (sum, session) => sum + session.putts.filter((putt) => Boolean(putt.interval)).length,
    0,
  );
  const speed = loadSpeedSessions().reduce(
    (sum, session) => sum + session.shots.filter((shot) => shot.ballSpeed > 0).length,
    0,
  );

  return approach + driving + shortGame + bunker + shortPutting + lagPutting + speed;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
      return {
        eyebrow: "Kom igång",
        title: "Gör ditt första HCP-test",
        detail: "Få ett första resultat och börja bygga din spelarprofil.",
        to: "/tester",
        activityId: "hcp-test",
      };
    }

    const playScore = Math.max(
      getBehaviorRecommendationScore("play-friend").score,
      getBehaviorRecommendationScore("play-bot").score,
      getBehaviorRecommendationScore("play-cup").score,
    );
    const practiceScore = getBehaviorRecommendationScore("practice").score;
    const testScore = getBehaviorRecommendationScore("hcp-test").score;

    if (practiceScore >= playScore && practiceScore >= testScore) {
      return {
        eyebrow: "Snabbstart",
        title: "Träna med coach",
        detail: "Tillbaka till Practice Mode.",
        to: "/coach",
        activityId: "practice",
      };
    }

    if (testScore > playScore) {
      return {
        eyebrow: "Snabbstart",
        title: "Gör ett nytt HCP-test",
        detail: "Få ett nytt resultat direkt.",
        to: "/tester",
        activityId: "hcp-test",
      };
    }

    return {
      eyebrow: "Snabbstart",
      title: "Spela en match",
      detail: "Hoppa direkt tillbaka till spel.",
      to: "/spela",
      activityId: "play-friend",
    };
  }, [data, sessionsVersion]);

  const totalFriends = friends.length + cloudFriendCount;
  const previewFriends = friends.slice(0, 4);
  const hcpValue = data ? hcpLabel(data.real ?? data.estimated ?? 0) : "–";
  const totalShots = useMemo(() => loadTotalRegisteredShots(), [sessionsVersion]);
  const knownCategories = data?.cats.filter((category) => category.count > 0) ?? [];
  const strongest = knownCategories.length
    ? [...knownCategories].sort((a, b) => a.handicap - b.handicap)[0]
    : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-28 pt-5">
      <header className="flex items-center justify-between">
        <Link to="/konto" className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">{displayName ?? "Golfspelare"}</span>
            <span className="block text-sm font-medium text-muted-foreground">HCP {hcpValue}</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Notiser"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
      </header>

      <section className="mt-5 grid grid-cols-[1fr_auto] overflow-hidden rounded-[24px] border border-border bg-card">
        <Link to="/utveckling" className="flex min-w-0 items-center gap-3 px-5 py-4 active:bg-muted/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Database className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Slagbank</span>
            <span className="mt-0.5 block text-[30px] font-black leading-none tabular-nums text-foreground">{totalShots.toLocaleString("sv-SE")}</span>
            <span className="mt-1 block text-xs text-muted-foreground">registrerade slag</span>
          </span>
        </Link>
        <Link to="/vanner" className="flex min-w-[92px] flex-col items-center justify-center border-l border-border px-4 py-4 text-center active:bg-muted/30">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="mt-1 text-xl font-black tabular-nums text-foreground">{totalFriends}</span>
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">vänner</span>
        </Link>
      </section>

      <div className="mt-4">
        <ActiveMultiplayerBanner />
      </div>

      <section className="mt-4">
        <Link
          to={quickStart.to}
          onClick={() => recordRecommendationOpen(quickStart.activityId)}
          className="group flex items-center gap-4 rounded-[26px] border border-blue-200 bg-blue-50/70 px-5 py-5 active:scale-[.99]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{quickStart.eyebrow}</p>
            <h1 className="mt-1.5 text-[22px] font-black leading-tight text-foreground">{quickStart.title}</h1>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{quickStart.detail}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-transform group-active:translate-x-0.5">
            <ChevronRight className="h-5 w-5" />
          </span>
        </Link>
      </section>

      <section className="mt-4">
        <Link
          to="/spela"
          onClick={() => recordRecommendationOpen("play-friend")}
          className="block overflow-hidden rounded-[26px] border border-border bg-card active:scale-[.99]"
        >
          <div className="grid grid-cols-[1fr_62px_1fr] border-b border-border">
            <div className="flex h-[72px] items-center gap-2 bg-blue-50 px-4 text-blue-600">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300"><User className="h-4 w-4" /></span>
              <span className="text-xs font-black uppercase tracking-[.12em]">Du</span>
            </div>
            <div className="flex h-[72px] items-center justify-center bg-[#071b14] text-sm font-black text-white">VS</div>
            <div className="flex h-[72px] items-center justify-end gap-2 bg-red-50 px-4 text-red-500">
              <span className="text-xs font-black uppercase tracking-[.12em]">Vän</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-red-300"><User className="h-4 w-4" /></span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Spela</p>
              <h2 className="mt-1 text-xl font-black text-foreground">Utmana en vän</h2>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {previewFriends.length ? previewFriends.map((friend) => (
                    <span key={friend.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-black text-foreground">
                      {initials(friend.name)}
                    </span>
                  )) : (
                    <>
                      <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" />
                      <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-300" />
                      <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" />
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{totalFriends > 0 ? `${totalFriends} vänner` : "Hitta någon att spela mot"}</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      </section>

      <section className="mt-3 space-y-3">
        <Link to="/tester" onClick={() => recordRecommendationOpen("hcp-test")} className="flex items-center gap-4 rounded-[22px] border border-border bg-card px-4 py-4 active:bg-muted/30">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Gauge className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[.17em] text-muted-foreground">HCP-test</span>
            <span className="mt-1 block text-base font-black text-foreground">Gör ett test – få ett HCP-resultat</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Senaste HCP: {hcpValue}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link to="/coach" onClick={() => recordRecommendationOpen("practice")} className="overflow-hidden rounded-[22px] border border-blue-200 bg-card active:bg-muted/30">
          <div className="grid grid-cols-[1.45fr_.9fr] min-h-[92px]">
            <span className="flex min-w-0 flex-col justify-center bg-blue-600 px-5 py-4 text-white [clip-path:polygon(0_0,88%_0,100%_50%,88%_100%,0_100%)]">
              <span className="text-[10px] font-black uppercase tracking-[.17em] text-blue-100">Träning</span>
              <span className="mt-1 text-lg font-black leading-tight">Starta ett träningspass</span>
              <span className="mt-1 text-xs text-blue-100">Coach · Putting · Chipping · Bunker</span>
            </span>
            <span className="flex items-center justify-end gap-2 px-4 text-blue-600">
              <Target className="h-6 w-6" />
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </Link>

        <Link to="/utveckling" className="flex items-center gap-4 rounded-[22px] border border-border bg-card px-4 py-4 active:bg-muted/30">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><LineChart className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[.17em] text-muted-foreground">Analys</span>
            <span className="mt-1 block text-base font-black text-foreground">Din utveckling</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {strongest ? `Starkast just nu: ${strongest.label}` : "Se styrkor, svagheter och framsteg"}
            </span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-violet-50 sm:flex"><LineChart className="h-4 w-4" /></span>
            <ChevronRight className="h-5 w-5" />
          </span>
        </Link>
      </section>

      <section className="mt-5 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <Link to="/vanner" className="flex items-center gap-1.5"><Users className="h-4 w-4" />Vänner</Link>
        <Link to="/spela" className="flex items-center gap-1.5"><Swords className="h-4 w-4" />Alla spellägen</Link>
      </section>
    </main>
  );
}
