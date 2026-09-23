import { useEffect, useState } from "react";
import { ChipCelebration } from "./chip-celebration";
import { fromMph, type SpeedUnit } from "@/lib/speed-course";
import { NHL_SHOT_MPH, TOUR_SPEEDS, tourMessage } from "@/lib/speed-story";

function SpeedBars({
  rows,
  unit,
}: {
  rows: { label: string; mph: number; you?: boolean }[];
  unit: SpeedUnit;
}) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1500);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        setProgress(1);
      }
    };
    if (motion.matches) setProgress(1);
    else frame = requestAnimationFrame(tick);
    motion.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", stop);
    };
  }, []);
  const max = Math.max(...rows.map((r) => r.mph), 1);
  return (
    <div className="my-7 space-y-5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-end justify-between gap-3">
            <span className="font-bold">{row.label}</span>
            <span className="text-xl font-black tabular-nums">
              <span className="sr-only">
                {fromMph(row.mph, unit).toFixed(1)} {unit}
              </span>
              <span aria-hidden="true">
                {(fromMph(row.mph, unit) * progress).toFixed(1).replace(".", ",")}{" "}
                <span className="text-xs">{unit}</span>
              </span>
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div
              className={`h-full origin-left rounded-full ${row.you ? "bg-yellow-300" : "bg-white/75"}`}
              style={{ width: `${(row.mph / max) * 100}%`, transform: `scaleX(${progress})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SpeedTourStory({ speed, unit }: { speed: number; unit: SpeedUnit }) {
  return (
    <section className="text-white">
      {speed >= TOUR_SPEEDS[1].mph && <ChipCelebration subtle />}
      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
        Din fart möter touren
      </p>
      <h2 className="mt-3 text-3xl font-black">Hur nära proffsen är du?</h2>
      <SpeedBars
        unit={unit}
        rows={[
          { label: "Ditt bästa slag", mph: speed, you: true },
          ...TOUR_SPEEDS.map((t) => ({ label: `${t.name} · snitt`, mph: t.mph })),
        ]}
      />
      <div className="space-y-3">
        {TOUR_SPEEDS.map((t) => (
          <p
            key={t.name}
            className={`rounded-2xl p-4 font-bold ${speed >= t.mph * 0.95 ? "bg-white text-blue-700" : "bg-white/10"}`}
          >
            {tourMessage(speed, t.mph, t.name)}
          </p>
        ))}
      </div>
      <a
        href="https://www.trackman.com/blog/introducing-updated-tour-averages"
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-block text-xs text-blue-100 underline"
      >
        Driversnitt · Trackman 2023
      </a>
    </section>
  );
}

export function SpeedPerspectiveStory({ speed }: { speed: number }) {
  const faster = speed > NHL_SHOT_MPH;
  return (
    <section className="text-white">
      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
        Så snabb är din boll
      </p>
      <h2 className="mt-3 text-3xl font-black">Din golfboll möter en hockeypuck</h2>
      <SpeedBars
        unit="km/h"
        rows={[
          { label: "Ditt bästa slag", mph: speed, you: true },
          { label: "Cháras NHL-skott", mph: NHL_SHOT_MPH },
        ]}
      />
      <p className="rounded-3xl bg-white p-5 text-xl font-black text-blue-700">
        {faster
          ? "Din boll lämnar klubban snabbare än Cháras rekordskott. Wow!"
          : "Tänk dig den farten över en hockeyrink – det är din boll i rörelse!"}
      </p>
      <p className="mt-4 text-sm text-blue-100">
        Zdeno Cháras skott i NHL All-Star Skills 2012. Vi jämför hastigheten direkt efter träffen.
      </p>
      <a
        href="https://media.nhl.com/site/asset/public/ext/2022-23/2023AllStarGuide.pdf"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs text-blue-100 underline"
      >
        Källa: NHL · 108,8 mph
      </a>
    </section>
  );
}
