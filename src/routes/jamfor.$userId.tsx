import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Dumbbell, Trophy, User } from "lucide-react";
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

type Tab = "overview" | "performance" | "training" | "records";
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]?.toUpperCase()).join("");
}

function Avatar({ name, url, side }: { name:string; url?:string|null; side:"left"|"right" }) {
  const tone = side === "left" ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-red-500 bg-red-500/10 text-red-500";
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

function MetricTable({ rows, hcp = false, compare = true }: { rows:MetricRow[]; hcp?:boolean; compare?:boolean }) {
  return <div className="overflow-hidden rounded-3xl border border-border bg-card">
    {rows.map((row, index) => {
      const win = compare ? winner(row) : null;
      return <div key={row.key} className={`grid grid-cols-[1fr_1.35fr_1fr] items-center gap-2 px-4 py-4 ${index ? "border-t border-border/70" : ""}`}>
        <div className="text-left"><span className={`inline-flex min-w-14 justify-center rounded-xl px-2.5 py-1.5 text-base font-bold tabular-nums ${win === "left" ? "bg-blue-500 text-white" : "text-foreground"}`}>{hcp ? formatHcp(row.left) : formatValue(row.left,row.unit,row.decimals)}</span></div>
        <div className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{row.label}</div>
        <div className="text-right"><span className={`inline-flex min-w-14 justify-center rounded-xl px-2.5 py-1.5 text-base font-bold tabular-nums ${win === "right" ? "bg-red-500 text-white" : "text-foreground"}`}>{hcp ? formatHcp(row.right) : formatValue(row.right,row.unit,row.decimals)}</span></div>
      </div>;
    })}
  </div>;
}

function matchRows(left: ComparisonMetric[], right: ComparisonMetric[], focus: Focus): MetricRow[] {
  const leftFiltered = focus === "all" ? left : left.filter((item) => item.category === focus);
  const rightFiltered = focus === "all" ? right : right.filter((item) => item.category === focus);
  const rightMap = new Map(rightFiltered.map((item) => [item.key, item]));
  const keys = Array.from(new Set([...leftFiltered.map((item) => item.key), ...rightFiltered.map((item) => item.key)]));
  return keys.map((key) => {
    const a = leftFiltered.find((item) => item.key === key);
    const b = rightMap.get(key);
    const ref = a ?? b!;
    return { key, label:ref.label, left:a?.value, right:b?.value, unit:ref.unit, decimals:ref.decimals, higherIsBetter:ref.higherIsBetter };
  });
}

function CompareFriendPage() {
  const { userId } = Route.useParams();
  return <CompareFriendContent userId={userId} />;
}

export function CompareFriendContent({ userId, onBack }: { userId:string; onBack?:()=>void }) {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [tab,setTab] = useState<Tab>("overview");
  const [focus,setFocus] = useState<Focus>("all");
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
    return [
      { key:"tests", label:"Tester gjorda", left:local.comparison.activity.tests, right:friendSnapshot.comparisonProfile.activity.tests, higherIsBetter:true },
      { key:"shots", label:"Slag registrerade", left:local.comparison.activity.shots, right:friendSnapshot.comparisonProfile.activity.shots, higherIsBetter:true },
    ];
  },[local,friendSnapshot]);

  const overviewRows = useMemo<MetricRow[]>(() => {
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

  const score = useMemo(() => overviewRows.filter((row) => row.key !== "total").reduce((acc,row) => {
    const win = winner(row);
    if (win === "left") acc.left += 1;
    if (win === "right") acc.right += 1;
    return acc;
  },{left:0,right:0}),[overviewRows]);

  if (loading) return <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10"><p className="text-center text-sm text-muted-foreground">Laddar …</p></main>;
  if (!user) return <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-10"><p className="text-center text-sm text-muted-foreground">Logga in för att jämföra med vänner.</p></main>;

  const tabs: Array<[Tab,string]> = [["overview","Översikt"],["performance","Performance"],["training","Träning"],["records","Rekord"]];
  const focusLabel = FOCUS_OPTIONS.find(([key]) => key === focus)?.[1] ?? "Hela spelet";

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-7">
    <header className="flex items-center justify-between">
      {onBack ? <button type="button" onClick={onBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></button> : <Link to="/jamfor" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Tillbaka"><ArrowLeft className="h-4 w-4" /></Link>}
      <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">SG4 Social</p><h1 className="font-display text-3xl">Head-to-head</h1></div>
      <span className="h-10 w-10" />
    </header>

    <section className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={selfName} url={selfAvatar} side="left"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{selfName}</p><p className="mt-0.5 text-xs font-semibold text-blue-500">HCP {formatHcp(local?.total)}</p></div>
      <div className="flex flex-col items-center"><span className="rounded-xl bg-foreground px-3 py-2 font-display text-2xl text-background">VS</span>{focus !== "all" ? <span className="mt-2 font-display text-3xl tabular-nums"><span className="text-blue-500">{score.left}</span>–<span className="text-red-500">{score.right}</span></span> : null}</div>
      <div className="flex min-w-0 flex-col items-center text-center"><Avatar name={friend?.displayName ?? "Vän"} url={friend?.avatarUrl} side="right"/><p className="mt-2 max-w-[8rem] truncate text-sm font-bold">{friend?.displayName ?? "Vän"}</p><p className="mt-0.5 text-xs font-semibold text-red-500">HCP {formatHcp(friendSnapshot?.estHcp ?? undefined)}</p></div>
    </section>

    <label className="mt-6 block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jämför område</span>
      <select value={focus} onChange={(event) => setFocus(event.target.value as Focus)} className="h-12 w-full appearance-none rounded-2xl border border-border bg-card px-4 text-sm font-semibold outline-none focus:border-primary">
        {FOCUS_OPTIONS.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <p className="mt-2 text-xs text-muted-foreground">{focus === "all" ? "Visar hela spelprofilen." : `Visar bara detaljer för ${focusLabel}.`}</p>
    </label>

    <div className="-mx-1 mt-5 overflow-x-auto px-1 pb-1"><div className="flex w-max min-w-full justify-center gap-1.5">{tabs.map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${tab===key?"border-foreground bg-foreground text-background":"border-border bg-card text-muted-foreground"}`}>{label}</button>)}</div></div>

    {message ? <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{message}</div> : null}

    <section className="mt-4">
      {tab === "overview" ? <>
        {focus === "all" ? <><div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">Aktivitet</h2></div><MetricTable rows={activityRows}/><div className="mb-3 mt-6 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">Nivå</h2></div></> : <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">{focusLabel}</h2></div>}
        <MetricTable rows={overviewRows} hcp/>
      </> : null}
      {tab === "performance" ? <><div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">Performance{focus !== "all" ? ` · ${focusLabel}` : ""}</h2></div>{performanceRows.length?<MetricTable rows={performanceRows}/>:<Empty/>}</> : null}
      {tab === "training" ? <><div className="mb-3 flex items-center gap-2"><Dumbbell className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">Tränings-PB{focus !== "all" ? ` · ${focusLabel}` : ""}</h2></div>{trainingRows.length?<MetricTable rows={trainingRows}/>:<Empty/>}</> : null}
      {tab === "records" ? <><div className="mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-primary"/><h2 className="font-display text-2xl">Rekord{focus !== "all" ? ` · ${focusLabel}` : ""}</h2></div>{recordRows.length?<MetricTable rows={recordRows}/>:<Empty/>}</> : null}
    </section>

    <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">Jämförelsen delar bara aggregerade resultat och personliga rekord – aldrig rå slagdata.</p>
  </main>;
}

function Empty(){return <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">Ingen gemensam jämförbar data ännu för det valda området.</div>}
