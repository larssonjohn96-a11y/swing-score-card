"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const SPLASH_KEY = "sg4-splash-shown";

export function useSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem(SPLASH_KEY);
    if (!seen) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SPLASH_KEY, "true");
    }
    setShow(false);
  }

  return { show, dismiss };
}

export function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    setExiting(true);
    setTimeout(onDismiss, 450);
  }

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6 transition-opacity duration-300 ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(140% 100% at 50% 0%, var(--bg-glow) 0%, var(--color-background) 55%)",
      }}
      onClick={handleDismiss}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span className="font-display text-[10rem] leading-none tracking-[0.04em] text-foreground">
          SG4
        </span>

        <div className="mt-2 space-y-1">
          <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-foreground">
            SE SPELET
          </h1>
          <h2 className="font-display text-4xl leading-[0.95] tracking-wide text-primary">
            BAKOM DITT HCP.
          </h2>
        </div>

        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Testa · Utvecklas · Jämför
        </p>
      </div>
    </div>
  );
}
