import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, TrendingDown, TrendingUp, User, X } from "lucide-react";
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
import type {
  CategoryCardStat,
  CategoryHandicap,
  CategorySlug,
  HeatmapZone,
  HistoryEntry,
  RatingPoint,
} from "@/lib/sg-handicap";
import {
  BENCHMARK_LEVELS,
  CATEGORY_LABELS,
  computeCategoryCardStats,
  hcpLabel,
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

type CompareTarget = { label: string; hcp: number; isFriend?: boolean };

const DEFAULT_TARGET: CompareTarget = { label: "0", hcp: BENCHMARK_LEVELS[3].hcp };

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

  const data = [
    ...cats.map((c) => ({
      subject: `HCP: ${c.title}`,
      spelare: c.handicap !== undefined ? ratingFromHandicap(c.handicap) : 0,
      target: ratingFromHandicap(target.hcp),
    })),
    {
      subject: "HCP: Totalt",
      spelare: totalHandicap !== undefined ? ratingFromHandicap(totalHandicap) : 0,
      target: ratingFromHandicap(target.hcp),
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
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-chart-3 bg-chart-3/10">
            <User className="h-7 w-7 text-chart-3" strokeWidth={1.5} />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-chart-3 text-background">
              <Plus className="h-3.5 w-3.5" />
            </span>
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
            onClick={() => setTarget({ label: l.label, hcp: l.hcp })}
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

  const q = query.trim().toLowerCase();
  const levels = BENCHMARK_LEVELS.filter(
    (l) => !q || l.label.toLowerCase().includes(q) || `hcp ${l.label}`.includes(q),
  );
  const filteredFriends = friends.filter((f) => !q || f.name.toLowerCase().includes(q));

  function pickLevel(l: (typeof BENCHMARK_LEVELS)[number]) {
    onPick({ label: l.label, hcp: l.hcp });
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
          Dina kompisar
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

/** Kort, ettordig svensk beskrivning per kategori. */
const CATEGORY_ONEWORD: Record<CategorySlug, string> = {
  approach: "Inspel",
  driving: "Utslag",
  "around-the-green": "Närspel",
  puttning: "Putt",
  speed: "Fart",
};

export function CategoryStatsSection() {
  const [cards, setCards] = useState<CategoryCardStat[]>([]);

  useEffect(() => {
    setCards(computeCategoryCardStats(90));
  }, []);

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Stats per kategori
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <Link
            key={c.slug}
            to={c.hasData ? "/utveckling/$slug" : NO_DATA_LINK[c.slug].to}
            params={c.hasData ? { slug: c.slug } : NO_DATA_LINK[c.slug].params}
            className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <p className="font-[family-name:var(--font-display)] text-xl leading-none">{c.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{CATEGORY_ONEWORD[c.slug]}</p>
            {c.hasData ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  Est. HCP{" "}
                  <span className="font-[family-name:var(--font-display)] text-xl text-flag">
                    {c.estHcp !== undefined ? hcpLabel(c.estHcp) : "–"}
                  </span>
                </p>
                <p className="mt-3 text-xs font-semibold text-flag">Visa analys →</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-muted-foreground">Inget test genomfört ännu.</p>
                <p className="mt-3 text-xs font-semibold text-flag">Genomför ett test →</p>
              </>
            )}
          </Link>
        ))}
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

export function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  const [filter, setFilter] = useState<CategorySlug | "all">("all");
  const [compare, setCompare] = useState<string[]>([]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.categorySlug === filter);
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
