import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Check, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchEightBallGroupSession,
  groupTotals,
  recordEightBallGroupScore,
  subscribeEightBallGroupSession,
  type GroupSession,
} from "@/lib/group-eight-ball";
import { syncForUser } from "@/lib/sessions/sync";
import { EIGHT_BALL_ROUNDS, LIGHT_SURFACE, STATION_LIST } from "./8-bollar";

export const Route = createFileRoute("/8-bollar-grupp/$sessionId")({ component: GroupSessionPage });

function GroupSessionPage() {
  const { sessionId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<GroupSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedCompleted, setLastSyncedCompleted] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchEightBallGroupSession(sessionId);
    setSession(next);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => subscribeEightBallGroupSession(sessionId, () => void refresh()), [sessionId, refresh]);

  useEffect(() => {
    if (!user || session?.status !== "completed" || lastSyncedCompleted) return;
    setLastSyncedCompleted(true);
    void syncForUser(user.id, { force: true });
  }, [user, session?.status, lastSyncedCompleted]);

  const totals = useMemo(() => session ? groupTotals(session) : [], [session]);
  const isHost = Boolean(user && session && user.id === session.hostUserId);
  const currentMember = session?.members.find((m) => m.seat === session.currentPlayerIndex) ?? null;
  const shotIndex = Math.min(session?.currentShot ?? 0, 39);
  const stationIndex = shotIndex % STATION_LIST.length;
  const station = STATION_LIST[stationIndex];
  const round = Math.floor(shotIndex / STATION_LIST.length) + 1;

  async function score(points: number) {
    if (!session || !currentMember || !isHost || busy || session.status !== "active") return;
    setBusy(true); setError(null);
    try {
      await recordEightBallGroupScore(session.id, currentMember.userId, session.currentShot, points);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Det gick inte att registrera poängen.");
    } finally { setBusy(false); }
  }

  if (authLoading || loading) return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-10 text-foreground"><p className="text-sm text-muted-foreground">Laddar gruppsession …</p></main>;
  if (!user) return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-10 text-foreground"><p className="font-semibold">Logga in för att öppna gruppsessionen.</p><Link to="/konto" className="mt-4 inline-block text-primary">Till konto ›</Link></main>;
  if (!session) return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-10 text-foreground"><p className="font-semibold">Sessionen kunde inte öppnas.</p><Link to="/vanner" className="mt-4 inline-block text-primary">Till vänner ›</Link></main>;

  if (session.status === "completed") {
    return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-12 pt-6 text-foreground">
      <header className="flex items-center gap-3"><Link to="/8-bollar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">8-bollsövningen</p><h1 className="font-display text-3xl leading-none">Gruppresultat</h1></div></header>
      <section className="mt-6 rounded-3xl border border-border bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Klart · 40 slag per spelare</p>
        <div className="mt-3 divide-y divide-border">{totals.map((row) => <div key={row.userId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold">{row.displayName}{row.userId === user.id ? " · Du" : ""}</p><p className="text-xs text-muted-foreground">40 registrerade slag</p></div><p className="font-display text-3xl text-primary">{row.score}<span className="ml-1 text-xs text-muted-foreground">p</span></p></div>)}</div>
      </section>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Ditt eget resultat sparas som ett vanligt 8-bollstest och kommer med i din historik och progress.</p>
      <Link to="/8-bollar-historik" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><BarChart3 className="h-4 w-4" /> Se min progress</Link>
      <Link to="/8-bollar" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Till 8-bollsövningen</Link>
    </main>;
  }

  const totalEntries = session.currentShot * session.members.length + session.currentPlayerIndex;
  const totalRequired = 40 * session.members.length;
  const progress = totalRequired ? (totalEntries / totalRequired) * 100 : 0;

  return <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-7 text-foreground">
    <header className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Grupp · {session.members.length} spelare</p><p className="mt-0.5 text-sm font-semibold">Slag {session.currentShot + 1} av 40</p></div><Link to="/vanner" className="text-xs font-semibold text-muted-foreground">Stäng</Link></header>

    <div className="mt-3 grid grid-cols-5 gap-1.5">{Array.from({ length: EIGHT_BALL_ROUNDS }, (_, i) => { const active = i === round - 1; const done = i < round - 1; return <div key={i}><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: done ? "100%" : active ? `${(stationIndex / STATION_LIST.length) * 100}%` : "0%" }} /></div><p className={`mt-1 text-center text-[9px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>V{i + 1}</p></div>; })}</div>
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary/50 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>

    <section className="mt-5 rounded-3xl border border-border bg-card p-5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Varv {round} · Station {stationIndex + 1}</p>
      <h2 className="mt-2 font-display text-4xl leading-none">{station.type}</h2>
      <p className="mt-2 text-lg font-semibold text-primary">{station.distance} m</p>
      <div className="mx-auto mt-4 h-px w-12 bg-border" />
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{isHost ? "Registrera för" : "Nu spelar"}</p>
      <p className="mt-1 font-display text-3xl leading-none">{currentMember?.displayName ?? "–"}</p>
      {!isHost ? <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Host registrerar resultatet</p> : null}
    </section>

    {isHost ? <div className="mt-4"><p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultat</p><div className="grid grid-cols-5 gap-2">{[{ p: 4, l: "Sänkt" }, { p: 3, l: "≤ 1 m" }, { p: 2, l: "≤ 2 m" }, { p: 1, l: "≤ 3 m" }, { p: 0, l: "> 3 m" }].map(({ p, l }) => <button key={p} type="button" disabled={busy} onClick={() => score(p)} className="flex h-[88px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 transition-transform active:scale-[0.97] disabled:opacity-50"><span className="font-display text-3xl leading-none text-primary">{p}</span><span className="mt-2 text-[10px] font-semibold">{l}</span></button>)}</div>{error ? <p className="mt-3 text-center text-xs text-destructive">{error}</p> : null}</div> : null}

    <section className="mt-4 rounded-2xl border border-border bg-card px-4 py-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ställning hittills</p><span className="text-[10px] text-muted-foreground">live</span></div><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">{totals.map((row) => <div key={row.userId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium">{row.displayName}</span><span className="font-semibold tabular-nums">{row.score} p</span></div>)}</div></section>
  </main>;
}
