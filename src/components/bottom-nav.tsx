"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, TrendingUp, User } from "lucide-react";
import { useBottomNavVisibility } from "@/lib/bottom-nav-visibility";

const TABS = [
  { to: "/", label: "Hem", icon: Home, exact: true },
  { to: "/tester", label: "Tester", icon: ListChecks, exact: false },
  { to: "/utveckling", label: "Utveckling", icon: TrendingUp, exact: false },
  { to: "/konto", label: "Profil", icon: User, exact: false },
] as const;

export function BottomNav() {
  const { hidden } = useBottomNavVisibility();
  const { pathname } = useLocation();

  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-full w-full max-w-md items-center px-2">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-1 flex-col items-center gap-1 py-2 active:scale-95"
            >
              <span
                className={`flex h-8 w-9 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="h-5 w-5" />
              </span>
              <span
                className={`text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
