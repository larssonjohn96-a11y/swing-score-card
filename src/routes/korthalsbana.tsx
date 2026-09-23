import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Plus,
  Trophy,
  Bot,
  Users,
  UserRound,
  Check,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  completeTotal,
  emptyShortCourses,
  matchStatus,
  parseShortCourses,
  personalBest,
  shortBotScores,
  validCourse,
  type ShortCourse,
  type ShortCourseStore,
  type ShortRound,
} from "@/lib/short-course";

export const Route = createFileRoute("/korthalsbana")({
  head: () => ({ meta: [{ title: "Spela korthålsbana | SG4" }] }),
  component: ShortCoursePage,
});
const primary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-base font-bold leading-snug text-white disabled:opacity-40";
const card = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950";
const bots = [
  { name: "Emma", level: "Lätt", text: "Oftast bogey eller dubbelbogey." },
  { name: "Alex", level: "Medel", text: "Oftast par eller bogey." },
  { name: "Max", level: "Svår", text: "Oftast par, ibland birdie." },
];
const relative = (n: number) => (n === 0 ? "E" : n > 0 ? `+${n}` : String(n));
function ScoreInput({
  name,
  value,
  set,
  concession,
}: {
  name: string;
  value: number | null;
  set: (n: number | null) => void;
  concession: boolean;
}) {
  return (
    <div className={card}>
      <p className="break-words text-center text-lg font-bold">{name}</p>
      <div className="my-4 grid grid-cols-[48px_1fr_48px] items-center gap-3">
        <button
          aria-label={`Färre slag för ${name}`}
          disabled={value === null || value <= 1}
          onClick={() => set(Math.max(1, (value ?? 3) - 1))}
          className="h-12 rounded-xl bg-slate-100 text-2xl disabled:opacity-30"
        >
          −
        </button>
        <p className="text-center text-4xl font-black tabular-nums">
          {value ?? "–"}
          <span className="mt-1 block text-sm font-normal text-slate-500">
            {value === null ? "Uppgivet hål" : "slag"}
          </span>
        </p>
        <button
          aria-label={`Fler slag för ${name}`}
          disabled={value !== null && value >= 30}
          onClick={() => set(Math.min(30, (value ?? 2) + 1))}
          className="h-12 rounded-xl bg-slate-100 text-2xl disabled:opacity-30"
        >
          +
        </button>
      </div>
      {concession && (
        <button
          onClick={() => set(value === null ? 3 : null)}
          className="min-h-11 w-full text-sm font-semibold text-slate-600 underline"
        >
          {value === null ? "Ange slag istället" : "Ger upp hålet"}
        </button>
      )}
    </div>
  );
}
function ShortCoursePage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const storageKey = `sg4.short-courses.v1:${user?.id ?? "guest"}`;
  const [data, setData] = useState<ShortCourseStore>(emptyShortCourses);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<"home" | "create" | "setup" | "play" | "result">("home");
  const [selected, setSelected] = useState<ShortCourse | null>(null);
  const [name, setName] = useState("");
  const [holeCount, setHoleCount] = useState(6);
  const [courseHoles, setCourseHoles] = useState<ShortCourse["holes"]>(
    Array.from({ length: 6 }, () => ({ par: 3, metres: null })),
  );
  const [mode, setMode] = useState<ShortRound["mode"]>("solo");
  const [format, setFormat] = useState<ShortRound["format"]>("stroke");
  const [friend, setFriend] = useState("");
  const [bot, setBot] = useState(1);
  const [youScore, setYouScore] = useState<number | null>(3);
  const [otherScore, setOtherScore] = useState<number | null>(3);
  const [edit, setEdit] = useState<number | null>(null);
  const [result, setResult] = useState<ShortRound | null>(null);
  const [abandon, setAbandon] = useState(false);
  const [botReveal, setBotReveal] = useState(false);
  useEffect(() => {
    if (loading) return;
    setReady(false);
    try {
      setData(parseShortCourses(localStorage.getItem(storageKey)));
      setError("");
      setReady(true);
    } catch {
      setError("Det gick inte att läsa dina sparade banor. Ladda om sidan och försök igen.");
    }
    setScreen("home");
  }, [storageKey, loading]);
  const save = (next: ShortCourseStore) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setData(next);
      setError("");
      return true;
    } catch {
      setError(
        "Kunde inte spara. Frigör lagringsutrymme i webbläsaren och försök igen. Ditt senaste val har inte sparats.",
      );
      return false;
    }
  };
  const active = data.active;
  const index = edit ?? active?.scores.length ?? 0;
  const hole = active?.course.holes[index];
  const course = selected;
  const resetInputs = (r: ShortRound, i: number) => {
    setYouScore(
      r.scores[i]?.you === null ? null : (r.scores[i]?.you ?? r.course.holes[i]?.par ?? 3),
    );
    setOtherScore(
      r.scores[i]?.other === null ? null : (r.scores[i]?.other ?? r.course.holes[i]?.par ?? 3),
    );
  };
  const openCourse = (c: ShortCourse) => {
    setSelected(c);
    setScreen("setup");
  };
  const start = () => {
    if (!course || data.active || (mode === "friend" && !friend.trim())) return;
    const r: ShortRound = {
      id: crypto.randomUUID(),
      course: structuredClone(course),
      mode,
      format: mode === "solo" ? "stroke" : format,
      names: [displayName || "Du", mode === "bot" ? bots[bot].name : friend.trim()],
      botLevel: bot,
      botScores: mode === "bot" ? shortBotScores(course, bot) : [],
      scores: [],
      started: new Date().toISOString(),
    };
    if (save({ ...data, active: r })) {
      resetInputs(r, 0);
      setEdit(null);
      setBotReveal(false);
      setScreen("play");
    }
  };
  const finish = (r: ShortRound) => {
    const done = { ...r, finished: new Date().toISOString() };
    if (
      save({
        ...data,
        active: null,
        history: [done, ...data.history.filter((h) => h.id !== done.id)],
      })
    ) {
      setResult(done);
      setScreen("result");
    }
  };
  const register = () => {
    if (!active || !hole || botReveal) return;
    const score = {
      you: youScore,
      other:
        active.mode === "solo"
          ? null
          : active.mode === "bot"
            ? active.botScores[index]
            : otherScore,
    };
    if (
      active.format === "stroke" &&
      (score.you === null || (active.mode !== "solo" && score.other === null))
    )
      return;
    const scores = [...active.scores];
    scores[index] = score;
    const next = { ...active, scores };
    if (!save({ ...data, active: next })) return;
    if (edit !== null) {
      setEdit(null);
      resetInputs(next, next.scores.length);
      return;
    }
    if (active.mode === "bot") {
      setBotReveal(true);
      return;
    }
    if (next.scores.length === next.course.holes.length) finish(next);
    else resetInputs(next, next.scores.length);
  };
  const nextAfterBot = () => {
    if (!active) return;
    setBotReveal(false);
    if (active.scores.length === active.course.holes.length) finish(active);
    else resetInputs(active, active.scores.length);
  };
  const pb = course ? personalBest(data.history, course) : null;
  const activeBest = active ? personalBest(data.history, active.course) : null;
  const playedTotal =
    active && active.scores.length && active.scores.every((s) => s.you !== null)
      ? active.scores.reduce((sum, s) => sum + s.you!, 0)
      : null;
  const recordDifference =
    active && activeBest && playedTotal !== null
      ? playedTotal -
        activeBest.scores.slice(0, active.scores.length).reduce((sum, s) => sum + s.you!, 0)
      : null;

  const back = () => {
    if (screen === "create" || screen === "setup" || screen === "result") setScreen("home");
    else if (screen === "play") {
      setBotReveal(false);
      setEdit(null);
      setScreen("home");
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid min-h-16 max-w-md grid-cols-[44px_1fr_44px] items-center px-4">
          {screen === "home" ? (
            <Link
              to="/"
              aria-label="Till startsidan"
              className="flex h-11 items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={back}
              aria-label={screen === "play" ? "Pausa och gå tillbaka" : "Tillbaka"}
              className="flex h-11 items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <p className="text-center text-sm font-bold">Spela korthålsbana</p>
        </div>
      </header>
      <div className="mx-auto max-w-md space-y-5 px-5 pb-12 pt-5">
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {!ready ? (
          <p className="py-12 text-center">
            {error ? "Sparade uppgifter kunde inte läsas." : "Hämtar dina banor…"}
          </p>
        ) : (
          <>
            {screen === "home" && (
              <>
                <section className="rounded-[28px] bg-blue-600 p-6 text-white">
                  <Flag className="mb-5 h-8 w-8" />
                  <p className="text-sm font-bold text-blue-100">Från utslag till sista putten</p>
                  <h1 className="mt-2 font-display text-4xl leading-tight">Spela korthålsbana</h1>
                  <p className="mt-3 leading-relaxed text-blue-50">
                    Spela banan själv, utmana en vän eller möt en bot. Räkna slagen på varje hål och
                    jaga ditt eget banrekord.
                  </p>
                  <button
                    onClick={() => setScreen("create")}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-blue-700"
                  >
                    <Plus className="h-5 w-5" />
                    Lägg till bana
                  </button>
                </section>
                {active && (
                  <section className={card}>
                    <p className="text-sm font-bold text-blue-700">Pågående spel</p>
                    <h2 className="mt-1 text-xl font-bold">{active.course.name}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {active.scores.length} av {active.course.holes.length} hål registrerade
                    </p>
                    <button
                      className={`${primary} mt-4`}
                      onClick={() => {
                        if (active.scores.length === active.course.holes.length) finish(active);
                        else {
                          resetInputs(active, active.scores.length);
                          setEdit(null);
                          setBotReveal(false);
                          setScreen("play");
                        }
                      }}
                    >
                      Fortsätt spela
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setAbandon(true)}
                      className="mt-2 min-h-11 w-full text-sm text-slate-500"
                    >
                      Avsluta utan att spara resultat
                    </button>
                  </section>
                )}
                <section>
                  <h2 className="mb-3 text-xl font-bold">Mina banor</h2>
                  {!data.courses.length ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-slate-500">
                      Lägg till banans namn och antal hål. Nästa gång finns den här.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.courses.map((c) => {
                        const best = personalBest(data.history, c);
                        return (
                          <button
                            key={c.id}
                            onClick={() => openCourse(c)}
                            className={`${card} w-full text-left`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="break-words text-lg font-bold">{c.name}</h3>
                              <ArrowRight className="h-5 w-5 shrink-0 text-blue-600" />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {c.holes.length} hål · par {c.holes.reduce((n, h) => n + h.par, 0)}
                            </p>
                            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-700">
                              <Trophy className="h-4 w-4" />
                              {best
                                ? `Ditt rekord: ${completeTotal(best)} slag`
                                : "Sätt ditt första rekord"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className={card}>
                  <h2 className="text-lg font-bold">Så fungerar det</h2>
                  <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
                    <li>Spara din bana. Par 3 är förvalt på alla hål.</li>
                    <li>Spela själv, slagspel eller matchspel mot vän eller bot.</li>
                    <li>
                      Registrera alla slag, inklusive puttar och pliktslag. Spela klart banan för
                      ett rekord.
                    </li>
                  </ol>
                  <p className="mt-4 text-sm text-slate-500">
                    Vänspel sker på samma telefon. Banor, resultat och pågående spel sparas i den
                    här webbläsaren. Ingen officiell handicapregistrering.
                  </p>
                </section>
              </>
            )}
            {screen === "create" && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = { id: crypto.randomUUID(), name: name.trim(), holes: courseHoles };
                  if (validCourse(c) && save({ ...data, courses: [...data.courses, c] })) {
                    setName("");
                    openCourse(c);
                  }
                }}
              >
                <div>
                  <p className="text-sm font-bold text-blue-700">Din bana</p>
                  <h1 className="mt-1 text-3xl font-bold">Spara korthålsbana</h1>
                  <p className="mt-2 text-slate-600">
                    Samma bana och utslagsplatser gör rekord jämförbara. Ange gärna tee i namnet.
                  </p>
                </div>
                <label className="block space-y-2">
                  <span className="font-bold">Banans namn</span>
                  <input
                    required
                    maxLength={70}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Exempel: Klubbens korthålsbana · gul tee"
                    className={field}
                  />
                </label>
                <div>
                  <label htmlFor="hole-count" className="mb-2 block font-bold">
                    Antal hål
                  </label>
                  <Select
                    value={String(holeCount)}
                    onValueChange={(v) => {
                      const count = Number(v);
                      setHoleCount(count);
                      setCourseHoles((old) =>
                        Array.from({ length: count }, (_, i) => old[i] ?? { par: 3, metres: null }),
                      );
                    }}
                  >
                    <SelectTrigger id="hole-count" className={field}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 18 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} hål
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <section className={card}>
                  <h2 className="font-bold">Par 3 som standard</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Justera vid behov. Längd är frivilligt och hjälper boten bedöma längre par
                    3-hål.
                  </p>
                  <div className="mt-4 grid grid-cols-[44px_1fr_1fr] gap-2 text-sm font-bold">
                    <span>Hål</span>
                    <span>Par</span>
                    <span>Meter</span>
                  </div>
                  {courseHoles.map((h, i) => (
                    <div key={i} className="mt-2 grid grid-cols-[44px_1fr_1fr] items-center gap-2">
                      <span className="text-center font-bold">{i + 1}</span>
                      <select
                        aria-label={`Par hål ${i + 1}`}
                        value={h.par}
                        onChange={(e) =>
                          setCourseHoles((old) =>
                            old.map((v, j) =>
                              j === i ? { ...v, par: Number(e.target.value) } : v,
                            ),
                          )
                        }
                        className={field}
                      >
                        {[3, 4, 5].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Längd hål ${i + 1}`}
                        type="number"
                        inputMode="numeric"
                        min={20}
                        max={600}
                        placeholder="–"
                        value={h.metres ?? ""}
                        onChange={(e) =>
                          setCourseHoles((old) =>
                            old.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    metres: e.target.value === "" ? null : Number(e.target.value),
                                  }
                                : v,
                            ),
                          )
                        }
                        className={field}
                      />
                    </div>
                  ))}
                </section>
                <button className={primary} disabled={!name.trim()}>
                  Spara bana
                  <Check className="h-5 w-5" />
                </button>
              </form>
            )}
            {screen === "setup" && course && (
              <>
                <section className={card}>
                  <p className="text-sm font-bold text-blue-700">
                    {course.holes.length} hål · par {course.holes.reduce((n, h) => n + h.par, 0)}
                  </p>
                  <h1 className="mt-2 break-words text-3xl font-bold">{course.name}</h1>
                  <p className="mt-4 flex items-center gap-2 font-bold text-blue-700">
                    <Trophy className="h-5 w-5" />
                    {pb ? `Ditt rekord: ${completeTotal(pb)} slag` : "Sätt ditt första rekord"}
                  </p>
                </section>
                <section>
                  <h2 className="mb-3 text-lg font-bold">Hur vill du spela?</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "solo", text: "Själv", icon: UserRound },
                        { id: "friend", text: "Mot vän", icon: Users },
                        { id: "bot", text: "Mot bot", icon: Bot },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        aria-pressed={mode === m.id}
                        className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-bold ${mode === m.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white"}`}
                      >
                        <m.icon className="h-6 w-6" />
                        {m.text}
                      </button>
                    ))}
                  </div>
                </section>
                {mode === "friend" && (
                  <label className="block space-y-2">
                    <span className="font-bold">Vännens namn</span>
                    <input
                      maxLength={35}
                      value={friend}
                      onChange={(e) => setFriend(e.target.value)}
                      className={field}
                      placeholder="Namn"
                    />
                    <span className="block text-sm text-slate-500">
                      Ni registrerar bådas slag på den här telefonen.
                    </span>
                  </label>
                )}
                {mode === "bot" && (
                  <section className="space-y-2">
                    <h2 className="font-bold">Välj motståndare</h2>
                    {bots.map((b, i) => (
                      <button
                        key={b.name}
                        onClick={() => setBot(i)}
                        aria-pressed={bot === i}
                        className={`w-full rounded-2xl border p-4 text-left ${bot === i ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                      >
                        <span className="font-bold">
                          {b.name} · {b.level}
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">{b.text}</span>
                      </button>
                    ))}
                    <p className="text-sm text-slate-500">
                      Botens slag simuleras utifrån par, längd och nivå. Resultatet visas efter att
                      du registrerat dina slag.
                    </p>
                  </section>
                )}
                {mode !== "solo" && (
                  <section>
                    <h2 className="mb-3 font-bold">Spelsätt</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          {
                            id: "stroke",
                            name: "Slagspel",
                            text: "Lägst totalt antal slag vinner.",
                          },
                          { id: "match", name: "Matchspel", text: "Färre slag vinner hålet." },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          aria-pressed={format === f.id}
                          onClick={() => setFormat(f.id)}
                          className={`rounded-2xl border p-4 text-left ${format === f.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                        >
                          <span className="font-bold">{f.name}</span>
                          <span className="mt-2 block text-sm text-slate-600">{f.text}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Alla spelar utan handicapslag. Ni kan spela klart banan även när matchen är
                      avgjord.
                    </p>
                  </section>
                )}
                <button
                  disabled={!!active || (mode === "friend" && !friend.trim())}
                  onClick={start}
                  className={primary}
                >
                  Starta spel
                  <Flag className="h-5 w-5" />
                </button>
                {active && (
                  <p className="text-sm text-slate-600">
                    Fortsätt eller avsluta ditt pågående spel på föregående sida först.
                  </p>
                )}
                <section>
                  <h2 className="mb-3 text-lg font-bold">Tidigare spel</h2>
                  <div className="space-y-2">
                    {data.history
                      .filter((r) => r.course.id === course.id)
                      .map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setResult(r);
                            setScreen("result");
                          }}
                          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-white p-3 text-left"
                        >
                          <span className="text-sm">
                            {new Date(r.finished!).toLocaleDateString("sv-SE")} ·{" "}
                            {r.mode === "solo" ? "Själv" : `Mot ${r.names[1]}`}
                          </span>
                          <strong>{completeTotal(r) ?? "–"} slag</strong>
                        </button>
                      ))}
                    {!data.history.some((r) => r.course.id === course.id) && (
                      <p className="text-sm text-slate-500">
                        Dina färdigspelade resultat visas här.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
            {screen === "play" && active && (
              <>
                <div>
                  <p className="text-sm font-bold text-blue-700">{active.course.name}</p>
                  <h1 className="mt-2 text-3xl font-bold">
                    {botReveal
                      ? `Hål ${active.scores.length} klart`
                      : `Hål ${index + 1} av ${active.course.holes.length}`}
                  </h1>
                  <p className="mt-2 text-slate-500">
                    Par {(botReveal ? active.course.holes[active.scores.length - 1] : hole)?.par}
                    {hole?.metres && !botReveal ? ` · ${hole.metres} m` : ""}
                  </p>
                </div>
                {active.format === "match" && (
                  <section className="rounded-2xl bg-blue-600 p-4 text-center text-white">
                    <p className="text-xl font-bold">
                      {matchStatus(active).diff === 0
                        ? "AS · lika"
                        : `${matchStatus(active).leader} ${Math.abs(matchStatus(active).diff)} UP`}
                    </p>
                    {matchStatus(active).decided && (
                      <p className="mt-2 text-sm">
                        Matchen är avgjord. Spela klart för att få ett komplett banresultat.
                      </p>
                    )}
                  </section>
                )}
                {playedTotal !== null && (
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 text-center">
                    <p className="font-bold">
                      {playedTotal} slag efter {active.scores.length} hål
                    </p>
                    {recordDifference !== null && (
                      <p className="mt-1 text-sm text-blue-700">
                        {recordDifference === 0
                          ? "I nivå med ditt rekord"
                          : `${Math.abs(recordDifference)} slag ${recordDifference < 0 ? "före" : "efter"} ditt rekord`}
                      </p>
                    )}
                  </div>
                )}
                {botReveal ? (
                  <section className={card}>
                    <p className="text-sm font-bold text-blue-700">{active.names[1]} har spelat</p>
                    <div className="my-5 grid grid-cols-2 gap-4 text-center">
                      {active.names.map((n, i) => (
                        <div key={i}>
                          <p className="break-words font-bold">{n}</p>
                          <p className="mt-2 text-4xl font-black">
                            {active.scores.at(-1)?.[i === 0 ? "you" : "other"] ?? "–"}
                          </p>
                          <p className="text-sm text-slate-500">slag</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={nextAfterBot} className={primary}>
                      {active.scores.length === active.course.holes.length
                        ? "Visa resultat"
                        : "Nästa hål"}
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </section>
                ) : hole ? (
                  <>
                    <ScoreInput
                      name={active.names[0]}
                      value={youScore}
                      set={setYouScore}
                      concession={active.format === "match"}
                    />
                    {active.mode === "friend" && (
                      <ScoreInput
                        name={active.names[1]}
                        value={otherScore}
                        set={setOtherScore}
                        concession={active.format === "match"}
                      />
                    )}
                    <button onClick={register} className={primary}>
                      {edit !== null ? "Spara ändring" : `Registrera hål ${index + 1}`}
                      <Check className="h-5 w-5" />
                    </button>
                    <p className="text-center text-sm text-slate-500">
                      Räkna alla slag, puttar och pliktslag.
                    </p>
                  </>
                ) : (
                  <button onClick={() => finish(active)} className={primary}>
                    Spara resultat
                  </button>
                )}
                <Scorecard
                  round={active}
                  onEdit={(i) => {
                    setEdit(i);
                    setBotReveal(false);
                    resetInputs(active, i);
                  }}
                />
                <button
                  onClick={() => {
                    setScreen("home");
                    setBotReveal(false);
                    setEdit(null);
                  }}
                  className="min-h-11 w-full text-sm font-bold text-slate-600"
                >
                  Pausa · fortsätt senare
                </button>
              </>
            )}
            {screen === "result" && result && (
              <>
                <section className="rounded-[28px] bg-blue-600 p-6 text-white">
                  <Trophy className="h-8 w-8" />
                  <p className="mt-4 text-sm text-blue-100">
                    {result.course.name} · {result.course.holes.length} hål
                  </p>
                  <h1 className="mt-2 text-3xl font-bold">Banan färdigspelad</h1>
                  {result.format === "match" ? (
                    <p className="mt-4 text-xl font-bold">
                      {matchStatus(result).diff === 0
                        ? "Matchen delas"
                        : `${matchStatus(result).leader} vinner matchen`}
                    </p>
                  ) : result.mode !== "solo" ? (
                    <p className="mt-4 text-xl font-bold">
                      {completeTotal(result) === completeTotal(result, "other")
                        ? "Lika resultat"
                        : `${result.names[completeTotal(result)! < completeTotal(result, "other")! ? 0 : 1]} vinner`}
                    </p>
                  ) : null}
                  <div
                    className={`mt-5 grid gap-3 ${result.mode === "solo" ? "grid-cols-1" : "grid-cols-2"}`}
                  >
                    {result.names.slice(0, result.mode === "solo" ? 1 : 2).map((n, i) => {
                      const total = completeTotal(result, i === 0 ? "you" : "other");
                      return (
                        <div key={i} className="min-w-0 rounded-2xl bg-white/10 p-4 text-center">
                          <p className="break-words text-sm font-bold">{n}</p>
                          <p className="mt-2 text-4xl font-black">{total ?? "–"}</p>
                          <p className="mt-1 text-sm">
                            {total === null
                              ? "Ej fullständigt slagresultat"
                              : `${relative(total - result.course.holes.reduce((s, h) => s + h.par, 0))} mot par`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
                {completeTotal(result) !== null &&
                personalBest(data.history, result.course)?.id === result.id ? (
                  <p className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">
                    Ditt bästa resultat på banan: {completeTotal(result)} slag!
                  </p>
                ) : completeTotal(result) === null ? (
                  <p className="text-sm text-slate-600">
                    Matchen är sparad. Uppgivna hål gör att resultatet inte räknas som banrekord.
                  </p>
                ) : null}
                <Scorecard round={result} />
                <button onClick={() => openCourse(result.course)} className={primary}>
                  Spela banan igen
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setScreen("home")}
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white font-bold"
                >
                  Mina banor
                </button>
              </>
            )}
          </>
        )}
      </div>
      <AlertDialog open={abandon} onOpenChange={setAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta pågående spel?</AlertDialogTitle>
            <AlertDialogDescription>
              Det ofullständiga resultatet tas bort. Din sparade bana och tidigare resultat finns
              kvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt senare</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (save({ ...data, active: null })) setScreen("home");
              }}
            >
              Avsluta spel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
function Scorecard({ round, onEdit }: { round: ShortRound; onEdit?: (i: number) => void }) {
  const opponent = round.mode !== "solo";
  return (
    <section className={card}>
      <h2 className="mb-3 text-lg font-bold">Scorekort</h2>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="w-12 py-2 text-left">Hål</th>
            <th className="w-10">Par</th>
            <th className="break-words px-1">{round.names[0]}</th>
            {opponent && <th className="break-words px-1">{round.names[1]}</th>}
            {onEdit && (
              <th className="w-10">
                <span className="sr-only">Ändra</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {round.course.holes.map((h, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-3">{i + 1}</td>
              <td className="text-center">{h.par}</td>
              <td className="text-center font-bold">
                {round.scores[i]?.you ?? (round.scores[i] ? "Uppg." : "–")}
              </td>
              {opponent && (
                <td className="text-center font-bold">
                  {round.scores[i]?.other ?? (round.scores[i] ? "Uppg." : "–")}
                </td>
              )}
              {onEdit && (
                <td>
                  {round.scores[i] && (
                    <button
                      aria-label={`Ändra hål ${i + 1}`}
                      onClick={() => onEdit(i)}
                      className="flex h-11 w-10 items-center justify-center"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
