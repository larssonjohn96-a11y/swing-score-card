"use client";

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bot, BriefcaseBusiness, ChevronRight, GitCompareArrows, GraduationCap, Home, Menu, Plus, Swords, Target, Trophy, UserRound, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/spela-runda", label: "HCP-tester", icon: Target, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/utveckling", label: "Jämför", icon: GitCompareArrows, exact: false },
] as const;

const PLAY_LINKS = [
  { to: "/match?flow=friend", label: "Spela mot vän", description: "Utmana en vän i en head-to-head match.", icon: UserRound, tone: "friend" },
  { to: "/match-bot", label: "Spela mot bot", description: "Välj rival och spela direkt.", icon: Bot, tone: "bot" },
  { to: "/match?flow=team", label: "Spela i lag", description: "Spela tillsammans med vänner.", icon: Users, tone: "team" },
] as const;

const MORE_LINKS = [
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
      <SheetContent side="bottom" className="rounded-t-[32px] border-white/80 bg-background/96 px-5 pb-[calc(84px+env(safe-area-inset-bottom))] pt-5 backdrop-blur-[30px]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-400/55" aria-hidden="true" />
        <SheetHeader className="pr-10"><SheetTitle className="text-left font-display text-[30px] leading-none">Spela</SheetTitle><p className="text-left text-sm text-muted-foreground">Vad vill du göra?</p></SheetHeader>
        <div className="mt-4 space-y-2">
          <Link to="/spela-runda" onClick={()=>setPlayOpen(false)} className="flex min-h-[78px] items-center gap-3 rounded-[22px] border border-blue-200 bg-white px-4 py-3 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Target className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">HCP-tester</strong><span className="mt-0.5 block text-xs text-muted-foreground">Se din HCP-nivå i varje kategori.</span></span><ChevronRight className="h-4 w-4 text-blue-500"/></Link>
          <button type="button" onClick={()=>{setPlayOpen(false);navigate({to:"/match",search:{flow:"friend"} as any})}} className="flex min-h-[78px] w-full items-center gap-3 rounded-[22px] border border-red-200 bg-white px-4 py-3 text-left shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Swords className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">Match</strong><span className="mt-0.5 block text-xs text-muted-foreground">Utmana vänner i alla delar av golfen.</span></span><ChevronRight className="h-4 w-4 text-red-500"/></button>
          <Link to="/min-bag" onClick={()=>setPlayOpen(false)} className="flex min-h-[78px] items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800"><BriefcaseBusiness className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">My Bag</strong><span className="mt-0.5 block text-xs text-muted-foreground">Bag HCP · klubbor · gapping · dispersion.</span></span><ChevronRight className="h-4 w-4 text-slate-400"/></Link>
          <Link to="/utveckling" onClick={()=>setPlayOpen(false)} className="flex min-h-[78px] items-center gap-3 rounded-[22px] border border-violet-200 bg-white px-4 py-3 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><GitCompareArrows className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-[17px]">Jämför</strong><span className="mt-0.5 block text-xs text-muted-foreground">Jämför HCP, vänner, nivåer & proffs.</span></span><ChevronRight className="h-4 w-4 text-violet-500"/></Link>
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
