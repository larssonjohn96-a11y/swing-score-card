"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Flag, GitCompareArrows, Home, Swords, Target } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { activeBottomTab, BOTTOM_TABS, hideBottomNavOnRoute } from "@/lib/bottom-nav-routes";

const TAB_ICONS = { home: Home, tests: Target, games: Flag, match: Swords, analysis: GitCompareArrows };

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();
  if (hidden || hideBottomNavOnRoute(pathname)) return null;
  const activeTab = activeBottomTab(pathname);

  return (
    <nav aria-label="Huvudmeny" className="fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-24px)] max-w-md -translate-x-1/2 rounded-[30px] border border-border/75 bg-card/85 shadow-bottom-nav backdrop-blur-[28px]">
      <div className="grid h-[68px] w-full grid-cols-5 items-center gap-0.5 px-2.5 py-1.5">
        {BOTTOM_TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = TAB_ICONS[tab.id];
          return (
            <Link key={tab.id} to={tab.to} aria-current={active ? "page" : undefined}
              className={`flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 transition-colors active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active ${active ? "border border-border bg-nav-active-surface text-nav-active shadow-sm" : "text-muted-foreground"}`}>
              <span className="flex h-7 w-8 items-center justify-center"><Icon aria-hidden="true" className={`h-5 w-5 ${active ? "stroke-[2.35]" : "stroke-[1.9]"}`} /></span>
              <span className={`whitespace-nowrap text-[9px] uppercase ${active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
