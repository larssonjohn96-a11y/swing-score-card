"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { ChartNoAxesColumnIncreasing, Home, UsersRound } from "lucide-react";
import type { SVGProps } from "react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";
import { activeBottomTab, BOTTOM_TABS, hideBottomNavOnRoute } from "@/lib/bottom-nav-routes";

function HcpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" data-nav-icon="hcp" {...props}>
      <path d="M9.5 17.6a7.5 7.5 0 1 1 5 0" />
      <circle cx="9" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="m10 19 2 3 2-3" />
    </svg>
  );
}

function GolfRoundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" data-nav-icon="golf-round" {...props}>
      <path d="M11 19V3l8 4-8 4" />
      <ellipse cx="11" cy="20" rx="5" ry="2" />
    </svg>
  );
}

const TAB_ICONS = { home: Home, tests: HcpIcon, games: GolfRoundIcon, match: UsersRound, analysis: ChartNoAxesColumnIncreasing };

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
