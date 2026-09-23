import { Link } from "@tanstack/react-router";
import { CourseScorecard } from "./course-scorecard";
import { CourseSuddenDeath } from "@/components/course-sudden-death";
import { CourseFinalResult } from "@/components/course-final-result";
import {
  CourseSetupHeader,
  CourseSetupBlock,
  CourseHoleChoices,
  courseSetupAction,
} from "@/components/course-setup";
import {
  CourseCelebration,
  CoursePressure,
  CourseCompactStyles,
} from "@/components/course-celebration";
import { coursePressure } from "@/lib/course-pressure";
import { CourseHoleResult, CourseMatchBar, CourseStrokeInput } from "@/components/course-match-ui";
import { allowanceOptions, allowanceLabel, normalizeAllowance } from "@/lib/course-allowance";
import { CourseOpponentCards } from "@/components/course-opponent-cards";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Trophy, Bot, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  botScore,
  courseWinner,
  distributeStrokes,
  matchStatus,
  netHole,
  parseGame,
  totals,
  type CourseGame,
  type HoleScore,
} from "@/lib/short-course";

const primary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-base font-bold leading-snug text-white disabled:opacity-40";
const card = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950";
const bots = [
  { name: "Emma", level: "Lätt" },
  { name: "Alex", level: "Medel" },
  { name: "Max", level: "Svår" },
];
function Choice({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-16 rounded-2xl border-2 px-3 py-3 font-sans text-base font-bold tracking-normal leading-snug ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
    >
      {children}
    </button>
  );
}
export type CourseOpponent = {
  mode: "friend" | "bot";
  name: string;
  userId?: string;
  botLevel?: number;
};
export function CourseGamePage({
  onBack,
  initialOpponent,
  playerName,
}: {
  onBack: () => void;
  initialOpponent?: CourseOpponent;
  playerName?: string;
}) {
  const { user, displayName, loading } = useAuth();
  const [enteredName, setEnteredName] = useState("");
  const actualName =
    [playerName, displayName, enteredName]
      .find((n) => n?.trim() && !/^(du|you)$/i.test(n.trim()))
      ?.trim() || "";
  const [tieClosed, setTieClosed] = useState(false);
  const storageKey = `sg4.course-game.v1:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<CourseGame | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<CourseGame | null>(null);
  const [screen, setScreen] = useState<"home" | "setup" | "play" | "result">("home");
  const [step, setStep] = useState(initialOpponent ? 1 : 0);
  const [settingsStage, setSettingsStage] = useState(0);
  const [mode, setMode] = useState<CourseGame["mode"]>(initialOpponent?.mode ?? "friend");
  const [format, setFormat] = useState<CourseGame["format"]>("match");
  const [friend, setFriend] = useState(
    initialOpponent?.mode === "friend" ? initialOpponent.name : "",
  );
  const [friendId, setFriendId] = useState<string | undefined>(initialOpponent?.userId);
  const [bot, setBot] = useState(initialOpponent?.botLevel ?? 1);
  const [botName, setBotName] = useState(
    initialOpponent?.mode === "bot" ? initialOpponent.name : "",
  );
  const hasInitialOpponent = !!initialOpponent;
  const [holes, setHoles] = useState(6);
  const [allowance, setAllowance] = useState(0);
  const [recipient, setRecipient] = useState<CourseGame["recipient"]>("other");
  const [giveStrokes, setGiveStrokes] = useState(false);
  const [abandon, setAbandon] = useState(false);
  const [chosenScores, setChosenScores] = useState<[boolean, boolean]>([false, false]);
  const [edit, setEdit] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<HoleScore | null>(null);
  useEffect(() => {
    if (loading) return;
    setReady(false);
    setScreen("home");
    setResult(null);
    setActive(null);
    setEdit(null);
    try {
      const restored = parseGame(localStorage.getItem(storageKey));
      setActive(restored);
      if (restored && !/^(du|you)$/i.test(restored.names[0])) setEnteredName(restored.names[0]);
      if (restored && !hasInitialOpponent) {
        setMode(restored.mode);
        setFriend(restored.mode === "friend" ? restored.names[1] : "");
        setFriendId(restored.opponentId);
        setBot(restored.botLevel);
        setBotName(restored.mode === "bot" ? restored.names[1] : "");
        setFormat(restored.format);
        setHoles(restored.holes);
        setAllowance(restored.allowance);
        setGiveStrokes(restored.allowance > 0);
        setRecipient(restored.recipient);
      }
      setStep(hasInitialOpponent ? 1 : 0);
      setSettingsStage(0);
      setScreen(restored ? "home" : "setup");
      setReady(true);
      setError("");
    } catch {
      setError("Det gick inte att läsa ditt pågående spel. Ladda om och försök igen.");
    }
  }, [storageKey, loading, hasInitialOpponent]);
  useEffect(() => {
    if (!actualName) return;
    if (active && /^(du|you)$/i.test(active.names[0]))
      save({ ...active, names: [actualName, active.names[1]] });
    if (result && /^(du|you)$/i.test(result.names[0]))
      setResult({ ...result, names: [actualName, result.names[1]] });
  }, [actualName, active, result]);
  function rematch() {
    if (!game) return;
    const next = {
      ...game,
      names: [actualName || game.names[0], game.names[1]] as [string, string],
      scores: [],
      rolls: Array.from({ length: game.holes }, () => Math.random()),
      draft: { you: 3, other: 3, length: game.draft.length },
      awaitingNext: false,
      suddenDeath: undefined,
    };
    if (save(next)) {
      setResult(null);
      setEdit(null);
      setCelebrating(false);
      setTieClosed(false);
      setScreen("play");
    }
  }
  function save(game: CourseGame | null) {
    try {
      if (game) localStorage.setItem(storageKey, JSON.stringify(game));
      else localStorage.removeItem(storageKey);
      setActive(game);
      setError("");
      return true;
    } catch {
      setError("Kunde inte spara ändringen. Försök igen innan du lämnar sidan.");
      return false;
    }
  }
  const names: [string, string] = [
    actualName,
    mode === "bot" ? botName || bots[bot].name : friend.trim() || "Vän",
  ];
  const extra = giveStrokes ? normalizeAllowance(allowance, holes) : 0;
  function beginSetup() {
    setStep(hasInitialOpponent ? 1 : 0);
    setSettingsStage(0);
    setResult(null);
    setScreen("setup");
  }
  function start() {
    if (settingsStage < 3 || !actualName) return;
    const game: CourseGame = {
      mode,
      format,
      names,
      opponentId: mode === "friend" ? friendId : undefined,
      holes,
      allowance: extra,
      recipient,
      botLevel: bot,
      rolls: Array.from({ length: holes }, () => Math.random()),
      scores: [],
      draft: { you: 3, other: 3, length: 100 },
    };
    if (save(game)) {
      setEdit(null);
      setScreen("play");
    }
  }
  const canRegister = chosenScores[0] && (active?.mode === "bot" || chosenScores[1]);
  function updateDraft(side: keyof HoleScore, value: number) {
    if (!active) return;
    let saved = true;
    if (edit !== null && editScore) setEditScore({ ...editScore, [side]: value });
    else saved = save({ ...active, draft: { ...active.draft, [side]: value } });
    if (saved && side !== "length")
      setChosenScores((v) => (side === "you" ? [true, v[1]] : [v[0], true]));
  }
  function register() {
    if (!active || !canRegister) return;
    if (edit !== null && editScore) {
      const scores = active.scores.map((s, i) => (i === edit ? editScore : s));
      if (save({ ...active, scores })) {
        setEdit(null);
        setEditScore(null);
      }
      return;
    }
    if (active.awaitingNext || active.scores.length >= active.holes) return;
    const score = { ...active.draft };
    if (active.mode === "bot")
      score.other = botScore(score.length, active.botLevel, active.rolls[active.scores.length]);
    save({
      ...active,
      scores: [...active.scores, score],
      awaitingNext: true,
      draft: { you: 3, other: 3, length: score.length },
    });
  }
  function finish() {
    if (!active || active.scores.length !== active.holes) return;
    const game = active;
    if (courseWinner(game) < 0 || save(null)) {
      setResult(game);
      setScreen("result");
      setCelebrating(courseWinner(game) >= 0);
    }
  }
  const game = screen === "result" ? result : active;
  const status = game ? matchStatus(game) : null;
  const net = game ? totals(game, true) : [0, 0];
  const draft = edit !== null && editScore ? editScore : active?.draft;
  const holeIndex =
    edit ?? Math.max(0, (active?.scores.length ?? 0) - (active?.awaitingNext ? 1 : 0));
  const holeExtra = active ? distributeStrokes(active.holes, active.allowance)[holeIndex] : 0;
  const complete = !!active && active.scores.length === active.holes;
  const last = active?.scores.at(-1);
  const winner = game ? courseWinner(game) : -1;
  useEffect(() => {
    setChosenScores([false, false]);
  }, [holeIndex, edit, screen, active?.awaitingNext]);
  function startSuddenDeath() {
    if (!result || courseWinner(result) >= 0) return;
    if (
      save({
        ...result,
        awaitingNext: false,
        suddenDeath: {
          round: 1,
          roll: Math.random(),
          draft: { you: 3, other: 3, length: result.scores.at(-1)?.length ?? 100 },
        },
      })
    ) {
      setScreen("play");
      setEdit(null);
      setResult(null);
    }
  }
  if (!loading && !actualName && (!active || /^(du|you)$/i.test(active.names[0])))
    return (
      <main className="mx-auto max-w-lg space-y-4 px-5 py-8">
        <button onClick={onBack} className="min-h-11 text-sm text-slate-500">
          ← Tillbaka
        </button>
        <h1 className="text-2xl font-bold">Vad heter du?</h1>
        <p className="text-sm text-slate-600">Namnet visas i matchen och resultatet.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") || "").trim();
            if (name && !/^(du|you)$/i.test(name)) setEnteredName(name);
          }}
          className="space-y-4"
        >
          <input
            name="name"
            aria-label="Ditt namn"
            autoComplete="given-name"
            required
            maxLength={40}
            className={field}
          />
          <button className={primary}>Nästa</button>
        </form>
      </main>
    );
  return (
    <div
      className={`course-readable ${screen === "play" ? "course-compact" : ""} min-h-dvh bg-[#fcfdf9] pb-10 text-slate-950`}
    >
      <CourseCompactStyles />
      {celebrating && screen === "result" && game && winner >= 0 && (
        <CourseCelebration
          name={game.names[winner === 0 ? 0 : 1]}
          tone={winner === 0 ? "blue" : "red"}
          onClose={() => setCelebrating(false)}
        />
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto grid max-w-lg grid-cols-[44px_1fr_44px] items-center gap-2">
          {screen === "home" ? (
            <button
              onClick={onBack}
              aria-label="Till spellägen"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              aria-label="Tillbaka"
              onClick={() => {
                if (screen === "setup" && initialOpponent) onBack();
                else if (screen === "setup" && step > 0) setStep(step - 1);
                else if (screen === "setup") onBack();
                else {
                  setEdit(null);
                  setScreen("home");
                  if (screen === "result") setResult(null);
                }
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <p className="text-center font-semibold">Match · Spela på bana</p>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-5 px-4 pt-6">
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {screen === "home" && ready && (
          <>
            <CourseSetupHeader step={0} title={active ? "Fortsätt matchen" : "Spela igen"} />
            <p className="text-slate-600">
              {active ? `${active.names[0]} mot ${active.names[1]}` : "Redo för nästa match?"}
            </p>
            {active ? (
              <>
                <button className={primary} onClick={() => setScreen("play")}>
                  Fortsätt spelet · {active.scores.length}/{active.holes} hål
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  className="min-h-12 w-full text-sm text-slate-600 underline"
                  onClick={() => setAbandon(true)}
                >
                  Avsluta pågående spel
                </button>
              </>
            ) : (
              <button disabled={!ready} className={primary} onClick={beginSetup}>
                Starta ett spel
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
            <p className="text-center text-sm text-slate-500">
              Pågående spel sparas på den här enheten. Ingen spelhistorik eller statistik.
            </p>
          </>
        )}
        {screen === "setup" && (
          <>
            {initialOpponent ? (
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  {names[0]} mot {names[1]}
                </p>
                <h1 className="mt-2 text-2xl font-bold">Spela på bana</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Korthål eller vanliga hål – ni väljer var.
                </p>
              </div>
            ) : (
              <CourseSetupHeader
                step={step}
                title={
                  step === 0
                    ? mode === "friend"
                      ? "Välj kompis"
                      : "Välj bot"
                    : "Matchinställningar"
                }
              />
            )}

            {step === 1 && (
              <div className="grid grid-cols-[1fr_40px_1fr] items-center overflow-hidden rounded-2xl border border-slate-200 text-center">
                <p className="break-words bg-blue-50 p-3 font-bold text-blue-700">{names[0]}</p>
                <span className="text-xs font-black text-slate-400">VS</span>
                <p className="break-words bg-red-50 p-3 font-bold text-red-700">{names[1]}</p>
              </div>
            )}
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Choice selected={mode === "friend"} onClick={() => setMode("friend")}>
                    <Users className="mx-auto mb-2 h-6 w-6" />
                    Mot vän
                  </Choice>
                  <Choice selected={mode === "bot"} onClick={() => setMode("bot")}>
                    <Bot className="mx-auto mb-2 h-6 w-6" />
                    Mot bot
                  </Choice>
                </div>
                <CourseOpponentCards
                  self={names[0]}
                  mode={mode}
                  friend={friend}
                  friendId={friendId}
                  onFriend={(p) => {
                    setFriend(p.name);
                    setFriendId(p.userId);
                  }}
                  bots={bots}
                  bot={bot}
                  onBot={(index) => {
                    setBot(index);
                    setBotName("");
                  }}
                />
              </>
            )}
            {step === 1 && (
              <CourseSetupBlock title="1. Välj spelform">
                <div className="grid grid-cols-2 gap-2">
                  <Choice
                    selected={settingsStage > 0 && format === "match"}
                    onClick={() => {
                      setFormat("match");
                      setSettingsStage(1);
                    }}
                  >
                    Matchspel
                    <span className="mt-1 block text-sm font-normal">Vinn flest hål.</span>
                  </Choice>
                  <Choice
                    selected={settingsStage > 0 && format === "stroke"}
                    onClick={() => {
                      setFormat("stroke");
                      setSettingsStage(1);
                    }}
                  >
                    Slagspel
                    <span className="mt-1 block text-sm font-normal">Lägst total vinner.</span>
                  </Choice>
                </div>
              </CourseSetupBlock>
            )}
            {step === 1 && (
              <CourseSetupBlock title="2. Välj antal hål" disabled={settingsStage < 1}>
                <CourseHoleChoices
                  value={holes}
                  confirmed={settingsStage >= 2}
                  onChange={(n) => {
                    setHoles(n);
                    setSettingsStage(2);
                  }}
                />
              </CourseSetupBlock>
            )}
            {step === 1 && (
              <CourseSetupBlock title="3. Välj extraslag" disabled={settingsStage < 2}>
                <select
                  aria-label="Välj extraslag"
                  className={field}
                  value={settingsStage >= 3 ? (giveStrokes ? "extra" : "scratch") : ""}
                  onChange={(e) => {
                    setGiveStrokes(e.target.value === "extra");
                    setSettingsStage(3);
                    if (!allowance) setAllowance(1);
                  }}
                >
                  <option value="" disabled>
                    Välj slagfördelning
                  </option>
                  <option value="scratch">Scratch – inga extraslag</option>
                  <option value="extra">Ge extraslag</option>
                </select>
                {giveStrokes && settingsStage >= 3 && (
                  <section className="space-y-3 border-t border-slate-200 pt-4">
                    <label className="block space-y-2 font-semibold">
                      <span>Vem får extraslagen?</span>
                      <select
                        className={field}
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value as CourseGame["recipient"])}
                      >
                        <option value="you">{names[0]}</option>
                        <option value="other">{names[1]}</option>
                      </select>
                    </label>
                    <label className="block space-y-2 font-semibold">
                      <span>Antal extraslag totalt</span>
                      <select
                        className={field}
                        value={normalizeAllowance(allowance, holes)}
                        onChange={(e) => setAllowance(Number(e.target.value))}
                      >
                        {allowanceOptions(holes).map((n) => (
                          <option key={n} value={n}>
                            {allowanceLabel(n, holes)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                )}
              </CourseSetupBlock>
            )}
            <button
              className={courseSetupAction}
              disabled={
                !ready ||
                !!active ||
                (mode === "friend" && !friend.trim()) ||
                (step === 1 && settingsStage < 3)
              }
              onClick={() => {
                if (step === 0) {
                  setStep(1);
                  window.scrollTo({ top: 0 });
                } else start();
              }}
            >
              {step === 1 ? "Starta matchen" : "Nästa"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
        {screen === "play" && active?.suddenDeath && (
          <CourseSuddenDeath game={active} onSave={save} onFinish={finish} />
        )}
        {(screen === "result" || (screen === "play" && !game?.suddenDeath)) && game && status && (
          <>
            {screen === "play" && (
              <>
                <CourseMatchBar
                  names={game.names}
                  holes={game.holes}
                  current={edit ?? game.scores.length - (game.awaitingNext ? 1 : 0)}
                  format={game.format}
                  margin={
                    game.format === "match" ? status.diff : game.scores.length ? net[1] - net[0] : 0
                  }
                  results={game.scores.map((s, i) => {
                    const n = netHole(game, s, i);
                    return Math.sign(n.other - n.you);
                  })}
                />
              </>
            )}
            {screen === "result" && <CourseFinalResult game={game} />}
            {screen === "play" && active && (
              <>
                {edit === null &&
                  coursePressure(
                    active.names,
                    active.format,
                    matchStatus({ ...active, scores: active.scores.slice(0, holeIndex) }).diff,
                    holeIndex,
                    active.holes,
                  ) && (
                    <CoursePressure
                      text={coursePressure(
                        active.names,
                        active.format,
                        matchStatus({ ...active, scores: active.scores.slice(0, holeIndex) }).diff,
                        holeIndex,
                        active.holes,
                      )!}
                    />
                  )}
                <div className="course-hole-heading text-center">
                  <h1 className="course-input-heading text-3xl font-bold leading-tight">
                    {edit !== null ? `Redigera hål ${edit + 1}` : `Hål ${holeIndex + 1}`}
                  </h1>
                  <p
                    className={`mt-1 text-sm text-slate-600 ${active.awaitingNext && edit === null ? "invisible" : ""}`}
                  >
                    Hur många slag blev det?
                  </p>
                </div>
                {active.awaitingNext && last && edit === null && (
                  <CourseHoleResult
                    names={active.names}
                    hole={active.scores.length}
                    scores={[last.you, last.other]}
                    net={[
                      netHole(active, last, active.scores.length - 1).you,
                      netHole(active, last, active.scores.length - 1).other,
                    ]}
                    nextLabel={complete ? "Visa slutresultat" : "Nästa hål"}
                    onNext={() => (complete ? finish() : save({ ...active, awaitingNext: false }))}
                  />
                )}
                {((!complete && !active.awaitingNext) || edit !== null) && draft && (
                  <>
                    {active.format === "match" && holeExtra > 0 && (
                      <p className="course-extra rounded-2xl bg-blue-50 p-3 text-center font-semibold text-blue-800">
                        {active.names[active.recipient === "you" ? 0 : 1]} har {holeExtra} extraslag
                        här.
                      </p>
                    )}
                    {active.mode === "bot" && (
                      <label className="course-bot-length block space-y-2 font-semibold">
                        <span>Ungefärlig hållängd</span>
                        <select
                          disabled={edit !== null}
                          className={field}
                          value={draft.length}
                          onChange={(e) => updateDraft("length", Number(e.target.value))}
                        >
                          <option value={100}>Upp till 200 m</option>
                          <option value={300}>201–400 m</option>
                          <option value={500}>Över 400 m</option>
                        </select>
                        <span className="block text-sm font-normal text-slate-500">
                          Botens resultat anpassas efter längd och nivå och visas när du registrerar
                          hålet.
                        </span>
                      </label>
                    )}
                    <CourseStrokeInput
                      key={`you-${holeIndex}-${edit !== null ? "edit" : "play"}`}
                      name={active.names[0]}
                      value={draft.you}
                      onChange={(v) => updateDraft("you", v)}
                    />
                    {active.mode === "friend" ? (
                      <CourseStrokeInput
                        key={`other-${holeIndex}-${edit !== null ? "edit" : "play"}`}
                        name={active.names[1]}
                        tone="red"
                        value={draft.other}
                        onChange={(v) => updateDraft("other", v)}
                      />
                    ) : (
                      edit !== null && (
                        <p className="text-center">
                          {active.names[1]}: {draft.other} slag
                        </p>
                      )
                    )}
                    <p className="course-input-hint text-center text-sm text-slate-500">
                      Ange verkligt antal slag. Appen räknar av extraslagen.
                    </p>
                    <button
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-display text-xl uppercase leading-tight text-white disabled:bg-slate-300 disabled:text-slate-500"
                      disabled={!canRegister}
                      onClick={register}
                    >
                      {edit !== null ? "Spara ändring" : `Registrera hål ${holeIndex + 1}`}
                      <ArrowRight className="h-5 w-5" />
                    </button>
                    {edit !== null && (
                      <button
                        className="min-h-11 w-full underline"
                        onClick={() => {
                          setEdit(null);
                          setEditScore(null);
                        }}
                      >
                        Avbryt ändring
                      </button>
                    )}
                  </>
                )}
                {complete && !active.awaitingNext && edit === null && (
                  <button className={primary} onClick={finish}>
                    Visa slutresultat
                    <Trophy className="h-5 w-5" />
                  </button>
                )}
                {status.decided && !complete && (
                  <p className="text-center text-sm text-slate-600">
                    Ni kan fortsätta spela klart de återstående hålen.
                  </p>
                )}
              </>
            )}
            {screen === "play" && game.scores.length > 0 && edit === null && (
              <button
                className="min-h-11 w-full text-center text-xs text-slate-400 underline underline-offset-4"
                onClick={() => {
                  const i = game.scores.length - 1;
                  setEdit(i);
                  setEditScore({ ...game.scores[i] });
                }}
              >
                Redigera föregående hål
              </button>
            )}
            {screen === "result" && <CourseScorecard game={game} />}
            {screen === "result" && winner < 0 && !tieClosed && (
              <>
                <button className={courseSetupAction} onClick={startSuddenDeath}>
                  Spela sudden death
                </button>
                <button
                  className="min-h-12 w-full rounded-2xl border border-slate-300 font-bold text-slate-600"
                  onClick={() => {
                    if (save(null)) {
                      setTieClosed(true);
                    }
                  }}
                >
                  Avsluta oavgjort
                </button>
              </>
            )}
            {screen === "result" && (winner >= 0 || tieClosed) && (
              <div className="space-y-3">
                <button className={courseSetupAction} onClick={rematch}>
                  Rematch <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
                  onClick={onBack}
                >
                  Match i annan kategori
                </button>
                <Link
                  to="/"
                  className="flex min-h-12 items-center justify-center text-sm font-semibold text-slate-500"
                >
                  Hem
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <AlertDialog open={abandon} onOpenChange={setAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta pågående spel?</AlertDialogTitle>
            <AlertDialogDescription>
              Resultaten tas bort. Du kan sedan starta ett nytt spel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt spela</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (save(null)) setScreen("home");
              }}
            >
              Avsluta spelet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
