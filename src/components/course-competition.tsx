import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  advanceBracket,
  completeFixture,
  createCompetition,
  fixtureAllowance,
  fixtureMargin,
  groupRanking,
  parseCompetition,
  standings,
  type Competition,
  type Fixture,
  type Player,
} from "@/lib/course-tournament";
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
const card = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950";
const primary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-40";
function Option({
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
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-14 rounded-2xl border-2 p-3 text-left ${selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white"}`}
    >
      {children}
    </button>
  );
}
function Counter({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className={card}>
      <p className="break-words text-lg font-bold">{name}</p>
      <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center gap-4">
        <button
          aria-label={`Färre slag för ${name}`}
          className="h-12 rounded-xl bg-slate-100 text-2xl disabled:opacity-30"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="text-center text-3xl font-bold">
          {value}
          <span className="ml-2 text-sm font-normal">slag</span>
        </span>
        <button
          aria-label={`Fler slag för ${name}`}
          className="h-12 rounded-xl bg-slate-100 text-2xl disabled:opacity-30"
          disabled={value >= 30}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
export function CourseCompetition({
  kind,
  onBack,
}: {
  kind: "group" | "tournament";
  onBack: () => void;
}) {
  const { user, displayName, loading } = useAuth();
  const storageKey = `sg4.course-competition.v1:${user?.id ?? "guest"}:${kind}`;
  const [game, setGame] = useState<Competition | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [system, setSystem] = useState<Competition["system"]>("bracket");
  const [format, setFormat] = useState<Competition["format"]>("match");
  const [holes, setHoles] = useState(6);
  const [count, setCount] = useState(kind === "group" ? 3 : 4);
  const [players, setPlayers] = useState<Player[]>(
    Array.from({ length: 16 }, () => ({ name: "", strokes: 0 })),
  );
  const [give, setGive] = useState(false);
  const [abandon, setAbandon] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (loading) return;
    setReady(false);
    setGame(null);
    setEditing(false);
    try {
      const restored = parseCompetition(localStorage.getItem(storageKey));
      setGame(restored);
      setEditing(restored?.editing ?? false);
      setReady(true);
      setError("");
    } catch {
      setError("Det gick inte att läsa spelet. Försök ladda om sidan.");
    }
    setPlayers((p) =>
      p.map((v, i) => (i === 0 && !v.name ? { ...v, name: displayName?.trim() || "Du" } : v)),
    );
  }, [storageKey, loading, displayName]);
  function save(next: Competition) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setGame(next);
      setEditing(next.editing);
      setError("");
      return true;
    } catch {
      setError("Ändringen kunde inte sparas. Försök igen innan du lämnar sidan.");
      return false;
    }
  }
  function clear(result?: Competition) {
    try {
      localStorage.removeItem(storageKey);
      setGame(result ?? null);
      setError("");
      setEditing(false);
      setStep(0);
      return true;
    } catch {
      setError("Spelet kunde inte avslutas. Försök igen.");
      return false;
    }
  }
  const chosen = players.slice(0, count);
  const validNames =
    chosen.every((p) => p.name.trim()) &&
    new Set(chosen.map((p) => p.name.trim().toLocaleLowerCase())).size === count;
  function start() {
    save(
      createCompetition(
        kind,
        system,
        format,
        holes,
        chosen.map((p) => ({ name: p.name.trim(), strokes: give ? p.strokes : 0 })),
      ),
    );
  }
  const all = game ? [...game.league, ...game.rounds.flat()] : [];
  const current = all.find((f) => f.id === game?.activeId);
  const scoreCount =
    game?.kind === "group" ? game.groupScores.length : (current?.scores.length ?? 0);
  const scoreIndex = editing ? scoreCount - 1 : scoreCount;
  const playing = !!game && (game.kind === "group" || !!current) && !game.finished;
  const ids =
    game?.kind === "group" ? game.players.map((_, i) => i) : current ? [current.a, current.b!] : [];
  const extra = game && current ? fixtureAllowance(game, current) : null;
  const rank = game ? groupRanking(game) : [];
  function draft(id: number, n: number) {
    if (game) save({ ...game, draft: game.draft.map((v, i) => (i === id ? n : v)) });
  }
  function register() {
    if (!game || (!editing && scoreCount >= game.holes)) return;
    if (game.kind === "group") {
      const scores = [...game.groupScores];
      if (editing) scores[scores.length - 1] = [...game.draft];
      else scores.push([...game.draft]);
      if (save({ ...game, groupScores: scores, editing: false, draft: game.players.map(() => 3) }))
        setEditing(false);
    } else if (current) {
      const scores = [...current.scores];
      const row: [number, number] = [game.draft[current.a], game.draft[current.b!]];
      if (editing) scores[scores.length - 1] = row;
      else scores.push(row);
      const update = (f: Fixture) => (f.id === current.id ? { ...f, scores } : f);
      if (
        save({
          ...game,
          editing: false,
          league: game.league.map(update),
          rounds: game.rounds.map((r) => r.map(update)),
          draft: game.players.map(() => 3),
        })
      )
        setEditing(false);
    }
  }
  function editLast() {
    if (!game || !scoreCount) return;
    let values = [...game.draft];
    if (game.kind === "group") values = [...game.groupScores[scoreCount - 1]];
    else if (current) {
      values[current.a] = current.scores[scoreCount - 1][0];
      values[current.b!] = current.scores[scoreCount - 1][1];
    }
    if (save({ ...game, draft: values, editing: true })) setEditing(true);
  }
  function finishMatch(winner?: number) {
    if (game && current) {
      save(completeFixture(game, current.id, winner));
      setEditing(false);
    }
  }
  function openMatch(f: Fixture) {
    if (game) save({ ...game, activeId: f.id, editing: false, draft: game.players.map(() => 3) });
  }
  const lastRound = game?.rounds.at(-1);
  const champion = game?.finished && game.kind === "tournament" ? lastRound?.[0]?.winner : null;
  const title = kind === "group" ? "Flera spelare" : "Turnering";
  const roundName = (matches: number) =>
    matches === 1
      ? "Final"
      : matches === 2
        ? "Semifinaler"
        : matches === 4
          ? "Kvartsfinaler"
          : "Åttondelsfinaler";
  function renderFixture(f: Fixture) {
    if (!game) return null;
    return (
      <div key={f.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="break-words font-semibold">{game.players[f.a].name}</p>
        <p className="my-1 text-xs text-slate-400">mot</p>
        <p className="break-words font-semibold">
          {f.b === null ? "Frirond" : game.players[f.b].name}
        </p>
        {f.done ? (
          <p className="mt-3 text-sm font-bold text-blue-700">
            {f.b === null
              ? "Direkt vidare"
              : f.winner === null
                ? "Oavgjort"
                : `${game.players[f.winner].name} vinner${f.margin === 0 ? " · särspel" : ""}`}
          </p>
        ) : (
          <button className={`${primary} mt-3`} onClick={() => openMatch(f)}>
            Spela match
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="min-h-dvh bg-[#fcfdf9] pb-10 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto grid max-w-lg grid-cols-[44px_1fr_44px] items-center gap-2">
          <button
            aria-label="Tillbaka"
            className="flex h-11 w-11 items-center justify-center rounded-full border"
            onClick={() => {
              if (game?.activeId) {
                save({ ...game, activeId: null, editing: false });
                setEditing(false);
              } else if (!game && step > 0) setStep(step - 1);
              else onBack();
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-center font-semibold">{title}</p>
          <span />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-5 px-4 pt-6">
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {!ready && !error && <p>Laddar…</p>}
        {ready && !game && (
          <>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Steg {step + 1} av 3
            </p>
            <h1 className="font-display text-4xl leading-tight">
              {step === 0
                ? kind === "group"
                  ? "Vilka är med?"
                  : "Skapa turnering"
                : step === 1
                  ? "Välj spelupplägg"
                  : "Slagfördelning"}
            </h1>
            {step === 0 && (
              <>
                {kind === "tournament" && (
                  <div className="grid gap-3">
                    <Option selected={system === "bracket"} onClick={() => setSystem("bracket")}>
                      <strong>Utslagsbracket</strong>
                      <span className="mt-1 block text-sm">
                        Lottade motståndare. Vinnaren går vidare till nästa omgång.
                      </span>
                    </Option>
                    <Option selected={system === "league"} onClick={() => setSystem("league")}>
                      <strong>Alla möter alla + slutspel</strong>
                      <span className="mt-1 block text-sm">
                        Alla spelar mot varandra. De {count >= 4 ? "fyra" : "två"} främsta går till
                        slutspel.
                      </span>
                    </Option>
                  </div>
                )}
                <label className="block space-y-2 font-semibold">
                  <span>Antal spelare</span>
                  <select
                    value={count}
                    className={field}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: kind === "group" ? 5 : 14 },
                      (_, i) => i + (kind === "group" ? 2 : 3),
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n} spelare
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-3">
                  {chosen.map((p, i) => (
                    <label key={i} className="block space-y-1 text-sm font-semibold">
                      <span>Spelare {i + 1}</span>
                      <input
                        className={field}
                        maxLength={40}
                        placeholder="Namn"
                        value={p.name}
                        onChange={(e) =>
                          setPlayers(
                            players.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  Ange olika namn. Ni registrerar resultaten på samma telefon.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                {kind === "tournament" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Option selected={format === "match"} onClick={() => setFormat("match")}>
                      <strong>Matchspel</strong>
                      <span className="block text-sm">Flest vunna hål.</span>
                    </Option>
                    <Option selected={format === "stroke"} onClick={() => setFormat("stroke")}>
                      <strong>Slagspel</strong>
                      <span className="block text-sm">Lägst antal slag.</span>
                    </Option>
                  </div>
                ) : (
                  <p className={card}>
                    Slagspel – lägst totalt antal slag efter eventuellt slagavdrag vinner.
                  </p>
                )}
                <label className="block space-y-2 font-semibold">
                  <span>Antal hål{kind === "tournament" ? " per match" : ""}</span>
                  <select
                    className={field}
                    value={holes}
                    onChange={(e) => setHoles(Number(e.target.value))}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} hål
                      </option>
                    ))}
                  </select>
                </label>
                {kind === "tournament" && (
                  <div className="rounded-2xl bg-blue-50 p-4 text-blue-950">
                    <p className="font-bold">
                      {system === "league"
                        ? (count * (count - 1)) / 2 + (count >= 4 ? 3 : 1)
                        : count - 1}{" "}
                      matcher totalt · {holes} hål per match
                    </p>
                    <p className="mt-2 text-sm">
                      {system === "league"
                        ? `${count - 1} matcher per person före slutspel. Vinst ger 2 poäng, oavgjort 1. Därefter resultatdifferens och lottad placering vid lika.`
                        : "Alla lottas in i bracketen. Vid ojämnt antal platser får några frirond."}{" "}
                      Lika i en utslagsmatch avgörs genom särspel.
                    </p>
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Option selected={!give} onClick={() => setGive(false)}>
                    Scratch · inga extraslag
                  </Option>
                  <Option selected={give} onClick={() => setGive(true)}>
                    Ge extraslag
                  </Option>
                </div>
                {give && (
                  <>
                    <p className="text-sm text-slate-600">
                      Ange extraslag totalt{kind === "tournament" ? " per match" : " för spelet"}.{" "}
                      {kind === "tournament" && format === "match"
                        ? "Skillnaden mellan spelarna fördelas jämnt över hålen, från hål 1."
                        : "Slagen dras av från respektive spelares slutresultat."}
                    </p>
                    {chosen.map((p, i) => (
                      <label key={i} className="grid grid-cols-[1fr_90px] items-center gap-3">
                        <span className="break-words font-semibold">{p.name}</span>
                        <select
                          aria-label={`Extraslag för ${p.name}`}
                          className={field}
                          value={p.strokes}
                          onChange={(e) =>
                            setPlayers(
                              players.map((v, j) =>
                                j === i ? { ...v, strokes: Number(e.target.value) } : v,
                              ),
                            )
                          }
                        >
                          {Array.from({ length: 37 }, (_, n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </>
                )}
                <p className="rounded-2xl bg-blue-50 p-4 font-semibold text-blue-950">
                  {count} spelare · {holes} hål{kind === "tournament" ? " per match" : ""} ·{" "}
                  {kind === "group" || format === "stroke" ? "Slagspel" : "Matchspel"}
                </p>
              </>
            )}
            <button
              className={primary}
              disabled={!validNames}
              onClick={() => (step < 2 ? setStep(step + 1) : start())}
            >
              {step < 2 ? "Nästa" : kind === "tournament" ? "Lotta och starta" : "Starta spelet"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
        {game && (
          <>
            {game.finished && (
              <section className="rounded-3xl bg-blue-600 p-6 text-center text-white">
                <Trophy className="mx-auto mb-3 h-9 w-9" />
                <h1 className="font-display text-4xl leading-tight">
                  {game.kind === "group"
                    ? rank.filter((r) => r.net === rank[0].net).length > 1
                      ? "Delad seger!"
                      : `${game.players[rank[0].id].name} vinner!`
                    : `${game.players[champion!].name} vinner!`}
                </h1>
                <p className="mt-2">
                  {game.kind === "tournament" ? "Turneringen är avgjord" : "Alla hål är spelade"}
                </p>
              </section>
            )}
            {playing && (
              <>
                <p className="text-center text-sm font-semibold text-slate-500">
                  {game.format === "match" ? "Matchspel" : "Slagspel"} · {scoreCount}/{game.holes}{" "}
                  hål registrerade
                </p>
                {current && (
                  <section className={card}>
                    <p className="break-words text-center text-lg font-bold">
                      {game.players[current.a].name} mot {game.players[current.b!].name}
                    </p>
                    {scoreCount > 0 && (
                      <p className="mt-2 text-center">
                        {game.format === "match"
                          ? fixtureMargin(game, current) === 0
                            ? "Lika"
                            : `${game.players[fixtureMargin(game, current) > 0 ? current.a : current.b!].name} ${Math.abs(fixtureMargin(game, current))} upp`
                          : `Registrerade slag: ${current.scores.reduce((s, r) => s + r[0], 0)}–${current.scores.reduce((s, r) => s + r[1], 0)}`}
                      </p>
                    )}
                    <p className="mt-2 text-center text-sm text-slate-500">
                      Extraslag totalt: {game.players[current.a].strokes} /{" "}
                      {game.players[current.b!].strokes}
                    </p>
                  </section>
                )}
                {(scoreCount < game.holes || editing) && (
                  <>
                    <h2 className="text-center font-display text-4xl leading-tight">
                      {editing ? "Redigera hål" : "Hål"} {scoreIndex + 1}
                    </h2>
                    {ids.map((id, i) => (
                      <div key={id} className="space-y-2">
                        {extra &&
                          game.format === "match" &&
                          (i === 0 ? extra.a : extra.b)[scoreIndex] > 0 && (
                            <p className="rounded-2xl bg-blue-50 p-3 text-center text-sm font-semibold text-blue-800">
                              {game.players[id].name} har{" "}
                              {(i === 0 ? extra.a : extra.b)[scoreIndex]} extraslag här.
                            </p>
                          )}
                        <Counter
                          name={game.players[id].name}
                          value={game.draft[id]}
                          onChange={(n) => draft(id, n)}
                        />
                      </div>
                    ))}
                    <p className="text-center text-sm text-slate-500">
                      Registrera verkligt antal slag. Appen räknar av extraslagen.
                    </p>
                    <button className={primary} onClick={register}>
                      {editing ? "Spara ändring" : `Registrera hål ${scoreIndex + 1}`}
                    </button>
                  </>
                )}
                {current && current.scores.length > 0 && (
                  <section className={card}>
                    <h2 className="font-bold">Scorekort för matchen</h2>
                    <table className="mt-3 w-full table-fixed text-center text-sm">
                      <thead>
                        <tr>
                          <th className="w-12">Hål</th>
                          <th className="break-words px-2">{game.players[current.a].name}</th>
                          <th className="break-words px-2">{game.players[current.b!].name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.scores.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-3">{i + 1}</td>
                            <td>{row[0]}</td>
                            <td>{row[1]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
                {scoreCount > 0 && !editing && (
                  <button
                    className="min-h-11 w-full text-sm text-slate-600 underline"
                    onClick={editLast}
                  >
                    Redigera senaste hålet
                  </button>
                )}
                {scoreCount === game.holes &&
                  !editing &&
                  (current ? (
                    current.id.startsWith("bracket") && fixtureMargin(game, current) === 0 ? (
                      <section className={`${card} space-y-3`}>
                        <h2 className="text-xl font-bold">Särspel</h2>
                        <p>
                          Spela ett extra hål utan extraslag. Vid lika spelar ni vidare tills någon
                          vinner. Vem vann särspelet?
                        </p>
                        {[current.a, current.b!].map((id) => (
                          <button key={id} className={primary} onClick={() => finishMatch(id)}>
                            {game.players[id].name} vann
                          </button>
                        ))}
                      </section>
                    ) : (
                      <button className={primary} onClick={() => finishMatch()}>
                        Bekräfta matchresultat
                      </button>
                    )
                  ) : (
                    <button className={primary} onClick={() => clear({ ...game, finished: true })}>
                      Visa slutresultat
                    </button>
                  ))}
              </>
            )}
            {game.kind === "group" && game.groupScores.length > 0 && (
              <section className={card}>
                <h2 className="text-xl font-bold">
                  {game.finished ? "Slutresultat" : "Resultattavla"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {game.groupScores.length}/{game.holes} hål · hela slagavdraget är med i netto.
                </p>
                <table className="mt-3 w-full table-fixed text-right text-sm">
                  <thead>
                    <tr>
                      <th className="w-2/5 text-left">Spelare</th>
                      <th>Slag</th>
                      <th>Avdrag</th>
                      <th>Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rank.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="break-words py-3 pr-2 text-left font-semibold">
                          {game.players[r.id].name}
                        </td>
                        <td>{r.gross}</td>
                        <td>−{game.players[r.id].strokes}</td>
                        <td className="font-bold">{r.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <details className="mt-4">
                  <summary className="min-h-11 cursor-pointer font-semibold">
                    Visa scorekort
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-sm">
                      <thead>
                        <tr>
                          <th className="p-2">Hål</th>
                          {game.players.map((p, i) => (
                            <th className="min-w-20 p-2" key={i}>
                              {p.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {game.groupScores.map((row, i) => (
                          <tr className="border-t" key={i}>
                            <td className="p-2">{i + 1}</td>
                            {row.map((n, j) => (
                              <td key={j}>{n}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            )}
            {game.kind === "tournament" && !current && (
              <>
                <p className="text-sm text-slate-500">
                  {game.players.length} spelare · {game.holes} hål per match ·{" "}
                  {game.format === "match" ? "Matchspel" : "Slagspel"}
                </p>
                {!!game.league.length && (
                  <>
                    <section className={card}>
                      <h2 className="text-xl font-bold">Tabell · alla möter alla</h2>
                      <table className="mt-4 w-full table-fixed text-right text-sm">
                        <thead>
                          <tr>
                            <th className="w-2/5 text-left">Spelare</th>
                            <th>Spelade</th>
                            <th>Diff</th>
                            <th>Poäng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings(game).map((r, i) => (
                            <tr className="border-t" key={r.id}>
                              <td className="break-words py-3 pr-2 text-left">
                                {i + 1}. {game.players[r.id].name}
                              </td>
                              <td>{r.played}</td>
                              <td>
                                {r.difference > 0 ? "+" : ""}
                                {r.difference}
                              </td>
                              <td className="font-bold">{r.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-3 text-xs text-slate-500">
                        Vinst 2 p · oavgjort 1 p. Lika poäng avgörs av{" "}
                        {game.format === "match" ? "håldifferens" : "slagdifferens"}, därefter den
                        lottade ordningen. Topp {game.players.length >= 4 ? 4 : 2} går till
                        slutspel.
                      </p>
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer">Visa lottad ordning</summary>
                        <p className="mt-2">
                          {game.seed.map((i) => game.players[i].name).join(" → ")}
                        </p>
                      </details>
                    </section>
                    <details open={!game.rounds.length}>
                      <summary className="min-h-11 cursor-pointer text-lg font-bold">
                        Matcher · {game.league.filter((f) => f.done).length}/{game.league.length}
                      </summary>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {game.league.map(renderFixture)}
                      </div>
                    </details>
                    {game.league.every((f) => f.done) && !game.rounds.length && (
                      <button className={primary} onClick={() => save(advanceBracket(game))}>
                        Starta slutspel ·{" "}
                        {game.players.length >= 4
                          ? "1:an mot 4:an, 2:an mot 3:an"
                          : "1:an mot 2:an"}
                      </button>
                    )}
                  </>
                )}
                {!!game.rounds.length && (
                  <section>
                    <h2 className="mb-4 text-xl font-bold">
                      {game.system === "league" ? "Slutspelsbracket" : "Turneringsbracket"}
                    </h2>
                    <div className="flex snap-x gap-4 overflow-x-auto pb-4">
                      {game.rounds.map((round, i) => (
                        <div key={i} className="w-64 shrink-0 snap-start space-y-3">
                          <h3 className="font-bold text-blue-800">{roundName(round.length)}</h3>
                          {round.map(renderFixture)}
                        </div>
                      ))}
                      {lastRound && lastRound.length > 1 && (
                        <div className="w-48 shrink-0 rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                          Vinnarna går vidare till {roundName(lastRound.length / 2).toLowerCase()}.
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {lastRound?.every((f) => f.done) && !game.finished && (
                  <button
                    className={primary}
                    onClick={() => {
                      const next = advanceBracket(game);
                      if (next.finished) clear(next);
                      else save(next);
                    }}
                  >
                    {lastRound.length === 1 ? "Visa turneringsvinnare" : "Starta nästa omgång"}
                  </button>
                )}
                <p className="text-sm text-slate-500">
                  Bekräftade matchresultat är låsta så att tabell och bracket håller ihop.
                  Kontrollera slagen innan du bekräftar.
                </p>
              </>
            )}
            {game.finished ? (
              <>
                <button className={primary} onClick={() => clear()}>
                  Spela igen
                </button>
                <button className="min-h-12 w-full font-semibold" onClick={onBack}>
                  Avsluta
                </button>
              </>
            ) : (
              <button
                className="min-h-12 w-full text-sm text-slate-600 underline"
                onClick={() => setAbandon(true)}
              >
                Avsluta {kind === "group" ? "spelet" : "turneringen"}
              </button>
            )}
          </>
        )}
        <p className="text-center text-xs text-slate-500">
          Pågående spel sparas på den här enheten. Ingen historik eller statistik.
        </p>
      </main>
      <AlertDialog open={abandon} onOpenChange={setAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta pågående spel?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla resultat och lottningen för detta spel tas bort.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt spela</AlertDialogCancel>
            <AlertDialogAction onClick={() => clear()}>Avsluta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
