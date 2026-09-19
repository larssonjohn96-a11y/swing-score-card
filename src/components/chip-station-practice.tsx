import { ActivityReview } from "@/components/activity-review";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-review";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Flag,
  LockKeyhole,
  RotateCcw,
  Star,
  Trophy,
  Undo2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  CHIP_STATIONS,
  CHIP_ZONES,
  ROUNDS_PER_PASS,
  bestAt,
  chipStorageKey,
  emptyChipProgress,
  goalAt,
  parseChipProgress,
  recommendStation,
  reduceChipProgress,
  roundTotal,
  sessionRounds,
  starTargets,
  starsAt,
  unlockedDistances,
  type ChipAction,
  type ChipLie,
  type ChipPoints,
  type ChipProgress,
} from "@/lib/chip-stations";

type Props = {
  userId: string | null;
  authLoading?: boolean;
  coach: { name: string; emoji: string };
  surface?: CSSProperties;
  onExit: () => void;
};
const card =
  "rounded-3xl border border-slate-200 bg-white shadow-[0_12px_36px_-24px_rgba(15,23,42,.25)]";
const primary =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-blue-600 px-4 py-3 text-base font-bold text-white active:translate-y-0.5 active:border-b-2 disabled:opacity-40";
const secondary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700";
const uid = () => crypto.randomUUID();
const lieName = (lie: ChipLie) => (lie === "Fairway" ? "Kortklippt" : "Ruff");
function Stars({ count, large = false }: { count: number; large?: boolean }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${count} av 3 stjärnor`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${large ? "h-8 w-8" : "h-5 w-5"} ${n <= count ? "fill-amber-400 text-amber-500" : "fill-slate-100 text-slate-300"}`}
        />
      ))}
    </span>
  );
}

export function ChipStationPractice({
  userId,
  authLoading = false,
  coach,
  surface,
  onExit,
}: Props) {
  const [progress, setProgress] = useState<ChipProgress>(emptyChipProgress);
  const state = useRef(progress);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [lie, setLie] = useState<ChipLie>("Fairway");
  const [detail, setDetail] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [rules, setRules] = useState(false);
  const tapUntil = useRef(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const key = chipStorageKey(userId);
  useEffect(() => {
    if (authLoading) return;
    setReady(false);
    try {
      const saved = parseChipProgress(localStorage.getItem(key));
      // Keep historical scores; legacy multi-lie sessions resume via the new map.
      if (saved.session && !saved.session.mode) saved.session = null;
      state.current = saved;
      setProgress(saved);
      const raw = JSON.parse(localStorage.getItem(key) ?? "null");
      const selected = localStorage.getItem(`${key}:lie`) ?? raw?.lie;
      setLie(saved.session?.lies[0] ?? (selected === "Ruff" ? "Ruff" : "Fairway"));
      setRegistering(!!saved.session?.current?.shots.length);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [key, authLoading]);
  function commit(action: ChipAction) {
    if (!ready) return;
    const next = reduceChipProgress(state.current, action);
    state.current = next;
    setProgress(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  function selectLie(value: ChipLie) {
    setLie(value);
    try {
      localStorage.setItem(`${key}:lie`, value);
    } catch {
      setStorageError(true);
    }
  }
  function begin(distance: number) {
    commit({ type: "begin", distance, lie, id: uid(), at: Date.now() });
    setRegistering(false);
    setDetail(null);
    tapUntil.current = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function start(mode: "guided" | "single", distance?: number) {
    if (!unlockedDistances(state.current, lie).includes(distance ?? 8)) return;
    commit({ type: "start", id: uid(), lies: [lie], at: Date.now(), mode });
    begin(distance ?? 8);
  }
  function home() {
    commit({ type: "home" });
    setRegistering(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function finish() {
    commit({ type: "finish" });
    setEndDialog(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function score(points: ChipPoints) {
    if (Date.now() < tapUntil.current) return;
    tapUntil.current = Date.now() + 300;
    commit({ type: "score", points });
  }
  const session = progress.session;
  const phase = session?.phase ?? "home";
  const isHome = phase === "home" || phase === "stations";
  const current = session?.current;
  const rounds = sessionRounds(progress);
  const unlocked = unlockedDistances(progress, lie);
  const frontier = unlocked.at(-1)!;
  const starCount = CHIP_STATIONS.reduce((sum, s) => sum + starsAt(progress, s.distance, lie), 0);
  const featured = goalAt(progress, frontier, lie);
  const recommendation = recommendStation(progress, lie);
  const before = current
    ? { ...progress, rounds: progress.rounds.filter((r) => r.id !== current.id) }
    : progress;
  const total = current ? roundTotal(current) : 0;
  const oldBest = current ? bestAt(before, current.distance, lie) : null;
  const newStars = current
    ? starsAt(progress, current.distance, lie) - starsAt(before, current.distance, lie)
    : 0;
  const fresh = unlocked.filter((d) => !unlockedDistances(before, lie).includes(d));
  const nextGoal = current ? goalAt(before, current.distance, lie) : featured;
  const limit = session?.mode === "single" ? 1 : ROUNDS_PER_PASS;
  const checkpoint = rounds.length >= limit;
  const shots = rounds.flatMap((r) => r.shots);
  const baseline = {
    ...progress,
    rounds: progress.rounds.filter((r) => r.sessionId !== session?.id),
  };
  const earned = CHIP_STATIONS.reduce(
    (sum, s) => sum + starsAt(progress, s.distance, lie) - starsAt(baseline, s.distance, lie),
    0,
  );
  const records = rounds.filter((r, i) => {
    const previous = bestAt(
      { ...baseline, rounds: [...baseline.rounds, ...rounds.slice(0, i)] },
      r.distance,
      r.lie,
    );
    return previous !== null && roundTotal(r) > previous;
  }).length;
  const retryDistance = rounds.length
    ? [...rounds].sort((a, b) => {
        const gap = (d: number) =>
          goalAt(progress, d, lie).points - (bestAt(progress, d, lie) ?? 0);
        return gap(a.distance) - gap(b.distance);
      })[0].distance
    : frontier;
  const selectedOpen = detail !== null && unlocked.includes(detail);

  return (
    <main
      style={{ ...surface, colorScheme: "light" }}
      data-chip-stations="v2"
      className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] text-slate-950"
    >
      <header className="mb-5 flex min-h-14 items-center justify-between gap-3">
        <button
          aria-label="Tillbaka"
          onClick={() => (isHome ? onExit() : phase === "summary" ? home() : setEndDialog(true))}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black">Chippning</h1>
        <button onClick={() => setRules(true)} className="min-h-12 text-sm font-bold text-blue-700">
          Regler
        </button>
      </header>
      {!ready ? (
        <p role="status">Laddar dina stationer…</p>
      ) : (
        <>
          {storageError && (
            <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Resultaten kunde inte sparas på enheten. Håll sidan öppen tills de har sparats.
            </p>
          )}
          {isHome && (
            <>
              <div
                className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 p-1.5"
                aria-label="Underlag"
              >
                {(["Fairway", "Ruff"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={lie === value}
                    onClick={() => selectLie(value)}
                    className={`min-h-12 rounded-xl text-base font-bold ${lie === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
                  >
                    {lieName(value)}
                  </button>
                ))}
              </div>
              <div className="mb-4 flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                  {starCount}/18 stjärnor
                </span>
                <span className="text-slate-500">{unlocked.length}/6 stationer öppna</span>
              </div>
              <section className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-5">
                <p className="text-sm font-bold text-blue-700">DIN NÄSTA UTMANING</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">
                      {frontier} <span className="text-xl">meter</span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {lieName(lie)} · Rekord {bestAt(progress, frontier, lie) ?? "–"}/12
                    </p>
                  </div>
                  <Stars count={starsAt(progress, frontier, lie)} large />
                </div>
                <p className="mt-4 text-base font-bold">
                  {featured.label} · {featured.points} poäng
                </p>
                <div className="mb-4 mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, ((bestAt(progress, frontier, lie) ?? 0) / featured.points) * 100)}%`,
                    }}
                  />
                </div>
                <button onClick={() => start("guided", frontier)} className={primary}>
                  Starta runda · 9 bollar <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 text-center text-sm text-slate-500">
                  3 omgångar · 3 bollar från samma plats
                </p>
              </section>
              <button
                className="my-2 min-h-12 w-full text-sm font-bold text-blue-700"
                onClick={() =>
                  mapRef.current?.scrollIntoView({ behavior: "instant", block: "start" })
                }
              >
                Välj station ↓
              </button>
              <div ref={mapRef} className="scroll-mt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Din väg till 30 m</h2>
                  <span className="text-sm text-slate-500">{lieName(lie)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Första stjärnan öppnar nästa station.</p>
                <div className="relative mx-auto mt-5 max-w-[320px] pb-3">
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 320 792"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M96 45 C96 110 224 110 224 177 S96 243 96 309 S224 375 224 441 S96 507 96 573 S224 639 224 705"
                      fill="none"
                      stroke="#dbeafe"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M96 45 C96 110 224 110 224 177 S96 243 96 309 S224 375 224 441 S96 507 96 573 S224 639 224 705"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="2"
                      strokeDasharray="5 8"
                    />
                  </svg>
                  {CHIP_STATIONS.map((station, index) => {
                    const open = unlocked.includes(station.distance);
                    const active = station.distance === frontier;
                    const count = starsAt(progress, station.distance, lie);
                    return (
                      <div
                        key={station.distance}
                        className={`relative flex h-[132px] flex-col items-center ${index % 2 ? "ml-[40%]" : "mr-[40%]"}`}
                      >
                        <button
                          onClick={() => setDetail(station.distance)}
                          aria-label={`${station.distance} meter, ${open ? `${count} stjärnor, rekord ${bestAt(progress, station.distance, lie) ?? 0} poäng` : "låst"}`}
                          className={`relative flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center rounded-[30px] border-b-[6px] ${active ? "border-blue-800 bg-blue-600 text-white ring-4 ring-blue-200 ring-offset-4 ring-offset-slate-50" : open ? "border-blue-200 bg-white text-blue-700 shadow-sm" : "border-slate-300 bg-slate-200 text-slate-500"}`}
                        >
                          {active && (
                            <span className="absolute -top-4 rounded-full bg-blue-950 px-3 py-1 text-xs font-bold text-white">
                              NÄSTA
                            </span>
                          )}
                          {open ? (
                            count > 0 ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Flag className="h-4 w-4" />
                            )
                          ) : (
                            <LockKeyhole className="h-4 w-4" />
                          )}
                          <span className="text-2xl font-black">
                            {station.distance}
                            <span className="ml-1 text-sm">m</span>
                          </span>
                        </button>
                        <span className="mt-3 rounded-full bg-slate-50 px-2">
                          <Stars count={count} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-center text-sm leading-6 text-slate-500">
                {lie === "Fairway"
                  ? "Spela från kortklippt gräs utanför greenen."
                  : "Spela från längre gräs med bollen synlig."}{" "}
                Avståndet är från bollen till hålet.
              </p>
              <p className="mt-3 text-center text-xs text-slate-400">
                Framsteg sparas på den här enheten{userId ? " för ditt konto" : " som gäst"}.
              </p>
            </>
          )}
          {phase === "play" && current && (
            <section>
              <div className="mb-4 flex items-center justify-between text-sm font-bold text-slate-500">
                <span>
                  {session?.mode === "single" ? "REKORDFÖRSÖK" : `OMGÅNG ${rounds.length + 1} AV 3`}
                </span>
                <span>{lieName(lie)}</span>
              </div>
              <div className="mb-5 flex gap-2">
                {Array.from({ length: limit }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i <= rounds.length ? "bg-blue-600" : "bg-blue-100"}`}
                  />
                ))}
              </div>
              <div className={`${card} p-6 text-center`}>
                <p className="text-sm font-bold text-blue-700">
                  {oldBest === null ? "TA DIN FÖRSTA STJÄRNA" : "SLÅ DITT REKORD"}
                </p>
                <p className="my-4 text-7xl font-black tracking-tight">
                  {current.distance}
                  <span className="ml-2 text-2xl">m</span>
                </p>
                <Stars count={starsAt(before, current.distance, lie)} large />
                <p className="mt-4 text-base font-bold">
                  {nextGoal.label} · {nextGoal.points} poäng
                </p>
                <p className="mt-1 text-sm text-slate-500">Ditt rekord: {oldBest ?? "–"}/12</p>
              </div>
              {!registering ? (
                <>
                  <div className="my-5 rounded-2xl bg-blue-50 p-4 text-base leading-6">
                    <strong>Tre bollar från samma plats.</strong>
                    <p className="mt-1 text-slate-600">
                      Slå alla tre. Gå sedan fram till hålet och registrera resultaten.
                    </p>
                  </div>
                  <button className={primary} onClick={() => setRegistering(true)}>
                    Registrera resultat <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="my-4 flex items-center justify-between">
                    <h2 className="text-lg font-black" aria-live="polite">
                      Boll {current.shots.length + 1} av 3
                    </h2>
                    <span className="text-lg font-black text-blue-700">{total} p</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {CHIP_ZONES.map((zone) => (
                      <button
                        key={zone.points}
                        onClick={() => score(zone.points)}
                        className={`flex min-h-16 items-center justify-between rounded-2xl border px-4 text-left ${zone.points === 4 ? "col-span-2 border-blue-700 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-900"}`}
                      >
                        <span className="text-base font-bold">{zone.label}</span>
                        <strong className="text-xl">{zone.points} p</strong>
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!current.shots.length}
                    onClick={() => commit({ type: "undo" })}
                    className="mt-3 flex min-h-12 items-center gap-2 text-sm font-bold text-slate-500 disabled:opacity-30"
                  >
                    <Undo2 className="h-4 w-4" />
                    Ångra senaste
                  </button>
                </>
              )}
            </section>
          )}
          {phase === "result" && current && (
            <section>
              <div
                className={`${card} p-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300`}
              >
                <p className="text-sm font-bold text-slate-500">
                  {current.distance} m · {lieName(lie)} · 3 bollar
                </p>
                <p className="my-5 text-7xl font-black text-blue-600">
                  {total}
                  <span className="text-2xl text-slate-400">/12</span>
                </p>
                <Stars count={starsAt(progress, current.distance, lie)} large />
                <h2 role="status" className="mt-4 text-2xl font-black">
                  {fresh.length
                    ? `${fresh[0]} meter upplåst!`
                    : newStars > 0
                      ? "Ny stjärna!"
                      : oldBest !== null && total > oldBest
                        ? "Nytt rekord!"
                        : total < nextGoal.points
                          ? `${nextGoal.points - total} poäng till målet`
                          : "Försöket klart"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {oldBest === null
                    ? "Ditt första resultat är sparat."
                    : `Tidigare rekord: ${oldBest}/12`}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  {current.shots.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800"
                    >
                      {p} p
                    </span>
                  ))}
                </div>
              </div>
              <p className="my-4 text-center text-sm text-slate-500">
                {rounds.length * 3} av {limit * 3} bollar klara
              </p>
              <button
                className={primary}
                onClick={() => (checkpoint ? finish() : begin(recommendation.distance))}
              >
                {checkpoint ? "Se din runda" : `Nästa omgång · ${recommendation.distance} m`}
                <ArrowRight className="h-5 w-5" />
              </button>
              {!checkpoint && (
                <p className="mt-3 text-center text-sm text-slate-500">{recommendation.reason}</p>
              )}
              <button
                onClick={() => {
                  commit({ type: "undo" });
                  setRegistering(true);
                }}
                className="mt-3 min-h-12 w-full text-sm font-bold text-slate-500"
              >
                Rätta senaste bollen
              </button>
            </section>
          )}
          {phase === "summary" && (
            <section>
              <div className={`${card} p-6 text-center`}>
                <Trophy className="mx-auto h-10 w-10 text-amber-500" />
                <h2 className="mt-3 text-3xl font-black">Din runda</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {shots.length} chippar · {lieName(lie)}
                </p>
                <p className="mt-4 text-lg font-bold text-blue-700">
                  {earned} nya stjärnor · {records} nya rekord
                </p>
              </div>
              <div className={`${card} mt-4 p-4`}>
                <h3 className="mb-2 text-base font-black">Dina stationer</h3>
                {rounds.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex min-h-14 items-center justify-between gap-2 border-t border-slate-100"
                  >
                    <span className="text-sm font-bold">
                      {i + 1}. {r.distance} m
                    </span>
                    <Stars count={starsAt(progress, r.distance, r.lie)} />
                    <strong>{roundTotal(r)}/12</strong>
                  </div>
                ))}
              </div>
              {shots.length > 0 && (
                <div className={`${card} mt-4 p-5`}>
                  <h3 className="text-base font-black">Rundans analys</h3>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Inom 1 m", shots.filter((p) => p >= 3).length],
                      ["Inom 3 m", shots.filter((p) => p >= 1).length],
                      ["Sänkta", shots.filter((p) => p === 4).length],
                    ].map(([label, count]) => (
                      <div key={label}>
                        <p className="text-2xl font-black text-blue-700">{count}</p>
                        <p className="text-sm text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {shots.filter((p) => p === 0).length} av {shots.length} bollar slutade mer än 3
                    m från hålet.{" "}
                    {shots.every((p) => p >= 1)
                      ? "Alla bollar stannade inom 3 m."
                      : "Försök få fler bollar inom poängzonerna nästa gång."}
                  </p>
                </div>
              )}
              {shots.length > 0 && (
                <div className="mt-4">
                  <ActivityReview
                    input={{
                      title: "Chippning",
                      modelId: "chip-three-ball-zones-v1",
                      summary: `${shots.length} chippar`,
                      outcomes: rounds.flatMap((r, ri) =>
                        r.shots.map((points, si) => ({
                          label: `Slag ${ri * 3 + si + 1}`,
                          context: `${r.distance} m · ${lieName(r.lie)}`,
                          result: CHIP_ZONES.find((z) => z.points === points)!.label,
                          rank: 4 - points,
                          category: ACTIVITY_CATEGORIES[4 - points],
                          basis:
                            "Registrerad poängzon. Avstånd och underlag är inte viktade i analysen.",
                        })),
                      ),
                    }}
                  />
                </div>
              )}
              <div className="my-5 rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-700">
                  NÄSTA UTMANING · {retryDistance} M
                </p>
                <p className="mt-1 text-base font-bold">
                  {goalAt(progress, retryDistance, lie).label} ·{" "}
                  {goalAt(progress, retryDistance, lie).points} poäng
                </p>
              </div>
              <button onClick={() => start("single", retryDistance)} className={primary}>
                <RotateCcw className="h-5 w-5" />
                Försök igen · 3 bollar
              </button>
              <button onClick={() => start("guided", frontier)} className={`${secondary} mt-3`}>
                Ny runda · 9 bollar
              </button>
              <button
                onClick={home}
                className="mt-2 min-h-12 w-full text-sm font-bold text-slate-500"
              >
                Till stationskartan
              </button>
              <button
                onClick={() => {
                  commit({ type: "home" });
                  onExit();
                }}
                className="min-h-12 w-full text-sm font-bold text-slate-500"
              >
                Avsluta
              </button>
            </section>
          )}
        </>
      )}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-white text-slate-950">
          <DialogTitle className="text-2xl">
            {detail} meter · {lieName(lie)}
          </DialogTitle>
          <DialogDescription>
            {selectedOpen
              ? "Tre bollar. Slå ditt rekord eller ta nästa stjärna."
              : `Ta första stjärnan på ${CHIP_STATIONS[Math.max(0, CHIP_STATIONS.findIndex((s) => s.distance === detail) - 1)].distance} m från ${lieName(lie).toLowerCase()} för att öppna.`}
          </DialogDescription>
          {detail !== null && (
            <>
              <Stars count={starsAt(progress, detail, lie)} large />
              <p className="text-base">
                Ditt rekord: <strong>{bestAt(progress, detail, lie) ?? "–"}/12</strong>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {starTargets(detail, lie).map((target, i) => (
                  <div key={target} className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-sm text-slate-500">
                      {i + 1} {i === 0 ? "stjärna" : "stjärnor"}
                    </p>
                    <strong>{target} p</strong>
                  </div>
                ))}
              </div>
              {selectedOpen && (
                <button className={primary} onClick={() => start("single", detail)}>
                  Spela station · 3 bollar
                </button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={endDialog} onOpenChange={setEndDialog}>
        <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-3xl bg-white text-slate-950">
          <DialogTitle>Avsluta rundan?</DialogTitle>
          <DialogDescription>
            Färdiga omgångar är sparade. Ett ofullständigt försök räknas inte med.
          </DialogDescription>
          <button className={primary} onClick={finish}>
            Visa resultat
          </button>
          <button className={secondary} onClick={() => setEndDialog(false)}>
            Fortsätt rundan
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-white text-slate-950">
          <DialogTitle>Tre bollar. Ett nytt mål.</DialogTitle>
          <DialogDescription>
            Slå tre bollar från samma plats och underlag. Registrera sedan vid hålet. En guidad
            runda innehåller tre omgångar.
          </DialogDescription>
          {CHIP_ZONES.map((z) => (
            <div
              key={z.points}
              className="flex justify-between border-b border-slate-100 py-2 text-base"
            >
              <span>{z.label}</span>
              <strong>{z.points} p</strong>
            </div>
          ))}
          <p className="text-sm leading-6">
            Första stjärnan öppnar nästa avstånd. Kortklippt och ruff har egna rekord och stjärnor.
            Du kan alltid återvända till öppna stationer. Exakt 1, 2 och 3 meter räknas inom
            respektive zon.
          </p>
          <p className="text-sm text-slate-500">
            {coach.emoji} {coach.name}: Lägg tre bollar på samma underlag. I ruff ska bollen vara
            synlig. Mät eller stega avståndet till hålet.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
