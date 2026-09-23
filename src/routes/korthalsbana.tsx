import {
  CourseCelebration,
  CoursePressure,
  CourseCompactStyles,
} from "@/components/course-celebration";
import { coursePressure } from "@/lib/course-pressure";
import { CourseHoleResult, CourseMatchBar, CourseStrokeInput } from "@/components/course-match-ui";
import { allowanceOptions, allowanceLabel, normalizeAllowance } from "@/lib/course-allowance";
import { CoursePlayerPicker } from "@/components/course-player-picker";
import { CourseCompetition } from "@/components/course-competition";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  distributeStrokes,
  matchStatus,
  netHole,
  parseGame,
  totals,
  type CourseGame,
  type HoleScore,
} from "@/lib/short-course";

export const Route = createFileRoute("/korthalsbana")({
  head: () => ({ meta: [{ title: "Spela på bana | SG4" }] }),
  component: CourseHub,
});
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
      className={`min-h-14 rounded-2xl border-2 px-3 py-3 font-semibold ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
    >
      {children}
    </button>
  );
}
function CourseHub() {
  useHideBottomNav(true);
  const [mode, setMode] = useState<"duel" | "group" | "tournament" | null>(null);
  const { user, loading } = useAuth();
  const [pending, setPending] = useState<string[]>([]);
  useEffect(() => {
    if (loading || mode) return;
    const suffix = user?.id ?? "guest";
    try {
      setPending([
        ...(localStorage.getItem(`sg4.course-game.v1:${suffix}`) ? ["duel"] : []),
        ...(localStorage.getItem(`sg4.course-competition.v1:${suffix}:group`) ? ["group"] : []),
        ...(localStorage.getItem(`sg4.course-competition.v1:${suffix}:tournament`)
          ? ["tournament"]
          : []),
      ]);
    } catch {
      setPending([]);
    }
  }, [loading, user?.id, mode]);
  if (mode === "duel") return <CourseGamePage onBack={() => setMode(null)} />;
  if (mode) return <CourseCompetition kind={mode} onBack={() => setMode(null)} />;
  return (
    <div className="min-h-dvh bg-[#fcfdf9] pb-10 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto grid max-w-lg grid-cols-[44px_1fr_44px] items-center gap-2">
          <Link
            to="/"
            aria-label="Till startsidan"
            className="flex h-11 w-11 items-center justify-center rounded-full border"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-center font-semibold">Spela på bana</p>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-5 px-4 pt-6">
        <section className="rounded-3xl bg-blue-600 p-6 text-white">
          <Flag className="mb-4 h-8 w-8" />
          <h1 className="font-display text-4xl leading-tight">Spela på bana</h1>
          <p className="mt-3 text-lg">Tävla på valfria golfhål.</p>
          <p className="mt-2 text-blue-100">
            Korthålsbana eller fulla hål. Välj hur ni vill tävla – inget par eller banregister
            behövs.
          </p>
        </section>
        {(
          [
            ["duel", "1 mot 1", "Utmana en vän eller bot. Matchspel eller slagspel."],
            ["group", "Flera spelare", "2–6 spelare. Lägst antal slag vinner."],
            [
              "tournament",
              "Turnering",
              "3–16 spelare. Utslagsbracket eller alla möter alla följt av slutspel.",
            ],
          ] as const
        ).map(([id, title, description]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`${card} flex w-full items-center gap-4 text-left`}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-display text-3xl">{title}</span>
              <span className="mt-2 block text-sm text-slate-600">{description}</span>
              {pending.includes(id) && (
                <span className="mt-2 block text-sm font-bold text-blue-700">
                  Pågående spel · fortsätt
                </span>
              )}
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-blue-600" />
          </button>
        ))}
        <p className="text-center text-sm text-slate-500">
          Välj samma spelläge för att återuppta ett pågående spel. Resultaten sparas bara medan ni
          spelar.
        </p>
      </main>
    </div>
  );
}
function CourseGamePage({ onBack }: { onBack: () => void }) {
  const { user, displayName, loading } = useAuth();
  const storageKey = `sg4.course-game.v1:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<CourseGame | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<CourseGame | null>(null);
  const [screen, setScreen] = useState<"home" | "setup" | "play" | "result">("home");
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<CourseGame["mode"]>("friend");
  const [format, setFormat] = useState<CourseGame["format"]>("match");
  const [friend, setFriend] = useState("");
  const [friendId, setFriendId] = useState<string | undefined>();
  const [bot, setBot] = useState(1);
  const [holes, setHoles] = useState(6);
  const [allowance, setAllowance] = useState(0);
  const [recipient, setRecipient] = useState<CourseGame["recipient"]>("other");
  const [giveStrokes, setGiveStrokes] = useState(false);
  const [abandon, setAbandon] = useState(false);
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
      setActive(parseGame(localStorage.getItem(storageKey)));
      setReady(true);
      setError("");
    } catch {
      setError("Det gick inte att läsa ditt pågående spel. Ladda om och försök igen.");
    }
  }, [storageKey, loading]);
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
    displayName?.trim() || "Du",
    mode === "bot" ? bots[bot].name : friend.trim() || "Vän",
  ];
  const extra = giveStrokes ? normalizeAllowance(allowance, holes) : 0;
  const allocation = distributeStrokes(holes, extra);
  function beginSetup() {
    setStep(0);
    setResult(null);
    setScreen("setup");
  }
  function start() {
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
  function updateDraft(side: keyof HoleScore, value: number) {
    if (!active) return;
    if (edit !== null && editScore) setEditScore({ ...editScore, [side]: value });
    else save({ ...active, draft: { ...active.draft, [side]: value } });
  }
  function register() {
    if (!active) return;
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
    if (save(null)) {
      setResult(game);
      setScreen("result");
      setCelebrating(true);
    }
  }
  const game = screen === "result" ? result : active;
  const status = game ? matchStatus(game) : null;
  const gross = game ? totals(game) : [0, 0];
  const net = game ? totals(game, true) : [0, 0];
  const draft = edit !== null && editScore ? editScore : active?.draft;
  const holeIndex =
    edit ?? Math.max(0, (active?.scores.length ?? 0) - (active?.awaitingNext ? 1 : 0));
  const holeExtra = active ? distributeStrokes(active.holes, active.allowance)[holeIndex] : 0;
  const complete = !!active && active.scores.length === active.holes;
  const last = active?.scores.at(-1);
  const winner =
    game && status
      ? game.format === "match"
        ? status.diff > 0
          ? 0
          : status.diff < 0
            ? 1
            : -1
        : net[0] < net[1]
          ? 0
          : net[0] > net[1]
            ? 1
            : -1
      : -1;
  const title = ["Vem spelar du mot?", "Hur vill ni tävla?", "Hur många hål?", "Slagfördelning"][
    step
  ];
  return (
    <div
      className={`${screen === "play" ? "course-compact" : ""} min-h-dvh bg-[#fcfdf9] pb-10 text-slate-950`}
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
                if (screen === "setup" && step > 0) setStep(step - 1);
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
          <p className="text-center font-semibold">Spela på bana</p>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-5 px-4 pt-6">
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {screen === "home" && (
          <>
            <section className="rounded-3xl bg-blue-600 p-6 text-white">
              <Flag className="mb-4 h-8 w-8" />
              <h1 className="font-display text-4xl leading-tight">Spela på bana</h1>
              <p className="mt-3 text-lg">Utmana en vän eller bot på valfria golfhål.</p>
              <p className="mt-3 text-blue-100">
                Korthålsbana eller fulla hål – ni väljer var. Räkna slagen och tävla mot varandra.
              </p>
            </section>
            <section className={card}>
              <h2 className="text-lg font-bold">Så fungerar det</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
                <li>Välj motståndare, spelform och antal hål.</li>
                <li>Spela scratch eller ge någon extraslag.</li>
                <li>Registrera era slag efter varje hål. Appen räknar ut vem som vinner.</li>
              </ol>
              <p className="mt-4 text-sm text-slate-500">
                Inget par eller banregister. Bara ert spel här och nu. Mot en vän använder ni samma
                telefon. Mot bot väljer du ungefärlig hållängd.
              </p>
            </section>
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
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Steg {step + 1} av 4
            </p>
            <h1 className="font-display text-4xl leading-tight">{title}</h1>
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
                {mode === "friend" ? (
                  <CoursePlayerPicker
                    label="Välj vän"
                    name={friend}
                    userId={friendId}
                    onChange={(p) => {
                      setFriend(p.name);
                      setFriendId(p.userId);
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {bots.map((b, i) => (
                      <Choice key={b.name} selected={bot === i} onClick={() => setBot(i)}>
                        {b.name}
                        <span className="block text-sm font-normal">{b.level}</span>
                      </Choice>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 1 && (
              <div className="grid gap-3">
                <Choice selected={format === "match"} onClick={() => setFormat("match")}>
                  Matchspel
                  <span className="mt-1 block text-sm font-normal">
                    Lägst antal slag vinner hålet. Flest vunna hål vinner.
                  </span>
                </Choice>
                <Choice selected={format === "stroke"} onClick={() => setFormat("stroke")}>
                  Slagspel
                  <span className="mt-1 block text-sm font-normal">
                    Spela alla hål. Lägst totalt antal slag vinner.
                  </span>
                </Choice>
              </div>
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 6, 9].map((n) => (
                    <Choice key={n} selected={holes === n} onClick={() => setHoles(n)}>
                      {n} hål
                    </Choice>
                  ))}
                </div>
                <label className="block space-y-2 font-semibold">
                  <span>Valfritt antal</span>
                  <select
                    className={field}
                    value={holes}
                    onChange={(e) => setHoles(Number(e.target.value))}
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1} hål
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Choice selected={!giveStrokes} onClick={() => setGiveStrokes(false)}>
                    Scratch<span className="block text-sm font-normal">Inga extraslag</span>
                  </Choice>
                  <Choice
                    selected={giveStrokes}
                    onClick={() => {
                      setGiveStrokes(true);
                      if (!allowance) setAllowance(1);
                    }}
                  >
                    Ge extraslag<span className="block text-sm font-normal">Totalt för spelet</span>
                  </Choice>
                </div>
                {giveStrokes && (
                  <section className={`${card} space-y-4`}>
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
                <section className="rounded-2xl bg-blue-50 p-4 text-blue-950">
                  <p className="font-bold">
                    {holes} hål · {format === "match" ? "Matchspel" : "Slagspel"}
                  </p>
                  <p className="mt-2">
                    {!extra
                      ? "Scratch – ni spelar utan extraslag."
                      : `${names[recipient === "you" ? 0 : 1]} får totalt ${extra} extraslag.`}
                  </p>
                  {extra > 0 && (
                    <p className="mt-2 text-sm">
                      {format === "stroke"
                        ? `${extra} slag dras av från slutresultatet.`
                        : allocation
                            .map((n, i) => (n ? `Hål ${i + 1}: ${n} extraslag` : null))
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                  )}
                </section>
              </>
            )}
            <button
              className={primary}
              disabled={mode === "friend" && !friend.trim()}
              onClick={() => (step < 3 ? setStep(step + 1) : start())}
            >
              {step === 3 ? "Starta spelet" : "Nästa"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
        {(screen === "play" || screen === "result") && game && status && (
          <>
            {screen === "play" && (
              <>
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {game.format === "match" ? "Matchspel" : "Slagspel"} · Spela på bana
                </p>
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
            {screen === "result" && (
              <section className={card}>
                <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
                  {game.format === "match" ? "Matchspel" : "Slagspel"} · {game.scores.length}/
                  {game.holes} hål
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  {game.names.map((name, i) => (
                    <div key={i}>
                      <p
                        className={`break-words text-lg font-bold ${i === 0 ? "text-blue-700" : "text-red-700"}`}
                      >
                        {name}
                      </p>
                      <p className="mt-1 text-3xl font-bold tabular-nums">
                        {gross[i]}
                        <span className="ml-1 text-sm font-normal text-slate-500">slag</span>
                      </p>
                    </div>
                  ))}
                </div>
                {game.format === "match" && (
                  <p className="mt-4 text-center font-bold">
                    {status.diff === 0
                      ? "Lika"
                      : `${game.names[status.diff > 0 ? 0 : 1]} ${Math.abs(status.diff)} upp`}
                    {status.decided ? " · Matchen är avgjord" : ""}
                  </p>
                )}
                {game.allowance > 0 && (
                  <p className="mt-3 text-center text-sm text-slate-600">
                    {game.names[game.recipient === "you" ? 0 : 1]} har {game.allowance} extraslag
                    totalt{game.format === "stroke" ? " · dras av vid slutresultatet" : ""}
                  </p>
                )}
              </section>
            )}
            {screen === "play" && active && (
              <>
                {!active.awaitingNext &&
                  edit === null &&
                  coursePressure(
                    active.names,
                    active.format,
                    status.diff,
                    active.scores.length,
                    active.holes,
                  ) && (
                    <CoursePressure
                      text={coursePressure(
                        active.names,
                        active.format,
                        status.diff,
                        active.scores.length,
                        active.holes,
                      )!}
                    />
                  )}
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
                    <h1 className="course-input-heading text-center font-display text-3xl uppercase leading-tight">
                      {edit !== null ? `Redigera hål ${edit + 1}` : "Antal slag"}
                    </h1>
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
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-display text-xl uppercase leading-tight text-white"
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
            {screen === "result" && (
              <section
                className={`rounded-3xl p-6 text-center text-white ${winner === 1 ? "bg-red-600" : winner === 0 ? "bg-blue-600" : "bg-slate-600"}`}
              >
                <Trophy className="mx-auto mb-3 h-9 w-9" />
                <h1 className="font-display text-4xl leading-tight">
                  {winner < 0 ? "Oavgjort!" : `${game.names[winner === 0 ? 0 : 1]} vinner!`}
                </h1>
                <p className="mt-3">
                  {game.format === "stroke"
                    ? `${net[0]}–${net[1]} slag${game.allowance ? " efter slagavdrag" : ""}`
                    : status.diff === 0
                      ? "Lika efter alla hål"
                      : `${Math.abs(status.diff)} upp efter ${game.holes} hål`}
                </p>
              </section>
            )}
            {game.scores.length > 0 && (
              <details
                className={`course-scorecard ${card} overflow-x-auto`}
                open={screen === "result" ? true : undefined}
              >
                <summary className="min-h-11 cursor-pointer text-base font-bold">
                  Scorekort · redigera hål
                </summary>
                <table className="w-full table-fixed text-center text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="w-16 py-3">Hål</th>
                      {game.names.map((n, i) => (
                        <th key={i} className="break-words px-1 py-3">
                          {n}
                        </th>
                      ))}
                      {screen === "play" && (
                        <th className="w-16">
                          <span className="sr-only">Redigera</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {game.scores.map((s, i) => {
                      const adjusted = netHole(game, s, i);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3">{i + 1}</td>
                          {(["you", "other"] as const).map((side) => (
                            <td key={side} className="py-3">
                              {s[side]}
                              {game.format === "match" && adjusted[side] !== s[side] && (
                                <span className="block text-xs text-blue-700">
                                  netto {adjusted[side]}
                                </span>
                              )}
                            </td>
                          ))}
                          {screen === "play" && (
                            <td>
                              <button
                                aria-label={`Ändra hål ${i + 1}`}
                                className="min-h-11 text-blue-700 underline"
                                onClick={() => {
                                  setEdit(i);
                                  setEditScore({ ...s });
                                }}
                              >
                                Ändra
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            )}
            {screen === "result" && (
              <>
                <button className={primary} onClick={beginSetup}>
                  Spela igen
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  className="min-h-12 w-full font-semibold"
                  onClick={() => {
                    setResult(null);
                    setScreen("home");
                  }}
                >
                  Avsluta
                </button>
              </>
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
