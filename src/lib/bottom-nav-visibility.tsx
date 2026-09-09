"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

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

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Call from a page to hide the bottom nav while it is mounted (or while a
 * condition is true). Automatically restores visibility on unmount / when
 * the condition flips back to false.
 *
 * A layout effect is used in the browser so the nav is hidden before paint,
 * avoiding the one-frame flash that otherwise appears when opening a
 * full-screen route.
 */
export function useHideBottomNav(shouldHide: boolean) {
  const { setHidden } = useBottomNavVisibility();

  useIsomorphicLayoutEffect(() => {
    if (shouldHide) {
      setHidden(true);
      return () => setHidden(false);
    }
    return undefined;
  }, [shouldHide, setHidden]);
}
