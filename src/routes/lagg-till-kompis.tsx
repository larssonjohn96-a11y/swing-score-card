import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, User, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listFriendships,
  listPublicSnapshots,
  searchProfiles,
  sendFriendRequest,
  type Profile,
} from "@/lib/friends-cloud";

export const Route = createFileRoute("/lagg-till-kompis")({
  head: () => ({ meta: [{ title: "Hitta användare | SG4" }] }),
  component: AddFriendPage,
});

type SuggestedProfile = Profile & { hcp?: number };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function Avatar({ profile }: { profile: Profile }) {
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#f2c400] bg-[#dfe8e2] text-sm font-black text-primary">
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(profile.displayName) || <User className="h-6 w-6" />}
    </span>
  );
}

function AddFriendPage() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [suggested, setSuggested] = useState<SuggestedProfile[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) { setSuggested([]); return; }
    void Promise.all([listFriendships(), listPublicSnapshots()]).then(([friends, snapshots]) => {
      const ids = new Set([
        ...friends.accepted.map((item) => item.other.id),
        ...friends.incoming.map((item) => item.other.id),
        ...friends.outgoing.map((item) => item.other.id),
      ]);
      setExistingIds(ids);
      setSuggested(
        snapshots
          .filter((profile) => profile.userId !== user.id && !ids.has(profile.userId))
          .slice(0, 12)
          .map((profile) => ({
            id: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            hcp: profile.realHcp ?? profile.estHcp ?? undefined,
          })),
      );
    });
  }, [user]);

  useEffect(() => {
    if (!user || query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const found = await searchProfiles(query);
      setResults(found.filter((profile) => profile.id !== user.id));
      setSearching(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, user]);

  const visibleProfiles = useMemo(() => query.trim().length >= 2 ? results : suggested, [query, results, suggested]);

  async function add(profile: Profile) {
    if (existingIds.has(profile.id)) return;
    setBusyId(profile.id);
    setMessage(null);
    const ok = await sendFriendRequest(profile.id);
    setBusyId(null);
    if (!ok) { setMessage("Det gick inte att skicka vänförfrågan."); return; }
    setExistingIds((current) => new Set([...current, profile.id]));
    setMessage(`Vänförfrågan skickad till ${profile.displayName}.`);
  }

  async function invite() {
    const text = "Spela och träna med mig i SG4.";
    try {
      if (navigator.share) await navigator.share({ title: "SG4", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Dela-dialogen kan stängas utan åtgärd.
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-40 pt-[max(18px,env(safe-area-inset-top))]">
      <div className="px-5">
        <header className="grid grid-cols-[56px_1fr_56px] items-center">
          <Link to="/" aria-label="Tillbaka" className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/65 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_24px_-18px_rgba(15,23,42,.5)] backdrop-blur-2xl">
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <h1 className="text-center text-[23px] font-black uppercase tracking-[-.03em] text-foreground">Hitta användare</h1>
          <span />
        </header>

        <label className="mt-8 flex items-center gap-3 rounded-[22px] bg-[#f3f4f7] px-5 py-4.5 focus-within:ring-1 focus-within:ring-primary/25">
          <Search className="h-6 w-6 shrink-0 text-[#0a9a55]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sök" className="min-w-0 flex-1 bg-transparent text-[18px] text-foreground outline-none placeholder:text-[#0a9a55]" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Rensa"><X className="h-5 w-5 text-muted-foreground" /></button> : null}
        </label>

        <div className="mt-8 flex items-center justify-between gap-3">
          <h2 className="text-[23px] font-black tracking-[-.035em] text-foreground">{query.trim().length >= 2 ? "Sökresultat" : "Golfare du kanske känner"}</h2>
          {!query && suggested.length > 6 ? <span className="shrink-0 text-[16px] font-bold text-[#13ad63]">Visa alla</span> : null}
        </div>

        {loading ? <p className="mt-8 text-sm text-muted-foreground">Laddar …</p> : !user ? (
          <div className="mt-6 rounded-[24px] border border-border bg-card p-5 text-sm text-muted-foreground">Logga in för att hitta och lägga till golfare.</div>
        ) : searching ? <p className="mt-7 text-sm text-muted-foreground">Söker …</p> : visibleProfiles.length ? (
          <div className="mt-4 divide-y divide-border/60">
            {visibleProfiles.map((profile) => {
              const exists = existingIds.has(profile.id);
              const hcp = "hcp" in profile ? profile.hcp : undefined;
              return (
                <article key={profile.id} className="flex items-center gap-4 py-4">
                  <div className="relative shrink-0">
                    <Avatar profile={profile} />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#f2c400] px-2 py-0.5 text-[9px] font-black text-white">GOLD</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-black text-foreground">{profile.displayName}</p>
                    <p className="mt-1 truncate text-[15px] text-muted-foreground">{typeof hcp === "number" ? `HCP ${hcp.toFixed(1)}` : "SG4-spelare"}</p>
                  </div>
                  <button type="button" onClick={() => add(profile)} disabled={exists || busyId === profile.id} aria-label={exists ? "Redan tillagd" : `Lägg till ${profile.displayName}`} className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f3f4f7] text-[#079b55] disabled:opacity-40">
                    <UserPlus className="h-6 w-6" />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-[24px] border border-border bg-card p-5 text-sm text-muted-foreground">{query.trim().length >= 2 ? "Ingen användare hittades." : "Inga nya förslag just nu."}</div>
        )}
        {message ? <p className="mt-4 text-sm font-semibold text-[#0a9a55]">{message}</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md rounded-t-[30px] border-t border-white/70 bg-white/82 px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-6 shadow-[0_-16px_40px_-28px_rgba(15,23,42,.35)] backdrop-blur-2xl">
        <p className="text-center text-[19px] font-black text-foreground">Hittade du inte din vän?</p>
        <button type="button" onClick={invite} className="mt-5 flex h-14 w-full items-center justify-center rounded-[18px] bg-[#18ad63] text-[18px] font-black text-white">Skicka en inbjudan</button>
      </div>
    </main>
  );
}
