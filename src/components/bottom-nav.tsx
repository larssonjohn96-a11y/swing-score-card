"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Plus, Trophy, TrendingUp } from "lucide-react";
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
  { to: "/trophy", label: "Trophy", icon: Trophy, exact: false },
] as const;

function NavLink({
  tab,
  active,
  badge,
}: {
  tab: { to: string; label: string; icon: typeof Home };
  active: boolean;
  badge?: number;
}) {
  return (
    <Link to={tab.to} className="flex flex-1 flex-col items-center gap-1 py-2 active:scale-95">
      <span
        className={`relative flex h-8 w-9 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-tint-strong text-primary" : "text-muted-foreground"
        }`}
      >
        <tab.icon className="h-5 w-5" />
        {Boolean(badge) && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flag px-1 text-[9px] font-bold text-background">
            {badge}
          </span>
        )}
      </span>
      <span
        className={`text-[10px] font-medium uppercase tracking-wide transition-colors ${
          active ? "font-semibold text-primary" : "text-muted-foreground"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [trophyBadge, setTrophyBadge] = useState(0);

  useEffect(() => {
    const count = countUncollected(computeMilestones()) + countUncollected(computeAchievements());
    setTrophyBadge(count);
  }, [pathname]);

  if (hidden) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card shadow-[0_-8px_24px_-24px_oklch(0.3_0.06_160/0.6)]">
        <div className="mx-auto flex h-full w-full max-w-md items-center px-2">
          {LEFT_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              tab={tab}
              active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)}
            />
          ))}

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Starta test"
              className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_oklch(0_0_0_/_0.45)] transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {RIGHT_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              tab={tab}
              active={tab.exact ? pathname === tab.to : pathname.startsWith(tab.to)}
              badge={tab.to === "/trophy" ? trophyBadge : undefined}
            />
          ))}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle className="text-left text-2xl">Starta test</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/kategori/$slug"
                params={{ slug: c.slug }}
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.subtitle}</p>
                    <h3 className="mt-0.5 text-xl leading-none">{c.title}</h3>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-1">{c.description}</p>
                  </div>
                  <p className="mt-0.5 max-w-[120px] shrink-0 text-right text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-flag">
                    Gör ett test · få ett HCP-resultat
                  </p>
                </div>
              </Link>
            ))}

            <Link
              to="/traning"
              search={{ category: undefined }}
              onClick={() => setOpen(false)}
              className="block rounded-2xl border border-border bg-muted/55 px-4 py-3.5 transition-colors hover:border-primary hover:bg-muted/70"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ej HCP-grundande</p>
              <h3 className="mt-0.5 text-xl leading-none">Träningstester</h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Träna med syfte och följ din utveckling över tid.
              </p>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
