import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Lock, RotateCcw, Undo2, X } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  LEVEL_GAMES, LEVELS, buildRound, distanceRange, formatDistance, loadDraft, loadRounds, progressFrom,
  saveDraft, saveRound, targetsFor, type Attempt, type LevelGameId, type LevelGameRound, type LevelNumber, type RoundMode,
} from "@/lib/level-games";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function LevelGamePlay({ gameId }: { gameId: LevelGameId }) {
  const game = LEVEL_GAMES[gameId];
  const [history, setHistory] = useState<LevelGameRound[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [round, setRound] = useState<{ id: string; mode: RoundMode; attempts: Attempt[] } | null>(null);
  const [result, setResult] = useState<LevelGameRound | null>(null);
  const savedIds = useRef(new Set<string>());

  useEffect(() => {
    setHistory(loadRounds());
    const d = loadDraft(gameId);
    if (d) setRound({ id: d.id, mode: d.mode, attempts: d.attempts });
    setHydrated(true);
  }, [gameId]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(gameId, round && round.attempts.length ? { gameId, ...round } : null);
  }, [round, hydrated, gameId]);

  useHideBottomNav(round !== null);

  const progress = useMemo(() => progressFrom(game, history), [game, history]);
  const targets = round ? targetsFor(game, round.mode) : [];

  const start = (mode: RoundMode) => { setResult(null); setRound({ id: newId(), mode, attempts: [] }); };

  const record = (outcome: number) => {
    if (!round || round.attempts.length >= targets.length) return;
    const t = targets[round.attempts.length];
    const attempts = [...round.attempts, { target: t.distance, outcome, outcomeLabel: game.outcomes[outcome], ...(t.lie ? { lie: t.lie } : {}) }];
    if (attempts.length < targets.length) { setRound({ ...round, attempts }); return; }
    const all = loadRounds();
    const built = buildRound(game, round.mode, attempts, all, round.id, new Date().toISOString());
    if (!savedIds.current.has(built.id)) { savedIds.current.add(built.id); saveRound(built); }
    setHistory(loadRounds());
    setResult(built);
    setRound(null);
  };

  const undo = () => round && setRound({ ...round, attempts: round.attempts.slice(0, -1) });
  const abort = () => {
    if (round && round.attempts.length && !window.confirm("Avbryta omgången? Registrerade slag sparas inte.")) return;
    setRound(null);
  };

  if (round) {
    const i = round.attempts.length;
    const t = targets[i];
    const station = game.stationSize ? Math.floor(i / game.stationSize) + 1 : null;
    const stations = game.stationSize ? targets.length / game.stationSize : null;
    const ball = game.stationSize ? (i % game.stationSize) + 1 : null;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-foreground">
        <header className="flex h-[58px] items-center justify-between">
          <button type="button" onClick={abort} aria-label="Avbryt omgång" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"><X className="h-5 w-5" /></button>
          <p className="text-[14px] font-extrabold">{game.title} · {round.mode.kind === "placement" ? "Hitta din nivå" : `Nivå ${round.mode.level}`}</p>
          <span className="w-10" />
        </header>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {targets.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? "bg-nav-active" : "bg-muted"}`} />)}
        </div>
        <section className="mt-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">
            {station ? `Station ${station}/${stations} · boll ${ball}/${game.stationSize}` : `${game.unit === "hål" ? "Hål" : game.unit === "slag" ? "Slag" : "Putt"} ${i + 1}/${targets.length}`}
          </p>
          <p className="mt-3 text-[11px] font-bold text-muted-foreground">{game.id === "inspel" ? "Flaggdistans" : "Avstånd"}</p>
          <p className="font-display text-[72px] leading-none">{formatDistance(t.distance)}</p>
          {t.lie && <p className="mt-2 text-sm font-bold">Läge: {t.lie}</p>}
        </section>
        <section className="mt-auto grid gap-2 pt-8" aria-label="Registrera utfall">
          {game.outcomes.map((label, k) => (
            <button key={label} type="button" onClick={() => record(k)}
              className={`min-h-14 rounded-2xl border border-border px-4 text-left text-[17px] font-bold active:scale-[.99] ${k < game.goodZones ? "bg-nav-active-surface" : "bg-card"}`}>
              {label}
            </button>
          ))}
          <button type="button" onClick={undo} disabled={!i} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-muted-foreground disabled:opacity-40">
            <Undo2 className="h-4 w-4" /> Ångra senaste
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-[calc(112px+env(safe-area-inset-bottom))] text-foreground">
      <header className="sticky top-0 z-[60] border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="grid h-[58px] grid-cols-[44px_1fr_44px] items-center px-3">
          <Link to="/spel" aria-label="Tillbaka till Spel" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <p className="text-center text-[14px] font-extrabold">{game.title}</p><span />
        </div>
      </header>

      {result ? <ResultView gameId={gameId} result={result} onReplay={() => start(result.placement ? { kind: "level", level: result.recommendedLevel } : { kind: "level", level: result.level!, ...(result.variant ? { variant: result.variant } : {}) })} /> : (
        <div className="px-5 pt-6">
          <h1 className="text-[36px] font-black leading-none">{game.title}</h1>
          <p className="mt-3 text-[15px] font-medium text-muted-foreground">{game.description}</p>
          {progress.pb !== null && <p className="mt-3 text-sm font-bold">Personbästa: {progress.pb} {game.scoreLabel}</p>}

          {!hydrated ? null : progress.recommended === null ? (
            <div className="mt-6 rounded-[24px] border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Första omgången</p>
              <h2 className="mt-1 text-2xl font-black">Hitta din nivå</h2>
              <p className="mt-2 text-sm text-muted-foreground">En vanlig omgång ({game.placementTargets.length} {game.unit}, {distanceRange(game.placementTargets)}). Vi jämför mot alla fem nivåer och föreslår en preliminär nivå.</p>
              <button type="button" onClick={() => start({ kind: "placement" })} className="mt-4 min-h-12 w-full rounded-2xl bg-nav-active text-[16px] font-bold text-primary-foreground">Starta</button>
            </div>
          ) : (
            <button type="button" onClick={() => start({ kind: "level", level: progress.recommended! })} className="mt-6 min-h-14 w-full rounded-2xl bg-nav-active text-[17px] font-bold text-primary-foreground">
              Spela rekommenderad nivå {progress.recommended}
            </button>
          )}

          <h2 className="mt-8 text-xl font-black">Nivåer</h2>
          <ul className="mt-3 space-y-2">
            {LEVELS.map(l => {
              const lv = game.levels[l];
              const cleared = progress.cleared.includes(l);
              const playable = progress.recommended !== null && l <= progress.recommended;
              return (
                <li key={l} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${cleared ? "bg-nav-active text-primary-foreground" : "bg-muted"}`}>{cleared ? <Check className="h-4 w-4" /> : l}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Nivå {l}{l === progress.recommended ? " · rekommenderad" : ""}</p>
                      <p className="text-xs text-muted-foreground">{lv.targets.length} {game.unit} · {distanceRange(lv.targets)} · {lv.summary}</p>
                    </div>
                    {playable ? (
                      <button type="button" onClick={() => start({ kind: "level", level: l })} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">{cleared ? "Spela igen" : "Spela"}</button>
                    ) : <Lock className="h-4 w-4 text-muted-foreground" aria-label="Låst" />}
                  </div>
                  {game.id === "bunker" && l === 5 && playable && (
                    <button type="button" onClick={() => start({ kind: "level", level: 5, variant: "varied-lies" })} className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-bold">
                      Frivilligt: Varierade lies (2 normala, 2 uppför, 2 nedför)
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">Spel påverkar aldrig ditt HCP. Nivåkraven är preliminära.</p>
        </div>
      )}
    </main>
  );
}

function ResultView({ gameId, result, onReplay }: { gameId: LevelGameId; result: LevelGameRound; onReplay: () => void }) {
  const game = LEVEL_GAMES[gameId];
  const [progress] = useState(() => progressFrom(game, loadRounds()));
  const next = result.recommendedLevel as LevelNumber;
  return (
    <div className="px-5 pt-6">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">{result.placement ? "Placering klar" : `Nivå ${result.level}${result.variant ? " · varierade lies" : ""}`}</p>
      <h1 className="mt-1 text-[34px] font-black leading-none">
        {result.placement ? `Föreslagen nivå: ${next}` : result.passed ? `Nivå ${result.level} klarad!` : `Nivå ${result.level} inte klarad`}
      </h1>
      {result.placement && <p className="mt-2 text-sm text-muted-foreground">Preliminärt – baserat på en omgång. {result.earnedLevel ? `Du nådde kraven för nivå ${result.earnedLevel}.` : "Du nådde inte kraven för nivå 1 än."}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Resultat</p><p className="text-3xl font-black">{result.score}</p><p className="text-xs">{game.scoreLabel}{result.personalBest ? " · nytt PB!" : ""}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Personbästa</p><p className="text-3xl font-black">{progress.pb}</p><p className="text-xs">{game.scoreLabel}</p></div>
      </div>
      <OutcomeTable gameId={gameId} attempts={result.attempts} />
      <p className="mt-5 text-sm font-bold">Klarade nivåer: {progress.cleared.length ? progress.cleared.join(", ") : "inga än"}</p>
      <p className="mt-1 text-sm text-muted-foreground">Nästa: nivå {next} – {game.levels[next].summary}</p>
      <div className="mt-6 grid gap-2">
        <button type="button" onClick={onReplay} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-nav-active font-bold text-primary-foreground"><RotateCcw className="h-4 w-4" /> {result.placement ? `Spela nivå ${next}` : "Spela igen"}</button>
        <Link to="/spel" className="flex min-h-12 items-center justify-center rounded-2xl border border-border font-bold">Till Spel</Link>
      </div>
    </div>
  );
}

function OutcomeTable({ gameId, attempts }: { gameId: LevelGameId; attempts: Attempt[] }) {
  const game = LEVEL_GAMES[gameId];
  const byDist = new Map<number, Attempt[]>();
  for (const a of attempts) byDist.set(a.target, [...(byDist.get(a.target) ?? []), a]);
  const threes = attempts.filter(a => a.outcome === 2).length;
  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm">
      {gameId === "langputt" && <p className="mb-2 font-bold">Treputtar (3+): {threes}/{attempts.length} ({Math.round((threes / attempts.length) * 100)} %)</p>}
      <ul className="space-y-1">
        {[...byDist.entries()].map(([d, as]) => {
          const good = as.filter(a => a.outcome < game.goodZones).length;
          return <li key={d} className="flex justify-between"><span>{formatDistance(d)}</span><span className="font-bold">{gameId === "kortputt" ? `${good}/${as.length} sänkta (${Math.round(good / as.length * 100)} %)` : as.map(a => a.outcomeLabel).join(" · ")}</span></li>;
        })}
      </ul>
    </div>
  );
}
