import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Search, User, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listFriendships,
  removeFriendship,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type Friendship,
  type Profile,
} from "@/lib/friends-cloud";

export const Route = createFileRoute("/vanner")({
  head: () => ({ meta: [{ title: "Vänner | SG4" }] }),
  component: FriendsPage,
});

type FriendshipState = {
  incoming: Friendship[];
  outgoing: Friendship[];
  accepted: Friendship[];
};

const EMPTY: FriendshipState = { incoming: [], outgoing: [], accepted: [] };

function Avatar({ profile }: { profile: Profile }) {
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials || <User className="h-5 w-5" />}
    </div>
  );
}

function FriendsPage() {
  const { user, loading } = useAuth();
  const [friendships, setFriendships] = useState<FriendshipState>(EMPTY);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return setFriendships(EMPTY);
    setFriendships(await listFriendships());
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const found = await searchProfiles(query);
      setResults(found);
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, user]);

  const existingIds = new Set([
    ...friendships.accepted.map((item) => item.other.id),
    ...friendships.incoming.map((item) => item.other.id),
    ...friendships.outgoing.map((item) => item.other.id),
  ]);

  async function add(profile: Profile) {
    setBusyId(profile.id);
    setMessage(null);
    const ok = await sendFriendRequest(profile.id);
    setBusyId(null);
    if (!ok) {
      setMessage("Det gick inte att skicka vänförfrågan.");
      return;
    }
    setMessage(`Vänförfrågan skickad till ${profile.displayName}.`);
    await refresh();
  }

  async function respond(friendship: Friendship, accept: boolean) {
    setBusyId(friendship.id);
    const ok = await respondToFriendRequest(friendship.id, accept);
    setBusyId(null);
    if (!ok) return setMessage("Det gick inte att uppdatera förfrågan.");
    setMessage(accept ? `${friendship.other.displayName} är nu din vän.` : "Förfrågan avvisades.");
    await refresh();
  }

  async function remove(friendship: Friendship) {
    setBusyId(friendship.id);
    const ok = await removeFriendship(friendship.id);
    setBusyId(null);
    if (!ok) return setMessage("Det gick inte att ta bort vänskapen.");
    setMessage(`${friendship.other.displayName} togs bort från dina vänner.`);
    await refresh();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header className="flex items-center gap-3">
        <Link to="/konto" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">SG4 Social</p>
          <h1 className="font-display text-4xl leading-none">Vänner</h1>
        </div>
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Laddar …</p>
      ) : !user ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center">
          <UserPlus className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Logga in för att lägga till vänner</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Vänner kopplas till ditt SG4-konto och kan jämföras i spelprofilen.</p>
          <Link to="/konto" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Till konto</Link>
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Lägg till vän</p>
                <h2 className="mt-1 font-display text-2xl">Sök spelarnamn</h2>
              </div>
              <span className="text-xs text-muted-foreground">{friendships.accepted.length} vänner</span>
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-3 focus-within:border-primary">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Sök efter spelare"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="Rensa"><X className="h-4 w-4 text-muted-foreground" /></button> : null}
            </label>

            {query.trim().length >= 2 ? (
              <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {searching ? <p className="p-4 text-sm text-muted-foreground">Söker …</p> : results.length ? results.map((profile) => {
                  const exists = existingIds.has(profile.id);
                  return (
                    <div key={profile.id} className="flex items-center gap-3 bg-background px-3.5 py-3">
                      <Avatar profile={profile} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{profile.displayName}</span>
                      <button
                        type="button"
                        onClick={() => add(profile)}
                        disabled={exists || busyId === profile.id}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-45"
                      >
                        {exists ? "Tillagd" : busyId === profile.id ? "Skickar …" : "Lägg till"}
                      </button>
                    </div>
                  );
                }) : <p className="p-4 text-sm text-muted-foreground">Ingen spelare hittades.</p>}
              </div>
            ) : null}

            {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
          </section>

          {friendships.incoming.length ? (
            <section className="mt-4 rounded-3xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Vänförfrågningar</p>
              <div className="mt-3 divide-y divide-border">
                {friendships.incoming.map((friendship) => (
                  <div key={friendship.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar profile={friendship.other} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{friendship.other.displayName}</span>
                    <button type="button" disabled={busyId === friendship.id} onClick={() => respond(friendship, true)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Acceptera"><Check className="h-4 w-4" /></button>
                    <button type="button" disabled={busyId === friendship.id} onClick={() => respond(friendship, false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground" aria-label="Avvisa"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-4 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dina vänner</p>
                <h2 className="mt-1 font-display text-2xl">Spelare</h2>
              </div>
              {friendships.accepted.length ? <Link to="/utveckling" className="text-xs font-semibold text-primary">Jämför ›</Link> : null}
            </div>

            {friendships.accepted.length ? (
              <div className="mt-3 divide-y divide-border">
                {friendships.accepted.map((friendship) => (
                  <div key={friendship.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar profile={friendship.other} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{friendship.other.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">Kan jämföras i Analys</p>
                    </div>
                    <button type="button" disabled={busyId === friendship.id} onClick={() => remove(friendship)} className="text-xs font-semibold text-muted-foreground">Ta bort</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">Inga vänner ännu. Sök på en spelares namn ovan och skicka en vänförfrågan.</p>
            )}
          </section>

          {friendships.outgoing.length ? (
            <section className="mt-4 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Skickade förfrågningar</p>
              <div className="mt-2 space-y-2">
                {friendships.outgoing.map((friendship) => (
                  <div key={friendship.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{friendship.other.displayName}</span>
                    <span className="text-xs text-muted-foreground">Väntar på svar</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
