import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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
type Data = { cats: CategoryHandicap[]; totalHandicap: number | undefined; parts: AnalysisParts };
function loadData(): Data {
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
  return { cats, totalHandicap: computeEstimatedHandicap(cats), parts };
}
export function categoryTone(hcp: number | undefined, baseline: number | undefined) {
  if (hcp === undefined || baseline === undefined) return "border-slate-200 bg-white";
  if (hcp < baseline - 2) return "border-emerald-200 bg-emerald-50/70";
  if (hcp > baseline + 2) return "border-amber-200 bg-amber-50/70";
  return "border-blue-100 bg-blue-50/50";
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
  const baseline =
    tested.length > 1 ? tested.reduce((sum, c) => sum + c.handicap!, 0) / tested.length : undefined;
  return (
    <div className="mt-4">
      <AnalysisRadarSwitcher cats={data.cats} totalHandicap={data.totalHandicap} />
      <section className="mt-6" aria-label="HCP per kategori">
        <h2 className="text-2xl font-black">HCP per kategori</h2>
        <p className="mt-2 text-xs text-slate-500">
          Grönt: relativ styrka · Blått: jämn nivå · Gult: utvecklingsområde
        </p>
        <div className="mt-3 space-y-3">
          {HCP_CATS.map((slug) => {
            const cat = data.cats.find((c) => c.slug === slug);
            const hcp = cat?.count ? cat.handicap : undefined;
            return (
              <details
                key={slug}
                className={`group overflow-hidden rounded-2xl border ${categoryTone(hcp, baseline)}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h3 className="font-bold">{CATEGORY_LABELS[slug]}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {cat?.count ? `${cat.count} test` : "Ej testad"}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-black">{hcp === undefined ? "–" : hcpLabel(hcp)}</p>
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Uppskattat HCP
                    </span>
                  </div>
                  <span className="ml-2 flex flex-col items-center gap-1 text-slate-500">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    <span className="text-[10px] group-open:hidden">Visa delar</span>
                    <span className="hidden text-[10px] group-open:block">Dölj</span>
                  </span>
                </summary>
                <div className="border-t border-black/5 px-4 pb-4">
                  <p className="py-3 text-xs text-slate-500">
                    Delresultat från upp till 5 senaste testerna. Kategori-HCP kan bygga på fler
                    tester.
                  </p>
                  {(data.parts[slug] ?? []).map((part) => (
                    <div
                      key={part.label}
                      className="flex items-center justify-between gap-3 border-b border-black/5 py-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold">{part.label}</p>
                        {part.note && (
                          <p className="mt-1 text-[11px] text-slate-500">{part.note}</p>
                        )}
                      </div>
                      <strong className="shrink-0 text-sm">
                        {part.hcp !== undefined
                          ? `HCP ${hcpLabel(part.hcp)}`
                          : (part.value ?? "Ej testad")}
                      </strong>
                    </div>
                  ))}
                  <Link
                    to="/utveckling/$slug"
                    params={{ slug }}
                    className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-blue-700"
                  >
                    Se utveckling över tid →
                  </Link>
                </div>
              </details>
            );
          })}
        </div>
      </section>
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
