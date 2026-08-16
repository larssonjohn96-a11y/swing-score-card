import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Off the Tee-specifik processing/reveal-upplevelse med mer förväntan än
 * de andra sex testernas delade TestResultProcessing/TestResultReveal
 * (test-reveal.tsx, orörd) – som väntan på vågen i ett bantningsprogram:
 * stegen escalerar, en kort "andhämtningspaus" innan siffran visas, och
 * själva HCP-talet räknas ner till sitt slutgiltiga värde istället för
 * att dyka upp direkt. Bara för Off the Tee, påverkar inga andra tester.
 */

const STEPS = ["Summerar dina slag", "Jämför med tusentals golfare", "Räknar ut ditt Driving HCP"];

export function OffTeeProcessing({ onDone }: { onDone: () => void }) {
  const [doneCount, setDoneCount] = useState(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const stepDelay = 750;
    const timers = STEPS.map((_, i) =>
      window.setTimeout(() => setDoneCount(i + 1), (i + 1) * stepDelay),
    );
    const holdTimer = window.setTimeout(() => setHolding(true), STEPS.length * stepDelay + 200);
    const doneTimer = window.setTimeout(onDone, STEPS.length * stepDelay + 1600);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(holdTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b1710] px-8 text-white">
      <h1 className="text-center font-[family-name:var(--font-display)] text-3xl leading-tight transition-opacity duration-500">
        {holding ? "Är du redo?" : "BERÄKNAR DITT HCP"}
      </h1>

      {!holding && (
        <div className="mt-10 w-full max-w-xs space-y-3">
          {STEPS.map((step, i) => {
            const done = i < doneCount;
            const active = i === doneCount;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary"
                        : "border-white/20"
                  }`}
                >
                  {done ? (
                    <span className="text-[10px]">✓</span>
                  ) : active ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  ) : null}
                </span>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    done ? "text-white" : active ? "text-white/80" : "text-white/30"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {holding && (
        <div className="animate-in fade-in mt-8 flex gap-2 duration-500">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OffTeeReveal({ hcp, onContinue }: { hcp: number; onContinue: () => void }) {
  const [display, setDisplay] = useState(45);
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const DURATION = 1600;
    const start = performance.now();
    const from = 45;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Ease-out kubisk – snabbt i början, saktar in mot slutet, som en
      // rullande siffervåg som stannar.
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (hcp - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(hcp);
        setSettled(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [hcp]);

  const displayLabel = (v: number) => {
    const rounded = Math.round(v * 10) / 10;
    const s = Math.abs(rounded).toFixed(1).replace(".", ",");
    return rounded < 0 ? `+${s}` : s;
  };

  return (
    <button
      type="button"
      onClick={settled ? onContinue : undefined}
      className="fixed inset-0 z-[100] flex w-full flex-col items-center justify-center bg-[#0b1710] px-8 text-center text-white"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
        Ditt Driving HCP är
      </p>
      <p
        className={`mt-2 font-[family-name:var(--font-display)] text-8xl leading-none transition-colors duration-300 ${
          settled ? "text-primary" : "text-white"
        }`}
      >
        {displayLabel(display)}
      </p>

      {settled && (
        <p
          className="animate-in fade-in mt-10 text-xs font-medium text-white/30 duration-500"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <span className="inline-flex items-center gap-1.5">
            Se ditt resultat <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </p>
      )}
    </button>
  );
}
