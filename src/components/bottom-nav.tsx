"use client";

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bot, BriefcaseBusiness, ChevronRight, Flag, Gauge, GraduationCap, Home, Menu, Plus, Target, Trophy, UserRound, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/tester", label: "HCP test", icon: Target, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/utveckling", label: "Analys", icon: Gauge, exact: false },
] as const;

const PLAY_LINKS = [
  { to: "/match?flow=friend", label: "Spela mot vän", description: "Utmana en vän i en head-to-head match.", icon: UserRound, tone: "friend" },
  { to: "/match-bot", label: "Spela mot bot", description: "Välj rival och spela direkt.", icon: Bot, tone: "bot" },
  { to: "/match?flow=team", label: "Spela i lag", description: "Spela tillsammans med vänner.", icon: Users, tone: "team" },
] as const;

const MORE_LINKS = [
  { to: "/learn", label: "Lär dig", description: "Lektioner, golfkunskap och interaktiva quiz.", icon: GraduationCap, tone: "learn" },
  { to: "/turneringar", label: "Turneringar", description: "Events, ranking och leaderboard.", icon: Trophy, tone: "gold" },
  { to: "/utmaningar", label: "Utmaningar", description: "Streaks, scoring och personliga rekord.", icon: Flag, tone: "flag" },
  { to: "/traning", label: "Träning – gammal", description: "Det gamla övningsflödet med alla drills.", icon: Target, tone: "neutral" },
  { to: "/vanner", label: "Vänner", description: "Hitta spelare och bygg ditt nätverk.", icon: Users, tone: "neutral" },
  { to: "/trophy", label: "Trophy Room", description: "PB, milestones och achievements.", icon: Trophy, tone: "gold" },
  { to: "/min-bag", label: "My Bag", description: "Klubbor, carry-längder och gapping.", icon: BriefcaseBusiness, tone: "neutral" },
] as const;

const TRAINING_FLOW_PATHS = new Set([
  "/traning",
  "/traning-progress",
  "/speed",
  "/longdrive",
  "/fairway-streak",
  "/driver-konsekvens",
  "/approach-pei-valj",
  "/approach-pei",
  "/approach-pei-wedge",
  "/approach-pei-iron",
  "/shot-shaping",
  "/8-bollar",
  "/upp-och-in",
  "/bunker-traning",
  "/putting-streak",
  "/lagputt-ladder",
  "/klock-putt",
  "/pga-tour-18-puttar",
  "/50-bollar",
  "/lagputt",
  "/tutor-test",
  "/green-reading",
  "/putting-data",
  "/50-bollar-resultat",
  "/8-bollar-historik",
  "/lagputt-historik",
  "/driver-konsekvens-historik",
  "/green-reading-historik",
  "/pga-tour-18-puttar-historik",
  "/tutor-test-historik",
  "/approach-pei-historik",
  "/approach-pei-wedge-historik",
  "/approach-pei-iron-historik",
  "/shot-shaping-9-window-historik",
  "/shot-shaping-konstant-historik",
  "/shot-shaping-vaxlande-historik",
  "/wedge-stege-historik",
]);

function isTrainingFlowPath(pathname: string) {
  return TRAINING_FLOW_PATHS.has(pathname) || pathname.startsWith("/shot-shaping-");
}

function NavLink({ tab, active }: { tab: { to: string; label: string; icon: typeof Home }; active: boolean }) {
  return <Link to={tab.to} className={`mx-0.5 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-all active:scale-[.96] ${active ? "border border-white/70 bg-black/[.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[.05] dark:bg-white/[.12]" : "text-muted-foreground"}`}>
    <span className="flex h-7 w-8 items-center justify-center"><tab.icon className={`h-5 w-5 ${active ? "stroke-[2.35]" : "stroke-[1.9]"}`} /></span>
    <span className={`text-[9px] uppercase tracking-wide ${active ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>{tab.label}</span>
  </Link>;
}

function toneClasses(tone: string) {
  if (tone === "gold") return { card: "border-amber-500/25 bg-amber-500/[.06]", icon: "bg-amber-500/15 text-amber-600" };
  if (tone === "learn") return { card: "border-emerald-500/25 bg-emerald-500/[.06]", icon: "bg-emerald-500/15 text-emerald-600" };
  if (tone === "flag") return { card: "border-red-500/20 bg-gradient-to-r from-blue-500/[.05] via-card to-red-500/[.05]", icon: "bg-slate-950 text-white" };
  return { card: "border-border bg-card", icon: "bg-muted text-foreground" };
}

function playToneClasses(tone: string) {
  if (tone === "friend") return {
    card: "border-blue-300/60 bg-gradient-to-r from-blue-500/[.09] via-card to-red-500/[.035]",
    icon: "border border-blue-300/70 bg-blue-50 text-blue-600",
    arrow: "text-blue-500",
  };
  if (tone === "bot") return {
    card: "border-red-300/55 bg-gradient-to-r from-red-500/[.035] via-card to-red-500/[.09]",
    icon: "border border-red-300/70 bg-red-50 text-red-600",
    arrow: "text-red-500",
  };
  return {
    card: "border-amber-300/55 bg-gradient-to-r from-amber-500/[.06] via-card to-amber-500/[.035]",
    icon: "border border-amber-300/70 bg-amber-50 text-amber-600",
    arrow: "text-amber-600",
  };
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [playOpen, setPlayOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [trophyBadge, setTrophyBadge] = useState(0);

  useEffect(() => {
    setTrophyBadge(countUncollected(computeMilestones()) + countUncollected(computeAchievements()));
  }, [pathname]);

  useEffect(() => {
    if (!playOpen) return;
    const preload = new Image();
    preload.src = "/Red_vs_blue_1.png";
  }, [playOpen]);

  if (hidden || pathname.startsWith("/match") || pathname.startsWith("/learn") || isTrainingFlowPath(pathname)) return null;
  const moreActive = moreOpen || MORE_LINKS.some((item) => pathname.startsWith(item.to));

  return <>
    <nav className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-visible rounded-[30px] border border-white/75 bg-card/66 shadow-[0_18px_48px_-20px_rgba(15,23,42,.52),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56" style={{ bottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid h-[68px] w-full grid-cols-[1fr_1fr_62px_1fr_1fr] items-center gap-0.5 px-2.5 py-1.5">
        {LEFT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}

        <button type="button" onClick={() => setPlayOpen(true)} aria-label="Spel" className="relative -mt-3 flex h-[54px] w-[54px] items-center justify-center justify-self-center rounded-full bg-emerald-600 text-white shadow-[0_9px_20px_-8px_rgba(5,150,105,.5)] transition duration-150 active:scale-[.94]">
          <Plus className="h-7 w-7 stroke-[2.6]" />
        </button>

        {RIGHT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={pathname.startsWith(tab.to)} />)}

        <button type="button" onClick={() => setMoreOpen(true)} className={`mx-0.5 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-all active:scale-[.96] ${moreActive ? "border border-white/70 bg-black/[.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[.05] dark:bg-white/[.12]" : "text-muted-foreground"}`} aria-label="Mer">
          <span className="relative flex h-7 w-8 items-center justify-center"><Menu className={`h-5 w-5 ${moreActive ? "stroke-[2.35]" : "stroke-[1.9]"}`} />{Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}</span>
          <span className={`text-[9px] uppercase tracking-wide ${moreActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>Mer</span>
        </button>
      </div>
    </nav>

    <Sheet open={playOpen} onOpenChange={setPlayOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] overflow-y-auto rounded-t-[34px] border-white/80 bg-background/95 px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_70px_-30px_rgba(15,23,42,.38)] backdrop-blur-[30px] duration-500 ease-out sm:px-5"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-400/55" aria-hidden="true" />
        <SheetHeader className="space-y-1.5 pr-10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="h-[2px] w-5 bg-border" />
            <span className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Head to Head</span>
            <span className="h-[2px] w-5 bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>
          <SheetTitle className="text-left font-display text-[34px] leading-none">Spela</SheetTitle>
          <p className="text-left text-sm text-muted-foreground">Välj hur du vill tävla.</p>
        </SheetHeader>

        <div className="relative mt-4 aspect-[16/7] w-full overflow-hidden rounded-[26px] border border-white/75 bg-gradient-to-r from-blue-100 via-white to-red-100 shadow-[0_16px_34px_-24px_rgba(15,23,42,.45)]">
          <img
            src="/Red_vs_blue_1.png"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
        </div>

        <div className="mt-4 space-y-2.5">
          {PLAY_LINKS.map((item) => {
            const tone = playToneClasses(item.tone);
            const inner = <>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] shadow-[inset_0_1px_0_rgba(255,255,255,.75)] ${tone.icon}`}><item.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-display text-[19px] leading-none">{item.label}</span><span className="mt-1.5 block text-[12px] leading-snug text-muted-foreground">{item.description}</span></span>
              <ChevronRight className={`h-4 w-4 shrink-0 ${tone.arrow}`} />
            </>;
            if (item.to === "/match?flow=friend" || item.to === "/match?flow=team") {
              const flow = item.to.endsWith("team") ? "team" : "friend";
              return <button key={item.to} type="button" onClick={() => { setPlayOpen(false); navigate({ to: "/match", search: { flow } as any }); }} className={`flex w-full items-center gap-3.5 rounded-[24px] border px-4 py-3.5 text-left shadow-[0_12px_32px_-28px_rgba(15,23,42,.28)] transition-transform active:scale-[.985] ${tone.card}`}>{inner}</button>;
            }
            return <Link key={item.to} to={item.to} onClick={() => setPlayOpen(false)} className={`flex items-center gap-3.5 rounded-[24px] border px-4 py-3.5 shadow-[0_12px_32px_-28px_rgba(15,23,42,.28)] transition-transform active:scale-[.985] ${tone.card}`}>{inner}</Link>;
          })}
        </div>
      </SheetContent>
    </Sheet>

    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="rounded-t-[32px] px-5 pb-7 pt-6">
        <SheetHeader className="space-y-1.5"><SheetTitle className="text-left text-[30px] leading-none">Mer</SheetTitle><p className="text-left text-sm text-muted-foreground">Fler delar av SG4.</p></SheetHeader>
        <div className="mt-5 space-y-2.5">
          {MORE_LINKS.map((item) => { const tone = toneClasses(item.tone); return <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className={`flex items-center gap-4 rounded-3xl border px-4 py-3.5 ${tone.card}`}>
            <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}><item.icon className="h-5 w-5" />{item.to === "/trophy" && trophyBadge ? <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{trophyBadge}</span> : null}</span>
            <span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>})}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}
