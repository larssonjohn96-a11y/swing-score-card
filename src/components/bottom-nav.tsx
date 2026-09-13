"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bot, BriefcaseBusiness, ChevronRight, Flag, Gauge, Home, Menu, Plus, Swords, Target, Trophy, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/traning", label: "Träning", icon: Target, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/utveckling", label: "Analys", icon: Gauge, exact: false },
] as const;

const PLAY_LINKS = [
  { to: "/match?flow=friend", label: "Match mot vän", description: "1 mot 1 mot en kompis.", icon: Swords, tone: "friend" },
  { to: "/match-bot", label: "Match mot bot", description: "Välj en golfpersona och spela direkt.", icon: Bot, tone: "bot" },
  { to: "/match?flow=team", label: "Lagmatch", description: "Fourball, Foursomes och 2 mot 2.", icon: Users, tone: "team" },
  { to: "/tester", label: "HCP-utmaning", description: "Spela mot en definierad nivå i ett SG4-test.", icon: Target, tone: "challenge" },
] as const;

const MORE_LINKS = [
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
  if (tone === "flag") return { card: "border-red-500/20 bg-gradient-to-r from-blue-500/[.05] via-card to-red-500/[.05]", icon: "bg-slate-950 text-white" };
  return { card: "border-border bg-card", icon: "bg-muted text-foreground" };
}

function playToneClasses(tone: string) {
  if (tone === "friend") return { card: "border-emerald-300/35 bg-gradient-to-r from-blue-500/[.05] via-white/[.62] to-emerald-500/[.08]", icon: "border border-white/40 bg-slate-950/90 text-white" };
  if (tone === "bot") return { card: "border-emerald-300/35 bg-gradient-to-r from-emerald-500/[.10] via-white/[.58] to-emerald-400/[.05]", icon: "border border-white/40 bg-emerald-600/90 text-white" };
  if (tone === "team") return { card: "border-emerald-300/35 bg-gradient-to-r from-emerald-500/[.07] via-white/[.60] to-violet-500/[.08]", icon: "border border-white/40 bg-violet-600/90 text-white" };
  return { card: "border-emerald-300/30 bg-white/[.58]", icon: "border border-white/40 bg-emerald-500/15 text-emerald-700" };
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

  if (hidden || pathname.startsWith("/match")) return null;
  const moreActive = moreOpen || MORE_LINKS.some((item) => pathname.startsWith(item.to));

  return <>
    <nav className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-visible rounded-[30px] border border-white/75 bg-card/66 shadow-[0_18px_48px_-20px_rgba(15,23,42,.52),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56" style={{ bottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid h-[68px] w-full grid-cols-[1fr_1fr_74px_1fr_1fr] items-center gap-0.5 px-2.5 py-1.5">
        {LEFT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}

        <button type="button" onClick={() => setPlayOpen(true)} aria-label="Spel" className="relative -mt-5 flex h-[66px] w-[66px] items-center justify-center justify-self-center rounded-full border border-emerald-100/60 bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,.72),transparent_28%),linear-gradient(145deg,rgba(52,211,153,.96),rgba(5,150,105,.94))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.72),inset_0_-8px_18px_rgba(4,120,87,.22),0_16px_30px_-12px_rgba(5,150,105,.62),0_0_0_6px_rgba(255,255,255,.24)] backdrop-blur-[28px] transition duration-200 active:scale-[.94]">
          <span className="absolute inset-[5px] rounded-full border border-white/25 bg-white/[.07]" />
          <span className="absolute left-[16px] right-[16px] top-[10px] h-px rounded-full bg-white/80" />
          <Plus className="relative z-10 h-8 w-8 stroke-[2.4]" />
          <span className="absolute -bottom-[17px] text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Spel</span>
        </button>

        {RIGHT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={pathname.startsWith(tab.to)} />)}

        <button type="button" onClick={() => setMoreOpen(true)} className={`mx-0.5 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 transition-all active:scale-[.96] ${moreActive ? "border border-white/70 bg-black/[.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[.05] dark:bg-white/[.12]" : "text-muted-foreground"}`} aria-label="Mer">
          <span className="relative flex h-7 w-8 items-center justify-center"><Menu className={`h-5 w-5 ${moreActive ? "stroke-[2.35]" : "stroke-[1.9]"}`} />{Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}</span>
          <span className={`text-[9px] uppercase tracking-wide ${moreActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>Mer</span>
        </button>
      </div>
    </nav>

    <Sheet open={playOpen} onOpenChange={setPlayOpen}>
      <SheetContent side="bottom" className="rounded-t-[34px] border-white/70 bg-card/80 px-5 pb-7 pt-6 shadow-[0_-24px_70px_-30px_rgba(15,23,42,.45)] backdrop-blur-[30px]">
        <SheetHeader className="space-y-1.5"><SheetTitle className="text-left text-[30px] leading-none">Spel</SheetTitle><p className="text-left text-sm text-muted-foreground">Välj hur du vill tävla.</p></SheetHeader>
        <div className="mt-5 space-y-2.5">
          {PLAY_LINKS.map((item) => { const tone = playToneClasses(item.tone); const inner = <><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-xl ${tone.icon}`}><item.icon className="h-5.5 w-5.5" /></span><span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></>; return item.to.includes("?") ? <a key={item.to} href={item.to} onClick={() => setPlayOpen(false)} className={`flex items-center gap-4 rounded-[26px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.62),0_16px_34px_-26px_rgba(15,23,42,.32)] backdrop-blur-2xl active:scale-[.985] ${tone.card}`}>{inner}</a> : <Link key={item.to} to={item.to} onClick={() => setPlayOpen(false)} className={`flex items-center gap-4 rounded-[26px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.62),0_16px_34px_-26px_rgba(15,23,42,.32)] backdrop-blur-2xl active:scale-[.985] ${tone.card}`}>{inner}</Link>; })}
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
