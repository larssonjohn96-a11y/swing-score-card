"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, ChevronRight, Flag, Home, ListChecks, Menu, Plus, Target, Trophy, TrendingUp, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { CATEGORIES } from "@/lib/categories";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/tester", label: "Tester", icon: ListChecks, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/utveckling", label: "Utveckling", icon: TrendingUp, exact: false },
] as const;

type MoreTone = "gold" | "neutral" | "h2h";

const MORE_LINKS: ReadonlyArray<{
  to: string;
  label: string;
  description: string;
  icon: typeof Home;
  tone: MoreTone;
}> = [
  { to: "/trophy", label: "Trophy Room", description: "Personliga rekord, milestones och achievements.", icon: Trophy, tone: "gold" },
  { to: "/min-bag", label: "My Bag", description: "Öppna din mappade bag – eller starta mappning om du inte har gjort den ännu.", icon: ListChecks, tone: "neutral" },
  { to: "/hcp-goal", label: "HCP Goal", description: "Sätt ett handicapmål och se dina tre viktigaste vägar dit.", icon: Target, tone: "h2h" },
  { to: "/jamfor", label: "Head-to-head", description: "Ställ din SG4-profil mot en vän och se vem som vinner.", icon: Users, tone: "h2h" },
  { to: "/match", label: "Match Play", description: "Singles, Fourball och Foursomes i Ryder Cup-format.", icon: Flag, tone: "h2h" },
  { to: "/vanner", label: "Vänner", description: "Hantera vänner och sociala funktioner.", icon: Users, tone: "neutral" },
  { to: "/shot-value", label: "Shot Value", description: "Se vad ett enskilt slag faktiskt är värt mot olika spelarnivåer.", icon: BarChart3, tone: "neutral" },
] as const;

function NavLink({ tab, active, badge }: { tab: { to: string; label: string; icon: typeof Home }; active: boolean; badge?: number }) {
  return (
    <Link to={tab.to} className="flex flex-1 flex-col items-center gap-1 py-2 active:scale-95">
      <span className={`relative flex h-8 w-9 items-center justify-center rounded-xl transition-colors ${active ? "bg-tint-strong text-primary" : "text-muted-foreground"}`}>
        <tab.icon className="h-5 w-5" />
        {Boolean(badge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{badge}</span>}
      </span>
      <span className={`text-[10px] font-medium uppercase tracking-wide transition-colors ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>{tab.label}</span>
    </Link>
  );
}

function moreItemClasses(tone: MoreTone) {
  if (tone === "h2h") return { card: "border-blue-500/20 bg-gradient-to-r from-blue-500/[0.06] via-card to-red-500/[0.06] hover:border-red-500/30", icon: "bg-gradient-to-br from-blue-500 to-red-500 text-white shadow-sm", chevron: "text-red-500/70" };
  if (tone === "gold") return { card: "border-amber-500/25 bg-amber-500/[0.06] hover:border-amber-500/40", icon: "border border-amber-500/30 bg-amber-500/15 text-amber-600", chevron: "text-amber-600/70" };
  return { card: "border-border bg-card hover:border-foreground/20 hover:bg-muted/35", icon: "border border-border bg-muted text-foreground", chevron: "text-muted-foreground" };
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [trophyBadge, setTrophyBadge] = useState(0);

  useEffect(() => {
    const count = countUncollected(computeMilestones()) + countUncollected(computeAchievements());
    setTrophyBadge(count);
  }, [pathname]);

  if (hidden || pathname.startsWith("/jamfor") || pathname.startsWith("/match")) return null;

  const moreActive = moreOpen || MORE_LINKS.some((item) => pathname.startsWith(item.to));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card shadow-[0_-8px_24px_-24px_oklch(0.3_0.06_160/0.6)]" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex h-16 w-full max-w-md items-center px-2">
          {LEFT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}
          <div className="flex flex-1 justify-center"><button type="button" onClick={() => setOpen(true)} aria-label="Starta test" className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_oklch(0_0_0_/_0.45)] transition-transform active:scale-95"><Plus className="h-6 w-6" /></button></div>
          {RIGHT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2 active:scale-95" aria-label="Mer">
            <span className={`relative flex h-8 w-9 items-center justify-center rounded-xl transition-colors ${moreActive ? "bg-tint-strong text-primary" : "text-muted-foreground"}`}><Menu className="h-5 w-5" />{Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}</span>
            <span className={`text-[10px] font-medium uppercase tracking-wide ${moreActive ? "font-semibold text-primary" : "text-muted-foreground"}`}>Mer</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-5 pt-5">
          <SheetHeader className="space-y-1"><SheetTitle className="text-left text-2xl">Vad vill du göra?</SheetTitle><p className="text-left text-xs text-muted-foreground">Mät din nivå eller träna en specifik färdighet.</p></SheetHeader>
          <div className="mt-4 space-y-2">
            {CATEGORIES.map((c) => <Link key={c.slug} to="/kategori/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary hover:bg-tint"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg leading-none">{c.title}</h3><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">HCP</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-1">{c.description}</p><p className="mt-1 text-[10px] font-semibold text-flag">Gör testet · få din nivå</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
            <div className="pt-1"><Link to="/traning" search={{ category: undefined }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-border bg-muted/55 px-4 py-3.5 transition-colors hover:border-primary hover:bg-muted/70"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg leading-none">Träningstester</h3><span className="rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Träning</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground">Träna med syfte och följ din utveckling över tid.</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link></div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader className="space-y-1"><SheetTitle className="text-left text-2xl">Mer</SheetTitle><p className="text-left text-xs text-muted-foreground">Snabbvägar till fler delar av SG4.</p></SheetHeader>
          <div className="mt-4 space-y-2">
            {MORE_LINKS.map((item) => { const tone = moreItemClasses(item.tone); return <Link key={item.to} to={item.to as any} onClick={() => setMoreOpen(false)} className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${tone.card}`}><span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><item.icon className="h-5 w-5" />{item.to === "/trophy" && trophyBadge ? <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{trophyBadge}</span> : null}</span><div className="min-w-0 flex-1"><h3 className="text-base font-semibold leading-none">{item.label}</h3><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.description}</p></div><ChevronRight className={`h-4 w-4 shrink-0 ${tone.chevron}`} /></Link>; })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
