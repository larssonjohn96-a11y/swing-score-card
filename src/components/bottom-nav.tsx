"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Bot, ChevronLeft, ChevronRight, Home, ListChecks, Menu, Swords, Target, Trophy, TrendingUp, User, Users } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { CATEGORIES } from "@/lib/categories";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeAchievements, computeMilestones, countUncollected } from "@/lib/trophy-room";

const LEFT_TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/tester", label: "Testa", icon: ListChecks, exact: false },
] as const;

const RIGHT_TABS = [
  { to: "/vanner", label: "Vänner", icon: Users, exact: false },
] as const;

type MoreTone = "gold" | "neutral" | "h2h";
type QuickView = "match" | "hcp";

const MORE_LINKS: ReadonlyArray<{
  to: string;
  label: string;
  description: string;
  icon: typeof Home;
  tone: MoreTone;
}> = [
  { to: "/utveckling", label: "Analys", description: "Se utveckling, styrkor, svagheter och dina kategoriresultat.", icon: TrendingUp, tone: "neutral" },
  { to: "/trophy", label: "Trophy Room", description: "Personliga rekord, milestones och achievements.", icon: Trophy, tone: "gold" },
  { to: "/min-bag", label: "My Bag", description: "Öppna din mappade bag – eller starta mappning om du inte har gjort den ännu.", icon: ListChecks, tone: "neutral" },
  { to: "/hcp-goal", label: "HCP Goal", description: "Sätt ett handicapmål och se dina tre viktigaste vägar dit.", icon: Target, tone: "h2h" },
  { to: "/jamfor", label: "Head-to-head", description: "Ställ din SG4-profil mot en vän och se vem som vinner.", icon: Users, tone: "h2h" },
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

function MatchOption({ icon: Icon, title, description, badge, disabled, onClick }: { icon: typeof Home; title: string; description: string; badge?: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[88px] w-full items-center gap-4 rounded-3xl border px-5 py-4 text-left transition-all ${disabled ? "border-border bg-muted/35 opacity-65" : "border-border bg-card active:scale-[0.99] hover:border-primary/35"}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary"><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2"><span className="text-lg font-semibold leading-none">{title}</span>{badge ? <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{badge}</span> : null}</span>
        <span className="mt-2 block text-sm leading-snug text-muted-foreground">{description}</span>
      </span>
      {!disabled ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </button>
  );
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [quickView, setQuickView] = useState<QuickView>("match");
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
              onClick={() => { setQuickView("match"); setOpen(true); }}
              aria-label="Öppna Match"
              className="flex h-[62px] w-[62px] -translate-y-3 flex-col items-center justify-center rounded-full border border-white/75 bg-primary/96 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_14px_30px_-12px_rgba(15,23,42,.52)] backdrop-blur-2xl ring-1 ring-black/[0.05] transition-all active:scale-95"
            >
              <Swords className="h-6 w-6" />
              <span className="mt-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em]">Match</span>
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

      <Sheet open={open} onOpenChange={(value) => { setOpen(value); if (!value) setQuickView("match"); }}>
        <SheetContent side="bottom" className="rounded-t-[32px] px-5 pb-7 pt-6">
          {quickView === "match" ? <>
            <SheetHeader className="space-y-1.5"><SheetTitle className="text-left text-[30px] leading-none">Match</SheetTitle><p className="text-left text-sm text-muted-foreground">Välj hur du vill tävla.</p></SheetHeader>
            <div className="mt-5 space-y-3">
              <Link to="/match" onClick={() => setOpen(false)} className="flex min-h-[92px] items-center gap-4 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.07] via-card to-red-500/[0.07] px-5 py-4 transition-all active:scale-[0.99]">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 shadow-sm"><User className="absolute left-1.5 h-[20px] w-[20px] stroke-[2.35] text-blue-600" /><span className="relative z-10 rounded bg-slate-950 px-1 py-0.5 text-[7px] font-extrabold leading-none text-white">VS</span><User className="absolute right-1.5 h-[20px] w-[20px] stroke-[2.35] text-red-600" /></span>
                <span className="min-w-0 flex-1"><span className="text-xl font-semibold leading-none">Mot vän</span><span className="mt-2 block text-sm leading-snug text-muted-foreground">Head-to-head, Fourball och Foursomes med en kompis.</span></span><ChevronRight className="h-4 w-4 shrink-0 text-red-500/70" />
              </Link>

              <MatchOption icon={Bot} title="Mot bot" description="Spela mot HCP-botar, dina egna ghosts och senare vänners bot-profiler." badge="Nästa" disabled />
              <MatchOption icon={Trophy} title="Turnering" description="Tävla i återkommande challenges och turneringar mot andra spelare." badge="Nästa" disabled />
              <MatchOption icon={Target} title="HCP-utmaning" description="Spela en challenge mot en definierad handicapnivå." onClick={() => setQuickView("hcp")} />
            </div>
            <Link to="/traning" search={{ category: undefined }} onClick={() => setOpen(false)} className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm font-medium"><span>Fri träning & PB</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
          </> : <>
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2"><button type="button" onClick={() => setQuickView("match")} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"><ChevronLeft className="h-4 w-4" /></button><div><SheetTitle className="text-left text-2xl">HCP-utmaning</SheetTitle><p className="text-left text-xs text-muted-foreground">Välj kategori. Nuvarande HCP-testmotor behålls som grunden.</p></div></div>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {CATEGORIES.map((c) => <Link key={c.slug} to="/kategori/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary hover:bg-tint"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg leading-none">{c.title}</h3><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">HCP</span></div><p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-1">{c.description}</p><p className="mt-1 text-[10px] font-semibold text-flag">Spela · få din nivå</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
            </div>
          </>}
        </SheetContent>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader className="space-y-1"><SheetTitle className="text-left text-2xl">Mer</SheetTitle><p className="text-left text-xs text-muted-foreground">Analys och alla verktyg vi redan byggt finns kvar här.</p></SheetHeader>
          <div className="mt-4 space-y-2">
            {MORE_LINKS.map((item) => { const tone = moreItemClasses(item.tone); return <Link key={item.to} to={item.to as any} onClick={() => setMoreOpen(false)} className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${tone.card}`}><span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><item.icon className="h-5 w-5" />{item.to === "/trophy" && trophyBadge ? <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{trophyBadge}</span> : null}</span><div className="min-w-0 flex-1"><h3 className="text-base font-semibold leading-none">{item.label}</h3><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.description}</p></div><ChevronRight className={`h-4 w-4 shrink-0 ${tone.chevron}`} /></Link>; })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
