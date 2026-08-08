"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Plan = "free" | "plus";

const OVERRIDE_KEY = "sg4-dev-plan-override";

function loadOverride(): Plan | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(OVERRIDE_KEY);
  return v === "free" || v === "plus" ? v : null;
}

/**
 * Riktig prenumerationsstatus. Ingen betalinfrastruktur (App Store/Google
 * Play) finns ännu, så det här är en medveten platshållare som alltid ger
 * "free". Byts ut mot en riktig koppling senare – resten av appen läser
 * bara plan via useSubscription() och behöver inte ändras när det sker.
 */
function loadActualPlan(): Plan {
  return "free";
}

type SubscriptionContextValue = {
  plan: Plan;
  isPlus: boolean;
  /** true om en Developer Preview-plan är aktiv (skiljer sig från riktig prenumeration) */
  isDeveloperOverrideActive: boolean;
  setDeveloperPlan: (plan: Plan | null) => void;
  /**
   * Namngivna entitlements istället för utspridda isPlus-checkar –
   * matchar kategorierna i produktspecen (Track/Analyze/Compare).
   */
  canViewFullHistory: boolean;
  canViewDeepAnalysis: boolean;
  canViewAdvancedComparison: boolean;
  canViewDetailedBreakdowns: boolean;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<Plan | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOverrideState(loadOverride());
    setHydrated(true);
  }, []);

  function setDeveloperPlan(plan: Plan | null) {
    if (plan === null) window.localStorage.removeItem(OVERRIDE_KEY);
    else window.localStorage.setItem(OVERRIDE_KEY, plan);
    setOverrideState(plan);
  }

  // Undvik en flash av "plus"-state innan localStorage hunnit läsas på klienten.
  const plan: Plan = hydrated ? (override ?? loadActualPlan()) : "free";
  const isPlus = plan === "plus";

  const value: SubscriptionContextValue = {
    plan,
    isPlus,
    isDeveloperOverrideActive: override !== null,
    setDeveloperPlan,
    canViewFullHistory: isPlus,
    canViewDeepAnalysis: isPlus,
    canViewAdvancedComparison: isPlus,
    canViewDetailedBreakdowns: isPlus,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
