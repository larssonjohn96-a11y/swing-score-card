"use client";

import { useEffect, useState } from "react";

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
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-black px-6 transition-opacity duration-300 ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      onClick={handleDismiss}
    >
      <img
        src="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "18% 50%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/28 to-black/55" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <span className="font-display text-[10rem] leading-none tracking-[0.04em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,.45)]">
          SG4
        </span>

        <div className="mt-2 space-y-1">
          <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,.5)]">
            SE SPELET
          </h1>
          <h2 className="font-display text-4xl leading-[0.95] tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,.5)]">
            BAKOM DITT HCP.
          </h2>
        </div>

        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/82 drop-shadow-[0_1px_10px_rgba(0,0,0,.45)]">
          Testa · Utvecklas · Jämför
        </p>
      </div>
    </div>
  );
}
