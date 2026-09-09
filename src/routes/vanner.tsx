import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Search, User, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchFriendSnapshot,
  listFriendships,
  removeFriendship,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type Friendship,
  type Profile,
} from "@/lib/friends-cloud";
import { listActiveEightBallGroupSessions } from "@/lib/group-eight-ball";
import { computeEstimatedHandicap, hcpLabel, loadRealHandicap } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";

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

function Avatar({ profile, size = "md" }: { profile: Profile; size?: "sm" | "md" | "lg" }) {
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const sizeClass = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-sm";

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary`}>
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
  const [friendHcp, setFriendHcp] = useState<Record<string, number | undefined>>({});
  const [groupSessions, setGroupSessions] = useState<Array<{ id: string; hostUserId: string; createdAt: string }>>([]);

  const ownHcp = useMemo(() => {
    const real = loadRealHandicap();
    const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
    return real ?? computeEstimatedHandicap(cats);
  }, []);

  useEffect(() => {
    if (!user) { setGroupSessions([]); return; }
    void listActiveEightBallGroupSessions().then(setGroupSessions);
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return setFriendships(EMPTY);
    const next = await listFriendships();
    setFriendships(next);
    const pairs = await Promise.all(next.accepted.map(async (friendship) => {
      const snapshot = await fetchFriendSnapshot(friendship.other.id);
      return [friendship.other.id, snapshot?.realHcp ?? snapshot?.estHcp ?? undefined] as const;
    }));
    setFriendHcp(Object.fromEntries(pairs));
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
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-32 pt-8">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm" aria-label="Tillbaka">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">SG4 Social</p>
          <h1 className="mt-1 font-display text-4xl leading-none">Vänner</h1>
        </div>
        <span className="h-10 w-10" />
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Laddar …</p>
      ) : !user ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 text-center shadow-[0_14px_34px_-24px_rgba(0,0,0,0.35)]">
          <UserPlus className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Logga in för att lägga till vänner</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Vänner kopplas till ditt SG4-konto och kan jämföras i spelprofilen.</p>
          <Link to="/konto" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Till konto</Link>
        </section>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-[1.55fr_.8fr] gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-border bg-card px-4 py-4 shadow-[0_14px_34px_-22px_rgba(0,0,0,0.36)]">
              <div className="flex shrink-0 items-center">
                {friendships.accepted.slice(0, 3).map((friendship, index) => (
                  <span key={friendship.id} className="rounded-full border-2 border-card" style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index }}><Avatar profile={friendship.other} size="sm" /></span>
                ))}
                {!friendships.accepted.length ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></span> : null}
              </div>
              <div className="min-w-0">
                <p className="font-display text-3xl leading-none text-primary">{friendships.accepted.length}</p>
                <p className="mt-1 truncate text-sm font-semibold">Vänner</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-center justify-center rounded-3xl border border-border bg-card px-3 py-4 text-center shadow-[0_14px_34px_-22px_rgba(0,0,0,0.36)]">
              <p className="font-display text-3xl leading-none text-primary">{ownHcp !== undefined ? hcpLabel(ownHcp) : "–"}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">HCP</p>
            </div>
          </div>

          <section id="friend-search" className="mt-5">
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm focus-within:border-primary">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Sök efter spelare"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="Rensa"><X className="h-4 w-4 text-muted-foreground" /></button> : null}
            </label>

            {query.trim().length >= 2 ? (
              <div className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                {searching ? <p className="p-4 text-sm text-muted-foreground">Söker …</p> : results.length ? results.map((profile) => {
                  const exists = existingIds.has(profile.id);
                  return (
                    <div key={profile.id} className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar profile={profile} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{profile.displayName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Klubb ej angiven</p>
                      </div>
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
            <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
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

          <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_14px_34px_-24px_rgba(0,0,0,0.34)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dina vänner</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Vänner ({friendships.accepted.length})</h2>
              </div>
              {friendships.accepted.length ? <Link to="/jamfor" className="text-xs font-semibold text-primary">Jämför ›</Link> : null}
            </div>

            {friendships.accepted.length ? (
              <div className="divide-y divide-border">
                {friendships.accepted.map((friendship) => {
                  const hcp = friendHcp[friendship.other.id];
                  return (
                    <div key={friendship.id} className="flex items-center gap-3 px-4 py-4">
                      <Avatar profile={friendship.other} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{friendship.other.displayName}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">Klubb ej angiven{hcp !== undefined ? ` · HCP ${hcpLabel(hcp)}` : ""}</p>
                      </div>
                      <button type="button" disabled={busyId === friendship.id} onClick={() => remove(friendship)} className="rounded-full px-2 py-1 text-lg leading-none text-muted-foreground" aria-label={`Ta bort ${friendship.other.displayName}`}>•••</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="m-4 rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">Inga vänner ännu. Sök på en spelares namn och skicka en vänförfrågan.</p>
            )}
          </section>

          <a href="#friend-search" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow-[0_12px_26px_-18px_rgba(0,0,0,0.35)]">
            <UserPlus className="h-5 w-5" />
            Lägg till nya vänner
          </a>

          {groupSessions.length ? (
            <section className="mt-5 rounded-3xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Pågående gruppspel</p>
              <div className="mt-3 space-y-2">
                {groupSessions.map((session) => (
                  <a key={session.id} href={`/8-bollar-grupp/${session.id}`} className="flex items-center gap-3 rounded-2xl border border-border px-3.5 py-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">8-bollsövningen</span><span className="block text-[11px] text-muted-foreground">{session.hostUserId === user.id ? "Ditt spel" : "Du är med som spelare"} · startat {new Date(session.createdAt).toLocaleDateString("sv-SE")}</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {friendships.outgoing.length ? (
            <section className="mt-5 px-1">
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
