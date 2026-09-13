import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createClubCup,
  cupRoundLabel,
  getPlayerCupMatch,
  loadClubCup,
  resetClubCup,
  saveClubCup,
  startActiveCupMatch,
  type CupMatch,
  type CupParticipant,
  type CupState,
} from "@/lib/cup-engine";

export const Route = createFileRoute("/cup")({
  head: () => ({ meta: [{ title: "Club Cup – SG4" }] }),
  component: CupPage,
});

function participant(match: CupMatch, side: "a" | "b") {
  return side === "a" ? match.a : match.b;
}

function PlayerRow({ player, winner, pending }: { player?: CupParticipant; winner?: boolean; pending?: boolean }) {
  return (
    <div className={`flex min-h-11 items-center gap-2 px-3 py-2 ${winner ? "bg-amber-500/10" : ""}`}>
      <span className="w-6 text-center text-lg">{player?.avatar ?? "·"}</span>
      <span className={`min-w-0 flex-1 truncate text-xs ${player?.player ? "font-black text-primary" : "font-semibold"}`}>{player?.name ?? (pending ? "Väntar" : "TBD")}</span>
      {typeof player?.hcp === "number" ? <span className="text-[9px] font-bold text-muted-foreground">HCP {player.hcp}</span> : null}
      {winner ? <Trophy className="h-3.5 w-3.5 text-amber-500" /> : null}
    </div>
  );
}

function MatchCard({ match }: { match: CupMatch }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <PlayerRow player={participant(match, "a")} winner={!!match.a && match.winnerId === match.a.id} pending={!match.a} />
      <div className="border-t border-border" />
      <PlayerRow player={participant(match, "b")} winner={!!match.b && match.winnerId === match.b.id} pending={!match.b} />
    </div>
  );
}

function RoundColumn({ title, matches }: { title: string; matches: CupMatch[] }) {
  return (
    <section className="w-[228px] shrink-0">
      <div className="mb-3 flex items-center justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground">{title}</p><span className="text-[9px] font-bold text-muted-foreground">{matches.length} match{matches.length === 1 ? "" : "er"}</span></div>
      <div className="flex min-h-[430px] flex-col justify-around gap-4">{matches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
    </section>
  );
}

function CupPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CupState | null>(null);

  useEffect(() => setState(loadClubCup()), []);

  const qf = useMemo(() => state?.matches.filter((m) => m.round === "quarterfinal").sort((a, b) => a.slot - b.slot) ?? [], [state]);
  const sf = useMemo(() => state?.matches.filter((m) => m.round === "semifinal").sort((a, b) => a.slot - b.slot) ?? [], [state]);
  const final = useMemo(() => state?.matches.filter((m) => m.round === "final") ?? [], [state]);
  const playerMatch = state ? getPlayerCupMatch(state) : undefined;
  const opponent = playerMatch ? (playerMatch.a?.player ? playerMatch.b : playerMatch.a) : undefined;

  function startCup() {
    const next = createClubCup();
    saveClubCup(next);
    setState(next);
  }

  function restartCup() {
    resetClubCup();
    startCup();
  }

  function playMatch() {
    if (!state || !opponent) return;
    startActiveCupMatch(state);
    window.localStorage.setItem("sg4-cup-bot-id", opponent.id);
    void navigate({ to: "/match-bot" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/turneringar" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-xl">‹</Link>
        <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.18em] text-muted-foreground">SG4 Cup</p><p className="text-xs font-bold text-muted-foreground">Knockout</p></div>
        <button onClick={restartCup} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Starta om cup"><RotateCcw className="h-4 w-4" /></button>
      </header>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-amber-500/25 bg-gradient-to-br from-amber-500/[.13] via-card to-card p-5 shadow-[0_22px_50px_-32px_rgba(0,0,0,.45)]">
        <div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Trophy className="h-6 w-6" /></span><span className="rounded-full bg-foreground px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-background">HCP 20</span></div>
        <h1 className="mt-5 font-display text-4xl">Club Cup</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">8 spelare. Förlust och du är ute. Vinn kvartsfinal, semifinal och final.</p>
        {state ? <div className="mt-4 flex items-center gap-2 text-xs font-bold"><span className="rounded-full border border-border bg-background/80 px-3 py-1.5">{state.status === "active" ? cupRoundLabel(state.currentRound) : state.status === "won" ? "Mästare" : "Utslagen"}</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">3 vinster till titeln</span></div> : null}
      </section>

      {!state ? (
        <section className="mt-5 rounded-[28px] border border-border bg-card p-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/12"><Trophy className="h-7 w-7 text-amber-600" /></div>
          <h2 className="mt-4 font-display text-3xl">Din första cup</h2>
          <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">En enkel 8-manna bracket. Övriga matcher avgörs automatiskt och din väg fortsätter så länge du vinner.</p>
          <button onClick={startCup} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 font-display text-xl text-background">Starta Club Cup <ChevronRight className="h-5 w-5" /></button>
        </section>
      ) : (
        <>
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Bracket</p><h2 className="mt-1 font-display text-3xl">Vägen till final</h2></div><p className="text-[10px] font-bold text-muted-foreground">Scrolla →</p></div>
            <div className="-mx-5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max items-stretch gap-4 pr-5">
                <RoundColumn title="Kvartsfinal" matches={qf} />
                <RoundColumn title="Semifinal" matches={sf} />
                <RoundColumn title="Final" matches={final} />
              </div>
            </div>
          </section>

          {state.status === "active" && playerMatch && opponent ? (
            <section className="mt-3 rounded-[28px] border border-primary/25 bg-primary/[.06] p-5">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-primary">Din nästa match · {cupRoundLabel(playerMatch.round)}</p>
              <div className="mt-3 flex items-center gap-3"><span className="text-4xl">{opponent.avatar}</span><div className="min-w-0"><h3 className="font-display text-3xl">Du vs {opponent.name}</h3>{typeof opponent.hcp === "number" ? <p className="mt-1 text-xs font-bold text-muted-foreground">{opponent.name} · HCP {opponent.hcp}</p> : null}</div></div>
              <button onClick={playMatch} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Spela {cupRoundLabel(playerMatch.round).toLowerCase()} <ChevronRight className="h-5 w-5" /></button>
            </section>
          ) : state.status === "won" ? (
            <section className="mt-3 rounded-[28px] border border-amber-500/30 bg-amber-500/[.10] p-5 text-center"><Trophy className="mx-auto h-8 w-8 text-amber-500" /><h3 className="mt-3 font-display text-3xl">Club Cup-mästare</h3><p className="mt-2 text-sm text-muted-foreground">Tre raka knockout-vinster. Nästa cupnivå kan byggas ovanpå samma system.</p><button onClick={restartCup} className="mt-5 w-full rounded-2xl bg-foreground py-4 font-display text-xl text-background">Försvara titeln</button></section>
          ) : (
            <section className="mt-3 rounded-[28px] border border-border bg-card p-5 text-center"><h3 className="font-display text-3xl">Utslagen</h3><p className="mt-2 text-sm text-muted-foreground">Cupen är över för den här gången. Starta om och försök igen.</p><button onClick={restartCup} className="mt-5 w-full rounded-2xl bg-foreground py-4 font-display text-xl text-background">Ny Club Cup</button></section>
          )}
        </>
      )}
    </main>
  );
}
