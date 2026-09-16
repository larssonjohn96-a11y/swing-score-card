import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, LineChart, Swords, User, UserPlus, Users } from "lucide-react";
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

const CLOUD_FRIEND_COUNT_KEY = "sg4-home-cloud-friend-count-v1";
const HOME_SHOT_COUNTER_KEY = "sg4-home-shot-counter-v1";

function loadHomeData(): HomeData {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, estimated: computeEstimatedHandicap(cats) };
}

function loadCachedCloudFriendCount() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(CLOUD_FRIEND_COUNT_KEY);
  const value = raw === null ? 0 : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function saveCachedCloudFriendCount(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOUD_FRIEND_COUNT_KEY, String(value));
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

function loadPreviousShotCount(current: number) {
  if (typeof window === "undefined") return current;
  const persisted = window.localStorage.getItem(HOME_SHOT_COUNTER_KEY);
  const legacySessionValue = window.sessionStorage.getItem(HOME_SHOT_COUNTER_KEY);
  const raw = persisted ?? legacySessionValue;
  if (persisted === null && legacySessionValue !== null) {
    window.localStorage.setItem(HOME_SHOT_COUNTER_KEY, legacySessionValue);
  }
  if (raw === null) return current;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > current) return current;
  return Math.floor(value);
}

function savePreviousShotCount(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOME_SHOT_COUNTER_KEY, String(Math.max(0, Math.floor(value))));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function BrowseHeading({ title, subtitle, action, to }: { title: string; subtitle: string; action: string; to: "/coach" | "/tester" }) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div>
        <h2 className="text-[24px] font-black leading-none text-foreground">{title}</h2>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">{subtitle}</p>
      </div>
      <Link to={to} className="shrink-0 text-xs font-bold text-blue-600">{action}</Link>
    </div>
  );
}

const ROW_CLASS = "-mx-5 mt-3.5 flex gap-2 overflow-x-auto bg-transparent px-5 pb-0.5 scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const CARD_BASE = "relative flex h-[220px] w-[164px] shrink-0 flex-col justify-end overflow-hidden rounded-[24px] border border-black/[.04] px-4 pb-4 pt-4 text-white";

function SimpleCard({ label, title, tone }: { label: string; title: string; tone: string }) {
  return (
    <div className={`${CARD_BASE} ${tone}`}>
      <span className="absolute left-4 top-4 text-[9px] font-black uppercase tracking-[.16em] text-white/68">{label}</span>
      <div>
        <h3 className="font-display text-[27px] leading-[.95] text-white">{title}</h3>
      </div>
    </div>
  );
}

function RollingDigit({ digit, active, accent }: { digit: number; active: boolean; accent: boolean }) {
  return (
    <span className={`relative h-[29px] w-[18px] overflow-hidden rounded-[4px] border border-[#0d5f43]/20 bg-[#f2efdf]/88 shadow-[inset_0_1px_0_rgba(255,255,255,.72),inset_0_-1px_0_rgba(17,72,52,.08)] ${active ? "ring-1 ring-[#c89f3b]/30" : ""}`}>
      <span
        className="absolute left-0 top-0 flex w-full flex-col transition-transform duration-150 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: `translateY(-${digit * 29}px)` }}
      >
        {Array.from({ length: 10 }, (_, value) => (
          <span key={value} className={`flex h-[29px] w-full shrink-0 items-center justify-center font-mono text-[20px] font-black leading-none ${accent && active ? "text-[#b4232f]" : "text-[#0b6b4c]"}`}>
            {value}
          </span>
        ))}
      </span>
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#0d5f43]/10" />
    </span>
  );
}

function HeritageShotCounter({ value, active }: { value: number; active: boolean }) {
  const text = value.toLocaleString("sv-SE");
  const lastDigitIndex = text.split("").reduce((last, char, index) => (/\d/.test(char) ? index : last), -1);

  return (
    <span className="flex items-center justify-center gap-[2px]" aria-label={`${text} registrerade slag`}>
      {text.split("").map((char, index) => {
        if (!/\d/.test(char)) return <span key={`${char}-${index}`} className="w-[4px]" />;
        return <RollingDigit key={index} digit={Number(char)} active={active} accent={index === lastDigitIndex} />;
      })}
    </span>
  );
}

function DragScrollRow({ children }: { children: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });

  return (
    <div
      ref={rowRef}
      className={`${ROW_CLASS} cursor-grab select-none active:cursor-grabbing`}
      style={{ WebkitOverflowScrolling: "touch" }}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") return;
        const row = rowRef.current;
        if (!row) return;
        dragRef.current = { active: true, startX: event.clientX, startScrollLeft: row.scrollLeft, moved: false };
        row.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const row = rowRef.current;
        const drag = dragRef.current;
        if (!row || !drag.active || event.pointerType === "touch") return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 4) drag.moved = true;
        row.scrollLeft = drag.startScrollLeft - delta;
        if (drag.moved) event.preventDefault();
      }}
      onPointerUp={(event) => {
        const row = rowRef.current;
        if (!row || event.pointerType === "touch") return;
        dragRef.current.active = false;
        if (row.hasPointerCapture(event.pointerId)) row.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragRef.current.active = false; }}
      onClickCapture={(event) => {
        if (!dragRef.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
        dragRef.current.moved = false;
      }}
    >
      {children}
    </div>
  );
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData>(() => loadHomeData());
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends());
  const [cloudFriendCount, setCloudFriendCount] = useState(() => loadCachedCloudFriendCount());
  const [navVisible, setNavVisible] = useState(true);
  const initialShotCountRef = useRef(loadTotalRegisteredShots());
  const [totalShots, setTotalShots] = useState(initialShotCountRef.current);
  const [displayedShots, setDisplayedShots] = useState(() => loadPreviousShotCount(initialShotCountRef.current));
  const [shotCounterActive, setShotCounterActive] = useState(false);
  const displayedShotsRef = useRef(displayedShots);
  const shotAnimationRef = useRef<number | null>(null);
  const shotGlowTimeoutRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const directionStartYRef = useRef(0);
  const scrollDirectionRef = useRef<"up" | "down" | null>(null);
  const sessionsVersion = useSessionsVersion();
  const profile = loadCardProfile();

  useEffect(() => {
    recordRecommendationImpressions(["play-friend", "play-bot", "play-cup", "hcp-test", "practice"]);
  }, []);

  useEffect(() => {
    const initialY = Math.max(0, window.scrollY);
    lastScrollYRef.current = initialY;
    directionStartYRef.current = initialY;

    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollYRef.current;
      const nextDirection = delta > 0 ? "down" : delta < 0 ? "up" : scrollDirectionRef.current;

      if (currentY <= 24) {
        setNavVisible(true);
        directionStartYRef.current = currentY;
        scrollDirectionRef.current = nextDirection;
        lastScrollYRef.current = currentY;
        return;
      }

      if (nextDirection && nextDirection !== scrollDirectionRef.current) {
        scrollDirectionRef.current = nextDirection;
        directionStartYRef.current = currentY;
      }

      const travelled = Math.abs(currentY - directionStartYRef.current);
      if (nextDirection === "down" && travelled >= 34) {
        setNavVisible(false);
        directionStartYRef.current = currentY;
      } else if (nextDirection === "up" && travelled >= 22) {
        setNavVisible(true);
        directionStartYRef.current = currentY;
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setData(loadHomeData());
    setFriends(loadFriends());
    setTotalShots(loadTotalRegisteredShots());
    if (user) {
      void pushPlayerSnapshot();
      void listFriendships().then((result) => {
        const count = result.accepted.length;
        saveCachedCloudFriendCount(count);
        setCloudFriendCount(count);
      });
    }
  }, [user, sessionsVersion]);

  useEffect(() => {
    const refreshShots = () => setTotalShots(loadTotalRegisteredShots());
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshShots();
    };

    window.addEventListener("focus", refreshShots);
    window.addEventListener("pageshow", refreshShots);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refreshShots);
      window.removeEventListener("pageshow", refreshShots);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (shotAnimationRef.current !== null) cancelAnimationFrame(shotAnimationRef.current);
    if (shotGlowTimeoutRef.current !== null) window.clearTimeout(shotGlowTimeoutRef.current);

    const start = displayedShotsRef.current;
    if (totalShots <= start) {
      displayedShotsRef.current = totalShots;
      setDisplayedShots(totalShots);
      setShotCounterActive(false);
      savePreviousShotCount(totalShots);
      return;
    }

    const delta = totalShots - start;
    const duration = Math.min(1350, Math.max(520, 430 + delta * 28));
    const startedAt = performance.now();
    setShotCounterActive(true);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.min(totalShots, start + Math.floor(delta * eased));
      if (next !== displayedShotsRef.current) {
        displayedShotsRef.current = next;
        setDisplayedShots(next);
      }

      if (progress < 1) {
        shotAnimationRef.current = requestAnimationFrame(tick);
        return;
      }

      displayedShotsRef.current = totalShots;
      setDisplayedShots(totalShots);
      savePreviousShotCount(totalShots);
      shotAnimationRef.current = null;
      shotGlowTimeoutRef.current = window.setTimeout(() => setShotCounterActive(false), 520);
    };

    shotAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (shotAnimationRef.current !== null) cancelAnimationFrame(shotAnimationRef.current);
    };
  }, [totalShots]);

  const quickStart = useMemo<QuickStart>(() => {
    const noBaseline = data.real === null && data.cats.every((category) => category.count === 0);
    if (noBaseline) return { eyebrow: "Kom igång", title: "Gör ditt första HCP-test", detail: "Få ett första resultat och börja bygga din spelarprofil.", to: "/tester", activityId: "hcp-test" };

    const playScore = Math.max(
      getBehaviorRecommendationScore("play-friend").score,
      getBehaviorRecommendationScore("play-bot").score,
      getBehaviorRecommendationScore("play-cup").score,
    );
    const practiceScore = getBehaviorRecommendationScore("practice").score;
    const testScore = getBehaviorRecommendationScore("hcp-test").score;

    if (practiceScore >= playScore && practiceScore >= testScore) return { eyebrow: "Snabbstart", title: "Träna med coach", detail: "Tillbaka till Practice Mode.", to: "/coach", activityId: "practice" };
    if (testScore > playScore) return { eyebrow: "Snabbstart", title: "Gör ett nytt HCP-test", detail: "Få ett nytt resultat direkt.", to: "/tester", activityId: "hcp-test" };
    return { eyebrow: "Snabbstart", title: "Spela en match", detail: "Hoppa direkt tillbaka till spel.", to: "/spela", activityId: "play-friend" };
  }, [data, sessionsVersion]);

  const totalFriends = friends.length + cloudFriendCount;
  const previewFriends = friends.slice(0, 3);
  const hcpValue = hcpLabel(data.real ?? data.estimated ?? 0);
  const knownCategories = data.cats.filter((category) => category.count > 0);
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
          <div className="flex items-center gap-2">
            <Link to="/lagg-till-kompis" aria-label="Lägg till kompis" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground">
              <UserPlus className="h-[18px] w-[18px]" />
            </Link>
            <Link to="/notiser" aria-label="Notiser" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground">
              <Bell className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
        <div className={`overflow-hidden transition-[max-height,opacity,padding] duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${navVisible ? "max-h-16 pb-3 opacity-100" : "max-h-0 pb-0 opacity-0"}`}>
          <nav className={`-mx-1 flex gap-2 overflow-x-auto px-1 transition-transform duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${navVisible ? "translate-y-0" : "-translate-y-1"}`} aria-label="Snabbnavigering">
            <Link to="/spela" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black">Spela</Link>
            <Link to="/tester" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black">Train &amp; Test</Link>
            <Link to="/utveckling" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black">Utveckling</Link>
            <Link to="/vanner" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black">Vänner</Link>
          </nav>
        </div>
      </header>

      <div className="px-5 pt-5">
        <section className="grid grid-cols-[1.6fr_1fr] gap-2">
          <Link
            to="/vanner"
            className="relative flex h-[78px] items-center overflow-hidden rounded-[24px] border border-white/75 bg-card/66 px-4 shadow-[0_18px_48px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56"
          >
            <span className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/22" />
            <span className="pointer-events-none absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="relative z-10 flex w-full items-center justify-start">
              <div className="flex shrink-0 -space-x-2.5">
                {previewFriends.length ? previewFriends.map((friend, index) => (
                  <span key={friend.id} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/90 text-[8px] font-black text-foreground shadow-[0_2px_8px_rgba(15,23,42,.12)] ${index % 3 === 0 ? "bg-emerald-100/90" : index % 3 === 1 ? "bg-sky-100/90" : "bg-amber-100/90"}`}>
                    {initials(friend.name)}
                  </span>
                )) : (
                  <>
                    <span className="h-8 w-8 rounded-full border-2 border-white/90 bg-emerald-100/90 shadow-sm" />
                    <span className="h-8 w-8 rounded-full border-2 border-white/90 bg-sky-100/90 shadow-sm" />
                    <span className="h-8 w-8 rounded-full border-2 border-white/90 bg-amber-100/90 shadow-sm" />
                  </>
                )}
              </div>
              <div className="ml-2.5 flex min-w-0 items-baseline gap-1.5">
                <span className="text-[28px] font-black leading-none tabular-nums text-emerald-700">{totalFriends}</span>
                <span className="truncate text-[14px] font-extrabold text-foreground/82">Vänner</span>
              </div>
            </div>
          </Link>

          <Link
            to="/utveckling"
            className={`relative flex h-[78px] items-center justify-center overflow-hidden rounded-[24px] border px-2 text-center backdrop-blur-[28px] transition-[background-color,border-color,box-shadow] duration-500 ${shotCounterActive ? "border-emerald-300/70 bg-card/76 shadow-[0_18px_48px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95),0_0_30px_rgba(16,185,129,.20)] supports-[backdrop-filter]:bg-card/66" : "border-white/75 bg-card/66 shadow-[0_18px_48px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95)] supports-[backdrop-filter]:bg-card/56"}`}
          >
            <span className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/22" />
            <span className={`pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent transition-opacity duration-300 ${shotCounterActive ? "opacity-100" : "opacity-80"}`} />
            <div className="relative z-10 flex flex-col items-center justify-center">
              <HeritageShotCounter value={displayedShots} active={shotCounterActive} />
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[.08em] text-foreground/60">Registrerade slag</span>
            </div>
          </Link>
        </section>

        <div className="mt-4"><ActiveMultiplayerBanner /></div>

        <section className="mt-4">
          <Link to={quickStart.to} onClick={() => recordRecommendationOpen(quickStart.activityId)} className="group flex items-center gap-4 rounded-[26px] border border-blue-200 bg-blue-50/70 px-5 py-5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{quickStart.eyebrow}</p>
              <h1 className="mt-1.5 text-[22px] font-black leading-tight text-foreground">{quickStart.title}</h1>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{quickStart.detail}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><ChevronRight className="h-5 w-5" /></span>
          </Link>
        </section>

        <section className="mt-4">
          <Link to="/spela" onClick={() => recordRecommendationOpen("play-friend")} className="block overflow-hidden rounded-[26px] border border-border bg-card">
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
          <BrowseHeading title="Träna med coach" subtitle="Practice Mode" action="Alla pass" to="/coach" />
          <DragScrollRow>
            <Link to="/coach" search={{ category: "putting" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0"><SimpleCard label="Practice" title="Puttning" tone="bg-[#5146d8]" /></Link>
            <Link to="/coach" search={{ category: "around-the-green" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0"><SimpleCard label="Practice" title="Chippning" tone="bg-[#118267]" /></Link>
            <Link to="/coach" search={{ category: "bunker" }} onClick={() => recordRecommendationOpen("practice")} className="block shrink-0"><SimpleCard label="Practice" title="Bunker" tone="bg-[#c77a2c]" /></Link>
            <Link to="/coach" onClick={() => recordRecommendationOpen("practice")} className="block shrink-0"><SimpleCard label="Practice" title="Alla pass" tone="bg-[#334155]" /></Link>
          </DragScrollRow>
        </section>

        <section className="mt-7">
          <BrowseHeading title="Testa din nivå" subtitle="HCP Test" action="Alla tester" to="/tester" />
          <DragScrollRow>
            <Link to="/kategori/$slug" params={{ slug: "puttning" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0"><SimpleCard label="HCP Test" title="Putting" tone="bg-[#7656c9]" /></Link>
            <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0"><SimpleCard label="HCP Test" title="Around the Green" tone="bg-[#2d8a58]" /></Link>
            <Link to="/kategori/$slug" params={{ slug: "approach" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0"><SimpleCard label="HCP Test" title="Approach" tone="bg-[#2f76b7]" /></Link>
            <Link to="/kategori/$slug" params={{ slug: "driving" }} onClick={() => recordRecommendationOpen("hcp-test")} className="block shrink-0"><SimpleCard label="HCP Test" title="Off the Tee" tone="bg-[#3f4b5d]" /></Link>
          </DragScrollRow>
        </section>

        <section className="mt-7">
          <div className="px-0.5">
            <h2 className="text-[24px] font-black leading-none text-foreground">Mät precision och nivå</h2>
            <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Benchmarks &amp; challenges</p>
          </div>
          <DragScrollRow>
            <Link to="/pga-tour-18-puttar" className="block shrink-0"><SimpleCard label="Benchmark" title="18 puttar" tone="bg-[#a94c57]" /></Link>
            <Link to="/tutor-test" className="block shrink-0"><SimpleCard label="Benchmark" title="Tutor Test" tone="bg-[#4955a7]" /></Link>
            <Link to="/driver-konsekvens" className="block shrink-0"><SimpleCard label="Challenge" title="Konsekvens" tone="bg-[#a76632]" /></Link>
            <Link to="/approach-pei-valj" className="block shrink-0"><SimpleCard label="Benchmark" title="PEI Approach" tone="bg-[#217d8c]" /></Link>
          </DragScrollRow>
        </section>

        <section className="mt-5">
          <Link to="/utveckling" className="flex items-center gap-4 rounded-[22px] border border-border bg-card px-4 py-4 active:bg-muted/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><LineChart className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[.17em] text-muted-foreground">Analys</span>
              <span className="mt-1 block text-base font-black text-foreground">Din utveckling</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{strongest ? `Starkast just nu: ${strongest.label}` : "Se styrkor, svagheter och framsteg"}</span>
            </span>
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