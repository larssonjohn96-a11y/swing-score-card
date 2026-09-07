import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, RotateCcw, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import {
  fetchEightBallGroupSession,
  groupTotals,
  recordEightBallGroupScore,
  subscribeEightBallGroupSession,
  type GroupSession,
} from "@/lib/group-eight-ball";
import { syncForUser } from "@/lib/sessions/sync";

const STATION_LIST = [
  { type: "Chip", distance: 10 },
  { type: "Chip", distance: 30 },
  { type: "Pitch", distance: 20 },
  { type: "Pitch", distance: 40 },
  { type: "Lobb", distance: 15 },
  { type: "Lobb", distance: 25 },
  { type: "Bunker", distance: 10 },
  { type: "Bunker", distance: 20 },
] as const;
const EIGHT_BALL_ROUNDS = 5;
const BOOTSTRAP_PREFIX = "sg4:eight-ball-group:bootstrap:";

const LIGHT_SURFACE = {
  "--background": "oklch(0.995 0.005 110)",
  "--foreground": "oklch(0.18 0.035 160)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.18 0.035 160)",
  "--primary": "oklch(0.4 0.11 158)",
  "--primary-foreground": "oklch(0.99 0.008 120)",
  "--tint": "oklch(0.972 0.026 158)",
  "--muted": "oklch(0.965 0.011 150)",
  "--muted-foreground": "oklch(0.46 0.028 158)",
  "--border": "oklch(0.905 0.016 155)",
} as unknown as import("react").CSSProperties;

function readBootstrap(sessionId: string): GroupSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${BOOTSTRAP_PREFIX}${sessionId}`);
    return raw ? (JSON.parse(raw) as GroupSession) : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/8-bollar-grupp/$sessionId")({
  ssr: false,
  component: GroupSessionPage,
});

function GroupSessionPage() {
  useHideBottomNav(true);
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const bootstrap = useMemo(() => readBootstrap(sessionId), [sessionId]);
  const [session, setSession] = useState<GroupSession | null>(bootstrap);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [lastSyncedCompleted, setLastSyncedCompleted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchEightBallGroupSession(sessionId);
      if (next) {
        setSession(next);
        setLoadError(null);
      } else if (!session) {
        setLoadError("Spelet kunde inte hittas eller du har inte tillgång till det.");
      }
    } catch (e) {
      if (!session) setLoadError(e instanceof Error ? e.message : "Spelet kunde inte öppnas.");
    }
  }, [sessionId, session]);

  useEffect(() => {
    if (bootstrap) {
      // Host enters immediately from local bootstrap. Network state is only a background refresh.
      void refresh();
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setLoadError("Spelet svarade inte. Försök igen.");
    }, 3500);
    void fetchEightBallGroupSession(sessionId)
      .then((next) => {
        if (!active) return;
        if (next) setSession(next);
        else setLoadError("Spelet kunde inte hittas eller du har inte tillgång till det.");
      })
      .catch((e) => {
        if (active) setLoadError(e instanceof Error ? e.message : "Spelet kunde inte öppnas.");
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [bootstrap, sessionId]);

  useEffect(() => {
    if (!session) return;
    return subscribeEightBallGroupSession(sessionId, () => void refresh());
  }, [sessionId, session, refresh]);

  useEffect(() => {
    if (!user || session?.status !== "completed" || lastSyncedCompleted) return;
    setLastSyncedCompleted(true);
    void syncForUser(user.id, { force: true });
  }, [user, session?.status, lastSyncedCompleted]);

  const totals = useMemo(() => (session ? groupTotals(session) : []), [session]);
  const isParticipant = Boolean(user && session?.members.some((member) => member.userId === user.id));
  const currentMember = session?.members.find((member) => member.seat === session.currentPlayerIndex) ?? null;
  const shotIndex = Math.min(session?.currentShot ?? 0, 39);
  const stationIndex = shotIndex % STATION_LIST.length;
  const station = STATION_LIST[stationIndex];
  const round = Math.floor(shotIndex / STATION_LIST.length) + 1;

  async function score(points: number) {
    if (!session || !currentMember || !isParticipant || busy || session.status !== "active") return;
    setBusy(true);
    setScoreError(null);
    try {
      await recordEightBallGroupScore(session.id, currentMember.userId, session.currentShot, points);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Det gick inte att registrera poängen.";
      if (/state changed|wrong player/i.test(message)) await refresh();
      else setScoreError(message);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-10 text-foreground">
        {loadError ? (
          <>
            <h1 className="font-display text-3xl">Kunde inte öppna spelet</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{loadError}</p>
            <button type="button" onClick={() => { setLoadError(null); void refresh(); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><RotateCcw className="h-4 w-4" /> Försök igen</button>
            <Link to="/8-bollar" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Till 8-bollsövningen</Link>
          </>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <p className="font-display text-2xl">Hämtar spelet</p>
            <p className="mt-2 text-xs text-muted-foreground">Detta visas bara när du öppnar någon annans pågående spel.</p>
          </div>
        )}
      </main>
    );
  }

  if (session.status === "cancelled") {
    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-10 text-foreground">
        <h1 className="font-display text-3xl">Spelet är avslutat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ett nytt 8-bollsspel har startats. Bara ett spel kan vara aktivt åt gången.</p>
        <Link to="/8-bollar" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Till 8-bollsövningen</Link>
      </main>
    );
  }

  if (session.status === "completed") {
    return (
      <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-12 pt-6 text-foreground">
        <header className="flex items-center gap-3">
          <Link to="/8-bollar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">8-bollsövningen</p><h1 className="font-display text-3xl leading-none">Resultat</h1></div>
        </header>
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Klart · 40 slag per spelare</p>
          <div className="mt-3 divide-y divide-border">
            {totals.map((row) => (
              <div key={row.userId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div><p className="text-sm font-semibold">{row.displayName}{row.userId === user?.id ? " · Du" : ""}</p><p className="text-xs text-muted-foreground">40 registrerade slag</p></div>
                <p className="font-display text-3xl text-primary">{row.score}<span className="ml-1 text-xs text-muted-foreground">p</span></p>
              </div>
            ))}
          </div>
        </section>
        <Link to="/8-bollar-historik" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><BarChart3 className="h-4 w-4" /> Se min progress</Link>
        <Link to="/8-bollar" className="mt-3 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-4 font-semibold">Kör igen</Link>
      </main>
    );
  }

  const totalEntries = session.currentShot * session.members.length + session.currentPlayerIndex;
  const totalRequired = 40 * session.members.length;
  const progress = totalRequired ? (totalEntries / totalRequired) * 100 : 0;
  const currentTotal = totals.find((row) => row.userId === currentMember?.userId)?.score ?? 0;

  return (
    <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 text-foreground">
      <div className="flex items-center justify-between pt-[max(.75rem,env(safe-area-inset-top))]">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">8-bollsövningen · {session.members.length} spelare</p><p className="mt-0.5 text-sm font-semibold">Slag {session.currentShot + 1} av 40</p></div>
        <Link to="/8-bollar" className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Avbryt</Link>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: EIGHT_BALL_ROUNDS }, (_, i) => {
          const active = i === round - 1;
          const done = i < round - 1;
          return <div key={i} className="min-w-0"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: done ? "100%" : active ? `${(stationIndex / STATION_LIST.length) * 100}%` : "0%" }} /></div><p className={`mt-1 text-center text-[9px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>V{i + 1}</p></div>;
        })}
      </div>

      <section className="py-5 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Varv {round} · Station {stationIndex + 1}</p>
        <div className="mt-2 flex items-end justify-center gap-3"><h2 className="font-display text-5xl leading-none">{station.type}</h2><p className="pb-1 text-xl font-semibold tabular-nums text-primary">{station.distance} m</p></div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"><Users className="h-4 w-4" /> {currentMember?.displayName ?? "Spelare"}</div>
      </section>

      <div>
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultat</p>
        <div className="grid grid-cols-5 gap-2">
          {[{ p: 4, l: "Sänkt" }, { p: 3, l: "≤ 1 m" }, { p: 2, l: "≤ 2 m" }, { p: 1, l: "≤ 3 m" }, { p: 0, l: "> 3 m" }].map(({ p, l }) => (
            <button key={p} type="button" disabled={!isParticipant || busy} onClick={() => void score(p)} className="flex h-[88px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 transition-[transform,border-color,background-color] active:scale-[0.97] active:border-primary active:bg-tint disabled:opacity-45"><span className="font-display text-3xl leading-none text-primary">{p}</span><span className="mt-2 text-[10px] font-semibold leading-none">{l}</span></button>
          ))}
        </div>
        {scoreError ? <p className="mt-3 text-center text-xs text-destructive">{scoreError}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="text-muted-foreground">{currentMember?.displayName ?? "Spelare"} hittills</span><span className="font-semibold tabular-nums">{currentTotal} poäng</span></div>
      <section className="mt-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ställning</p><span className="text-[10px] text-muted-foreground">{Math.round(progress)}%</span></div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">{totals.map((row) => <div key={row.userId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium">{row.displayName}{row.userId === user?.id ? " · Du" : ""}</span><span className="font-semibold tabular-nums">{row.score} p</span></div>)}</div>
      </section>
    </main>
  );
}
