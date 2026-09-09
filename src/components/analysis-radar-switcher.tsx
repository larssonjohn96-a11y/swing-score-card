import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, User } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  approachLateralErrorPct,
  approachLengthErrorPct,
  approachProximityPct,
  collectApproachShots,
} from "@/lib/approach-global";
import {
  bunkerShots,
  collectAroundGreenShots,
  expectedScramblingPct,
  outside30Yards,
  type AroundGreenBenchmarkKey,
} from "@/lib/around-green-global";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { distanceToHandicap, shotHandicap } from "@/lib/offtee";
import { collectLagHoleOutStarts, collectPuttStarts, puttingMakeStats } from "@/lib/putting-global";
import { handicapFromPct } from "@/lib/precision";
import { loadCardProfile } from "@/lib/rating-card";
import {
  fetchFriendSnapshot,
  listFriendships,
  pushPlayerSnapshot,
  type Friendship,
} from "@/lib/friends-cloud";
import type { SocialRadarProfile } from "@/lib/social-radar-profile";
import {
  BENCHMARK_LEVELS,
  hcpLabel,
  ratingFromHandicap,
  type CategoryHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";

type View = "total" | "driving" | "approach" | "around" | "putting";
type CompareTarget = {
  label: string;
  hcp: number;
  isFriend?: boolean;
  categoryHcp?: Partial<Record<CategorySlug, number>>;
  radarProfile?: SocialRadarProfile;
  avatarUrl?: string | null;
  initials?: string;
};
type Row = { subject: string; du: number; target: number; raw?: string; targetRaw?: string; hcp?: number; targetHcp?: number; placeholder?: boolean };
type ChartRow = Row & { duChart: number; targetChart: number };
type PuttingKey = "0-1" | "1-2" | "2-3" | "3-5" | "three-putt";

const TABS: [View, string][] = [["total", "Total"], ["driving", "Off the Tee"], ["approach", "Approach"], ["around", "Around Green"], ["putting", "Putting"]];
const QUICK = BENCHMARK_LEVELS.filter((level) => ["30", "20", "10", "0", "+3", "Tour"].includes(level.label));
const DEFAULT_LEVEL = QUICK.find((level) => level.label === "0") ?? QUICK[0];
const defaultTarget = (): CompareTarget => ({ label: DEFAULT_LEVEL.label, hcp: DEFAULT_LEVEL.hcp, categoryHcp: DEFAULT_LEVEL.categoryHcp });
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const pct = (value: number) => `${Math.round(Number.isFinite(value) ? value : 0)}%`;
const targetHcpFor = (target: CompareTarget, slug?: CategorySlug) => slug ? target.categoryHcp?.[slug] ?? target.hcp : target.hcp;

const PUTTING_BMS: Record<string, { score: number; values: Record<PuttingKey, number> }> = {
  Tour: { score: 100, values: { "0-1": 99, "1-2": 82, "2-3": 50, "3-5": 30, "three-putt": 97.5 } },
  "0": { score: 85, values: { "0-1": 98, "1-2": 76, "2-3": 49, "3-5": 34, "three-putt": 92.2 } },
  "10": { score: 65, values: { "0-1": 96, "1-2": 65, "2-3": 39, "3-5": 26, "three-putt": 88.2 } },
  "20": { score: 45, values: { "0-1": 90, "1-2": 55, "2-3": 33, "3-5": 18, "three-putt": 80.9 } },
};

function puttingSkill(key: PuttingKey, raw: number) {
  const safeRaw = Number.isFinite(raw) ? raw : 0;
  const anchors = ["20", "10", "0", "Tour"].map((label) => ({ raw: PUTTING_BMS[label].values[key], score: PUTTING_BMS[label].score })).sort((a, b) => a.raw - b.raw);
  if (safeRaw >= anchors.at(-1)!.raw) return 100;
  if (safeRaw <= anchors[0].raw) return clamp((safeRaw / Math.max(1, anchors[0].raw)) * anchors[0].score);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i], b = anchors[i + 1];
    if (safeRaw >= a.raw && safeRaw <= b.raw) {
      const t = (safeRaw - a.raw) / (b.raw - a.raw || 1);
      return clamp(a.score + t * (b.score - a.score));
    }
  }
  return 0;
}

function puttBin(rows: ReturnType<typeof puttingMakeStats>, min: number, max: number, first = false) {
  const selected = rows.filter((row) => first ? row.distance >= min && row.distance <= max : row.distance > min && row.distance <= max);
  const attempts = selected.reduce((sum, row) => sum + row.attempts, 0);
  const made = selected.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : 0;
}

function aroundKey(label: string): AroundGreenBenchmarkKey {
  if (label === "Tour") return "tour";
  if (label === "0") return "hcp0";
  if (label === "20") return "hcp20";
  return "hcp10";
}

function totalRows(cats: CategoryHandicap[], total: number | undefined, target: CompareTarget): Row[] {
  const main = cats.filter((cat) => cat.slug !== "speed").slice(0, 4).map((cat) => {
    const targetHcp = targetHcpFor(target, cat.slug);
    return { subject: cat.title, du: cat.handicap !== undefined ? ratingFromHandicap(cat.handicap) : 0, target: ratingFromHandicap(targetHcp), hcp: cat.handicap, targetHcp };
  });
  return [...main, { subject: "Totalt", du: total !== undefined ? ratingFromHandicap(total) : 0, target: ratingFromHandicap(target.hcp), hcp: total, targetHcp: target.hcp }];
}

function drivingRows(target: CompareTarget): Row[] {
  const shots = loadOffTeeSessions().flatMap((session) => session.shots.filter((shot) => shot.filled));
  const targetHcp = targetHcpFor(target, "driving");
  const targetScore = ratingFromHandicap(targetHcp);
  if (!shots.length) return ["Längd", "Total driving", "Fairway", "Dispersion", "Penalty avoidance"].map((subject) => ({ subject, du: 0, target: targetScore, targetHcp, placeholder: true }));
  const avgTotal = avg(shots.map((shot) => shot.total));
  const overallHcp = avg(shots.map((shot) => shotHandicap(shot)));
  const fairway = shots.filter((shot) => Math.abs(shot.sidled) <= 16).length / shots.length * 100;
  const meanSide = avg(shots.map((shot) => shot.sidled));
  const dispersion = Math.sqrt(avg(shots.map((shot) => (shot.sidled - meanSide) ** 2)));
  const penaltyAvoid = 100 - shots.filter((shot) => Math.abs(shot.sidled) > 28).length / shots.length * 100;
  return [
    { subject: "Längd", du: ratingFromHandicap(distanceToHandicap(avgTotal)), target: targetScore, raw: `${Math.round(avgTotal)} m`, targetHcp },
    { subject: "Total driving", du: ratingFromHandicap(overallHcp), target: targetScore, hcp: overallHcp, targetHcp },
    { subject: "Fairway", du: clamp(fairway), target: targetScore, raw: pct(fairway), targetHcp },
    { subject: "Dispersion", du: clamp(100 - dispersion * 2.4), target: targetScore, raw: `${dispersion.toFixed(1).replace(".", ",")} m`, targetHcp },
    { subject: "Penalty avoidance", du: clamp(penaltyAvoid), target: targetScore, raw: pct(penaltyAvoid), targetHcp },
  ];
}

function approachRows(target: CompareTarget): Row[] {
  const shots = collectApproachShots();
  const targetHcp = targetHcpFor(target, "approach");
  const benchmark = ratingFromHandicap(targetHcp);
  const inside = shots.filter((shot) => shot.target < 91.44);
  const outside = shots.filter((shot) => shot.target >= 91.44);
  const build = (subject: string, selected: typeof shots, getter: (shot: typeof shots[number]) => number): Row => {
    const values = selected.map(getter).filter(Number.isFinite);
    const value = avg(values);
    return { subject, du: values.length ? ratingFromHandicap(handicapFromPct(value)) : 0, target: benchmark, raw: values.length ? `${value.toFixed(1).replace(".", ",")} %` : "–", targetHcp, placeholder: !values.length };
  };
  return [build("Inom 100 yd", inside, approachProximityPct), build("Över 100 yd", outside, approachProximityPct), build("Närhet till hål", shots, approachProximityPct), build("Längdkontroll", shots, approachLengthErrorPct), build("Sidledskontroll", shots, approachLateralErrorPct)];
}

function aroundRows(target: CompareTarget): Row[] {
  const shots = collectAroundGreenShots();
  const targetHcp = targetHcpFor(target, "around-the-green");
  const targetScore = ratingFromHandicap(targetHcp);
  const outside = outside30Yards(shots);
  const sand = bunkerShots(shots);
  const key = aroundKey(target.label);
  const useBenchmarkCurve = !target.isFriend && ["Tour", "0", "10", "20"].includes(target.label);
  const scrambling = expectedScramblingPct(shots);
  const scramblingTarget = useBenchmarkCurve && shots.length ? expectedScramblingPct(shots, key) : undefined;
  const outsideTarget = useBenchmarkCurve && outside.length ? expectedScramblingPct(outside, key) : undefined;
  const sandTarget = useBenchmarkCurve && sand.length ? expectedScramblingPct(sand, key) : undefined;
  return [
    { subject: "Scrambling", du: shots.length ? scrambling : 0, target: scramblingTarget ?? targetScore, raw: shots.length ? pct(scrambling) : "–", targetRaw: scramblingTarget !== undefined ? pct(scramblingTarget) : undefined, targetHcp, placeholder: !shots.length },
    { subject: "Utanför 30 yd", du: outside.length ? expectedScramblingPct(outside) : 0, target: outsideTarget ?? targetScore, raw: outside.length ? pct(expectedScramblingPct(outside)) : "–", targetRaw: outsideTarget !== undefined ? pct(outsideTarget) : undefined, targetHcp, placeholder: !outside.length },
    { subject: "Sand save", du: sand.length ? expectedScramblingPct(sand) : 0, target: sandTarget ?? targetScore, raw: sand.length ? pct(expectedScramblingPct(sand)) : "–", targetRaw: sandTarget !== undefined ? pct(sandTarget) : undefined, targetHcp, placeholder: !sand.length },
    { subject: "Närhet", du: 0, target: targetScore, targetHcp, placeholder: true },
    { subject: "Scoringzon", du: 0, target: targetScore, targetHcp, placeholder: true },
  ];
}

function puttingRows(target: CompareTarget): Row[] {
  const starts = collectPuttStarts();
  const lag = collectLagHoleOutStarts();
  const stats = puttingMakeStats(starts);
  const raw: Array<{ key: PuttingKey; subject: string; value: number; hasData: boolean }> = [
    { key: "0-1", subject: "0–1 m", value: puttBin(stats, 0, 1, true), hasData: stats.some((r) => r.distance >= 0 && r.distance <= 1 && r.attempts > 0) },
    { key: "1-2", subject: "1–2 m", value: puttBin(stats, 1, 2), hasData: stats.some((r) => r.distance > 1 && r.distance <= 2 && r.attempts > 0) },
    { key: "2-3", subject: "2–3 m", value: puttBin(stats, 2, 3), hasData: stats.some((r) => r.distance > 2 && r.distance <= 3 && r.attempts > 0) },
    { key: "3-5", subject: "3–5 m", value: puttBin(stats, 3, 5), hasData: stats.some((r) => r.distance > 3 && r.distance <= 5 && r.attempts > 0) },
    { key: "three-putt", subject: "3-putt undvik.", value: lag.length ? 100 - lag.filter((row) => row.strokes >= 3).length / lag.length * 100 : 0, hasData: lag.length > 0 },
  ];
  const targetHcp = targetHcpFor(target, "puttning");
  const benchmark = !target.isFriend ? PUTTING_BMS[target.label] : undefined;
  const targetScore = benchmark?.score ?? ratingFromHandicap(targetHcp);
  return raw.map((row) => ({ subject: row.subject, du: row.hasData ? puttingSkill(row.key, row.value) : 0, target: targetScore, raw: row.hasData ? pct(row.value) : "–", targetRaw: benchmark ? pct(benchmark.values[row.key]) : undefined, targetHcp, placeholder: !row.hasData }));
}

function friendRadarValues(target: CompareTarget, view: View): number[] | undefined {
  if (!target.isFriend || view === "total") return undefined;
  if (view === "driving") return target.radarProfile?.driving;
  if (view === "approach") return target.radarProfile?.approach;
  if (view === "around") return target.radarProfile?.["around-the-green"];
  return target.radarProfile?.puttning;
}

function hasFriendRadar(target: CompareTarget, view: View) {
  const values = friendRadarValues(target, view);
  return Boolean(values && values.length >= 5 && values.some((value) => Number.isFinite(value)));
}

function applyFriendRadar(rows: Row[], target: CompareTarget, view: View): Row[] {
  const values = friendRadarValues(target, view);
  if (!target.isFriend || view === "total") return rows;
  if (!values?.length) {
    return rows.map((row) => ({ ...row, target: 0, targetRaw: "Detaljdata saknas", targetHcp: undefined }));
  }
  return rows.map((row, index) => {
    const value = values[index];
    if (!Number.isFinite(value)) return { ...row, target: 0, targetRaw: "Detaljdata saknas", targetHcp: undefined };
    return {
      ...row,
      target: clamp(value),
      targetRaw: `${Math.round(clamp(value))}/100`,
      targetHcp: undefined,
    };
  });
}

function chartRows(rows: Row[]): ChartRow[] {
  const safe = rows.map((row) => ({ ...row, du: clamp(row.du), target: clamp(row.target) }));
  const hasAnyPlayerValue = safe.some((row) => row.du > 0);
  return safe.map((row) => ({ ...row, duChart: hasAnyPlayerValue && row.du === 0 ? 1.5 : row.du, targetChart: row.target }));
}

const RADAR_LABEL_LINES: Record<string, string[]> = {
  "Penalty avoidance": ["Penalty", "avoidance"],
  "Bogey avoidance": ["Bogey", "avoidance"],
  "Total driving": ["Total", "driving"],
  "Sidledskontroll": ["Sidleds", "kontroll"],
  "Längdkontroll": ["Längd", "kontroll"],
  "Närhet till hål": ["Närhet", "till hål"],
  "Utanför 30 yd": ["Utanför", "30 yd"],
  "3-putt undvik.": ["3-putt", "undvik."],
};

function splitRadarLabel(label: string): string[] {
  const fixed = RADAR_LABEL_LINES[label];
  if (fixed) return fixed;
  if (label.length <= 13) return [label];
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].filter(Boolean);
  }
  const cut = Math.ceil(label.length / 2);
  return [label.slice(0, cut), label.slice(cut)];
}

function RadarAxisTick({ x = 0, y = 0, payload, textAnchor = "middle" }: any) {
  const label = String(payload?.value ?? "");
  const lines = splitRadarLabel(label);
  const onRight = textAnchor === "start";
  const onLeft = textAnchor === "end";
  const safeAnchor = onRight ? "end" : onLeft ? "start" : "middle";
  const safeX = x + (onRight ? -10 : onLeft ? 10 : 0);
  const firstLineY = y - ((lines.length - 1) * 6);

  return (
    <text
      x={safeX}
      y={firstLineY}
      textAnchor={safeAnchor}
      dominantBaseline="middle"
      fill="var(--muted-foreground)"
      fontSize={11}
      fontWeight={600}
    >
      {lines.map((line, index) => (
        <tspan key={`${label}-${index}`} x={safeX} dy={index === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function RadarTooltip({ active, payload, targetLabel }: { active?: boolean; payload?: Array<{ payload?: ChartRow }>; targetLabel: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"><p className="font-semibold">{row.subject}</p><p className="mt-1 text-muted-foreground">Du: <span className="font-semibold text-foreground">{row.raw ?? (row.hcp !== undefined ? hcpLabel(row.hcp) : row.placeholder ? "Ingen data" : Math.round(row.du))}</span></p><p className="text-muted-foreground">{targetLabel}: <span className="font-semibold text-foreground">{row.targetRaw ?? (row.targetHcp !== undefined ? hcpLabel(row.targetHcp) : Math.round(row.target))}</span></p></div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AnalysisRadarSwitcher({ cats, totalHandicap }: { cats: CategoryHandicap[]; totalHandicap: number | undefined }) {
  const [view, setView] = useState<View>("total");
  const [target, setTarget] = useState<CompareTarget>(defaultTarget);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [busyFriend, setBusyFriend] = useState<string | null>(null);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  const profile = loadCardProfile();

  useEffect(() => {
    void pushPlayerSnapshot();
    void listFriendships().then((result) => setFriends(result.accepted));
  }, []);

  useEffect(() => {
    if (pickerOpen) void listFriendships().then((result) => setFriends(result.accepted));
  }, [pickerOpen]);

  const data = useMemo(() => {
    const rows = view === "total" ? totalRows(cats, totalHandicap, target) : view === "driving" ? drivingRows(target) : view === "approach" ? approachRows(target) : view === "around" ? aroundRows(target) : puttingRows(target);
    return chartRows(applyFriendRadar(rows, target, view));
  }, [view, cats, totalHandicap, target]);

  const friendDetailMissing = Boolean(target.isFriend && view !== "total" && !hasFriendRadar(target, view));
  const targetLabel = target.isFriend ? target.label : target.label === "Tour" ? "Tour" : `HCP ${target.label}`;

  async function pickFriend(friendship: Friendship) {
    setBusyFriend(friendship.other.id);
    setPickerMessage(null);
    const snapshot = await fetchFriendSnapshot(friendship.other.id);
    setBusyFriend(null);
    if (!snapshot) {
      setPickerMessage("Spelaren har ännu ingen jämförbar SG4-profil.");
      return;
    }
    const hcp = snapshot.estHcp ?? snapshot.realHcp;
    if (hcp === null) {
      setPickerMessage("Spelaren har ännu inget handicapvärde att jämföra med.");
      return;
    }
    setTarget({
      label: friendship.other.displayName,
      hcp,
      isFriend: true,
      categoryHcp: snapshot.categoryHcp,
      radarProfile: snapshot.radarProfile,
      avatarUrl: friendship.other.avatarUrl,
      initials: initials(friendship.other.displayName),
    });
    setPickerOpen(false);
  }

  function pickBenchmark(level: (typeof QUICK)[number]) {
    setTarget({ label: level.label, hcp: level.hcp, categoryHcp: level.categoryHcp });
    setPickerOpen(false);
  }

  return <section className="mt-6">
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-chart-4 bg-primary/10">
          {profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-7 w-7 text-chart-4" strokeWidth={1.5} />}
        </div>
        <p className="text-xs font-semibold">Du</p>
      </div>
      <button type="button" onClick={() => setPickerOpen(true)} className="flex flex-col items-center gap-1.5">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-chart-3 bg-chart-3/10">
            {target.avatarUrl ? <img src={target.avatarUrl} alt="" className="h-full w-full object-cover" /> : target.isFriend && target.initials ? <span className="font-display text-xl text-chart-3">{target.initials}</span> : <User className="h-7 w-7 text-chart-3" strokeWidth={1.5} />}
          </span>
          {!target.isFriend ? <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-chart-3 text-background"><Plus className="h-3.5 w-3.5" /></span> : null}
        </span>
        <p className="max-w-[7rem] truncate text-xs font-semibold text-muted-foreground">{targetLabel}</p>
      </button>
    </div>

    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {QUICK.map((level) => <button key={level.label} type="button" onClick={() => setTarget({ label: level.label, hcp: level.hcp, categoryHcp: level.categoryHcp })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${!target.isFriend && target.label === level.label ? "border-chart-3 bg-chart-3 text-background" : "border-border text-muted-foreground"}`}>{level.label === "Tour" ? "Tour" : `HCP ${level.label}`}</button>)}
    </div>

    <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">Jämförelseanalys</p>

    <div className="mt-4 h-96 w-full overflow-hidden rounded-3xl border border-border bg-card px-4 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="57%" margin={{ top: 24, right: 28, bottom: 24, left: 28 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={<RadarAxisTick />} tickLine={false} />
          <PolarRadiusAxis domain={[0, 110]} tick={false} axisLine={false} />
          {!friendDetailMissing ? <Radar name={targetLabel} dataKey="targetChart" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} strokeWidth={2} dot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 1 }} isAnimationActive animationDuration={320} /> : null}
          <Radar name="Du" dataKey="duChart" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.28} strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-4)", stroke: "var(--card)", strokeWidth: 1 }} isAnimationActive animationDuration={320} />
          <Tooltip content={<RadarTooltip targetLabel={targetLabel} />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>

    {friendDetailMissing ? <div className="mt-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">{targetLabel} saknar ännu synkad detaljdata för den här kategorin. Vi visar därför inte en falsk jämn HCP-ring. Profilen uppdateras automatiskt när spelaren öppnar den nya versionen av SG4.</div> : null}

    <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1"><div className="flex w-max min-w-full justify-center gap-1.5">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${view === key ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}>{label}</button>)}</div></div>

    <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-4" />Din nivå</span>{!friendDetailMissing ? <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3" />{targetLabel}</span> : null}</div>

    <p className="mt-4 text-center text-sm text-muted-foreground">Vill du jämföra med andra spelare?</p>
    <button type="button" onClick={() => setPickerOpen(true)} className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary">Jämför<span aria-hidden>›</span></button>

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetContent side="bottom" className="mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader><SheetTitle>Jämför med</SheetTitle></SheetHeader>

        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Handicapnivå</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {QUICK.map((level) => <button key={level.label} type="button" onClick={() => pickBenchmark(level)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${!target.isFriend && target.label === level.label ? "border-chart-3 bg-chart-3/10 text-chart-3" : "border-border bg-card"}`}>{level.label === "Tour" ? "PGA Tour" : `HCP ${level.label}`}</button>)}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vänner</p>
            <Link to="/vanner" onClick={() => setPickerOpen(false)} className="text-xs font-semibold text-primary">Hantera vänner</Link>
          </div>
          {friends.length ? <div className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border">{friends.map((friendship) => <button key={friendship.id} type="button" disabled={busyFriend === friendship.other.id} onClick={() => void pickFriend(friendship)} className="flex w-full items-center gap-3 bg-card px-3.5 py-3 text-left disabled:opacity-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">{friendship.other.avatarUrl ? <img src={friendship.other.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(friendship.other.displayName) || <User className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{friendship.other.displayName}</span>
            <span className="text-xs text-muted-foreground">{busyFriend === friendship.other.id ? "Laddar…" : "Jämför"}</span>
          </button>)}</div> : <div className="mt-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Inga accepterade vänner ännu. Lägg till en vän för att jämföra era SG4-profiler.</div>}
          {pickerMessage ? <p className="mt-3 text-xs text-muted-foreground">{pickerMessage}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  </section>;
}
