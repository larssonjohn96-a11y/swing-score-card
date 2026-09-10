import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { supabase } from "@/integrations/supabase/client";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot, type PlayerSnapshot, type Profile } from "@/lib/friends-cloud";
import { computeLocalComparisonProfile, type ComparisonCategory, type ComparisonMetric, type SocialComparisonProfile } from "@/lib/social-comparison-profile";
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

const FOCUS_OPTIONS: Array<[Focus,string]> = [
  ["all","Hela spelet"],
  ["driving","Off the Tee"],
  ["approach","Approach"],
  ["around-the-green","Around Green"],
  ["puttning","Putting"],
];

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-center"><h2 className="font-display text-2xl">{children}</h2></div>;
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

  const performanceRows = useMemo(() => local && friendSnapshot ? matchRows(local.comparison.performance, friendSnapshot.comparisonProfile.performance, focus) : [],[local,friendSnapshot,focus]);
  const trainingRows = useMemo(() => local && friendSnapshot ? matchRows(local.comparison.training, friendSnapshot.comparisonProfile.training, focus) : [],[local,friendSnapshot,focus]);
  const recordRows = useMemo(() => local && friendSnapshot ? matchRows(local.comparison.records, friendSnapshot.comparisonProfile.records, focus) : [],[local,friendSnapshot,focus]);

  if (loading || !user) return <Shell onBack={onBack} note={loading ? null : "Logga in för att jämföra med vänner."} />;


  const focusLabel = FOCUS_OPTIONS.find(([key]) => key === focus)?.[1] ?? "Hela spelet";

  return <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-7">
    <header className={`flex items-center justify-between rounded-[1.75rem] px-3 py-2.5 ${glassCard}`}>
      {onBack ? <button type="button" onClick={onBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button> : <Link to="/jamfor" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>}
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Head-to-head</h1></div>
      <span className="h-10 w-10" />
    </header>

    <section className={`mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[2rem] px-4 py-5 ${glassCard}`}>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={selfName} url={selfAvatar} side="left"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{selfName}</p><p className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">HCP {formatHcp(local?.total)}</p></div>
      <div className="flex flex-col items-center"><span className="rounded-xl bg-foreground px-3 py-2 font-display text-2xl text-background shadow-sm">VS</span></div>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={friend?.displayName ?? "Vän"} url={friend?.avatarUrl} side="right"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{friend?.displayName ?? "Vän"}</p><p className="mt-0.5 text-xs font-semibold text-red-600 dark:text-red-400">HCP {formatHcp(friendSnapshot?.estHcp ?? undefined)}</p></div>
    </section>

    <div className="relative mt-5">
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
      <p className="mt-2 text-xs text-muted-foreground">{focus === "all" ? "Visar de viktigaste statsen från hela spelet." : `Visar en djupare breakdown för ${focusLabel}.`}</p>
    </div>

    {message ? <div className={`mt-5 rounded-2xl p-4 text-sm text-muted-foreground ${glassCard}`}>{message}</div> : null}

    <section className="mt-6">
      <SectionTitle>Tester & registrerade slag</SectionTitle>
      <MetricTable rows={activityRows}/>
    </section>

    <section className="mt-7">
      <SectionTitle>Handicap per kategori{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      <MetricTable rows={levelRows} hcp/>
    </section>

    <section className="mt-7">
      <SectionTitle>Spelstatistik{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      {performanceRows.length ? <MetricTable rows={performanceRows}/> : <Empty/>}
    </section>

    <section className="mt-7">
      <SectionTitle>Träningsresultat{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      {trainingRows.length ? <MetricTable rows={trainingRows}/> : <Empty/>}
    </section>

    <section className="mt-7">
      <SectionTitle>Personliga rekord{focus !== "all" ? ` · ${focusLabel}` : ""}</SectionTitle>
      {recordRows.length ? <MetricTable rows={recordRows}/> : <Empty/>}
    </section>

    <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">Jämförelsen delar bara aggregerade resultat och personliga rekord – aldrig rå slagdata.</p>
  </main>;
}

function Empty(){return <div className="rounded-3xl border border-dashed border-white/70 bg-muted/45 p-6 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">Ingen gemensam jämförbar data ännu för det valda området.</div>}
