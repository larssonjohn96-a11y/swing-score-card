import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";
import { createEightBallGroupSession } from "@/lib/group-eight-ball";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/8-bollar-grupp")({ component: GroupSetupPage });

function GroupSetupPage() {
  const { user, displayName, loading } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [selected, setSelected] = useState<Friendship[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void listFriendships().then((r) => setFriends(r.accepted));
  }, [user]);

  function toggle(friend: Friendship) {
    setSelected((current) => current.some((f) => f.id === friend.id)
      ? current.filter((f) => f.id !== friend.id)
      : current.length < 3 ? [...current, friend] : current);
  }

  async function start() {
    if (!selected.length) return;
    setBusy(true); setError(null);
    try {
      const id = await createEightBallGroupSession(selected);
      window.location.assign(`/8-bollar-grupp/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Det gick inte att starta gruppsessionen.");
      setBusy(false);
    }
  }

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-[100dvh] w-full max-w-md bg-background px-5 pb-10 pt-5 text-foreground">
      <header className="flex items-center gap-3">
        <Link to="/8-bollar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">8-bollsövningen</p><h1 className="font-display text-3xl leading-none">Testa tillsammans</h1></div>
      </header>

      {loading ? <p className="mt-8 text-sm text-muted-foreground">Laddar …</p> : !user ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <Users className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Logga in först</h2>
          <p className="mt-2 text-sm text-muted-foreground">Grupptest kopplar resultat till varje spelares konto.</p>
          <Link to="/konto" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Till konto</Link>
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Scorer</p>
            <p className="mt-1 font-display text-2xl">{displayName ?? "Du"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Du matar in resultat för hela gruppen.</p>
          </section>

          <section className="mt-3 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Välj spelare</p><h2 className="mt-1 font-display text-2xl">Vänner</h2></div>
              <span className="text-xs font-semibold text-muted-foreground">{selected.length + 1}/4 spelare</span>
            </div>
            {friends.length ? <div className="mt-3 divide-y divide-border">{friends.map((friend) => {
              const active = selected.some((f) => f.id === friend.id);
              return <button key={friend.id} type="button" onClick={() => toggle(friend)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{active ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4 text-muted-foreground" />}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{friend.other.displayName}</span>
                {active ? <X className="h-4 w-4 text-muted-foreground" /> : null}
              </button>;
            })}</div> : <div className="mt-4 rounded-2xl bg-muted/60 p-4"><p className="text-sm text-muted-foreground">Du behöver minst en accepterad vän för att starta ett grupptest.</p><Link to="/vanner" className="mt-2 inline-block text-sm font-semibold text-primary">Lägg till vän ›</Link></div>}
          </section>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <button type="button" onClick={start} disabled={!selected.length || busy} className="mt-5 w-full rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground disabled:opacity-40">{busy ? "Startar …" : `Starta test · ${selected.length + 1} spelare`}</button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">Alla spelar samma 40 slag. Resultatet sparas automatiskt på respektive konto.</p>
        </>
      )}
    </main>
  );
}
