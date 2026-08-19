import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Plus, Search, TrendingDown, TrendingUp, User, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { loadCardProfile } from "@/lib/rating-card";
import { addFriend, loadFriends, removeFriend, type Friend } from "@/lib/friends";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchFriendSnapshot,
  listFriendships,
  listPublicSnapshots,
  removeFriendship,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type Friendship,
  type Profile,
} from "@/lib/friends-cloud";
import { searchOpenProfiles, type OpenProfile } from "@/lib/open-profiles";
import { useSubscription } from "@/lib/subscription";
import { PremiumLock } from "@/components/premium-lock";
import type {
  CategoryHandicap,
  CategorySlug,
  HeatmapZone,
  HistoryEntry,
  RatingPoint,
} from "@/lib/sg-handicap";
import {
  BENCHMARK_LEVELS,
  CATEGORY_LABELS,
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  hcpLabel,
  loadRealHandicap,
  ratingFromHandicap,
} from "@/lib/sg-handicap";

/** Trend där HÖGRE är bättre (rating), till skillnad från home-dashboardens handicap-trend. */
function RatingTrend({ value }: { value?: number }) {
  if (value === undefined || Math.abs(value) < 0.5) return null;
  const improving = value > 0;
  const Icon = improving ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
        improving ? "text-primary" : "text-destructive"
      }`}
    >
      <Icon className="h-4 w-4" />
      {improving ? "+" : ""}
      {Math.round(value)} poäng
    </span>
  );
}

/* --------------------------------------------------------------- Översikt */

export function OverviewCard({
  real,
  estimated,
  totalRating,
  change30d,
}: {
  real: number | null;
  estimated: number | undefined;
  totalRating: number | undefined;
  change30d: number | undefined;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Real HCP</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none">
            {real !== null ? hcpLabel(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Est. Total HCP
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
            {estimated !== undefined ? hcpLabel(estimated) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Total Rating
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
            {totalRating ?? "–"}
          </p>
        </div>
      </div>
      {change30d !== undefined ? (
        <p className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <RatingTrend value={change30d} />
          senaste 30 dagarna
        </p>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted-foreground">
          Kör fler tester för att se din utveckling över tid.
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------- Jämförelseanalys */

type CompareTarget = {
  label: string;
  hcp: number;
  isFriend?: boolean;
  /** för riktiga vänner: exakt HCP per kategori istället för samma tal på alla axlar */
  categoryHcp?: Partial<Record<CategorySlug, number>>;
  avatarUrl?: string;
  initials?: string;
  verified?: boolean;
  premium?: boolean;
};

const DEFAULT_TARGET: CompareTarget = {
  label: "0",
  hcp: BENCHMARK_LEVELS[3].hcp,
  categoryHcp: BENCHMARK_LEVELS[3].categoryHcp,
};

/** Alltid synliga genvägar, en delmängd av BENCHMARK_LEVELS. */
const QUICK_LEVELS = BENCHMARK_LEVELS.filter((l) => ["20", "10", "0", "Tour"].includes(l.label));

export function RadarCard({
  cats,
  totalHandicap,
}: {
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
}) {
  const [target, setTarget] = useState<CompareTarget>(DEFAULT_TARGET);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => setFriends(loadFriends()), []);

  const profile = loadCardProfile();

  const targetFor = (slug?: CategorySlug) => {
    const exact = slug && target.categoryHcp?.[slug];
    return ratingFromHandicap(exact ?? target.hcp);
  };

  const data = [
    ...cats.map((c) => ({
      subject: `HCP: ${c.title}`,
      spelare: c.handicap !== undefined ? ratingFromHandicap(c.handicap) : 0,
      spelareHcp: c.handicap,
      target: targetFor(c.slug),
      targetHcp: (c.slug && target.categoryHcp?.[c.slug]) ?? target.hcp,
    })),
    {
      subject: "HCP: Totalt",
      spelare: totalHandicap !== undefined ? ratingFromHandicap(totalHandicap) : 0,
      spelareHcp: totalHandicap,
      target: targetFor(undefined),
      targetHcp: target.hcp,
    },
  ];

  return (
    <section className="mt-6">
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-chart-4 bg-primary/10">
            {profile.photo ? (
              <img src={profile.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-chart-4" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-xs font-semibold">Du</p>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="relative flex h-16 w-16 items-center justify-center">
            <span
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${
                target.premium ? "border-[#d4af37]" : "border-chart-3"
              } ${target.avatarUrl || target.initials ? "bg-chart-3/5" : "bg-chart-3/10"}`}
            >
              {target.avatarUrl ? (
                <img src={target.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : target.initials ? (
                <span className="font-[family-name:var(--font-display)] text-xl text-chart-3">
                  {target.initials}
                </span>
              ) : (
                <User className="h-7 w-7 text-chart-3" strokeWidth={1.5} />
              )}
            </span>
            {target.verified || target.premium ? (
              <BadgeCheck
                className={`absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-background ${
                  target.premium ? "text-[#d4af37]" : "text-chart-4"
                }`}
                fill="currentColor"
                stroke="var(--background)"
                strokeWidth={2}
              />
            ) : (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-chart-3 text-background">
                <Plus className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
          <p className="max-w-[5rem] truncate text-xs font-semibold text-muted-foreground">
            {target.isFriend
              ? target.label
              : target.label === "Tour"
                ? "Tour"
                : `HCP ${target.label}`}
          </p>
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {QUICK_LEVELS.map((l) => (
          <button
            key={l.label}
            type="button"
            onClick={() => setTarget({ label: l.label, hcp: l.hcp, categoryHcp: l.categoryHcp })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              !target.isFriend && target.hcp === l.hcp
                ? "border-chart-3 bg-chart-3 text-background"
                : "border-border text-muted-foreground"
            }`}
          >
            {l.label === "Tour" ? "Tour" : `HCP ${l.label}`}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Jämförelseanalys
      </p>

      <div className="mt-4 h-80 w-full rounded-3xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name={target.isFriend ? target.label : `HCP ${target.label}`}
              dataKey="target"
              stroke="var(--chart-3)"
              fill="var(--chart-3)"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 1 }}
            />
            <Radar
              name="Din nivå"
              dataKey="spelare"
              stroke="var(--chart-4)"
              fill="var(--chart-4)"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-4)", stroke: "var(--card)", strokeWidth: 1 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, name, props) => {
                const hcp =
                  props.dataKey === "spelare" ? props.payload.spelareHcp : props.payload.targetHcp;
                return [hcp !== undefined ? hcpLabel(hcp) : "–", name];
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
          Din nivå
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />
          {target.isFriend ? target.label : `HCP ${target.label}`}
        </span>
      </div>

      <AdvancedCompareSection cats={cats} target={target} />

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Vill du jämföra med andra spelare?
      </p>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mx-auto mt-2 flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary"
      >
        Jämför
        <span aria-hidden>›</span>
      </button>

      <SelectPlayerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        friends={friends}
        onPick={setTarget}
        onFriendsChange={setFriends}
      />
    </section>
  );
}

/** Avatar med valfri verifierad (blå) eller premium (guld) bock, som på sociala medier. */
function BadgedAvatar({
  verified,
  premium,
  tone = "sand",
}: {
  verified?: boolean;
  premium?: boolean;
  tone?: "sand" | "primary";
}) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <span
        className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ${
          premium ? "ring-2 ring-[#d4af37]" : tone === "primary" ? "bg-primary/10" : "bg-sand/15"
        }`}
      >
        <User className={`h-4 w-4 ${tone === "primary" ? "text-primary" : "text-sand"}`} />
      </span>
      {(verified || premium) && (
        <BadgeCheck
          className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background ${
            premium ? "text-[#d4af37]" : "text-chart-4"
          }`}
          fill="currentColor"
          stroke="var(--background)"
          strokeWidth={2}
        />
      )}
    </span>
  );
}

/** SG4+: kategori-för-kategori-jämförelse mot valt mål, med störst fördel/gap sammanfattat. */
function AdvancedCompareSection({
  cats,
  target,
}: {
  cats: CategoryHandicap[];
  target: CompareTarget;
}) {
  const { canViewAdvancedComparison } = useSubscription();

  const rows = cats
    .filter((c) => c.handicap !== undefined)
    .map((c) => {
      const benchmark = target.categoryHcp?.[c.slug] ?? target.hcp;
      // Lägre HCP är bättre, så diff = benchmark - du (positivt = du är bättre).
      const diff = Math.round((benchmark - c.handicap!) * 10) / 10;
      return { slug: c.slug, title: c.title, you: c.handicap!, benchmark, diff };
    });

  if (rows.length < 2) return null;

  const biggestAdvantage = [...rows].sort((a, b) => b.diff - a.diff)[0];
  const biggestGap = [...rows].sort((a, b) => a.diff - b.diff)[0];

  const table = (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Detaljerad jämförelse
      </p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.slug} className="text-sm">
            <p className="font-medium">{r.title}</p>
            <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Du <span className="font-semibold text-foreground">{hcpLabel(r.you)}</span>
              </span>
              <span>
                Benchmark{" "}
                <span className="font-semibold text-foreground">{hcpLabel(r.benchmark)}</span>
              </span>
              <span className={r.diff >= 0 ? "text-primary" : "text-destructive"}>
                {r.diff > 0 ? "+" : ""}
                {r.diff}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <p className="uppercase tracking-[0.15em] text-muted-foreground">Störst fördel</p>
          <p className="mt-0.5 font-semibold text-primary">{biggestAdvantage.title}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.15em] text-muted-foreground">Störst gap</p>
          <p className="mt-0.5 font-semibold text-destructive">{biggestGap.title}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      {canViewAdvancedComparison ? (
        table
      ) : (
        <PremiumLock label="Se detaljerad jämförelse">{table}</PremiumLock>
      )}
    </div>
  );
}

function SelectPlayerSheet({
  open,
  onOpenChange,
  friends,
  onPick,
  onFriendsChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  friends: Friend[];
  onPick: (t: CompareTarget) => void;
  onFriendsChange: (f: Friend[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendHcp, setFriendHcp] = useState("");

  const { user } = useAuth();
  const [accepted, setAccepted] = useState<Friendship[]>([]);
  const [incoming, setIncoming] = useState<Friendship[]>([]);
  const [outgoing, setOutgoing] = useState<Friendship[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<
    Awaited<ReturnType<typeof listPublicSnapshots>>
  >([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const refreshFriendships = useCallback(() => {
    if (!user) return;
    void listFriendships().then((r) => {
      setAccepted(r.accepted);
      setIncoming(r.incoming);
      setOutgoing(r.outgoing);
    });
    void listPublicSnapshots().then(setPublicProfiles);
  }, [user]);

  useEffect(() => {
    if (open) refreshFriendships();
  }, [open, refreshFriendships]);

  useEffect(() => {
    if (!open || !user) return;
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchProfiles(q).then((r) => {
        setSearchResults(r);
        setSearching(false);
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [query, open, user]);

  async function pickRealFriend(f: Friendship) {
    const snap = await fetchFriendSnapshot(f.other.id);
    if (!snap) return;
    onPick({
      label: f.other.displayName,
      hcp: snap.estHcp ?? snap.realHcp ?? 18,
      isFriend: true,
      categoryHcp: snap.categoryHcp,
      avatarUrl: f.other.avatarUrl ?? undefined,
    });
    onOpenChange(false);
  }

  function pickPublicProfile(p: Awaited<ReturnType<typeof listPublicSnapshots>>[number]) {
    onPick({
      label: p.displayName,
      hcp: p.estHcp ?? p.realHcp ?? 18,
      isFriend: true,
      categoryHcp: p.categoryHcp,
      avatarUrl: p.avatarUrl ?? undefined,
    });
    onOpenChange(false);
  }

  function pickOpenProfile(p: OpenProfile) {
    onPick({
      label: p.name,
      hcp: p.hcp,
      isFriend: true,
      categoryHcp: p.categoryHcp,
      initials: p.initials,
      verified: p.verified,
      premium: p.premium,
    });
    onOpenChange(false);
  }

  async function handleSendRequest(profileId: string) {
    const ok = await sendFriendRequest(profileId);
    if (ok) setSentTo((prev) => new Set(prev).add(profileId));
  }

  async function handleRespond(id: string, accept: boolean) {
    await respondToFriendRequest(id, accept);
    refreshFriendships();
  }

  const q = query.trim().toLowerCase();
  const levels = BENCHMARK_LEVELS.filter(
    (l) => !q || l.label.toLowerCase().includes(q) || `hcp ${l.label}`.includes(q),
  );
  const filteredFriends = friends.filter((f) => !q || f.name.toLowerCase().includes(q));
  const openProfiles = searchOpenProfiles(query);

  function pickLevel(l: (typeof BENCHMARK_LEVELS)[number]) {
    onPick({ label: l.label, hcp: l.hcp, categoryHcp: l.categoryHcp });
    onOpenChange(false);
  }

  function pickFriend(f: Friend) {
    onPick({ label: f.name, hcp: f.handicap, isFriend: true });
    onOpenChange(false);
  }

  function saveFriend() {
    const hcp = Number(friendHcp.replace(",", "."));
    if (!friendName.trim() || !Number.isFinite(hcp)) return;
    onFriendsChange(addFriend(friendName, hcp));
    setFriendName("");
    setFriendHcp("");
    setAddingFriend(false);
  }

  function deleteFriend(id: string) {
    onFriendsChange(removeFriend(id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-left text-2xl">Select Player</SheetTitle>
        </SheetHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök filter…"
            className="w-full rounded-2xl border border-input bg-background py-3 pl-10 pr-4 text-foreground outline-none focus:border-primary"
          />
        </div>

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Handicapnivåer
        </p>
        <div className="mt-2 space-y-1">
          {levels.map((l) => (
            <button
              key={l.label}
              onClick={() => pickLevel(l)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="font-medium">{l.label === "Tour" ? "Tour" : `HCP ${l.label}`}</span>
            </button>
          ))}
          {!levels.length && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Inga träffar.</p>
          )}
        </div>

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Öppna profiler
        </p>
        <div className="mt-2 space-y-1">
          {openProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => pickOpenProfile(p)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <BadgedAvatar verified={p.verified} premium={p.premium} />
              <span>
                <span className="flex items-center gap-1 font-medium">
                  {p.name}
                  {p.premium && (
                    <span className="rounded-full bg-[#d4af37]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#d4af37]">
                      Premium
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  HCP {hcpLabel(p.hcp)}
                  {p.subtitle ? ` · ${p.subtitle}` : ""}
                </span>
              </span>
            </button>
          ))}
          {!openProfiles.length && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Inga träffar.</p>
          )}
        </div>

        {user && publicProfiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {publicProfiles.map((p) => (
              <button
                key={p.userId}
                onClick={() => pickPublicProfile(p)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand/15">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-sand" />
                  )}
                </span>
                <span className="font-medium">{p.displayName}</span>
              </button>
            ))}
          </div>
        )}

        {user ? (
          <>
            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Riktiga vänner
            </p>

            {incoming.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {incoming.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{f.other.displayName}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRespond(f.id, true)}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        Acceptera
                      </button>
                      <button
                        onClick={() => handleRespond(f.id, false)}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        Avböj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 space-y-1">
              {accepted.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-2xl px-3 py-2 transition-colors hover:bg-muted"
                >
                  <button
                    onClick={() => pickRealFriend(f)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                      {f.other.avatarUrl ? (
                        <img
                          src={f.other.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <span className="font-medium">{f.other.displayName}</span>
                  </button>
                  <button
                    onClick={async () => {
                      await removeFriendship(f.id);
                      refreshFriendships();
                    }}
                    aria-label={`Ta bort ${f.other.displayName}`}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {outgoing.map((f) => (
                <p key={f.id} className="px-3 py-2 text-xs text-muted-foreground">
                  Förfrågan skickad till {f.other.displayName} – väntar på svar
                </p>
              ))}
              {!accepted.length && !outgoing.length && !incoming.length && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Inga vänner än – sök efter namn ovan för att skicka en förfrågan.
                </p>
              )}
            </div>

            {query.trim().length >= 2 && (
              <div className="mt-2 space-y-1 border-t border-border pt-2">
                {searching && <p className="px-3 py-1 text-xs text-muted-foreground">Söker…</p>}
                {searchResults
                  .filter(
                    (p) =>
                      !accepted.some((f) => f.other.id === p.id) &&
                      !outgoing.some((f) => f.other.id === p.id),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl px-3 py-2"
                    >
                      <span className="text-sm">{p.displayName}</span>
                      <button
                        onClick={() => handleSendRequest(p.id)}
                        disabled={sentTo.has(p.id)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground disabled:opacity-50"
                      >
                        {sentTo.has(p.id) ? "Skickad" : "Lägg till"}
                      </button>
                    </div>
                  ))}
                {!searching && !searchResults.length && (
                  <p className="px-3 py-1 text-xs text-muted-foreground">
                    Ingen hittad med det namnet.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="mt-5 rounded-2xl border border-border bg-card/60 p-3 text-xs text-muted-foreground">
            Logga in för att söka efter och jämföra dig mot riktiga vänner som använder appen.
          </p>
        )}

        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Manuellt tillagda
        </p>
        <div className="mt-2 space-y-1">
          {filteredFriends.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-2xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <button
                onClick={() => pickFriend(f)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chart-3/10">
                  <User className="h-4 w-4 text-chart-3" />
                </span>
                <span>
                  <span className="block font-medium">{f.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    HCP {hcpLabel(f.handicap)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => deleteFriend(f.id)}
                aria-label={`Ta bort ${f.name}`}
                className="p-2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!friends.length && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Inga kompisar tillagda än.</p>
          )}
        </div>

        {addingFriend ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-border p-4">
            <input
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Namn"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={friendHcp}
              onChange={(e) => setFriendHcp(e.target.value)}
              inputMode="decimal"
              placeholder="Handicap, t.ex. 14,8"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={saveFriend}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
              >
                Spara
              </button>
              <button
                onClick={() => setAddingFriend(false)}
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingFriend(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Lägg till kompis
          </button>
        )}

        <p className="mt-4 pb-2 text-center text-xs text-muted-foreground">
          Appen har ingen spelarkatalog ännu, så du lägger till kompisar manuellt – deras handicap
          jämförs på samma sätt som en fast HCP-nivå.
        </p>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------------------------------------------- Kategori-stats (klickbara) */

const NO_DATA_LINK: Record<CategorySlug, { to: string; params?: Record<string, string> }> = {
  approach: { to: "/kategori/$slug", params: { slug: "approach" } },
  driving: { to: "/kategori/$slug", params: { slug: "driving" } },
  "around-the-green": { to: "/kategori/$slug", params: { slug: "around-the-green" } },
  puttning: { to: "/kategori/$slug", params: { slug: "puttning" } },
  speed: { to: "/speed-test" },
};

/** De fem HCP-kategorierna som ingår i gridet och färgkodningen mot
 *  Total HCP – inklusive Speed, som nu behandlas exakt likadant som de
 *  övriga fyra. */
const HCP_GRID_SLUGS: CategorySlug[] = [
  "approach",
  "driving",
  "around-the-green",
  "puttning",
  "speed",
];

/** Kontinuerlig färgskala baserad på hur en kategoris HCP förhåller sig
 *  till spelarens Total HCP – grönt för styrkor, rött för svagheter,
 *  intensiteten interpolerad snarare än i fasta steg. Mycket subtil
 *  bakgrundston, starkare färg på själva HCP-siffran, subtil kant. */
function categoryTone(diff: number | undefined): {
  background?: string;
  borderColor?: string;
  valueColor?: string;
} {
  if (diff === undefined) return {};
  const clamped = Math.max(-4, Math.min(4, diff));
  // Liten dödzon kring 0 räknas som neutral, ingen färgsignal där.
  if (Math.abs(clamped) < 0.3) return {};

  const intensity = Math.min(1, Math.abs(clamped) / 4); // 0–1
  const color = clamped > 0 ? "var(--destructive)" : "var(--primary)";
  const bgPct = Math.round(4 + intensity * 10);
  const borderPct = Math.round(10 + intensity * 35);
  const valuePct = Math.round(55 + intensity * 35);

  return {
    background: `color-mix(in oklch, ${color} ${bgPct}%, var(--card))`,
    borderColor: `color-mix(in oklch, ${color} ${borderPct}%, var(--border))`,
    valueColor: `color-mix(in oklch, ${color} ${valuePct}%, var(--foreground))`,
  };
}

export function CategoryStatsSection() {
  const [cats, setCats] = useState<CategoryHandicap[]>([]);
  const [totalHcp, setTotalHcp] = useState<number | undefined>(undefined);

  useEffect(() => {
    const real = loadRealHandicap();
    const computed = computeCategoryHandicaps(undefined, real ?? undefined);
    setCats(computed);
    setTotalHcp(real ?? computeEstimatedHandicap(computed));
  }, []);

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Stats per kategori
      </p>

      {/* Total HCP – störst visuell prioritet, egen rad överst */}
      <div className="mt-3 rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none text-primary">
          {totalHcp !== undefined ? hcpLabel(totalHcp) : "–"}
        </p>
      </div>

      {/* Grid – alla fem kategorier, inklusive Speed, färgkodade mot Total HCP */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {HCP_GRID_SLUGS.map((slug) => {
          const cat = cats.find((c) => c.slug === slug);
          const hasHcp = cat?.handicap !== undefined;
          const diff = hasHcp && totalHcp !== undefined ? cat!.handicap! - totalHcp : undefined;
          const tone = categoryTone(diff);
          const noDataLink = NO_DATA_LINK[slug];

          return (
            <Link
              key={slug}
              to={hasHcp ? "/utveckling/$slug" : noDataLink.to}
              params={hasHcp ? { slug } : noDataLink.params}
              className="block rounded-2xl border p-3.5 transition-transform active:scale-[0.98]"
              style={{
                background: tone.background ?? "var(--card)",
                borderColor: tone.borderColor ?? "var(--border)",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {CATEGORY_LABELS[slug]}
              </p>
              {hasHcp ? (
                <>
                  <p
                    className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none"
                    style={tone.valueColor ? { color: tone.valueColor } : undefined}
                  >
                    HCP {hcpLabel(cat!.handicap!)}
                  </p>
                  {cat!.isBaseline && (
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Uppskattning
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm font-medium text-primary">Gör ett test</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Heatmaps */

function heatColor(score: number): string {
  if (score >= 70) return "bg-primary/15 text-primary border-primary/30";
  if (score >= 45) return "bg-flag/15 text-flag border-flag/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function heatBar(score: number): string {
  if (score >= 70) return "bg-primary";
  if (score >= 45) return "bg-flag";
  return "bg-destructive";
}

export function HeatmapCard({
  title,
  zones,
  unit = "",
}: {
  title: string;
  zones: HeatmapZone[];
  unit?: string;
}) {
  if (!zones.length) return null;
  const best = [...zones].sort((a, b) => b.score - a.score)[0];
  const worst = [...zones].sort((a, b) => a.score - b.score)[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {zones.map((z) => (
          <div key={z.label} className={`rounded-xl border p-2 ${heatColor(z.score)}`}>
            <p className="flex items-center gap-1 text-[11px] font-medium opacity-80">
              {z.label}
              {z.label === best.label && z.score !== worst.score && (
                <span aria-label="Starkast">🏆</span>
              )}
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl leading-none">
              {Math.round(z.score)}
              {unit}
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/60">
              <div
                className={`h-full rounded-full ${heatBar(z.score)}`}
                style={{ width: `${Math.max(4, Math.min(100, z.score))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Utvecklingsgrafer */

const PERIODS = [
  { label: "30 dagar", days: 30 },
  { label: "90 dagar", days: 90 },
  { label: "12 månader", days: 365 },
  { label: "Alla tester", days: null },
] as const;

const METRICS = [
  { key: "total", label: "Total Rating", color: "var(--primary)" },
  { key: "approach", label: "Approach", color: "var(--flag)" },
  { key: "driving", label: "Off the Tee", color: "var(--chart-4)" },
  { key: "aroundGreen", label: "Around Green", color: "var(--sand)" },
  { key: "putting", label: "Putting", color: "var(--destructive)" },
  { key: "speed", label: "Speed", color: "var(--chart-3)" },
] as const;

export function TrendChartsCard({
  points,
  period,
  onPeriodChange,
}: {
  points: RatingPoint[];
  period: (typeof PERIODS)[number]["days"];
  onPeriodChange: (days: (typeof PERIODS)[number]["days"]) => void;
}) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("total");
  const active = METRICS.find((m) => m.key === metric)!;
  const data = points.filter((p) => p[metric] !== undefined);

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Utvecklingsgrafer</p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              metric === m.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPeriodChange(p.days)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              period === p.days
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ChartCard title={`${active.label} över tid`}>
        {data.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Kör minst två tester i den här kategorin för att se en graf.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={active.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </section>
  );
}

/* --------------------------------------------------------------- Historik */

const HISTORY_FILTERS: { slug: CategorySlug | "all"; label: string }[] = [
  { slug: "all", label: "Alla" },
  { slug: "approach", label: CATEGORY_LABELS.approach },
  { slug: "driving", label: CATEGORY_LABELS.driving },
  { slug: "around-the-green", label: CATEGORY_LABELS["around-the-green"] },
  { slug: "puttning", label: CATEGORY_LABELS.puttning },
];

export function HistoryPanel({ entries, limit }: { entries: HistoryEntry[]; limit?: number }) {
  const [filter, setFilter] = useState<CategorySlug | "all">("all");
  const [compare, setCompare] = useState<string[]>([]);

  const filtered = (
    filter === "all" ? entries : entries.filter((e) => e.categorySlug === filter)
  ).slice(0, limit);
  const compared = compare
    .map((k) => entries.find((e) => e.key === k))
    .filter(Boolean) as HistoryEntry[];

  function toggleCompare(key: string) {
    setCompare((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  }

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Historik</p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.slug}
            type="button"
            onClick={() => setFilter(f.slug)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.slug
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {compared.length === 2 && (
        <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Jämförelse</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {compared.map((e) => (
              <div key={e.key}>
                <p className="text-xs text-muted-foreground">{e.title}</p>
                <p className="text-[11px] text-muted-foreground">{e.date.slice(0, 10)}</p>
                <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
                  {e.score}
                  {e.scoreUnit}
                </p>
              </div>
            ))}
          </div>
          {typeof compared[0].score === "number" && typeof compared[1].score === "number" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Skillnad:{" "}
              {(compared[1].score - compared[0].score >= 0 ? "+" : "") +
                Math.round((compared[1].score - compared[0].score) * 10) / 10}
              {compared[0].scoreUnit}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Inga tester i den här kategorin ännu.
          </p>
        ) : (
          filtered.map((e) => (
            <div
              key={e.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <input
                type="checkbox"
                checked={compare.includes(e.key)}
                onChange={() => toggleCompare(e.key)}
                aria-label={`Välj ${e.title} ${e.date.slice(0, 10)} för jämförelse`}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date.slice(0, 10)}</p>
              </div>
              {e.score !== undefined && (
                <span className="font-[family-name:var(--font-display)] text-lg leading-none">
                  {e.score}
                  {e.scoreUnit}
                </span>
              )}
              <Link
                to="/framsteg/$slug/$test"
                params={{ slug: e.to.slug, test: e.to.test }}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Öppna
              </Link>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Markera två tester med kryssrutorna för att jämföra dem. "Öppna" tar dig till den
        detaljerade grafen för testtypen.
      </p>
    </section>
  );
}
