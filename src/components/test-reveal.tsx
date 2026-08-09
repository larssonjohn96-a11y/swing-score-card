import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * Mellansteg mellan sista registrerade slaget och den befintliga resultat-
 * sidan: en kort "Beräknar din nivå"-processering följt av en HCP-reveal.
 * Rör ALDRIG scoring/HCP-beräkning – tar bara emot redan färdigräknad data
 * och visar den. Samma komponenter används av alla sju tester.
 */

/* ------------------------------------------------------------- Processing */

export function TestResultProcessing({
  testLabel,
  secondaryLabel,
  isRetest,
  onDone,
}: {
  /** t.ex. "Approach" – används i "Beräknar din Approach-nivå" */
  testLabel: string;
  /** t.ex. "18 / 18 slag" */
  secondaryLabel?: string;
  isRetest: boolean;
  onDone: () => void;
}) {
  const steps = isRetest
    ? [
        "Summerar ditt test",
        "Jämför med HCP-nivåer",
        "Jämför med tidigare resultat",
        `Beräknar din ${testLabel}-nivå`,
      ]
    : ["Summerar ditt test", "Jämför med HCP-nivåer", `Beräknar din ${testLabel}-nivå`];

  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    // Fast, kort tajmning (~2–2,2 s totalt) – beräkningen är redan klar
    // (allt är synkron JS), animationen får ändå spela ut för själva
    // reveal-känslan, men aldrig längre än nödvändigt.
    const stepDelay = isRetest ? 480 : 620;
    const timers = steps.map((_, i) =>
      window.setTimeout(() => setDoneCount(i + 1), (i + 1) * stepDelay),
    );
    const doneTimer = window.setTimeout(onDone, steps.length * stepDelay + 300);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b1710] px-8 text-white">
      {secondaryLabel && (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          {secondaryLabel}
        </p>
      )}
      <h1 className="mt-3 text-center font-[family-name:var(--font-display)] text-3xl leading-tight">
        BERÄKNAR DIN NIVÅ
      </h1>

      <div className="mt-10 w-full max-w-xs space-y-3">
        {steps.map((step, i) => {
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
    </div>
  );
}

/* ----------------------------------------------------------------- Reveal */

export type RevealState = "first" | "personal-best" | "improved" | "neutral";

export function TestResultReveal({
  testLabel,
  metricLabel = "HCP",
  value,
  previousValue,
  deltaLabel,
  state,
  profileUpdated,
  onContinue,
}: {
  testLabel: string;
  metricLabel?: string;
  /** formaterat värde, t.ex. "7,4" */
  value: string;
  previousValue?: string;
  /** formaterad, positiv skillnad, t.ex. "2,1" */
  deltaLabel?: string;
  state: RevealState;
  profileUpdated?: boolean;
  onContinue: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onContinue, 3400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={onContinue}
      className="fixed inset-0 z-[100] flex w-full flex-col items-center justify-center bg-[#0b1710] px-8 text-center text-white"
    >
      {state === "personal-best" && (
        <p className="animate-in fade-in zoom-in-95 text-xs font-bold uppercase tracking-[0.3em] text-flag duration-500">
          Nytt personbästa
        </p>
      )}
      {state === "first" && (
        <p className="animate-in fade-in zoom-in-95 text-xs font-semibold uppercase tracking-[0.3em] text-white/40 duration-500">
          Din första {testLabel.toLowerCase()}-nivå
        </p>
      )}
      {(state === "improved" || state === "neutral") && (
        <p className="animate-in fade-in zoom-in-95 text-xs font-semibold uppercase tracking-[0.3em] text-white/40 duration-500">
          Din {testLabel.toLowerCase()}-nivå
        </p>
      )}

      <p
        className="animate-in fade-in zoom-in-95 mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/30 delay-150 duration-500"
        style={{ animationFillMode: "both" }}
      >
        {metricLabel}
      </p>
      <p
        className="animate-in fade-in zoom-in-95 font-[family-name:var(--font-display)] text-8xl leading-none text-primary delay-200 duration-500"
        style={{ animationFillMode: "both" }}
      >
        {value}
      </p>

      <div
        className="animate-in fade-in slide-in-from-bottom-2 mt-4 delay-500 duration-500"
        style={{ animationFillMode: "both" }}
      >
        {state === "first" && (
          <p className="text-sm font-semibold text-white/70">Din baseline är satt.</p>
        )}
        {state === "personal-best" && previousValue && (
          <p className="text-sm text-white/60">
            Tidigare bästa <span className="font-semibold text-white">{previousValue}</span>
            {deltaLabel ? <span className="ml-2 text-primary">↓ {deltaLabel}</span> : null}
          </p>
        )}
        {state === "improved" && deltaLabel && (
          <p className="text-sm font-semibold text-primary">↓ {deltaLabel} sedan förra testet</p>
        )}
        {state === "neutral" && previousValue && (
          <p className="text-sm text-white/60">
            Förra testet <span className="font-semibold text-white">{previousValue}</span>
          </p>
        )}
      </div>

      {profileUpdated && (
        <p
          className="animate-in fade-in mt-6 flex items-center gap-1.5 text-xs font-medium text-white/50 delay-700 duration-500"
          style={{ animationFillMode: "both" }}
        >
          <Check className="h-3.5 w-3.5 text-primary" />
          Player Card uppdaterat
        </p>
      )}

      <p
        className="animate-in fade-in mt-10 text-xs font-medium text-white/30 duration-500"
        style={{ animationDelay: "1200ms", animationFillMode: "both" }}
      >
        Tryck för att se resultatet →
      </p>
    </button>
  );
}
