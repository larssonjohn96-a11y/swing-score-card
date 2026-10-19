import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { AnalysisHistoryChart } from "@/components/analysis-history-chart";
import {
  CATEGORY_LABELS,
  computeEstimatedHandicap,
  hcpLabel,
  loadRealHandicap,
  type CategoryHandicap,
  type CategorySlug,
} from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { AnalysisRadarSwitcher } from "@/components/analysis-radar-switcher";
import { loadAnalysisParts, type AnalysisParts } from "@/lib/analysis-category-parts";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessions/sync";
import { ComparePicker } from "./jamfor";

type Tab = "analys" | "jamfor";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "analys", label: "Min analys" },
  { id: "jamfor", label: "Jämför H2H" },
];
const HCP_CATS: CategorySlug[] = ["driving", "approach", "around-the-green", "puttning"];
export const Route = createFileRoute("/utveckling/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s.tab === "jamfor" ? { tab: "jamfor" } : {},
  head: () => ({
    meta: [
      { title: "Analys – Din spelprofil | SG4" },
      {
        name: "description",
        content: "Se styrkor, utvecklingsområden och HCP per del av ditt golfspel.",
      },
    ],
  }),
  component: UtvecklingPage,
});
type Data = {
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
  kpis: Partial<Record<CategorySlug, CategoryKpi[]>>;
};
function loadData(userId: string | null): Data {
  const real = loadRealHandicap();
  const parts = loadAnalysisParts();
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined).map((cat) => {
    // Existing category indices remain authoritative. Show current test estimates when no index exists yet.
    if (cat.count > 0) return cat;
    const available = (parts[cat.slug] ?? []).filter((p) => p.hcp !== undefined && p.count > 0);
    const values = cat.slug === "driving" ? available.slice(0, 1) : available;
    if (!values.length) return cat;
    return {
      ...cat,
      isBaseline: false,
      handicap: values.reduce((sum, p) => sum + p.hcp!, 0) / values.length,
      count: values.reduce((sum, p) => sum + p.count, 0),
    };
  });
  const cache = new Map<HistoryKind, AnalysisHistoryPoint[]>();
  const history = (kind: HistoryKind) => {
    if (!cache.has(kind)) cache.set(kind, loadAnalysisHistory(kind, userId));
    return cache.get(kind)!;
  };
  const kpis = Object.fromEntries(HCP_CATS.map((slug) => [slug, categoryKpis(slug, history)]));
  return { cats, totalHandicap: computeEstimatedHandicap(cats), kpis };
}
function UtvecklingPage() {
  const { tab = "analys" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    const refresh = () => setData(loadData());
    refresh();
    window.addEventListener(SESSIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SESSIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-3">
      <h1 className="sr-only">Analys</h1>
      <div
        role="tablist"
        aria-label="Analys"
        className="sticky top-[calc(58px+env(safe-area-inset-top))] z-40 -mx-5 bg-background/95 px-5 py-2 backdrop-blur"
      >
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/50 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() =>
                navigate({ search: t.id === "analys" ? {} : { tab: t.id }, replace: true })
              }
              className={`rounded-xl py-2.5 text-sm font-bold ${tab === t.id ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "jamfor" ? (
        <div className="mt-4">
          <ComparePicker embedded />
        </div>
      ) : (
        data && <AnalysisTab data={data} />
      )}
    </main>
  );
}
function AnalysisTab({ data }: { data: Data }) {
  const tested = data.cats.filter(
    (c) => HCP_CATS.includes(c.slug) && c.count > 0 && c.handicap !== undefined,
  );
  return (
    <div className="mt-4">
      <AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.totalHandicap} />
      <section className="mt-6" aria-label="HCP per kategori">
        <h2 className="text-2xl font-black">HCP per kategori</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {HCP_CATS.map((slug) => (
            <CategoryFlipCard
              key={slug}
              slug={slug}
              cat={data.cats.find((c) => c.slug === slug)}
              kpis={data.kpis[slug] ?? []}
            />
          ))}
        </div>
      </section>
      <AnalysisHistoryChart />
      {!tested.length && (
        <Link
          to="/spela-runda"
          className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white"
        >
          Gör ditt första HCP-test →
        </Link>
      )}
    </div>
  );
}

function CategoryFlipCard({
  slug,
  cat,
  kpis,
}: {
  slug: CategorySlug;
  cat: CategoryHandicap | undefined;
  kpis: CategoryKpi[];
}) {
  const [flipped, setFlipped] = useState(false);
  const hcp = cat?.count ? cat.handicap : undefined;
  const face =
    "absolute inset-0 flex flex-col rounded-2xl border border-border bg-card [backface-visibility:hidden]";
  const counts = [...new Set(kpis.filter((k) => k.count > 0).map((k) => k.count))];
  return (
    <button
      type="button"
      onClick={() => setFlipped((value) => !value)}
      aria-pressed={flipped}
      aria-label={`${CATEGORY_LABELS[slug]} – ${flipped ? "visa kategori-HCP" : "vänd för mätvärden"}`}
      className="h-[340px] min-w-0 rounded-2xl text-left outline-none [perspective:1000px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span
        className="relative block h-full w-full transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <span aria-hidden={flipped} className={`${face} p-4`}>
          <span className="flex items-start justify-between gap-2">
            <span className="text-base font-bold">{CATEGORY_LABELS[slug]}</span>
            <RotateCcw className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </span>
          <span className="my-auto block">
            <span className="block text-5xl font-black">
              {hcp === undefined ? "–" : hcpLabel(hcp)}
            </span>
            <span className="mt-2 block text-[10px] font-bold uppercase text-muted-foreground">
              Uppskattat HCP
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {cat?.count ? `${cat.count} test` : "Ej testad"}
          </span>
          <span className="mt-3 flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-muted/50 text-[11px] font-semibold text-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Vänd för mätvärden
          </span>
        </span>
        <span
          aria-hidden={!flipped}
          className={`${face} p-3`}
          style={{ transform: "rotateY(180deg)" }}
        >
          <span className="flex items-baseline justify-between gap-1">
            <span className="text-sm font-bold">{CATEGORY_LABELS[slug]}</span>
            <span className="text-[11px] font-black">
              HCP {hcp === undefined ? "–" : hcpLabel(hcp)}
            </span>
          </span>
          <span className="mt-0.5 text-[9px] text-muted-foreground">
            {counts.length === 0
              ? "Inga mätvärden ännu"
              : counts.length === 1
                ? `Senaste ${counts[0]} ${counts[0] === 1 ? "test" : "tester"}`
                : "Snitt av senaste ≤5 tester per test"}
          </span>
          <span className="mt-2 flex flex-1 flex-col justify-around">
            {kpis.map((k) => (
              <span key={k.key} className="block border-t border-border pt-1.5 first:border-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </span>
                <span className="block leading-none">
                  <span className="text-[26px] font-black tabular-nums">
                    {k.value === undefined
                      ? "–"
                      : k.value.toLocaleString("sv-SE", {
                          minimumFractionDigits: k.def.decimals,
                          maximumFractionDigits: k.def.decimals,
                        })}
                  </span>
                  {k.value !== undefined && (
                    <span className="ml-1 text-xs font-semibold text-muted-foreground">
                      {k.def.unit}
                    </span>
                  )}
                </span>
                {counts.length > 1 && k.count > 0 && (
                  <span className="block text-[9px] text-muted-foreground">
                    senaste {k.count} test
                  </span>
                )}
              </span>
            ))}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Vänd tillbaka
          </span>
        </span>
      </span>
    </button>
  );
}
