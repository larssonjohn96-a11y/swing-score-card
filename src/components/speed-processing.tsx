import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const STEPS = ["Testet sammanställt", "Jämfört med HCP-nivåer", "Speed-nivå beräknad"];

/**
 * Speed-testets egen variant av "Beräknar din nivå" – exakt samma mönster
 * som Approach-pilotens ApproachProcessing (approach-processing.tsx),
 * medvetet en egen komponent istället för att ändra den delade
 * TestResultProcessing (test-reveal.tsx) som de andra fem testerna
 * använder. Ingen automatisk reveal/navigering – när stegen är klara
 * visas "RESULTATET ÄR KLART" och användaren trycker själv vidare.
 */
export function SpeedProcessing({
  totalShots,
  resultReady,
  onSeeResult,
}: {
  totalShots: number;
  resultReady: boolean;
  onSeeResult: () => void;
}) {
  const [doneCount, setDoneCount] = useState(0);
  const [stepsFinished, setStepsFinished] = useState(false);

  useEffect(() => {
    const delays = [850, 950, 1100];
    let elapsed = 0;
    const timers = delays.map((d, i) => {
      elapsed += d;
      return window.setTimeout(() => setDoneCount(i + 1), elapsed);
    });
    const finishTimer = window.setTimeout(() => setStepsFinished(true), elapsed + 300);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(finishTimer);
    };
  }, []);

  const allDone = doneCount >= STEPS.length;
  const showResultCta = stepsFinished && allDone;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b1710] px-8 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
        {totalShots} / {totalShots} slag
      </p>
      <h1 className="mt-3 flex items-center justify-center gap-2 text-center font-[family-name:var(--font-display)] text-3xl leading-tight transition-all duration-500">
        {showResultCta ? (
          <>
            RESULTATET ÄR KLART
            <Check className="h-6 w-6 text-primary" />
          </>
        ) : (
          "BERÄKNAR DIN NIVÅ"
        )}
      </h1>

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
                  <Check className="h-3 w-3" />
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

      {showResultCta && (
        <button
          type="button"
          onClick={onSeeResult}
          disabled={!resultReady}
          className="animate-in fade-in slide-in-from-bottom-2 mt-10 flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-[family-name:var(--font-display)] text-xl text-primary-foreground duration-500 disabled:opacity-50"
        >
          Se mitt resultat
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
