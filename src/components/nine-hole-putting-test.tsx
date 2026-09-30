import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, RotateCcw, Star, Trophy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildPuttingMatchReview } from "@/lib/putting-match-review";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { StandardHcpAnalysis, ShotAnalysisList, BenchmarkStory } from "@/components/standard-hcp-analysis";

const DEFAULT_DIST = [1.5, 2.5, 4, 6, 8, 10, 12, 15, 18];
const SPECIALIST_BASE_KEY = "sg4-putting-nine-hole-v1";
const TOTAL_KEY = "sg4-putting-total-nine-v2";
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

type Saved = {
  id: string;
  at: number;
  putts: number[];
  distances?: number[];
  stars?: number;
};

type Feedback = {
  distance: number;
  putts: number;
  stars: number;
  label: string;
};

const historyKey = (modeKey: string) =>
  modeKey === "total" ? TOTAL_KEY : `${SPECIALIST_BASE_KEY}-${modeKey}`;

function load(key: string): Saved[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(key: string, value: Saved) {
  localStorage.setItem(key, JSON.stringify([...load(key), value].slice(-30)));
}

function shuffle(values: readonly number[]) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function smartOrder(modeKey: string, values: readonly number[], enabled: boolean) {
  if (!enabled) return [...values];

  if (modeKey === "short") return shuffle(values);

  if (modeKey === "medium") {
    const pool = [...values];
    const openingIndexes = pool
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value <= 4);
    const pick = openingIndexes[Math.floor(Math.random() * openingIndexes.length)];
    if (!pick) return shuffle(pool);
    const [first] = pool.splice(pick.index, 1);
    return [first, ...shuffle(pool)];
  }

  if (modeKey === "long") {
    const warm = shuffle(values.filter((value) => value <= 12));
    const hard = values.filter((value) => value > 12);
    const hardest = Math.max(...hard);
    const beforeHardest = shuffle(hard.filter((value) => value !== hardest));
    const order = [
      warm[0],
      warm[1],
      beforeHardest[0],
      warm[2],
      beforeHardest[1],
      hardest,
    ].filter((value): value is number => typeof value === "number");
    return order.length === values.length ? order : shuffle(values);
  }

  if (modeKey === "total") {
    const short = shuffle(values.filter((value) => value <= 2));
    const medium = shuffle(values.filter((value) => value > 2 && value <= 7));
    const long = shuffle(values.filter((value) => value > 7));
    const pattern: Array<"short" | "medium" | "long"> = [
      "short",
      "medium",
      "short",
      "long",
      "short",
      "medium",
      "short",
      "long",
      "medium",
    ];
    const groups = { short, medium, long };
    return pattern
      .map((group) => groups[group].shift())
      .filter((value): value is number => typeof value === "number");
  }

  return shuffle(values);
}

function starsFor(distance: number, putts: number) {
  if (putts === 1) return 3;
  if (putts === 2) return distance <= 1.2 ? 1 : 2;
  if (putts === 3) return distance >= 8 ? 1 : 0;
  return 0;
}

function feedbackLabel(stars: number) {
  if (stars === 3) return "Briljant";
  if (stars === 2) return "Bra";
  if (stars === 1) return "Godkänt";
  return "Tapp";
}

function gradeFor(distance: number, putts: number) {
  const stars = starsFor(distance, putts);
  if (stars === 3) return "exceptionell" as const;
  if (stars === 2) return "bra" as const;
  if (stars === 1) return "förväntat" as const;
  return "stort tapp" as const;
}

export function NineHolePuttingTest({
  onExit,
  modeKey = "total",
  testTitle = "Putting",
  rangeLabel = "1,5–18 m",
  distances = DEFAULT_DIST,
  shuffleDistances = true,
}: {
  onExit: () => void;
  modeKey?: string;
  testTitle?: string;
  rangeLabel?: string;
  distances?: readonly number[];
  shuffleDistances?: boolean;
}) {
  const initialDistances = () => smartOrder(modeKey, distances, shuffleDistances);
  const [view, setView] = useState<"intro" | "countdown" | "test" | "compiling" | "result">("intro");
  const [countdown, setCountdown] = useState(3);
  const [putts, setPutts] = useState<number[]>([]);
  const [sessionDist, setSessionDist] = useState<number[]>(initialDistances);
  const [compile, setCompile] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timers = useRef<number[]>([]);

  useChipScreenColor(view === "countdown" || view === "compiling" || analysis);

  useEffect(() => {
    document.documentElement.dataset.sg4TestActive = view === "intro" ? "false" : "true";
    return () => {
      delete document.documentElement.dataset.sg4TestActive;
    };
  }, [view]);

  useEffect(() => {
    const handler = () => setConfirmExit(true);
    window.addEventListener("sg4-test-abort", handler);
    return () => window.removeEventListener("sg4-test-abort", handler);
  }, []);

  const key = historyKey(modeKey);
  const shotCount = sessionDist.length;
  const review = useMemo(
    () =>
      buildPuttingMatchReview(
        putts.map((puttCount, index) => ({
          distance: sessionDist[index],
          yourValue: puttCount,
          completed: true,
        })),
      ),
    [putts, sessionDist],
  );

  const puttingHistory =
    typeof window === "undefined"
      ? []
      : load(key).filter((entry) => entry.putts.length === shotCount);

  const best = puttingHistory
    .map((entry) => entry.putts.reduce((sum, value) => sum + value, 0))
    .reduce<number | null>((current, value) => (current === null ? value : Math.min(current, value)), null);

  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  useEffect(() => clear, []);

  useEffect(() => {
    if (view !== "countdown") return;
    setCountdown(3);
    const start = performance.now();
    const duration = 2400;
    const id = window.setInterval(() => {
      const left = Math.max(0, duration - (performance.now() - start));
      setCountdown(left / 800);
      if (left <= 0) {
        window.clearInterval(id);
        setView("test");
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [view]);

  useEffect(() => {
    if (view !== "compiling") return;
    setCompile(0);
    clear();
    timers.current = [
      window.setTimeout(() => setCompile(1), 700),
      window.setTimeout(() => setCompile(2), 1450),
      window.setTimeout(() => setCompile(3), 2200),
      window.setTimeout(() => setView("result"), 2850),
    ];
    return clear;
  }, [view]);

  const total = putts.reduce((sum, value) => sum + value, 0);
  const starTotal = putts.reduce(
    (sum, value, index) => sum + starsFor(sessionDist[index], value),
    0,
  );

  let streak = 0;
  for (let index = putts.length - 1; index >= 0; index--) {
    if (starsFor(sessionDist[index], putts[index]) >= 2) streak += 1;
    else break;
  }

  const index = Math.min(Math.max(0, shotCount - 1), putts.length);
  const currentDistance = sessionDist[index] ?? sessionDist.at(-1) ?? 0;

  function start() {
    clear();
    setFeedback(null);
    setSessionDist(smartOrder(modeKey, distances, shuffleDistances));
    setPutts([]);
    setView("countdown");
  }

  function score(value: number) {
    if (feedback || putts.length >= shotCount) return;
    const earned = starsFor(currentDistance, value);
    const next = [...putts, value];
    const nextStars = next.reduce(
      (sum, puttCount, shotIndex) => sum + starsFor(sessionDist[shotIndex], puttCount),
      0,
    );

    setFeedback({
      distance: currentDistance,
      putts: value,
      stars: earned,
      label: feedbackLabel(earned),
    });

    const id = window.setTimeout(() => {
      setPutts(next);
      setFeedback(null);
      if (next.length === shotCount) {
        save(key, {
          id: crypto.randomUUID(),
          at: Date.now(),
          putts: next,
          distances: sessionDist,
          stars: nextStars,
        });
        setView("compiling");
      }
    }, 650);
    timers.current.push(id);
  }

  function undo() {
    if (feedback) return;
    setPutts((current) => current.slice(0, -1));
  }

  function abort() {
    clear();
    setConfirmExit(false);
    onExit();
  }

  const maxStars = shotCount * 3;

  return (
    <main className="mx-auto min-h-[calc(100dvh-58px)] max-w-md bg-slate-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 text-slate-950">
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6">
          <DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle>
          <DialogDescription>Dina registrerade hål i det här testet sparas inte.</DialogDescription>
          <Button onClick={abort} className="min-h-12 bg-slate-950 text-white">Avbryt test</Button>
          <Button variant="outline" onClick={() => setConfirmExit(false)}>Fortsätt testet</Button>
        </DialogContent>
      </Dialog>

      {view === "intro" ? (
        <div className="space-y-4">
          <section className="text-center">
            <p className="text-xs font-black uppercase text-blue-600">Putting HCP</p>
            <h1 className="mt-1 text-4xl font-black">{testTitle}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {shotCount} hål {shuffleDistances ? "med varierade avstånd" : "över hela puttspannet"}. Håla varje boll, samla stjärnor och få ditt Putting-HCP.
            </p>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
            <img src="/Putting_1.png" alt="" className="mb-4 h-52 w-full rounded-2xl object-cover" />
            <div className="grid grid-cols-3 divide-x rounded-2xl bg-slate-50 py-3 text-center">
              {[
                [`${shotCount} hål`, "Speltest"],
                ["★", "Direkt feedback"],
                [rangeLabel, shuffleDistances ? "Varierade avstånd" : "Hela spannet"],
              ].map(([a, b]) => (
                <div key={a}>
                  <Check className="mx-auto mb-1 h-4 w-4 text-blue-600" />
                  <p className="text-xs font-black">{a}</p>
                  <p className="text-[10px] text-slate-500">{b}</p>
                </div>
              ))}
            </div>
            <Button onClick={start} className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white">
              Starta {testTitle}
            </Button>
          </section>

          {best !== null && (
            <p className="px-2 text-sm font-semibold">
              <Trophy className="mr-2 inline h-4 w-4" />
              Ditt personbästa · {best} puttar
            </p>
          )}

          <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white">
            <div className="border-b border-blue-100 p-4">
              <h2 className="font-black">Topplista</h2>
              <p className="text-xs text-slate-500">Dina senaste {testTitle.toLowerCase()}-test</p>
            </div>
            {puttingHistory.length ? (
              <div>
                {[...puttingHistory]
                  .sort(
                    (a, b) =>
                      a.putts.reduce((x, y) => x + y, 0) -
                      b.putts.reduce((x, y) => x + y, 0),
                  )
                  .slice(0, 5)
                  .map((entry, rank) => (
                    <div key={entry.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
                      <span className="text-sm font-semibold">#{rank + 1} Test</span>
                      <div className="text-right">
                        <strong>{entry.putts.reduce((a, b) => a + b, 0)} puttar</strong>
                        {typeof entry.stars === "number" && <p className="text-[10px] font-bold text-amber-500">{entry.stars} ★</p>}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-slate-500">Gör ditt första test för att sätta high score.</p>
            )}
          </section>
        </div>
      ) : view === "countdown" ? (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-blue-600 text-center text-white">
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-100">Putting HCP · {shotCount} hål</p>
          <h1 className="mt-3 text-3xl font-black">Gör dig redo</h1>
          <p className="mt-2 text-blue-100">Startar om {Math.max(1, Math.ceil(countdown))}</p>
          <div className="relative mt-8 h-40 w-40">
            <svg className="-rotate-90 h-full w-full" viewBox="0 0 100 100">
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
                strokeDashoffset={251.2 * (1 - Math.max(0, countdown) / 3)}
                className="text-white"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-6xl font-black">
              {Math.max(1, Math.ceil(countdown))}
            </span>
          </div>
        </div>
      ) : view === "test" ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-3 divide-x text-center">
              <div><strong className="text-xl">{total}</strong><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Puttar</p></div>
              <div><strong className="text-xl text-amber-500">{starTotal} ★</strong><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">av {maxStars}</p></div>
              <div><strong className="text-xl">{streak}</strong><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Streak</p></div>
            </div>
            {best !== null && <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">PB · {best} puttar</p>}
          </section>

          <section className="text-center">
            <p className="text-xs font-semibold text-slate-500">Hål {index + 1} av {shotCount}</p>
            <h1 className="mt-2 text-5xl font-black text-blue-700">{fmt(currentDistance)} m</h1>
            <div className="mt-3 flex justify-center gap-1">
              {[0, 1, 2].map((star) => (
                <Star
                  key={star}
                  className={`h-7 w-7 ${feedback && star < feedback.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                />
              ))}
            </div>
          </section>

          {feedback && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center shadow-sm">
              <p className="text-xs font-black uppercase tracking-[.16em] text-amber-700">Hål {index + 1}</p>
              <h2 className="mt-1 text-3xl font-black">{feedback.label}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {feedback.putts === 1 ? "1 putt" : feedback.putts >= 4 ? "4+ puttar" : `${feedback.putts} puttar`} · +{feedback.stars} ★
              </p>
            </section>
          )}

          {index === shotCount - 1 && !feedback && (
            <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center font-bold text-violet-900">
              Sista hålet – en chans till att slå ditt rekord!
            </p>
          )}

          <section className={`rounded-3xl border border-blue-100 bg-white p-4 transition ${feedback ? "pointer-events-none opacity-40" : ""}`}>
            <p className="mb-3 text-center text-sm font-semibold text-slate-500">Hur många puttar för att håla ut?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                [1, "1 putt"],
                [2, "2 puttar"],
                [3, "3 puttar"],
                [4, "4+ puttar"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant="outline"
                  onClick={() => score(Number(value))}
                  className="min-h-16 rounded-2xl text-base font-black"
                >
                  {label}
                </Button>
              ))}
            </div>
            {putts.length > 0 && (
              <Button variant="ghost" onClick={undo} className="mt-2 w-full text-slate-500">
                <Undo2 />
                Ändra förra hålet
              </Button>
            )}
          </section>
        </div>
      ) : view === "compiling" ? (
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 p-6 text-center text-white">
            <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600">
              {compile >= 3 ? <Check className="h-9 w-9" /> : <LoaderCircle className="h-9 w-9 motion-safe:animate-spin" />}
            </span>
            <h1 className="text-3xl font-black">{compile >= 3 ? "Resultatet klart" : "Sammanställer testet…"}</h1>
            <div className="mt-6 space-y-4 text-left text-blue-100">
              {[
                `Sammanställer dina ${shotCount} hål`,
                "Räknar score och stjärnor",
                "Förbereder din HCP-analys",
              ].map((item, itemIndex) => (
                <p key={item} className={`flex gap-3 ${itemIndex <= compile ? "opacity-100" : "opacity-0"}`}>
                  {itemIndex < compile || compile >= 3 ? <Check /> : <LoaderCircle className="motion-safe:animate-spin" />}
                  {item}
                </p>
              ))}
            </div>
          </div>,
          document.body,
        )
      ) : view === "result" ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-blue-100 bg-white p-5 text-center">
            <p className="text-xs font-black uppercase text-blue-600">Din score</p>
            <h1 className="mt-1 text-2xl font-black">{testTitle} klart</h1>
            <p className="mt-4 text-6xl font-black text-blue-700">{total}</p>
            <p className="text-sm text-slate-500">puttar totalt</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 font-black text-amber-600">
              <Star className="h-5 w-5 fill-current" />
              {starTotal} / {maxStars}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4">
              <div><strong>{review.onePutts}</strong><p className="text-xs text-slate-500">1-puttar</p></div>
              <div><strong>{review.threePutts}</strong><p className="text-xs text-slate-500">3+</p></div>
              <div><strong>{fmt(review.average)}</strong><p className="text-xs text-slate-500">snitt</p></div>
            </div>
          </section>

          <Button onClick={() => setAnalysis(true)} className="min-h-14 w-full rounded-2xl bg-blue-600 font-black text-white">
            Visa mitt Putting-HCP
          </Button>
          <Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-white">
            <RotateCcw />
            Testa igen · {shotCount} hål
          </Button>
        </div>
      ) : null}

      <Dialog open={analysis} onOpenChange={setAnalysis}>
        <DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white">
          <DialogTitle className="sr-only">Putting HCP-analys</DialogTitle>
          <DialogDescription className="sr-only">Ditt estimerade Putting-HCP.</DialogDescription>
          <StandardHcpAnalysis
            title={`${testTitle} · HCP-analys`}
            hcp={review.estimate ?? 0}
            onClose={() => setAnalysis(false)}
            slides={[
              {
                key: "shots",
                content: (
                  <ShotAnalysisList
                    title={`Dina ${shotCount} hål`}
                    rows={putts.map((puttCount, shotIndex) => ({
                      label: `Hål ${shotIndex + 1} · ${fmt(sessionDist[shotIndex])} m`,
                      value:
                        puttCount === 1
                          ? "1 putt"
                          : puttCount >= 4
                            ? "4+ puttar"
                            : `${puttCount} puttar`,
                      grade: gradeFor(sessionDist[shotIndex], puttCount),
                    }))}
                  />
                ),
              },
              {
                key: "profile",
                content: (
                  <section>
                    <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Din profil idag</p>
                    <h2 className="mt-3 text-3xl font-black">Putting per längd</h2>
                    <div className="mt-5 space-y-3">
                      {review.bands
                        .filter((band) => band.count > 0)
                        .map((band) => (
                          <div key={band.label} className="flex justify-between rounded-2xl bg-white/10 p-4">
                            <strong>{band.label} · {band.range}</strong>
                            <span>{band.average === null ? "–" : fmt(band.average)} puttar</span>
                          </div>
                        ))}
                    </div>
                  </section>
                ),
              },
              {
                key: "benchmark",
                content: <BenchmarkStory title="Mot hög nivå" hcp={review.estimate ?? 0} tourLabel="Referens" tourValue="Expected putts" />,
              },
              {
                key: "potential",
                content: (
                  <section className="text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Din score</p>
                    <h2 className="mt-4 text-3xl font-black">Spelet före HCP:t</h2>
                    <div className="mt-6 rounded-3xl bg-white/10 p-5 text-left">
                      <p className="flex justify-between"><span>Stjärnor</span><strong>{starTotal} / {maxStars}</strong></p>
                      <p className="mt-3 flex justify-between"><span>1-puttar</span><strong>{review.onePutts}</strong></p>
                      <p className="mt-3 flex justify-between"><span>2-puttar eller bättre</span><strong>{putts.filter((value) => value <= 2).length} / {shotCount}</strong></p>
                    </div>
                  </section>
                ),
              },
            ]}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
