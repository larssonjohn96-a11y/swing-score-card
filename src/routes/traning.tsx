import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  RotateCcw,
  Target,
  Trophy,
  Undo2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/traning")({
  head: () => ({
    meta: [
      { title: "Träningstester | SG4" },
      {
        name: "description",
        content:
          "Färdigbyggda träningstester för putting, around the green, approach och off the tee. Följ din utveckling utan att påverka SG4 HCP.",
      },
    ],
  }),
  component: TrainingTestsPage,
});

type Category = "putting" | "around-the-green" | "approach" | "off-the-tee";

type EightBallStation = {
  id: string;
  title: string;
  distance: string;
  instruction: string;
};

type EightBallShot = {
  round: number;
  stationId: string;
  stationTitle: string;
  distance: string;
  points: number;
};

type EightBallRun = {
  id: string;
  createdAt: string;
  score: number;
  shots: EightBallShot[];
};

const EIGHT_BALL_HISTORY_KEY = "sg4-training-eight-ball-v1";

const CATEGORIES: Array<{
  id: Category;
  title: string;
  description: string;
}> = [
  {
    id: "putting",
    title: "Putting",
    description: "Puttning, startlinje och längdkontroll",
  },
  {
    id: "around-the-green",
    title: "Around the Green",
    description: "Chip, pitch, lobb och bunker",
  },
  {
    id: "approach",
    title: "Approach",
    description: "Wedges, järn och range targets",
  },
  {
    id: "off-the-tee",
    title: "Off the Tee",
    description: "Driver, precision och shot shaping",
  },
];

const EIGHT_BALL_STATIONS: EightBallStation[] = [
  {
    id: "chip-10",
    title: "Chip",
    distance: "10 m",
    instruction: "Spela ett chipslag mot hålet.",
  },
  {
    id: "chip-30",
    title: "Chip",
    distance: "30 m",
    instruction: "Spela ett chipslag mot hålet.",
  },
  {
    id: "pitch-20",
    title: "Pitch",
    distance: "20 m",
    instruction: "Spela ett pitchslag mot hålet.",
  },
  {
    id: "pitch-40",
    title: "Pitch",
    distance: "40 m",
    instruction: "Spela ett pitchslag mot hålet.",
  },
  {
    id: "lobb-15",
    title: "Lobb",
    distance: "15 m",
    instruction: "Spela ett lobbslag mot hålet.",
  },
  {
    id: "lobb-25",
    title: "Lobb",
    distance: "25 m",
    instruction: "Spela ett lobbslag mot hålet.",
  },
  {
    id: "bunker-10",
    title: "Bunker",
    distance: "10 m",
    instruction: "Spela ett bunkerslag mot hålet.",
  },
  {
    id: "bunker-20",
    title: "Bunker",
    distance: "20 m",
    instruction: "Spela ett bunkerslag mot hålet.",
  },
];

const SCORE_OPTIONS = [
  { points: 4, title: "I hål", helper: "4 poäng" },
  { points: 3, title: "≤ 1 m", helper: "3 poäng" },
  { points: 2, title: "≤ 2 m", helper: "2 poäng" },
  { points: 1, title: "≤ 3 m", helper: "1 poäng" },
  { points: 0, title: "> 3 m", helper: "0 poäng" },
] as const;

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadEightBallHistory(): EightBallRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EIGHT_BALL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEightBallHistory(runs: EightBallRun[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EIGHT_BALL_HISTORY_KEY, JSON.stringify(runs));
}

function scoreByRound(shots: EightBallShot[]) {
  return Array.from({ length: 5 }, (_, index) => {
    const round = index + 1;
    return shots
      .filter((shot) => shot.round === round)
      .reduce((sum, shot) => sum + shot.points, 0);
  });
}

function TrainingTestsPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [showEightBallIntro, setShowEightBallIntro] = useState(false);
  const [runningEightBall, setRunningEightBall] = useState(false);
  const [shots, setShots] = useState<EightBallShot[]>([]);
  const [completedRun, setCompletedRun] = useState<EightBallRun | null>(null);
  const [history, setHistory] = useState<EightBallRun[]>([]);

  useEffect(() => {
    setHistory(loadEightBallHistory());
  }, []);

  const shotIndex = shots.length;
  const round = Math.floor(shotIndex / EIGHT_BALL_STATIONS.length) + 1;
  const stationIndex = shotIndex % EIGHT_BALL_STATIONS.length;
  const activeStation = EIGHT_BALL_STATIONS[stationIndex];
  const totalScore = shots.reduce((sum, shot) => sum + shot.points, 0);
  const roundScores = useMemo(() => scoreByRound(shots), [shots]);
  const bestScore = history.length
    ? Math.max(...history.map((run) => run.score))
    : null;

  function chooseCategory(next: Category) {
    setCategory(next);
    setShowEightBallIntro(false);
  }

  function backToCategories() {
    setCategory(null);
    setShowEightBallIntro(false);
  }

  function startEightBall() {
    setShots([]);
    setCompletedRun(null);
    setRunningEightBall(true);
  }

  function closeEightBall() {
    setRunningEightBall(false);
    setCompletedRun(null);
    setShots([]);
  }

  function recordEightBallShot(points: number) {
    if (!activeStation || shotIndex >= 40) return;

    const nextShots: EightBallShot[] = [
      ...shots,
      {
        round,
        stationId: activeStation.id,
        stationTitle: activeStation.title,
        distance: activeStation.distance,
        points,
      },
    ];

    setShots(nextShots);

    if (nextShots.length === 40) {
      const score = nextShots.reduce((sum, shot) => sum + shot.points, 0);
      const run: EightBallRun = {
        id: createId(),
        createdAt: new Date().toISOString(),
        score,
        shots: nextShots,
      };
      const nextHistory = [run, ...history];
      setHistory(nextHistory);
      saveEightBallHistory(nextHistory);
      setCompletedRun(run);
    }
  }

  function undoEightBallShot() {
    if (!shots.length || completedRun) return;
    setShots((current) => current.slice(0, -1));
  }

  if (runningEightBall) {
    const progress = Math.min(100, (shots.length / 40) * 100);
    const completedRoundScores = scoreByRound(completedRun?.shots ?? shots);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeEightBall}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border"
            aria-label="Avsluta 8-bollsövningen"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Around the Green
            </p>
            <p className="text-sm font-semibold">8-bollsövningen</p>
          </div>
          <span className="w-10" />
        </div>

        {completedRun ? (
          <section className="mt-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              40 av 40 slag
            </p>
            <h1 className="mt-2 font-display text-4xl leading-none">Test klart</h1>

            <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Totalpoäng
              </p>
              <p className="mt-2 font-display text-6xl leading-none text-primary">
                {completedRun.score}
                <span className="ml-1 text-2xl text-muted-foreground">/160</span>
              </p>
              {bestScore !== null ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Personbästa: <span className="font-semibold text-foreground">{Math.max(bestScore, completedRun.score)}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {completedRoundScores.map((score, index) => (
                <div key={index} className="rounded-2xl border border-border bg-card px-2 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    V{index + 1}
                  </p>
                  <p className="mt-1 font-display text-xl leading-none">{score}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startEightBall}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
            >
              <RotateCcw className="h-5 w-5" />
              Kör igen
            </button>
            <button
              type="button"
              onClick={closeEightBall}
              className="mt-3 w-full rounded-2xl border border-border py-4 text-sm font-semibold"
            >
              Till träningstester
            </button>
          </section>
        ) : (
          <>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Varv {Math.min(round, 5)} av 5</span>
              <span>Slag {shots.length + 1} av 40</span>
            </div>

            <section className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Station {stationIndex + 1} av 8
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-4xl leading-none">{activeStation.title}</h1>
                  <p className="mt-2 text-lg font-semibold text-primary">{activeStation.distance}</p>
                </div>
                <div className="rounded-2xl bg-muted/60 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Score
                  </p>
                  <p className="font-display text-2xl leading-none">{totalScore}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{activeStation.instruction}</p>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Var slutade bollen?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {SCORE_OPTIONS.map((option, index) => (
                    <button
                      key={option.points}
                      type="button"
                      onClick={() => recordEightBallShot(option.points)}
                      className={`rounded-2xl border p-4 text-left transition-colors active:scale-[0.99] ${
                        index === 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary"
                      } ${index === SCORE_OPTIONS.length - 1 ? "col-span-2" : ""}`}
                    >
                      <span className="block font-display text-2xl leading-none">{option.title}</span>
                      <span
                        className={`mt-1 block text-xs ${
                          index === 0 ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {option.helper}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={undoEightBallShot}
                disabled={!shots.length}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground disabled:opacity-30"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Ångra senaste
              </button>
              <div className="flex gap-1.5">
                {roundScores.map((score, index) => (
                  <span
                    key={index}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                      index + 1 === round
                        ? "bg-primary text-primary-foreground"
                        : score > 0
                          ? "bg-muted text-foreground"
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {score > 0 ? score : `V${index + 1}`}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Träningstester
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-4xl leading-none">
          <Dumbbell className="h-7 w-7 text-primary" />
          Träna & följ progress
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Färdigbyggda tester för sådant golfare redan tränar på. De påverkar inte ditt SG4 HCP.
        </p>
      </header>

      {!category ? (
        <section className="mt-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Vad vill du träna?
          </p>
          <div className="mt-3 space-y-3">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseCategory(item.id)}
                className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                  {item.id === "around-the-green" ? (
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      1 färdigt test
                    </span>
                  ) : (
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Fler test kommer
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-7">
          <button
            type="button"
            onClick={backToCategories}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kategorier
          </button>

          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">
            {CATEGORIES.find((item) => item.id === category)?.title}
          </p>
          <h2 className="mt-1 font-display text-3xl leading-none">Träningstester</h2>

          {category === "around-the-green" ? (
            <div className="mt-4 space-y-3">
              {!showEightBallIntro ? (
                <button
                  type="button"
                  onClick={() => setShowEightBallIntro(true)}
                  className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl leading-none">8-bollsövningen</span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      Chip, pitch, lobb och bunker från åtta stationer. Fem varv.
                    </span>
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      40 slag · max 160 poäng
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
                  <button
                    type="button"
                    onClick={() => setShowEightBallIntro(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Around the Green
                  </button>
                  <p className="mt-5 text-xs uppercase tracking-[0.2em] text-primary">
                    Färdigbyggt test
                  </p>
                  <h3 className="mt-1 font-display text-4xl leading-none">8-bollsövningen</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Spela ett slag från varje station i ordning och upprepa hela serien fem gånger. Du matar in resultatet direkt efter varje slag.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {EIGHT_BALL_STATIONS.map((station) => (
                      <div key={station.id} className="rounded-2xl bg-muted/50 p-3">
                        <p className="text-sm font-semibold">{station.title}</p>
                        <p className="text-xs text-muted-foreground">{station.distance}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Poäng per slag
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {SCORE_OPTIONS.map((option) => (
                        <div key={option.points} className="flex items-center justify-between gap-3">
                          <span>{option.title}</span>
                          <span className="font-semibold">{option.points} p</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {history.length ? (
                    <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Personbästa</span>
                        <span className="font-display text-2xl">{bestScore}/160</span>
                      </div>
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {history.slice(0, 5).map((run) => (
                          <span
                            key={run.id}
                            className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
                          >
                            {run.score} p
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={startEightBall}
                    className="mt-6 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
                  >
                    Starta 40 slag
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-border p-6 text-center">
              <Target className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">Färdiga tester kommer här</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vi bygger de vanligaste etablerade testerna först, istället för att kräva att du sätter upp dem själv.
              </p>
            </div>
          )}
        </section>
      )}

      <div className="mt-10 border-t border-border pt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Behöver du något eget?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bygg eget test finns kvar som ett sekundärt verktyg och byggs vidare när de viktigaste färdigtesterna är på plats.
        </p>
      </div>

      <Link
        to="/tester"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
      >
        Tillbaka till tester
      </Link>
    </main>
  );
}
