"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, ChevronLeft, ChevronRight, Flag, Home, ListChecks, Menu, Plus, Target, Trophy, TrendingUp, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { CATEGORIES } from "@/lib/categories";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/tester", label: "Testa", icon: ListChecks, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/utveckling", label: "Analys", icon: TrendingUp, exact: false },
] as const;

type MoreTone = "gold" | "neutral" | "h2h";
type QuickView = "root" | "hcp";

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
  { to: "/match", label: "Tävla", description: "Tävla i Singles, Fourball eller Foursomes.", icon: Flag, tone: "h2h" },
  { to: "/vanner", label: "Vänner", description: "Hantera vänner och sociala funktioner.", icon: Users, tone: "neutral" },
  { to: "/shot-value", label: "Shot Value", description: "Se vad ett enskilt slag faktiskt är värt mot olika spelarnivåer.", icon: BarChart3, tone: "neutral" },
] as const;

function NavLink({ tab, active, badge }: { tab: { to: string; label: string; icon: typeof Home }; active: boolean; badge?: number }) {
  return (
    <Link
      to={tab.to}
      className={`mx-0.5 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1.5 py-1.5 transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.96] ${
        active
          ? "border border-white/70 bg-black/[0.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[0.05] dark:bg-white/[0.12]"
          : "text-muted-foreground"
      }`}
    >
      <span className="relative flex h-7 w-8 items-center justify-center">
        <tab.icon className={`h-5 w-5 transition-[stroke-width,color,transform] duration-300 ease-out ${active ? "scale-[1.04] stroke-[2.35]" : "scale-100 stroke-[1.9]"}`} />
        {Boolean(badge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{badge}</span>}
      </span>
      <span className={`text-[10px] uppercase tracking-wide transition-colors duration-300 ease-out ${active ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>{tab.label}</span>
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
  const [quickView, setQuickView] = useState<QuickView>("root");
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
      <nav
        className="fixed left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-visible rounded-[30px] border border-white/75 bg-card/66 shadow-[0_18px_48px_-20px_rgba(15,23,42,.52),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-card/56"
        style={{ bottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex h-[68px] w-full items-center gap-0.5 px-2.5 py-1.5">
          {LEFT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}
          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => { setQuickView("root"); setOpen(true); }}
              aria-label="Öppna snabbval"
              className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full border border-white/75 bg-primary/94 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_14px_30px_-12px_rgba(15,23,42,.52)] backdrop-blur-2xl ring-1 ring-black/[0.05] transition-all active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {RIGHT_TABS.map((tab) => <NavLink key={tab.to} tab={tab} active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)} />)}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`mx-0.5 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1.5 py-1.5 transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.96] ${moreActive ? "border border-white/70 bg-black/[0.09] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_10px_26px_-15px_rgba(15,23,42,.78)] backdrop-blur-2xl ring-1 ring-black/[0.05] dark:bg-white/[0.12]" : "text-muted-foreground"}`}
            aria-label="Mer"
          >
            <span className="relative flex h-7 w-8 items-center justify-center">
              <Menu className={`h-5 w-5 transition-[stroke-width,color,transform] duration-300 ease-out ${moreActive ? "scale-[1.04] stroke-[2.35]" : "scale-100 stroke-[1.9]"}`} />
              {Boolean(trophyBadge) && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">{trophyBadge}</span>}
            </span>
            <span className={`text-[10px] uppercase tracking-wide transition-colors duration-300 ease-out ${moreActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>Mer</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={(value) => { setOpen(value); if (!value) setQuickView("root"); }}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-5 pt-5">
          {quickView === "root" ? <>
            <SheetHeader className="space-y-1"><SheetTitle className="text-left text-2xl">Vad vill du göra?</SheetTitle><p className="text-left text-xs text-muted-foreground">Välj mellan att testa, träna eller tävla.</p></SheetHeader>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => setQuickView("hcp")} className="group flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.045] px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.07]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-primary"><Target className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg font-semibold leading-none">Handicap-test</h3><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">HCP</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground">Gör ett test och få ett handicapresultat i kategorin.</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
              </button>

              <Link to="/traning" search={{ category: undefined }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-border bg-muted/55 px-4 py-4 transition-colors hover:border-primary hover:bg-muted/70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground"><ListChecks className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg font-semibold leading-none">Träning</h3><span className="rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Träna</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground">Träna specifika färdigheter och följ din utveckling.</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>

              <Link to="/match" onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.06] via-card to-red-500/[0.06] px-4 py-4 transition-colors hover:border-red-500/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-red-500 text-white shadow-sm"><Flag className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg font-semibold leading-none">Tävla</h3><span className="rounded-full bg-red-500/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-500">H2H</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground">Tävla mot din kompis i Singles, Fourball eller Foursomes.</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-red-500/70" />
              </Link>
            </div>
          </> : <>
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2"><button type="button" onClick={() => setQuickView("root")} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"><ChevronLeft className="h-4 w-4" /></button><div><SheetTitle className="text-left text-2xl">Handicap-test</SheetTitle><p className="text-left text-xs text-muted-foreground">Välj kategori och gör ett test för att få din nivå.</p></div></div>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {CATEGORIES.map((c) => <Link key={c.slug} to="/kategori/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary hover:bg-tint"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg leading-none">{c.title}</h3><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">HCP</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-1">{c.description}</p><p className="mt-1 text-[10px] font-semibold text-flag">Gör testet · få din nivå</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
            </div>
          </>}
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
