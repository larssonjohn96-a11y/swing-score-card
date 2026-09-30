import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { supabase } from "@/integrations/supabase/client";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot, type PlayerSnapshot, type Profile } from "@/lib/friends-cloud";
import { computeLocalComparisonProfile, type ComparisonBagProfile, type ComparisonCategory, type ComparisonMetric, type SocialComparisonProfile } from "@/lib/social-comparison-profile";
import { computeEstimatedHandicap, loadRealHandicap, type CategorySlug } from "@/lib/sg-handicap";
import { loadCardProfile } from "@/lib/rating-card";

export const Route = createFileRoute("/jamfor/$userId")({
  head: () => ({ meta: [{ title: "Jämför spelare | SG4" }] }),
  component: CompareFriendPage,
});

type Focus = "all" | ComparisonCategory;
type MetricRow = { key:string; label:string; left?:number; right?:number; unit?:string; decimals?:number; higherIsBetter:boolean };
type LocalSnapshot = {
  total?: number;
  categories: Partial<Record<CategorySlug, number>>;
  comparison: SocialComparisonProfile;
};

const CATEGORY_ROWS: Array<{ slug: ComparisonCategory; label: string }> = [
  { slug: "driving", label: "Off the Tee" },
  { slug: "approach", label: "Approach" },
  { slug: "around-the-green", label: "Around Green" },
  { slug: "puttning", label: "Putting" },
];

const FOCUS_OPTIONS: Array<[Focus,string]> = [["all","Hela spelet"],["driving","Utslag"],["approach","Inspel"],["around-the-green","Närspel"],["puttning","Puttning"]];

const SHOT_LABELS: Record<ComparisonCategory,string> = {
  driving: "Drives registrerade",
  approach: "Inspel registrerade",
  "around-the-green": "Närspelsslag registrerade",
  puttning: "Puttar registrerade",
};

const glassCard = "border border-white/70 bg-muted/55 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl backdrop-saturate-125 dark:border-white/10 dark:bg-white/[0.06]";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]?.toUpperCase()).join("");
}

function Avatar({ name, url, side }: { name:string; url?:string|null; side:"left"|"right" }) {
  const tone = side === "left"
    ? "border-blue-500 bg-blue-500/10 text-blue-500 shadow-[0_10px_28px_-16px_rgba(59,130,246,0.6)]"
    : "border-red-500 bg-red-500/10 text-red-500 shadow-[0_10px_28px_-16px_rgba(239,68,68,0.55)]";
  return <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] font-display text-xl ${tone}`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials(name) || <User className="h-6 w-6" />}
  </div>;
}

function formatHcp(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return "–";
  const abs = Math.abs(value).toFixed(1).replace(".0", "").replace(".", ",");
  return value < 0 ? `+${abs}` : abs;
}

function formatValue(value: number | undefined, unit = "", decimals = 0) {
  if (value === undefined || !Number.isFinite(value)) return "–";
  const text = value.toFixed(decimals).replace(/\.0$/, "").replace(".", ",");
  return unit ? `${text}${unit === "%" ? "%" : ` ${unit}`}` : text;
}

function winner(row: MetricRow) {
  if (row.left === undefined || row.right === undefined || row.left === row.right) return null;
  const leftBetter = row.higherIsBetter ? row.left > row.right : row.left < row.right;
  return leftBetter ? "left" : "right";
}

function MetricTable({ rows, hcp = false }: { rows:MetricRow[]; hcp?:boolean }) {
  return <div className={`overflow-hidden rounded-[1.75rem] ${glassCard}`}>
    {rows.map((row, index) => {
      const win = winner(row);
      return <div key={row.key} className={`grid grid-cols-[1fr_1.35fr_1fr] items-center gap-2 px-4 py-4 ${index ? "border-t border-white/60 dark:border-white/10" : ""}`}>
        <div className="text-left"><span className={`inline-flex min-w-14 justify-center rounded-xl px-2.5 py-1.5 text-base font-bold tabular-nums ${win === "left" ? "bg-blue-500 text-white shadow-[0_8px_18px_-10px_rgba(59,130,246,0.75)]" : "text-blue-600 dark:text-blue-400"}`}>{hcp ? formatHcp(row.left) : formatValue(row.left,row.unit,row.decimals)}</span></div>
        <div className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{row.label}</div>
        <div className="text-right"><span className={`inline-flex min-w-14 justify-center rounded-xl px-2.5 py-1.5 text-base font-bold tabular-nums ${win === "right" ? "bg-red-500 text-white shadow-[0_8px_18px_-10px_rgba(239,68,68,0.75)]" : "text-red-600 dark:text-red-400"}`}>{hcp ? formatHcp(row.right) : formatValue(row.right,row.unit,row.decimals)}</span></div>
      </div>;
    })}
  </div>;
}

function matchRows(left: ComparisonMetric[], right: ComparisonMetric[], focus: Focus): MetricRow[] {
  const leftFiltered = focus === "all" ? left.filter((item) => item.overview !== false) : left.filter((item) => item.category === focus);
  const rightFiltered = focus === "all" ? right.filter((item) => item.overview !== false) : right.filter((item) => item.category === focus);
  const rightMap = new Map(rightFiltered.map((item) => [item.key, item]));
  const keys = Array.from(new Set([...leftFiltered.map((item) => item.key), ...rightFiltered.map((item) => item.key)]));
  return keys.map((key) => {
    const a = leftFiltered.find((item) => item.key === key);
    const b = rightMap.get(key);
    const ref = a ?? b!;
    return { key, label:ref.label, left:a?.value, right:b?.value, unit:ref.unit, decimals:ref.decimals, higherIsBetter:ref.higherIsBetter };
  });
}

type BagCompareTarget = "friend" | "hcp30" | "hcp20" | "hcp10" | "scratch" | "tour" | "tour-long";

const BAG_TARGETS: Array<{ id: BagCompareTarget; label: string; shortLabel: string }> = [
  { id: "friend", label: "Kompis", shortLabel: "Kompis" },
  { id: "hcp30", label: "HCP 30", shortLabel: "HCP 30" },
  { id: "hcp20", label: "HCP 20", shortLabel: "HCP 20" },
  { id: "hcp10", label: "HCP 10", shortLabel: "HCP 10" },
  { id: "scratch", label: "HCP 0", shortLabel: "HCP 0" },
  { id: "tour", label: "Tour", shortLabel: "Tour" },
  { id: "tour-long", label: "Tour Long Hitter", shortLabel: "Long Hitter" },
];

const BENCHMARK_CARRY: Record<Exclude<BagCompareTarget, "friend">, Record<string, number>> = {
  hcp30: { Driver:185,"3W":170,"5W":160,"4H":150,"5H":145,"4i":145,"5i":137,"6i":128,"7i":118,"8i":108,"9i":98,PW:88,"48°":82,"50°":78,"52°":74,"54°":70,"56°":66,"58°":62,"60°":58 },
  hcp20: { Driver:200,"3W":185,"5W":175,"4H":165,"5H":158,"4i":158,"5i":150,"6i":140,"7i":130,"8i":120,"9i":110,PW:100,"48°":94,"50°":90,"52°":86,"54°":82,"56°":78,"58°":74,"60°":70 },
  hcp10: { Driver:220,"3W":203,"5W":191,"4H":180,"5H":172,"4i":174,"5i":165,"6i":155,"7i":145,"8i":135,"9i":125,PW:114,"48°":108,"50°":103,"52°":98,"54°":93,"56°":88,"58°":83,"60°":78 },
  scratch:{ Driver:240,"3W":220,"5W":207,"4H":194,"5H":185,"4i":188,"5i":178,"6i":168,"7i":158,"8i":148,"9i":138,PW:126,"48°":120,"50°":115,"52°":110,"54°":104,"56°":98,"58°":92,"60°":86 },
  tour:   { Driver:255,"3W":235,"5W":220,"4H":205,"5H":196,"4i":198,"5i":188,"6i":178,"7i":168,"8i":158,"9i":148,PW:136,"48°":130,"50°":125,"52°":120,"54°":114,"56°":108,"58°":102,"60°":96 },
  "tour-long":{ Driver:280,"3W":258,"5W":242,"4H":225,"5H":215,"4i":218,"5i":207,"6i":196,"7i":185,"8i":174,"9i":163,PW:150,"48°":143,"50°":137,"52°":131,"54°":124,"56°":117,"58°":110,"60°":103 },
};

function benchmarkBag(target: Exclude<BagCompareTarget, "friend">, labels: string[]): ComparisonBagProfile {
  const carry = BENCHMARK_CARRY[target];
  const clubs = labels.map((label) => ({ label, ...(carry[label] !== undefined ? { carry: carry[label] } : {}) }));
  return { mappedCount: clubs.filter((club) => club.carry !== undefined).length, clubCount: clubs.length, clubs };
}

function BagComparison({
  left,
  friendBag,
  leftName,
  friendName,
  leftAvatar,
  friendAvatar,
}: {
  left?: ComparisonBagProfile;
  friendBag?: ComparisonBagProfile;
  leftName: string;
  friendName: string;
  leftAvatar?: string | null;
  friendAvatar?: string | null;
}) {
  const [bagView, setBagView] = useState<"carry" | "witb">("carry");
  const [target, setTarget] = useState<BagCompareTarget>("friend");

  if (!left) {
    return <Empty text="Färdigställ My Bag först för att kunna jämföra din bag." />;
  }

  const leftLabels = [...left.clubs].map((club) => club.label);
  const targetConfig = BAG_TARGETS.find((item) => item.id === target) ?? BAG_TARGETS[0];
  const benchmark = target === "friend" ? friendBag : benchmarkBag(target, leftLabels);
  const rightName = target === "friend" ? friendName : targetConfig.label;
  const rightAvatar = target === "friend" ? friendAvatar : null;
  const canShowWitb = target === "friend";

  const normalize = (label: string) => label.trim().toLowerCase();
  const rightByLabel = new Map((benchmark?.clubs ?? []).map((club) => [normalize(club.label), club]));
  const knownLeft = new Set(left.clubs.map((club) => normalize(club.label)));
  const rows = [
    ...left.clubs.map((club) => ({ label: club.label, left: club, right: rightByLabel.get(normalize(club.label)) })),
    ...(target === "friend" ? benchmark?.clubs ?? [] : [])
      .filter((club) => !knownLeft.has(normalize(club.label)))
      .map((club) => ({ label: club.label, left: undefined, right: club })),
  ].reverse();

  const modelText = (club: ComparisonBagProfile["clubs"][number] | undefined) =>
    club ? [club.brand, club.model].filter(Boolean).join(" ") : "";
  const specText = (club: ComparisonBagProfile["clubs"][number] | undefined) =>
    club
      ? [
          club.loft ? `Loft ${club.loft}` : null,
          club.shaft,
          club.flex ? `Flex ${club.flex}` : null,
          club.length ? `Längd ${club.length}` : null,
          club.lie ? `Lie ${club.lie}` : null,
          club.grip,
        ].filter(Boolean).join(" · ")
      : "";

  return <div className="space-y-5">
    <section className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] px-4 py-5 ${glassCard}`}>
      <div className="flex min-w-0 flex-col items-center text-center">
        <Avatar name={leftName} url={leftAvatar} side="left" />
        <p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{leftName}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">{left.mappedCount} mappade</p>
      </div>
      <span className="rounded-xl bg-foreground px-3 py-2 font-display text-2xl text-background shadow-sm">VS</span>
      <div className="flex min-w-0 flex-col items-center text-center">
        <Avatar name={rightName} url={rightAvatar} side="right" />
        <p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{rightName}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
          {target === "friend" ? (benchmark ? `${benchmark.mappedCount} mappade` : "Ingen bag ännu") : "Carry benchmark"}
        </p>
      </div>
    </section>

    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Jämför mot</p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BAG_TARGETS.map((item) => {
          const active = item.id === target;
          return <button
            key={item.id}
            type="button"
            onClick={() => { setTarget(item.id); if (item.id !== "friend") setBagView("carry"); }}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}
          >
            {item.shortLabel}
          </button>;
        })}
      </div>
    </section>

    {canShowWitb ? (
      <div className={`grid grid-cols-2 gap-1 rounded-2xl p-1 ${glassCard}`}>
        <button type="button" onClick={() => setBagView("carry")} className={`min-h-11 rounded-xl text-sm font-bold transition ${bagView === "carry" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"}`}>Carry</button>
        <button type="button" onClick={() => setBagView("witb")} className={`min-h-11 rounded-xl text-sm font-bold transition ${bagView === "witb" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"}`}>WITB</button>
      </div>
    ) : null}

    <section className={`overflow-hidden rounded-[1.8rem] ${glassCard}`}>
      <div className="grid grid-cols-[78px_1fr_1fr] items-end border-b border-white/60 px-4 py-3 dark:border-white/10">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.12em] text-muted-foreground">Klubb</p>
        </div>
        <div className="text-center">
          <p className="truncate text-sm font-black text-blue-600 dark:text-blue-400">{leftName}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{bagView === "carry" ? "Carry" : "WITB"}</p>
        </div>
        <div className="text-center">
          <p className="truncate text-sm font-black text-red-600 dark:text-red-400">{rightName}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{bagView === "carry" ? "Carry" : "WITB"}</p>
        </div>
      </div>

      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className={`grid min-h-[62px] grid-cols-[78px_1fr_1fr] items-center gap-2 px-4 py-3 ${index ? "border-t border-white/60 dark:border-white/10" : ""}`}>
          <div className="text-left text-sm font-black">{row.label}</div>
          {bagView === "carry" ? (
            <>
              <div className="text-center">
                <p className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{row.left?.carry === undefined ? "–" : `${Math.round(row.left.carry)} m`}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black tabular-nums text-red-600 dark:text-red-400">{row.right?.carry === undefined ? "–" : `${Math.round(row.right.carry)} m`}</p>
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 text-center">
                <p className="truncate text-[11px] font-bold text-blue-600 dark:text-blue-400">{modelText(row.left) || (row.left ? "Ej angivet" : "–")}</p>
                {specText(row.left) ? <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{specText(row.left)}</p> : null}
              </div>
              <div className="min-w-0 text-center">
                <p className="truncate text-[11px] font-bold text-red-600 dark:text-red-400">{modelText(row.right) || (row.right ? "Ej angivet" : "–")}</p>
                {specText(row.right) ? <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{specText(row.right)}</p> : null}
              </div>
            </>
          )}
        </div>
      ))}
    </section>

    {target === "friend" && !friendBag ? (
      <p className="text-center text-xs leading-relaxed text-muted-foreground">Din kompis behöver färdigställa och synka My Bag innan carry och WITB kan jämföras.</p>
    ) : target !== "friend" ? (
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">Benchmark-värden används för carry-jämförelsen och är separata från spelarens HCP.</p>
    ) : null}
  </div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-center"><h2 className="font-display text-2xl">{children}</h2></div>;
}

function BackControl({ onBack }: { onBack?: () => void }) {
  const cls = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5";
  return onBack
    ? <button type="button" onClick={onBack} className={cls} aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button>
    : <Link to="/jamfor" className={cls} aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>;
}

/** Stabilt skal som renderas direkt så sidan inte hoppar mellan laddning och innehåll. */
function Shell({ onBack, note }: { onBack?: () => void; note?: string | null }) {
  return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-7">
    <header className={`flex items-center justify-between rounded-[1.75rem] px-3 py-2.5 ${glassCard}`}>
      <BackControl onBack={onBack} />
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Head-to-head</h1></div>
      <span className="h-10 w-10" />
    </header>
    <section className={`mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] px-4 py-5 ${glassCard}`}>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name="" side="left" /><p className="mt-2 h-5 w-20 rounded bg-muted/70" /><p className="mt-1 h-4 w-12 rounded bg-muted/50" /></div>
      <div className="flex flex-col items-center"><span className="rounded-xl bg-foreground px-3 py-2 font-display text-2xl text-background shadow-sm">VS</span></div>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name="" side="right" /><p className="mt-2 h-5 w-20 rounded bg-muted/70" /><p className="mt-1 h-4 w-12 rounded bg-muted/50" /></div>
    </section>
    {note ? <div className={`mt-5 rounded-2xl p-4 text-center text-sm text-muted-foreground ${glassCard}`}>{note}</div> : null}
  </main>;
}

function CompareFriendPage() {
  const { userId } = Route.useParams();
  return <CompareFriendContent userId={userId} />;
}


export function CompareFriendContent({ userId, onBack }: { userId:string; onBack?:()=>void }) {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [focus,setFocus] = useState<Focus>("all");
  const [focusOpen,setFocusOpen] = useState(false);
  const [compareMode,setCompareMode] = useState<"game"|"bag">("game");
  const [friend,setFriend] = useState<Profile|null>(null);
  const [friendSnapshot,setFriendSnapshot] = useState<PlayerSnapshot|null>(null);
  const [selfName,setSelfName] = useState("Du");
  const [selfAvatar,setSelfAvatar] = useState<string|null>(() => loadCardProfile().photo ?? null);
  const [local,setLocal] = useState<LocalSnapshot|null>(null);
  const [message,setMessage] = useState<string|null>(null);

  useEffect(() => {
    if (!user) return;
    const real = loadRealHandicap();
    const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
    setLocal({
      total: computeEstimatedHandicap(cats),
      categories: Object.fromEntries(cats.map((cat) => [cat.slug, cat.handicap])) as Partial<Record<CategorySlug, number>>,
      comparison: computeLocalComparisonProfile(),
    });
    void pushPlayerSnapshot();
    void supabase.from("profiles").select("display_name, avatar_url").eq("id",user.id).maybeSingle().then(({data}) => {
      if (data?.display_name) setSelfName(data.display_name);
      if (data?.avatar_url) setSelfAvatar(data.avatar_url);
    });
    void listFriendships().then(async ({accepted}) => {
      const selected = accepted.find((item) => item.other.id === userId);
      if (!selected) { setMessage("Den här spelaren finns inte bland dina accepterade vänner."); return; }
      setFriend(selected.other);
      const snapshot = await fetchFriendSnapshot(userId);
      if (!snapshot) setMessage("Vännen har ännu ingen SG4-profil att jämföra med.");
      setFriendSnapshot(snapshot);
    });
  }, [user,userId]);

  const activityRows = useMemo<MetricRow[]>(() => {
    if (!local || !friendSnapshot) return [];
    if (focus === "all") {
      return [
        { key:"tests", label:"Tester gjorda", left:local.comparison.activity.tests, right:friendSnapshot.comparisonProfile.activity.tests, higherIsBetter:true },
        { key:"shots", label:"Slag registrerade", left:local.comparison.activity.shots, right:friendSnapshot.comparisonProfile.activity.shots, higherIsBetter:true },
      ];
    }
    const left = local.comparison.activity.byCategory[focus];
    const right = friendSnapshot.comparisonProfile.activity.byCategory[focus];
    return [
      { key:`${focus}-tests`, label:"Tester gjorda", left:left.tests, right:right.tests, higherIsBetter:true },
      { key:`${focus}-shots`, label:SHOT_LABELS[focus], left:left.shots, right:right.shots, higherIsBetter:true },
    ];
  },[local,friendSnapshot,focus]);

  const levelRows = useMemo<MetricRow[]>(() => {
    if (!local || !friendSnapshot) return [];
    if (focus !== "all") {
      const selected = CATEGORY_ROWS.find((item) => item.slug === focus);
      return selected ? [{ key:selected.slug, label:`${selected.label} HCP`, left:local.categories[selected.slug], right:friendSnapshot.categoryHcp[selected.slug], higherIsBetter:false }] : [];
    }
    return [
      { key:"total", label:"SG4 HCP", left:local.total, right:friendSnapshot.estHcp ?? undefined, higherIsBetter:false },
      ...CATEGORY_ROWS.map(({slug,label}) => ({ key:slug, label, left:local.categories[slug], right:friendSnapshot.categoryHcp[slug], higherIsBetter:false })),
    ];
  },[local,friendSnapshot,focus]);

  const performanceRows = useMemo(() => {
    if (!local || !friendSnapshot) return [];
    const allowed = new Set(["avg-ball-speed","avg-drive","approach-proximity","three-putt-avoid","putting-1-2"]);
    return matchRows(local.comparison.performance.filter(item=>allowed.has(item.key)), friendSnapshot.comparisonProfile.performance.filter(item=>allowed.has(item.key)), focus);
  },[local,friendSnapshot,focus]);

  if (loading || !user) return <Shell onBack={onBack} note={loading ? null : "Logga in för att jämföra med vänner."} />;


  const focusLabel = FOCUS_OPTIONS.find(([key]) => key === focus)?.[1] ?? "Hela spelet";

  return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-7">
    <header className={`flex items-center justify-between rounded-[1.75rem] px-3 py-2.5 ${glassCard}`}>
      {onBack ? <button type="button" onClick={onBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button> : <Link to="/jamfor" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>}
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Head-to-head</h1></div>
      <span className="h-10 w-10" />
    </header>

    {compareMode === "game" ? <section className={`mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] px-4 py-5 ${glassCard}`}>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={selfName} url={selfAvatar} side="left"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{selfName}</p><p className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">HCP {formatHcp(local?.total)}</p></div>
      <div className="flex flex-col items-center"><span className="rounded-xl bg-foreground px-3 py-2 font-display text-2xl text-background shadow-sm">VS</span></div>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={friend?.displayName ?? "Vän"} url={friend?.avatarUrl} side="right"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{friend?.displayName ?? "Vän"}</p><p className="mt-0.5 text-xs font-semibold text-red-600 dark:text-red-400">HCP {formatHcp(friendSnapshot?.estHcp ?? undefined)}</p></div>
    </section> : null}

    <div className={`mt-5 grid grid-cols-2 gap-1 rounded-2xl p-1 ${glassCard}`}>
      <button
        type="button"
        onClick={() => setCompareMode("game")}
        className={`min-h-11 rounded-xl text-sm font-bold transition ${compareMode === "game" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"}`}
      >
        Spel
      </button>
      <button
        type="button"
        onClick={() => setCompareMode("bag")}
        className={`min-h-11 rounded-xl text-sm font-bold transition ${compareMode === "bag" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"}`}
      >
        Jämför bag
      </button>
    </div>

    {compareMode === "game" ? <><div className="relative mt-5">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jämför kategori</span>
      <button type="button" onClick={() => setFocusOpen((value) => !value)} className={`flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-semibold ${glassCard}`} aria-haspopup="listbox" aria-expanded={focusOpen}>
        <span>{focusLabel}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${focusOpen ? "rotate-180" : ""}`} />
      </button>
      {focusOpen ? (
        <div className="absolute left-0 right-0 top-[4.6rem] z-30 overflow-hidden rounded-2xl border border-white/70 bg-background/90 p-1.5 shadow-xl backdrop-blur-2xl dark:border-white/10" role="listbox" aria-label="Jämför kategori">
          {FOCUS_OPTIONS.map(([key,label]) => {
            const active = key === focus;
            return <button key={key} type="button" onClick={() => { setFocus(key); setFocusOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold ${active ? "bg-muted text-foreground" : "hover:bg-muted/60"}`} role="option" aria-selected={active}>
              <span>{label}</span>
              {active ? <Check className="h-4 w-4" /> : null}
            </button>;
          })}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{focus === "all" ? "Visar jämförbara snitt och nivåer från hela spelet." : `Visar jämförbara snitt för ${focusLabel}.`}</p>
    </div>

    {message ? <div className={`mt-5 rounded-2xl p-4 text-sm text-muted-foreground ${glassCard}`}>{message}</div> : null}

    <section className="mt-7">
      <SectionTitle>Handicap per kategori{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      <MetricTable rows={levelRows} hcp/>
    </section>

    <section className="mt-7">
      <SectionTitle>Spelstatistik{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      {performanceRows.length ? <MetricTable rows={performanceRows}/> : <Empty/>}
    </section>


    <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">Jämförelsen bygger på aggregerade snitt och handicapnivåer – inte enskilda rekordslag.</p>
    </> : (
      <div className="mt-7">
        <SectionTitle>Jämför bag</SectionTitle>
        <BagComparison
          left={local?.comparison.bag}
          friendBag={friendSnapshot?.comparisonProfile.bag}
          leftName={selfName}
          friendName={friend?.displayName ?? "Vän"}
          leftAvatar={selfAvatar}
          friendAvatar={friend?.avatarUrl}
        />
      </div>
    )}
  </main>;
}

function Empty({ text = "Ingen gemensam jämförbar data ännu för det valda området." }: { text?: string }){return <div className="rounded-3xl border border-dashed border-white/70 bg-muted/45 p-6 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">{text}</div>}
