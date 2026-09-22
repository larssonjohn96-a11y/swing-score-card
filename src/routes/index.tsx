import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, User, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  computeEstimatedHandicap,
  hcpLabel,
  loadRealHandicap,
  type CategoryHandicap,
} from "@/lib/sg-handicap";
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
      { name: "description", content: "Spela, testa och följ din utveckling i SG4." },
    ],
  }),
  component: Home,
});

type HomeData = { real: number | null; cats: CategoryHandicap[]; estimated: number | undefined };
type QuickStart = {
  eyebrow: string;
  title: string;
  detail: string;
  to: "/standardiserade-tester" | "/spela";
  activityId: string;
};
type CompareTarget = "30" | "20" | "10" | "0" | "+3" | "tour";

const CLOUD_FRIEND_COUNT_KEY = "sg4-home-cloud-friend-count-v1";
const HOME_SHOT_COUNTER_KEY = "sg4-home-shot-counter-v1";
const COMPARE_OPTIONS: { id: CompareTarget; label: string }[] = [
  { id: "30", label: "HCP 30" },
  { id: "20", label: "HCP 20" },
  { id: "10", label: "HCP 10" },
  { id: "0", label: "HCP 0" },
  { id: "+3", label: "HCP +3" },
  { id: "tour", label: "Tour" },
];

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
  const shortPutting = loadShortPuttSessions().reduce(
    (sum, session) => sum + session.putts.length,
    0,
  );
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

function loadPreviousShotCount(current: number) {
  if (typeof window === "undefined") return current;
  const persisted = window.localStorage.getItem(HOME_SHOT_COUNTER_KEY);
  const legacySessionValue = window.sessionStorage.getItem(HOME_SHOT_COUNTER_KEY);
  const raw = persisted ?? legacySessionValue;
  if (persisted === null && legacySessionValue !== null)
    window.localStorage.setItem(HOME_SHOT_COUNTER_KEY, legacySessionValue);
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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BrowseHeading({
  title,
  subtitle,
  action,
  to,
}: {
  title: string;
  subtitle: string;
  action: string;
  to: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
      <div>
        <h2 className="text-[24px] font-black leading-none text-foreground">{title}</h2>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <Link to={to} className="shrink-0 text-xs font-bold text-blue-600">
        {action}
      </Link>
    </div>
  );
}

const ROW_CLASS =
  "-mx-5 mt-3.5 flex gap-2 overflow-x-auto bg-transparent px-5 pb-0.5 scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const CARD_BASE =
  "relative flex h-[238px] w-[178px] shrink-0 flex-col justify-end overflow-hidden rounded-[24px] border border-black/[.04] px-4 pb-4 pt-4 text-white";

function SimpleCard({
  label,
  title,
  tone,
  imageSrc,
  imagePosition,
  subtitle,
}: {
  label: string;
  title: string;
  tone: string;
  imageSrc?: string;
  imagePosition?: string;
  subtitle?: string;
}) {
  return (
    <div className={`${CARD_BASE} ${tone}`}>
      {imageSrc && (
        <>
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: imagePosition }}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/5" />
        </>
      )}
      <span className="absolute left-4 top-4 text-[9px] font-black uppercase tracking-[.16em] text-white/80">{label}</span>
      <div className="relative z-10">
        <h3 className="font-display text-[27px] leading-[.95] text-white">{title}</h3>
        {subtitle ? <p className="mt-2 text-[12px] font-semibold leading-snug text-white/80">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function RollingDigit({
  digit,
  active,
  accent,
}: {
  digit: number;
  active: boolean;
  accent: boolean;
}) {
  return (
    <span
      className={`relative h-[27px] w-[17px] overflow-hidden rounded-[4px] border border-[#0d5f43]/20 bg-[#f2efdf]/88 shadow-[inset_0_1px_0_rgba(255,255,255,.72),inset_0_-1px_0_rgba(17,72,52,.08)] ${active ? "ring-1 ring-[#c89f3b]/30" : ""}`}
    >
      <span
        className="absolute left-0 top-0 flex w-full flex-col transition-transform duration-150 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: `translateY(-${digit * 27}px)` }}
      >
        {Array.from({ length: 10 }, (_, value) => (
          <span
            key={value}
            className={`flex h-[27px] w-full shrink-0 items-center justify-center font-mono text-[19px] font-black leading-none ${accent && active ? "text-[#b4232f]" : "text-[#0b6b4c]"}`}
          >
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
  const lastDigitIndex = text
    .split("")
    .reduce((last, char, index) => (/\d/.test(char) ? index : last), -1);
  return (
    <span
      className="flex items-center justify-center gap-[2px]"
      aria-label={`${text} registrerade slag`}
    >
      {text
        .split("")
        .map((char, index) =>
          !/\d/.test(char) ? (
            <span key={`${char}-${index}`} className="w-[4px]" />
          ) : (
            <RollingDigit
              key={index}
              digit={Number(char)}
              active={active}
              accent={index === lastDigitIndex}
            />
          ),
        )}
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
        dragRef.current = {
          active: true,
          startX: event.clientX,
          startScrollLeft: row.scrollLeft,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const row = rowRef.current;
        const drag = dragRef.current;
        if (!row || !drag.active || event.pointerType === "touch") return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 4 && !drag.moved) {
          drag.moved = true;
          row.setPointerCapture(event.pointerId);
        }
        row.scrollLeft = drag.startScrollLeft - delta;
        if (drag.moved) event.preventDefault();
      }}
      onPointerUp={(event) => {
        const row = rowRef.current;
        if (!row || event.pointerType === "touch") return;
        dragRef.current.active = false;
        if (row.hasPointerCapture(event.pointerId)) row.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
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

function handicapToScore(handicap: number) {
  return Math.max(8, Math.min(100, 100 - handicap * 2.25));
}

function RadarPreview({
  categories,
  benchmarkHcp,
}: {
  categories: CategoryHandicap[];
  benchmarkHcp: number;
}) {
  const order = ["driving", "approach", "around-the-green", "puttning"];
  const fallback = categories.length
    ? categories.reduce((sum, item) => sum + (item.handicap ?? 0), 0) / categories.length
    : 25;
  const categoryValues = order.map((id) => {
    const item = categories.find((category) => category.slug === id);
    return handicapToScore(item?.count ? (item.handicap ?? fallback) : fallback);
  });
  const total = categoryValues.reduce((sum, value) => sum + value, 0) / categoryValues.length;
  const values = [
    categoryValues[0],
    categoryValues[1],
    categoryValues[2],
    categoryValues[3],
    total,
  ];
  const benchmark = handicapToScore(benchmarkHcp);
  const centerX = 170;
  const centerY = 152;
  const radius = 92;
  const axes = Array.from({ length: 5 }, (_, index) => -Math.PI / 2 + index * ((Math.PI * 2) / 5));
  const point = (value: number, angle: number) => {
    const r = (radius * value) / 100;
    return `${centerX + Math.cos(angle) * r},${centerY + Math.sin(angle) * r}`;
  };
  const playerPoints = axes.map((angle, index) => point(values[index], angle)).join(" ");
  const benchmarkPoints = axes.map((angle) => point(benchmark, angle)).join(" ");
  const ring = (scale: number) => axes.map((angle) => point(scale, angle)).join(" ");
  const labels = [
    { x: 170, y: 28, text: "Off the Tee" },
    { x: 310, y: 130, text: "Approach" },
    { x: 274, y: 270, text: "Around Green" },
    { x: 66, y: 270, text: "Putting" },
    { x: 28, y: 130, text: "Totalt" },
  ];

  return (
    <svg
      viewBox="0 0 340 300"
      className="h-auto w-full"
      role="img"
      aria-label="Jämförelseanalys av ditt spel"
    >
      <polygon points={ring(100)} fill="none" stroke="rgba(15,23,42,.14)" strokeWidth="1" />
      <polygon points={ring(75)} fill="none" stroke="rgba(15,23,42,.10)" strokeWidth="1" />
      <polygon points={ring(50)} fill="none" stroke="rgba(15,23,42,.08)" strokeWidth="1" />
      <polygon points={ring(25)} fill="none" stroke="rgba(15,23,42,.06)" strokeWidth="1" />
      {axes.map((angle, index) => {
        const [x, y] = point(100, angle).split(",").map(Number);
        return (
          <line
            key={index}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="rgba(15,23,42,.09)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={benchmarkPoints}
        fill="rgba(239,68,68,.08)"
        stroke="rgb(239,68,68)"
        strokeWidth="2"
      />
      <polygon
        points={playerPoints}
        fill="rgba(2,132,199,.18)"
        stroke="rgb(2,132,199)"
        strokeWidth="2"
      />
      {axes.map((angle, index) => {
        const [x, y] = point(values[index], angle).split(",").map(Number);
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="3.2"
            fill="rgb(2,132,199)"
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}
      {labels.map((label) => (
        <text
          key={label.text}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          className="fill-slate-600 text-[10px] font-semibold"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}

function Home() {
  const { user, displayName } = useAuth();
  const [data, setData] = useState<HomeData>(() => loadHomeData());
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends());
  const [cloudFriendCount, setCloudFriendCount] = useState(() => loadCachedCloudFriendCount());
  const [navVisible, setNavVisible] = useState(true);
  const [compareTarget, setCompareTarget] = useState<CompareTarget>("0");
  const initialShotCountRef = useRef(loadTotalRegisteredShots());
  const [totalShots, setTotalShots] = useState(initialShotCountRef.current);
  const [displayedShots, setDisplayedShots] = useState(() =>
    loadPreviousShotCount(initialShotCountRef.current),
  );
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
    recordRecommendationImpressions([
      "play-friend",
      "play-bot",
      "play-cup",
      "hcp-test",
    ]);
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
    if (noBaseline)
      return {
        eyebrow: "Kom igång",
        title: "Gör ditt första test",
        detail: "Få ett första resultat och börja bygga din spelarprofil.",
        to: "/standardiserade-tester",
        activityId: "hcp-test",
      };
    const playScore = Math.max(
      getBehaviorRecommendationScore("play-friend").score,
      getBehaviorRecommendationScore("play-bot").score,
      getBehaviorRecommendationScore("play-cup").score,
    );
    const testScore = getBehaviorRecommendationScore("hcp-test").score;
    if (testScore > playScore)
      return {
        eyebrow: "Snabbstart",
        title: "Gör ett nytt test",
        detail: "Få ett nytt resultat direkt.",
        to: "/standardiserade-tester",
        activityId: "hcp-test",
      };
    return {
      eyebrow: "Snabbstart",
      title: "Spela en match",
      detail: "Hoppa direkt tillbaka till spel.",
      to: "/spela",
      activityId: "play-friend",
    };
  }, [data, sessionsVersion]);

  const totalFriends = friends.length + cloudFriendCount;
  const previewFriends = friends.slice(0, 3);
  const hcpValue = hcpLabel(data.real ?? data.estimated ?? 0);
  const benchmarkHcp = compareTarget === "tour" ? -5 : Number(compareTarget);
  const compareLabel = compareTarget === "tour" ? "Tour" : `HCP ${compareTarget}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/88 px-5 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-3">
          <Link to="/konto" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {profile.photo ? (
                <img src={profile.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[19px] font-black leading-none text-foreground">
                {displayName ?? "Golfspelare"}
              </span>
              <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                HCP {hcpValue}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/lagg-till-kompis"
              aria-label="Lägg till kompis"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground"
            >
              <UserPlus className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to="/notiser"
              aria-label="Notiser"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
        <div
          className={`overflow-hidden transition-[max-height,opacity,padding] duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${navVisible ? "max-h-16 pb-3 opacity-100" : "max-h-0 pb-0 opacity-0"}`}
        >
          <nav
            className={`-mx-1 flex gap-2 overflow-x-auto px-1 transition-transform duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${navVisible ? "translate-y-0" : "-translate-y-1"}`}
            aria-label="Snabbnavigering"
          >
            <Link
              to="/spela"
              className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black"
            >
              Match
            </Link>
            <Link
              to="/spela-runda"
              className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black"
            >
              Spel & utmaningar
            </Link>
                        <Link to="/standardiserade-tester" className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black">Standardiserade tester</Link>
            <Link
              to="/utveckling"
              className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black"
            >
              Utveckling
            </Link>
            <Link
              to="/vanner"
              className="shrink-0 rounded-full border border-border bg-card/85 px-4 py-2.5 text-xs font-black"
            >
              Vänner
            </Link>
          </nav>
        </div>
      </header>

      <div className="px-5 pt-4">
        <section className="grid grid-cols-[1.6fr_1fr] gap-2">
          <Link
            to="/vanner"
            className="relative flex h-[64px] items-center overflow-hidden rounded-[22px] border border-white/75 bg-card/66 px-3.5 shadow-[0_14px_38px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56"
          >
            <span className="pointer-events-none absolute inset-[1px] rounded-[21px] border border-white/22" />
            <div className="relative z-10 flex w-full items-center justify-start">
              <div className="flex shrink-0 -space-x-2">
                {previewFriends.length ? (
                  previewFriends.map((friend, index) => (
                    <span
                      key={friend.id}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/90 text-[8px] font-black text-foreground ${index % 3 === 0 ? "bg-emerald-100/90" : index % 3 === 1 ? "bg-sky-100/90" : "bg-amber-100/90"}`}
                    >
                      {initials(friend.name)}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="h-7 w-7 rounded-full border-2 border-white/90 bg-emerald-100/90" />
                    <span className="h-7 w-7 rounded-full border-2 border-white/90 bg-sky-100/90" />
                    <span className="h-7 w-7 rounded-full border-2 border-white/90 bg-amber-100/90" />
                  </>
                )}
              </div>
              <div className="ml-2.5 flex min-w-0 items-baseline gap-1.5">
                <span className="text-[25px] font-black leading-none tabular-nums text-emerald-700">
                  {totalFriends}
                </span>
                <span className="truncate text-[13px] font-extrabold text-foreground/82">
                  Vänner
                </span>
              </div>
            </div>
          </Link>

          <Link
            to="/utveckling"
            className={`relative flex h-[64px] items-center justify-center overflow-hidden rounded-[22px] border px-2 text-center backdrop-blur-[28px] transition-[background-color,border-color,box-shadow] duration-500 ${shotCounterActive ? "border-emerald-300/70 bg-card/76 shadow-[0_14px_38px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95),0_0_26px_rgba(16,185,129,.20)] supports-[backdrop-filter]:bg-card/66" : "border-white/75 bg-card/66 shadow-[0_14px_38px_-24px_rgba(15,23,42,.42),inset_0_1px_0_rgba(255,255,255,.95)] supports-[backdrop-filter]:bg-card/56"}`}
          >
            <span className="pointer-events-none absolute inset-[1px] rounded-[21px] border border-white/22" />
            <div className="relative z-10 flex flex-col items-center justify-center">
              <HeritageShotCounter value={displayedShots} active={shotCounterActive} />
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[.07em] text-foreground/58">
                Registrerade slag
              </span>
            </div>
          </Link>
        </section>

        <section className="mt-4">
          <Link
            to={quickStart.to}
            onClick={() => recordRecommendationOpen(quickStart.activityId)}
            className="group flex items-center gap-4 rounded-[26px] border border-blue-200 bg-blue-50/70 px-5 py-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                {quickStart.eyebrow}
              </p>
              <h1 className="mt-1.5 text-[22px] font-black leading-tight text-foreground">
                {quickStart.title}
              </h1>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                {quickStart.detail}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <ChevronRight className="h-5 w-5" />
            </span>
          </Link>
        </section>

        <section className="mt-4">
          <Link
            to="/spela"
            onClick={() => recordRecommendationOpen("play-friend")}
            className="block overflow-hidden rounded-[26px] border border-border bg-card"
          >
            <div className="grid grid-cols-[1fr_62px_1fr] border-b border-border">
              <div className="flex h-[72px] items-center gap-2 bg-blue-50 px-4 text-blue-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300">
                  <User className="h-4 w-4" />
                </span>
                <span className="text-xs font-black uppercase tracking-[.12em]">Du</span>
              </div>
              <div className="flex h-[72px] items-center justify-center bg-[#071b14] text-sm font-black text-white">
                VS
              </div>
              <div className="flex h-[72px] items-center justify-end gap-2 bg-red-50 px-4 text-red-500">
                <span className="text-xs font-black uppercase tracking-[.12em]">Vän</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-red-300">
                  <User className="h-4 w-4" />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                  Match
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">Utmana en vän</h2>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {previewFriends.length ? (
                      previewFriends.map((friend) => (
                        <span
                          key={friend.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-black text-foreground"
                        >
                          {initials(friend.name)}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" />
                        <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-300" />
                        <span className="h-8 w-8 rounded-full border-2 border-background bg-slate-200" />
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {totalFriends > 0 ? `${totalFriends} vänner` : "Hitta någon att spela mot"}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        </section>

        <ActiveMultiplayerBanner inline />

        <section className="mt-7" aria-label="Spel & utmaningar">
          <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
            <div>
              <h2 className="text-[24px] font-black leading-none text-foreground">
                Spel & utmaningar
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Välj en utmaning. Slå ditt rekord.
              </p>
            </div>
            <Link to="/spela-runda" className="shrink-0 text-xs font-bold text-blue-600">
              Visa alla
            </Link>
          </div>
          <DragScrollRow>
            <Link to="/speedrundan" className="block shrink-0">
              <SimpleCard
                label="Speed"
                title="Maxfart"
                subtitle="Hur hårt kan du slå?"
                tone="bg-[#118267]"
                imageSrc="/Off_the_tee.png"
                imagePosition="18% 50%"
              />
            </Link>
            <Link to="/driverrundan" className="block shrink-0">
              <SimpleCard
                label="Driver"
                title="Långt & rakt"
                subtitle="Hur långt och rakt kan du slå?"
                tone="bg-[#118267]"
                imageSrc="/Off_the_tee.png"
                imagePosition="18% 50%"
              />
            </Link>
            <Link to="/chipprundan" className="block shrink-0">
              <SimpleCard
                label="Chippning"
                title="Närmast flaggan"
                subtitle="Hur nära flaggan kan du komma?"
                tone="bg-[#118267]"
                imageSrc="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png"
                imagePosition="18% 50%"
              />
            </Link>
            <Link to="/puttrundan" className="block shrink-0">
              <SimpleCard
                label="Puttning"
                title="Sänk den!"
                subtitle="Hur många kan du sänka?"
                tone="bg-[#118267]"
                imageSrc="/Putting_1.png"
                imagePosition="18% 50%"
              />
            </Link>
            <Link to="/inspelsrundan" className="block shrink-0">
              <SimpleCard
                label="Inspel"
                title="Mitt i prick"
                subtitle="Hur nära kan du slå?"
                tone="bg-[#118267]"
                imageSrc="/Approach_shot.png"
                imagePosition="18% 50%"
              />
            </Link>
            <Link to="/bunkerrundan" className="block shrink-0">
              <SimpleCard
                label="Bunker"
                title="Sandjakten"
                subtitle="Hur nära kan du komma från sanden?"
                tone="bg-[#118267]"
                imageSrc="/bunker-round.svg"
                imagePosition="18% 50%"
              />
            </Link>
          </DragScrollRow>
        </section>

        <section className="mt-7">
          <BrowseHeading
            title="Standardiserade tester"
            subtitle="Mät specifika delar av spelet"
            action="Alla tester"
            to="/standardiserade-tester"
          />
          <DragScrollRow>
            <Link to="/8-bollar" className="block shrink-0">
              <SimpleCard
                label="Precision"
                title="8 Bollar"
                tone="bg-[#6757c7]"
                imageSrc="/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png"
              />
            </Link>
            <Link to="/tutor-test" className="block shrink-0">
              <SimpleCard
                label="Startlinje"
                title="Tutor Test"
                tone="bg-[#4955a7]"
                imageSrc="/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png"
              />
            </Link>
            <Link to="/pga-tour-18-puttar" className="block shrink-0">
              <SimpleCard
                label="Scoring"
                title="18 Puttar"
                tone="bg-[#a94c57]"
                imageSrc="/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png"
              />
            </Link>
            <Link to="/approach-pei-valj" className="block shrink-0">
              <SimpleCard label="Precision" title="PEI Approach" tone="bg-[#217d8c]" />
            </Link>
            <Link to="/driver-konsekvens" className="block shrink-0">
              <SimpleCard label="Konsekvens" title="Driver" tone="bg-[#a76632]" />
            </Link>
            <Link to="/upp-och-in" className="block shrink-0">
              <SimpleCard label="Närspel" title="Upp & In" tone="bg-[#247760]" />
            </Link>
            <Link to="/standardiserade-tester" className="block shrink-0">
              <SimpleCard label="Bibliotek" title="Alla tester" tone="bg-[#334155]" />
            </Link>
          </DragScrollRow>
        </section>

        <section className="mt-8 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-[28px] leading-none text-[#071b14]">ANALYS</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[.24em] text-muted-foreground">
                Jämförelseanalys
              </p>
            </div>
            <Link
              to="/utveckling"
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-700"
            >
              Öppna <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 flex items-start justify-center gap-6">
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sky-500 bg-sky-50 text-sky-600">
                <User className="h-6 w-6" />
              </span>
              <p className="mt-1.5 text-[11px] font-semibold text-foreground">Du</p>
              <p className="text-[10px] text-muted-foreground">HCP {hcpValue}</p>
            </div>
            <div className="pt-5 font-display text-[16px] text-[#071b14]">VS</div>
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-400 bg-red-50 text-red-500">
                <User className="h-6 w-6" />
              </span>
              <p className="mt-1.5 text-[11px] font-semibold text-foreground">{compareLabel}</p>
              <p className="text-[10px] text-muted-foreground">Referens</p>
            </div>
          </div>

          <div className="-mx-1 mt-4 flex flex-wrap justify-center gap-1.5 px-1">
            {COMPARE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCompareTarget(option.id)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${compareTarget === option.id ? "border-red-500 bg-red-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-2 pb-2 pt-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,.28)]">
            <RadarPreview categories={data.cats} benchmarkHcp={benchmarkHcp} />
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {["Total", "Off the Tee", "Approach", "Around Green", "Putting"].map((label, index) => (
              <span
                key={label}
                className={`rounded-full border px-3 py-1.5 text-[9px] font-bold ${index === 0 ? "border-[#071b14] bg-[#071b14] text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
              Din nivå
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              {compareLabel}
            </span>
          </div>

          <div className="mt-5 text-center">
            <p className="text-[12px] text-muted-foreground">Vill du jämföra med andra spelare?</p>
            <Link
              to="/utveckling"
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[12px] font-bold text-[#071b14] shadow-sm"
            >
              Jämför <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
