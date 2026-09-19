import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { useSubscription } from "@/lib/subscription";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { reviewRound, courseHandicap, holeStars, type CourseRound } from "@/lib/putt-course";
export function PuttAnalysis({ round }: { round: CourseRound }) {
  const [open, setOpen] = useState(false),
    [stage, setStage] = useState(0),
    [filter, setFilter] = useState<string | null>(null);
  const { canViewDetailedBreakdowns } = useSubscription();
  const hcp = courseHandicap(round);
  const review = reviewRound(round);
  useChipScreenColor(open && canViewDetailedBreakdowns && stage < 3);
  useEffect(() => {
    if (!open) return;
    setStage(0);
    setFilter(null);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [
      setTimeout(() => setStage(1), reduced ? 0 : 1400),
      setTimeout(() => setStage(2), reduced ? 700 : 3200),
      setTimeout(() => setStage(3), reduced ? 700 : 3850),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open]);
  const rows = review.rows.map((r) => ({
    ...r,
    category:
      r.category.id === "loss"
        ? { id: "weak", label: "Svagt", tone: "bg-orange-50 text-orange-700" }
        : r.category,
  }));
  return (
    <>
      <button className="putt-primary" onClick={() => setOpen(true)}>
        Analys – se ditt handicap →
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!fixed !inset-0 !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !gap-0 overflow-hidden !bg-slate-50 text-slate-950 [&>button]:z-50 [&>button]:bg-white [&>button]:p-2">
          <DialogTitle className="sr-only">Puttrundans analys</DialogTitle>
          <DialogDescription className="sr-only">
            Estimerat putt-handicap och resultat per hål
          </DialogDescription>
          {!canViewDetailedBreakdowns ? (
            <div className="m-auto max-w-sm p-6 text-center">
              <h2 className="text-2xl font-black">Se ditt putt-handicap</h2>
              <p className="my-4">Lås upp rundanalys och resultat hål för hål med SG4 Plus.</p>
              <Link to="/premium" className="putt-primary">
                Upptäck Plus
              </Link>
            </div>
          ) : (
            <>
              <div
                className="mx-auto w-full max-w-md overflow-y-auto p-5 pt-[max(56px,env(safe-area-inset-top))]"
                aria-hidden={stage < 3}
              >
                <h2 className="text-2xl font-black">Estimerat putt-HCP</h2>
                <div className="my-4 rounded-3xl bg-blue-100 p-5 text-center text-blue-700">
                  <strong className="text-5xl">
                    {hcp === null ? "–" : hcp.toFixed(1).replace(".", ",")}
                  </strong>
                  <p className="mt-2 text-sm">Den här rundan</p>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {[...new Map(rows.map((r) => [r.category.id, r.category])).values()].map((c) => (
                    <button
                      key={c.id}
                      aria-pressed={filter === c.id}
                      className={`min-h-11 rounded-xl px-3 font-bold ${c.tone} ${filter === c.id ? "ring-2 ring-blue-600" : ""}`}
                      onClick={() => setFilter(filter === c.id ? null : c.id)}
                    >
                      {c.label} · {rows.filter((r) => r.category.id === c.id).length}
                    </button>
                  ))}
                </div>
                <h3 className="mb-3 font-black">Hål för hål</h3>
                {rows
                  .filter((r) => !filter || r.category.id === filter)
                  .map((r) => (
                    <section
                      key={r.hole}
                      className="mb-3 overflow-hidden rounded-2xl border bg-white"
                    >
                      <h4 className="flex justify-between bg-blue-50 p-3 font-bold">
                        <span>
                          Hål {r.hole} · {r.distance} m
                        </span>
                        <span>{holeStars(round.holes[r.hole - 1], r.hole - 1)} ★</span>
                      </h4>
                      <div className="flex items-center justify-between p-3">
                        <span>
                          {r.putts === 4 ? "4+" : r.putts} {r.putts === 1 ? "putt" : "puttar"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${r.category.tone}`}
                        >
                          {r.category.label}
                        </span>
                      </div>
                    </section>
                  ))}
                <p className="my-4 text-xs text-slate-500">
                  Uppskattning från rundans avstånd och puttar. Påverkar inte ditt officiella HCP.
                  {round.holes.some((h) => h[0] === 4)
                    ? " 4+ räknas som fyra puttar i uppskattningen."
                    : ""}
                </p>
              </div>
              {stage < 3 && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center bg-blue-600 text-white transition-opacity duration-700 ${stage === 2 ? "opacity-0" : "opacity-100"}`}
                >
                  <p className="mb-5 text-lg font-bold">
                    {stage === 0 ? "Beräknar din runda…" : "Ditt estimerade putt-HCP"}
                  </p>
                  <div className="relative h-32 w-full text-center">
                    <span
                      className={`absolute inset-0 text-8xl font-black transition-all duration-700 ${stage === 0 ? "opacity-100 blur-0" : "opacity-0 blur-sm"}`}
                      aria-hidden
                    >
                      ···
                    </span>
                    <strong
                      className={`absolute inset-0 text-8xl font-black transition-all duration-700 ${stage === 0 ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}
                    >
                      {hcp === null ? "–" : hcp.toFixed(1).replace(".", ",")}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
