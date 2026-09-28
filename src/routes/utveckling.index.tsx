import { HandicapProcessStory } from "@/components/handicap-process-story";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { CATEGORY_LABELS, computeEstimatedHandicap, hcpLabel, loadRealHandicap, type CategoryHandicap, type CategorySlug, type HcpTimelinePoint } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps, computeStableCategoryHcpTimeline } from "@/lib/category-index";
import { AnalysisRadarSwitcher } from "@/components/analysis-radar-switcher";
import { LowerHcpAssessment } from "@/components/lower-hcp-assessment";
import { ComparePicker } from "./jamfor";

type Tab = "analys" | "jamfor" | "sank";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "analys", label: "Min analys" },
  { id: "jamfor", label: "Jämför" },
  { id: "sank", label: "Sänk mitt HCP" },
];
const HCP_CATS: CategorySlug[] = ["driving", "approach", "around-the-green", "puttning"];
const RETEST_DAYS = 14;

export const Route = createFileRoute("/utveckling/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s.tab;
    return t === "jamfor" || t === "sank" ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Analys – Min nivå, jämför & sänk HCP | SG4" },
      { name: "description", content: "Se din HCP per kategori, jämför dig med vänner och få en tydlig plan för att sänka ditt handicap." },
      { property: "og:title", content: "Analys | SG4" },
      { property: "og:description", content: "Min analys, jämför och sänk mitt HCP – på en sida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UtvecklingPage,
});

type Data = { real: number | null; cats: CategoryHandicap[]; totalHandicap: number | undefined };

function loadData(): Data {
  const real = loadRealHandicap();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  return { real, cats, totalHandicap: computeEstimatedHandicap(cats) };
}

function rankable(cats: CategoryHandicap[]) {
  return cats.filter((c) => HCP_CATS.includes(c.slug) && c.handicap !== undefined && c.count > 0).sort((a, b) => (a.handicap ?? 0) - (b.handicap ?? 0));
}

function UtvecklingPage() {
  const { tab = "analys" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => setData(loadData()), []);
  const hasData = data?.cats.some((c) => c.count > 0) ?? false;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-3">
      <h1 className="sr-only">Analys & utveckling</h1>
      <div role="tablist" aria-label="Analys" className="sticky top-[calc(58px+env(safe-area-inset-top))] z-40 -mx-5 bg-background/95 px-5 py-2 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/50 p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active}
                onClick={() => navigate({ search: t.id === "analys" ? {} : { tab: t.id }, replace: true })}
                className={`min-w-0 truncate rounded-xl px-1.5 py-2.5 text-[12.5px] font-bold transition-colors ${active ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground active:bg-card"}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "jamfor" ? (
        <div className="mt-4"><ComparePicker embedded /></div>
      ) : !data ? null : !hasData ? (
        <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center">
          <p className="text-sm text-slate-600">Börja med ett HCP-test för att få en nivå att analysera.</p>
          <Link to="/spela-runda" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white">Gör mitt första HCP-test →</Link>
        </div>
      ) : tab === "sank" ? (
        <LowerTab data={data} />
      ) : (
        <AnalysisTab data={data} />
      )}
    </main>
  );
}

function AnalysisTab({ data }: { data: Data }) {
  const ranked = rankable(data.cats);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  return (
    <div className="mt-4">
      <HandicapProcessStory />
      <section className="mt-3 rounded-3xl border border-blue-500/20 bg-card p-5 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Uppskattat HCP</p>
        <p className="mt-1 font-display text-6xl leading-none text-blue-600">{data.totalHandicap !== undefined ? hcpLabel(data.totalHandicap) : "–"}</p>
      </section>
      {best && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Starkast" cat={best} tone="text-blue-600" />
          {worst && <StatTile icon={<TrendingDown className="h-4 w-4" />} label="Svagast" cat={worst} tone="text-red-500" />}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {HCP_CATS.map((slug) => {
          const c = data.cats.find((x) => x.slug === slug);
          return (
            <Link key={slug} to="/utveckling/$slug" params={{ slug }} className="rounded-2xl border border-border bg-card p-3.5 active:bg-muted/60">
              <p className="truncate text-xs font-semibold text-muted-foreground">{CATEGORY_LABELS[slug]}</p>
              <p className="mt-1 font-display text-3xl leading-none">{c?.handicap !== undefined ? hcpLabel(c.handicap) : "–"}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{c?.count ? `${c.count} test` : "Ej testad"}</p>
            </Link>
          );
        })}
      </div>
      <div className="mt-6"><AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.totalHandicap} /></div>
    </div>
  );
}

function StatTile({ icon, label, cat, tone }: { icon: React.ReactNode; label: string; cat: CategoryHandicap; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <p className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-[.16em] ${tone}`}>{icon}{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{CATEGORY_LABELS[cat.slug]}</p>
      <p className={`font-display text-3xl leading-none ${tone}`}>{hcpLabel(cat.handicap ?? 0)}</p>
    </div>
  );
}

function LowerTab({ data }: { data: Data }) {
  const ranked = rankable(data.cats);
  const focus = ranked[ranked.length - 1];
  const [timeline, setTimeline] = useState<HcpTimelinePoint[]>([]);
  useEffect(() => { if (focus) setTimeline(computeStableCategoryHcpTimeline(focus.slug, null)); }, [focus?.slug]);
  const points = useMemo(() => timeline.filter((p) => p.rolling !== undefined), [timeline]);
  const last = points[points.length - 1];
  const nextRetest = useMemo(() => {
    if (!last) return undefined;
    const d = new Date(last.date);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setDate(d.getDate() + RETEST_DAYS);
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  }, [last]);
  const change = points.length >= 2 ? (points[points.length - 1].rolling ?? 0) - (points[0].rolling ?? 0) : undefined;
  const LOOP = ["Test", "Analys", "Fokus", "Träning", "Retest", "Ny nivå"];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {LOOP.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`rounded-full px-2 py-1 ${s === "Fokus" || s === "Träning" ? "bg-blue-600 text-white" : "bg-muted"}`}>{s}</span>
            {i < LOOP.length - 1 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </div>
      <LowerHcpAssessment cats={data.cats} totalHandicap={data.totalHandicap} />
      {focus && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Utveckling · {CATEGORY_LABELS[focus.slug]}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] uppercase text-muted-foreground">Förändring</p><p className={`font-display text-2xl ${change !== undefined && change < 0 ? "text-blue-600" : change ? "text-red-500" : ""}`}>{change !== undefined ? hcpLabel(change) : "–"}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Senaste test</p><p className="font-display text-2xl">{last?.date ?? "–"}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Nästa retest</p><p className="font-display text-2xl">{nextRetest ?? "–"}</p></div>
          </div>
          <Link to="/utveckling/$slug" params={{ slug: focus.slug }} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">Se utveckling över tid →</Link>
        </section>
      )}
    </div>
  );
}
