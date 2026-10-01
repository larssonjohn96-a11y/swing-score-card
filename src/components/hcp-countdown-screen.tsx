import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

export function HcpCountdownScreen({
  label,
  onComplete,
  seconds = 3,
}: {
  label: string;
  onComplete: () => void;
  seconds?: number;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const completeRef = useRef(onComplete);
  const finishedRef = useRef(false);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    finishedRef.current = false;
    setRemaining(seconds);

    const tick = (now: number) => {
      const left = Math.max(0, seconds - (now - startedAt) / 1000);
      setRemaining(left);
      if (left <= 0) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          completeRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seconds]);

  const digit = Math.max(1, Math.ceil(remaining));
  const progress = Math.max(0, Math.min(1, remaining / seconds));

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex min-h-[100dvh] flex-col items-center justify-center bg-blue-600 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-white">
      <style>{`
        @keyframes hcpCountdownDigit {
          0% { opacity: .2; transform: scale(.82); }
          55% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        .hcp-countdown-digit { animation: hcpCountdownDigit .24s cubic-bezier(.2,.8,.2,1); }
        @media (prefers-reduced-motion: reduce) {
          .hcp-countdown-digit { animation: none !important; }
        }
      `}</style>
      <p className="text-xs font-black uppercase tracking-[.18em] text-blue-100">{label}</p>
      <h1 className="mt-3 text-3xl font-black">Gör dig redo</h1>
      <p className="mt-2 text-sm font-semibold text-blue-100">Startar om {digit}</p>
      <div className="relative mt-8 h-40 w-40">
        <svg className="-rotate-90 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/20" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 * (1 - progress)}
            className="text-white"
          />
        </svg>
        <span key={digit} className="hcp-countdown-digit absolute inset-0 flex items-center justify-center text-6xl font-black tabular-nums">
          {digit}
        </span>
      </div>
    </div>,
    document.body,
  );
}
