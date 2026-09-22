import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useSubscription } from "@/lib/subscription";
import {
  buildActivityReview,
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
} from "@/lib/activity-review";
import { courseDistances, courseHandicap, holePoints, type CourseRound } from "@/lib/chip-course";
import { CHIP_ZONES } from "@/lib/chip-stations";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { handicapLabel } from "@/lib/shortgame";

const chipCategory = (category: ActivityCategory): ActivityCategory =>
  category === "Stort tapp" ? "Svagt" : category;

export function ChipAnalysis({ round }: { round: CourseRound }) {
  const { canViewDetailedBreakdowns } = useSubscription();
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(false);
  const [stage, setStage] = useState<"counting" | "result" | "fade" | "details">("counting");
  const [filter, setFilter] = useState<ActivityCategory | null>(null);
  useChipScreenColor(open && canViewDetailedBreakdowns && stage !== "details");
  const groups = useRef<HTMLDivElement>(null);
  const hcp = courseHandicap(round);
  const review = buildActivityReview({
    title: "Rundanalys",
    handicap: hcp,
    modelId: "chip-course-proximity-v1",
    outcomes: round.holes.flatMap((shots, i) =>
      shots.map((points, j) => ({
        label: `Hål ${i + 1} · boll ${j + 1}`,
        context: `${courseDistances(round.model, round)[i]} m`,
        result: CHIP_ZONES.find((z) => z.points === points)!.label,
        rank: 4 - points,
        category: chipCategory(ACTIVITY_CATEGORIES[4 - points]),
      })),
    ),
  });
  useEffect(() => {
    if (!open || !canViewDetailedBreakdowns || skip) return;
    setFilter(null);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduced ? "result" : "counting");
    const timers = [
      setTimeout(() => setStage("result"), reduced ? 0 : 1600),
      setTimeout(() => setStage("fade"), reduced ? 900 : 3800),
      setTimeout(() => setStage("details"), reduced ? 900 : 4450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open, round.id, canViewDetailedBreakdowns, skip]);
  const select = (category: ActivityCategory | null) => {
    setFilter(category);
    requestAnimationFrame(() =>
      groups.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setSkip(false);
          setStage("counting");
        }
      }}
    >
      <style>{`@keyframes chipHcpDial{from{transform:translateY(0)}to{transform:translateY(-85.7%)}}.chip-hcp-dial{animation:chipHcpDial .65s linear infinite;line-height:96px}@media(prefers-reduced-motion:reduce){.chip-hcp-dial{animation:none}}`}</style>
      <DialogTrigger asChild>
        <button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow-md">
          {!canViewDetailedBreakdowns && <Lock className="h-4 w-4" />}Analys – se ditt handicap{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="!animate-none !fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !gap-0 overflow-hidden !bg-transparent text-slate-950 [&>button]:z-30 [&>button]:bg-white [&>button]:p-2">
        <DialogTitle className="sr-only">Rundanalys</DialogTitle>
        <DialogDescription className="sr-only">
          Ditt estimerade chipp-handicap och slag för slag, grupperat per hål.
        </DialogDescription>
        {canViewDetailedBreakdowns ? (
          <>
            <div
              className="flex h-full items-center justify-center px-3 py-6"
              hidden={stage === "counting" || stage === "result"}
            >
              <div className="max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-xl">
                <div>
                  <h2 className="text-2xl font-black">Estimerat chipp-HCP</h2>
                  <p className="mt-3 rounded-2xl bg-blue-50 p-4 text-center text-blue-700">
                    <span className="block text-xs">Estimerad HCP-nivå</span>
                    <strong className="mt-1 block text-3xl">
                      {hcp === null ? "–" : handicapLabel(hcp)}
                    </strong>
                  </p>
                </div>
                <div className="space-y-1.5" aria-label="Filtrera slag">
                  {review.counts
                    .filter(({ category }) => category !== "Stort tapp")
                    .map(({ category, count: baseCount }) => {
                      const count =
                        baseCount +
                        (category === "Svagt"
                          ? review.counts.find((row) => row.category === "Stort tapp")!.count
                          : 0);
                      return (
                        <button
                          key={category}
                          disabled={!count}
                          aria-pressed={filter === category}
                          onClick={() => select(filter === category ? null : category)}
                          className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-bold disabled:opacity-35 ${category === "Exceptionellt" ? "bg-teal-50 text-teal-700" : category === "Utmärkt" ? "bg-blue-50 text-blue-700" : category === "Bra" ? "bg-emerald-50 text-emerald-700" : category === "Förväntat" ? "bg-slate-100 text-slate-600" : category === "Svagt" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"} ${filter === category ? "ring-2 ring-blue-500" : ""}`}
                        >
                          <span>{category}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                </div>
                <div ref={groups} className="scroll-mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black">{filter ?? "Hål för hål"}</h3>
                    {filter && (
                      <button
                        className="min-h-11 text-sm font-bold text-blue-700"
                        onClick={() => select(null)}
                      >
                        Visa alla slag
                      </button>
                    )}
                  </div>
                  {round.holes.map((shots, i) => {
                    const selected = shots
                      .map((points, j) => ({
                        points,
                        j,
                        category: chipCategory(ACTIVITY_CATEGORIES[4 - points]),
                      }))
                      .filter((row) => !filter || row.category === filter);
                    return selected.length ? (
                      <section
                        key={i}
                        className="overflow-hidden rounded-2xl border border-slate-200"
                        aria-label={`Hål ${i + 1}`}
                      >
                        <h4 className="flex items-center justify-between bg-blue-50 p-3 font-black">
                          <span>
                            Hål {i + 1} · {courseDistances(round.model, round)[i]} m
                          </span>
                          <span>{holePoints(shots)} poäng</span>
                        </h4>
                        {selected.map(({ points, j, category }) => (
                          <div
                            key={j}
                            className="flex items-center justify-between gap-3 border-t border-slate-100 p-3 text-sm"
                          >
                            <div>
                              <p className="font-bold">
                                Boll {j + 1} · {CHIP_ZONES.find((z) => z.points === points)!.label}
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${category === "Exceptionellt" ? "bg-teal-100 text-teal-800" : category === "Utmärkt" ? "bg-blue-100 text-blue-800" : category === "Bra" ? "bg-emerald-100 text-emerald-800" : category === "Förväntat" ? "bg-slate-200 text-slate-700" : category === "Svagt" ? "bg-orange-100 text-orange-800" : "bg-rose-100 text-rose-800"}`}
                              >
                                {category}
                              </span>
                            </div>
                            <strong className="text-blue-700">+{points}</strong>
                          </div>
                        ))}
                      </section>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            {stage !== "details" && (
              <div
                data-hcp-reveal={stage}
                className={`absolute inset-0 flex flex-col items-center justify-center bg-blue-600 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center text-white transition-opacity duration-700 motion-reduce:transition-none ${stage === "fade" ? "pointer-events-none opacity-0" : "opacity-100"}`}
              >
                <p className="text-sm font-bold uppercase tracking-widest">
                  Din runda är analyserad
                </p>
                <p className="mt-5 text-lg">
                  {stage === "counting"
                    ? "Sammanställer ditt resultat…"
                    : "Ditt estimerade chipp-HCP"}
                </p>
                <div
                  className="relative my-8 h-40 w-full max-w-sm"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 flex items-center justify-center overflow-hidden text-8xl font-black transition-all duration-700 motion-reduce:transition-none ${stage === "counting" ? "opacity-100" : "opacity-0 blur-sm"}`}
                  >
                    <span className="block h-24 overflow-hidden">
                      <span className="block chip-hcp-dial">
                        36
                        <br />
                        24
                        <br />
                        18
                        <br />
                        12
                        <br />8<br />4<br />0
                      </span>
                    </span>
                  </div>
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-[clamp(88px,27vw,132px)] font-black leading-none tabular-nums transition-all duration-1000 ease-out motion-reduce:transition-none ${stage === "counting" ? "scale-95 opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
                  >
                    {stage === "counting" ? (
                      <span className="sr-only">Beräknar</span>
                    ) : hcp === null ? (
                      "–"
                    ) : (
                      handicapLabel(hcp)
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSkip(true);
                    setStage("details");
                  }}
                  className="min-h-12 rounded-full border border-white/40 px-6 text-sm font-bold"
                >
                  {stage === "counting" ? "Visa analys direkt" : "Se slag för slag"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col justify-center p-6 text-center">
            <Lock className="mx-auto h-10 w-10 text-blue-600" />
            <h2 className="mt-4 text-2xl font-black">Lås upp din rundanalys</h2>
            <p className="mt-2 text-slate-500">
              Se ditt estimerade handicap och analysen för varje hål med SG4+.
            </p>
            <Link to="/premium" className="mt-5 rounded-2xl bg-blue-600 p-4 font-bold text-white">
              Se SG4+
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
