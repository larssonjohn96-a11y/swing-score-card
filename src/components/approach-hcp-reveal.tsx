import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { handicapLabel } from "@/lib/precision";

/**
 * "Vågen"-ögonblicket: efter beräkningen byggs spänningen upp med en
 * nedräkning och en siffra som rullar innan Approach-HCP:t landar. Ren
 * presentation – värdet är redan färdigräknat.
 */
export function ApproachHcpReveal({ hcp, onContinue }: { hcp: number; onContinue: () => void }) {
  const [stage, setStage] = useState<"suspense" | "rolling" | "done">("suspense");
  const [display, setDisplay] = useState(36);

  useEffect(() => {
    const t = window.setTimeout(() => setStage("rolling"), 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage !== "rolling") return;
    const start = performance.now();
    const from = 36;
    const duration = 2600;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // Långsam inbromsning – siffran "letar sig" fram till resultatet.
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(from + (hcp - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setStage("done");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, hcp]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b1710] px-8 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
        {stage === "done" ? "Din approach-nivå" : "Resultatet är klart"}
      </p>

      {stage === "suspense" ? (
        <>
          <h1 className="mt-6 animate-pulse font-[family-name:var(--font-display)] text-4xl leading-tight">
            SÅ… VAD SÄGER SIFFRAN?
          </h1>
          <div className="mt-8 flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/30">
            Approach HCP
          </p>
          <p
            className={`font-[family-name:var(--font-display)] text-[7rem] leading-none tabular-nums transition-all duration-500 ${
              stage === "done" ? "scale-105 text-primary" : "text-white/80"
            }`}
          >
            {handicapLabel(Math.round(display * 10) / 10)}
          </p>
        </>
      )}

      {stage === "done" && (
        <button
          type="button"
          onClick={onContinue}
          className="animate-in fade-in slide-in-from-bottom-2 mt-12 flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-[family-name:var(--font-display)] text-xl text-primary-foreground duration-500"
        >
          Se hela resultatet
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
