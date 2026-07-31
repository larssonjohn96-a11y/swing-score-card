"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type BottomNavVisibilityContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const BottomNavVisibilityContext = createContext<BottomNavVisibilityContextValue | null>(null);

export function BottomNavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  return (
    <BottomNavVisibilityContext.Provider value={{ hidden, setHidden }}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useBottomNavVisibility() {
  const ctx = useContext(BottomNavVisibilityContext);
  if (!ctx) {
    throw new Error("useBottomNavVisibility must be used within a BottomNavVisibilityProvider");
  }
  return ctx;
}

/**
 * Call from a page to hide the bottom nav while it is mounted (or while a
 * condition is true). Automatically restores visibility on unmount / when
 * the condition flips back to false.
 */
export function useHideBottomNav(shouldHide: boolean) {
  const { setHidden } = useBottomNavVisibility();

  useEffect(() => {
    if (shouldHide) {
      setHidden(true);
      return () => setHidden(false);
    }
    return undefined;
  }, [shouldHide, setHidden]);
}
