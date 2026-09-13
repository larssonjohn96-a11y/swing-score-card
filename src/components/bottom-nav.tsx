"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BriefcaseBusiness, ChevronRight, Flag, Gauge, Home, ListChecks, Menu, Swords, Target, Trophy, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/spela", label: "Spela", icon: Swords, exact: false },
  { to: "/traning", label: "Träna", icon: Target, exact: false },
  { to: "/tester", label: "Tester", icon: ListChecks, exact: false },
] as const;

const MORE_LINKS = [
  { to: "/turneringar", label: "Turneringar", description: "Events, ranking och leaderboard.", icon: Trophy, tone: "gold" },
  { to: "/utmaningar", label: "Utmaningar", description: "Streaks, scoring och personliga rekord.", icon: Flag, tone: "flag" },
  { to: "/utveckling", label: "Progression", description: "Följ utveckling, styrkor och svagheter.", icon: Gauge, tone: "neutral" },
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
  if (tone === "flag") return { card: "border-red-500/20 bg-gradient-to-r from-blue-500/[.05] via-card to-red-500/[.05]", icon: "bg-slate-950 text-white" };
  return { card: "border-border bg-card", icon: "bg-muted text-foreground" };
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [trophyBadge, setTrophyBadge] = useState(0);

  useEffect(() => {
    setTrophyBadge(countUncollected(computeMilestones()) + countUncollected(computeAchievements()));
  }, [pathname]);

  if (hidden || pathname.startsWith("/match")) return null;
  const moreActive = moreOpen || MORE_LINKS.some((item) => pathname.startsWith(item.to));

  return <>
    <nav className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-visible rounded-[30px] border border-white/75 bg-card/66 shadow-[0_18px_48px_-20px_rgba(15,23,42,.52),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56" style={{ bottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex h-[68px] w-full items-center gap-0.5 px-2.5 py-1.5">
        {TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}
        <button type="button" onClick={() => setMoreOpen(true)} className={`mx-0.5 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-all active:scale-[.96] ${moreActive ? "border border-white/70 bg-black/[.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[.05] dark:bg-white/[.12]" : "text-muted-foreground"}`} aria-label="Mer">
          <span className="relative flex h-7 w-8 items-center justify-center"><Menu className={`h-5 w-5 ${moreActive ? "stroke-[2.35]" : "stroke-[1.9]"}`} />{Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}</span>
          <span className={`text-[9px] uppercase tracking-wide ${moreActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>Mer</span>
        </button>
      </div>
    </nav>

    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="rounded-t-[32px] px-5 pb-7 pt-6">
        <SheetHeader className="space-y-1.5"><SheetTitle className="text-left text-[30px] leading-none">Mer</SheetTitle><p className="text-left text-sm text-muted-foreground">Tävla mer, följ din utveckling och hantera din golfprofil.</p></SheetHeader>
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
