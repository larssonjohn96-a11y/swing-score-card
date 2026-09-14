"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bot, BriefcaseBusiness, ChevronRight, Flag, Gauge, GraduationCap, Home, Menu, Plus, Target, Trophy, UserRound, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/traning", label: "Träning", icon: Target, exact: false },
] as const;

const PLAY_LINKS = [
  { to: "/match?flow=friend", label: "Match mot vän", description: "1 mot 1 · välj spel och utmana en kompis.", icon: UserRound, tone: "friend" },
  { to: "/match-bot", label: "Match mot bot", description: "1 mot 1 · välj rival och spela direkt.", icon: Bot, tone: "bot" },
  { to: "/match?flow=team", label: "Lagmatch", description: "2 mot 2 · Fourball eller Foursomes.", icon: Users, tone: "team" },
  { to: "/cup", label: "Putting Cup", description: "5 hål · kvartsfinal, semifinal och final.", icon: Trophy, tone: "cup" },
] as const;

const MORE_LINKS = [
  { to: "/learn", label: "Lär dig", description: "Lektioner, golfkunskap och interaktiva quiz.", icon: GraduationCap, tone: "learn" },
  { to: "/utveckling", label: "Analys", description: "Utveckling, nivåer och spelarprofil.", icon: Gauge, tone: "neutral" },
  { to: "/turneringar", label: "Turneringar", description: "Events, ranking och leaderboard.", icon: Trophy, tone: "gold" },
  { to: "/utmaningar", label: "Utmaningar", description: "Streaks, scoring och personliga rekord.", icon: Flag, tone: "flag" },
  { to: "/tester", label: "Tester", description: "Tester, HCP-nivå och utveckling.", icon: Target, tone: "neutral" },
  { to: "/vanner", label: "Vänner", description: "Hitta spelare och bygg ditt nätverk.", icon: Users, tone: "neutral" },
  { to: "/trophy", label: "Trophy Room", description: "PB, milestones och achievements.", icon: Trophy, tone: "gold" },
  { to: "/min-bag", label: "My Bag", description: "Klubbor, carry-längder och gapping.", icon: BriefcaseBusiness, tone: "neutral" },
] as const;

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
    card: "border-blue-300/55 bg-gradient-to-r from-blue-500/[.10] via-card to-red-500/[.06]",
    icon: "border border-blue-300/70 bg-blue-50 text-blue-600",
    arrow: "text-red-500",
  };
  if (tone === "bot") return {
    card: "border-red-300/50 bg-gradient-to-r from-blue-500/[.06] via-card to-red-500/[.10]",
    icon: "border border-red-300/70 bg-red-50 text-red-600",
    arrow: "text-red-500",
  };
  if (tone === "team") return {
    card: "border-blue-300/45 bg-gradient-to-r from-blue-500/[.08] via-card to-red-500/[.08]",
    icon: "border border-slate-200 bg-white text-slate-800",
    arrow: "text-red-500",
  };
  return {
    card: "border-amber-300/45 bg-gradient-to-r from-blue-500/[.05] via-card to-amber-500/[.08]",
    icon: "border border-amber-300/60 bg-amber-50 text-amber-600",
    arrow: "text-amber-600",
  };
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const [playOpen, setPlayOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [trophyBadge, setTrophyBadge] = useState(0);

  useEffect(() => {
    setTrophyBadge(countUncollected(computeMilestones()) + countUncollected(computeAchievements()));
  }, [pathname]);

  if (hidden || pathname.startsWith("/match") || pathname.startsWith("/learn")) return null;
  const moreActive = moreOpen || MORE_LINKS.some((item) => pathname.startsWith(item.to));

  return <>
    <nav className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-visible rounded-[30px] border border-white/75 bg-card/66 shadow-[0_18px_48px_-20px_rgba(15,23,42,.52),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56" style={{ bottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid h-[68px] w-full grid-cols-[1fr_1fr_74px_1fr] items-center gap-0.5 px-2.5 py-1.5">
        {LEFT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}

        <button type="button" onClick={() => setPlayOpen(true)} aria-label="Spel" className="relative -mt-5 flex h-[64px] w-[64px] items-center justify-center justify-self-center rounded-full bg-emerald-600 text-white shadow-[0_10px_24px_-8px_rgba(5,150,105,.55)] transition duration-150 active:scale-[.94]">
          <Plus className="h-8 w-8 stroke-[2.6]" />
          <span className="absolute -bottom-[17px] text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Spel</span>
        </button>

        <button type="button" onClick={() => setMoreOpen(true)} className={`mx-0.5 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-all active:scale-[.96] ${moreActive ? "border border-white/70 bg-black/[.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[.05] dark:bg-white/[.12]" : "text-muted-foreground"}`} aria-label="Mer">
          <span className="relative flex h-7 w-8 items-center justify-center"><Menu className={`h-5 w-5 ${moreActive ? "stroke-[2.35]" : "stroke-[1.9]"}`} />{Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}</span>
          <span className={`text-[9px] uppercase tracking-wide ${moreActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>Mer</span>
        </button>
      </div>
    </nav>

    <Sheet open={playOpen} onOpenChange={setPlayOpen}>
      <SheetContent side="bottom" className="rounded-t-[34px] border-white/80 bg-background/94 px-5 pb-7 pt-6 shadow-[0_-24px_70px_-30px_rgba(15,23,42,.35)] backdrop-blur-[30px]">
        <SheetHeader className="space-y-1.5">
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
        <div className="mt-5 space-y-2.5">
          {PLAY_LINKS.map((item) => {
            const tone = playToneClasses(item.tone);
            const inner = <>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,.7)] ${tone.icon}`}><item.icon className="h-5.5 w-5.5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span>
              <ChevronRight className={`h-4 w-4 shrink-0 ${tone.arrow}`} />
            </>;
            return item.to.includes("?") ? <a key={item.to} href={item.to} onClick={() => setPlayOpen(false)} className={`flex items-center gap-4 rounded-[24px] border px-4 py-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,.28)] active:scale-[.985] ${tone.card}`}>{inner}</a> : <Link key={item.to} to={item.to} onClick={() => setPlayOpen(false)} className={`flex items-center gap-4 rounded-[24px] border px-4 py-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,.28)] active:scale-[.985] ${tone.card}`}>{inner}</Link>;
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
