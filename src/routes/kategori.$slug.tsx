import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Target } from "lucide-react";
import { findCategory, CATEGORIES, type Category, type CategoryTest } from "@/lib/categories";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedSessions } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadFairwaySessions, fairwayHitRate } from "@/lib/fairway";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { TeeHero } from "@/components/offtee-visuals";
import { PuttingHero } from "@/components/shortputt-visuals";
import { SpeedHero } from "@/components/speed-visuals";
import { ShortGameHero } from "@/components/shortgame-visuals";
import { BunkerHero } from "@/components/bunker-visuals";
import { LagPuttHero } from "@/components/lagputt-visuals";
import { ApproachLoopIllustration } from "@/components/approach-loop-illustration";

const TEST_THUMBNAILS: Partial<Record<CategoryTest["to"], () => React.ReactNode>> = {
  "/approach": () => <ApproachLoopIllustration className="h-32 w-full" />,
  "/offtee-test": () => <TeeHero className="h-32 w-full" />,
  "/short-putting-test": () => <PuttingHero className="h-32 w-full" />,
  "/putting": () => <PuttingHero className="h-32 w-full" />,
  "/speed-test": () => <SpeedHero className="h-32 w-full" />,
  "/narspel-test": () => <ShortGameHero className="h-32 w-full" />,
  "/bunker-test": () => <BunkerHero className="h-32 w-full" />,
  "/lagputt-test": () => <LagPuttHero className="h-32 w-full" />,
};

const CARD_TITLES: Partial<Record<CategoryTest["to"], string>> = {
  "/approach": "Inspelstest",
  "/offtee-test": "Off the Tee",
  "/speed-test": "Speed",
  "/bunker-test": "Bunkerslag",
  "/narspel-test": "Närspelstest",
  "/short-putting-test": "Short Putting",
  "/lagputt-test": "Lag Putt",
  "/putting": "Putting Test",
};

const PUTTING_PROGRESS_TESTS = [
  { to: "/50-bollar" as const, title: "50-bollsövningen", subtitle: "50 puttar från 1–5 meter.", meta: "Score & progress" },
  { to: "/lagputt-test" as const, title: "Lag Putt", subtitle: "Längdkontroll från 8–18 meter.", meta: "Score & progress" },
];
const APPROACH_PROGRESS_TESTS = [
  { to: "/approach-pei-valj" as const, title: "PEI Precision", subtitle: "Wedge, järn eller total precision.", meta: "Score & progress" },
];
const AROUND_GREEN_PROGRESS_TESTS = [
  { to: "/8-bollar" as const, title: "8-bollsövningen", subtitle: "Chip, pitch, lobb och bunker från åtta stationer.", meta: "Score & progress" },
];

export const Route = createFileRoute("/kategori/$slug")({
  loader: ({ params }) => { const category = findCategory(params.slug); if (!category) throw notFound(); return { category }; },
  head: ({ loaderData }) => loaderData ? { meta: [{ title: `${loaderData.category.title} – golftester` }, { name: "description", content: `${loaderData.category.description} Kör testerna och följ utvecklingen över tid.` }] } : { meta: [{ title: "Kategorin hittades inte" }] },
  notFoundComponent: () => <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16"><h1 className="text-4xl">Kategorin finns inte</h1><Link to="/" className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm">Till menyn</Link></main>,
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData() as { category: Category };
  const [last, setLast] = useState<Record<string, string | undefined>>({});
  useEffect(() => {
    const d=loadBunkerSessions(), sp=loadSpeedSessions(), ld=loadLongDriveSessions(), fw=loadFairwaySessions(), offtee=loadOffTeeSessions(), lo=offtee.at(-1);
    setLast({
      "/fairway":fw.length?`Senast ${fw.at(-1)!.points.toFixed(0)} p · ${(fairwayHitRate(fw.at(-1)!.drives)*100).toFixed(0)}% fairway`:undefined,
      "/longdrive":ld.length?`Senast ${sessionBest(ld.at(-1)!).toFixed(0)} ${ld.at(-1)!.unit} längsta carry`:undefined,
      "/speed-test":sp.length?`Senast ${sp.at(-1)!.avgBallSpeed.toFixed(1)} mph ball speed`:undefined,
      "/bunker-test":d.length?`Senast ${d.at(-1)!.avgProximity.toFixed(2)} m i snitt`:undefined,
      "/offtee-test":lo?`Senast ${lo.score.toFixed(0)} / 100`:undefined,
    });
  }, []);
  const coreTests=category.slug==="puttning"?category.tests.filter(t=>t.to!=="/lagputt-test"&&t.to!=="/50-bollar"):category.tests;
  const progressTests=category.slug==="puttning"?PUTTING_PROGRESS_TESTS:category.slug==="approach"?APPROACH_PROGRESS_TESTS:category.slug==="around-the-green"?AROUND_GREEN_PROGRESS_TESTS:[];

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
    <header className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{category.subtitle}</p><h1 className="text-4xl leading-none">{category.title}</h1></div><Link to="/" className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">Tillbaka</Link></header>
    {category.slug!=="approach"&&<p className="mt-3 text-sm text-muted-foreground">{category.description}</p>}
    <section className="mt-8">
      <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-flag">Testa din nivå</p><h2 className="mt-1 text-2xl">HCP-test</h2><p className="mt-1 text-xs text-muted-foreground">Gör testet och se vilken HCP-nivå du motsvarar i kategorin.</p></div>
      <div className="space-y-4">{coreTests.map((t:CategoryTest)=>{const thumb=TEST_THUMBNAILS[t.to];return <Link key={t.to} to={t.to} className="block rounded-3xl border border-border bg-card p-5"><div className="flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-primary/5">{thumb?thumb():<Target className="h-8 w-8 text-flag"/>}</div><div className="mt-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-flag">HCP-resultat</p><h3 className="mt-1 text-3xl">{CARD_TITLES[t.to]??t.title}</h3></div><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground"/></div><p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>{last[t.to]&&<p className="mt-2 text-xs text-muted-foreground">{last[t.to]}</p>}</Link>})}</div>
    </section>
    {progressTests.length>0&&<section className="mt-10 border-t border-border pt-7"><div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Fler tester</p><h2 className="mt-1 text-xl">Följ din utveckling</h2><p className="mt-1 text-xs text-muted-foreground">Precision- och scoringtester som ger score och progress, inte HCP.</p></div><div className="overflow-hidden rounded-3xl border border-border bg-card">{progressTests.map((test,index)=><Link key={test.to} to={test.to} className={`flex items-center gap-3 px-4 py-4 ${index>0?"border-t border-border":""}`}><span className="flex-1"><span className="block text-lg">{test.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{test.subtitle}</span><span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{test.meta}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground"/></Link>)}</div></section>}
    <nav className="mt-10"><h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Andra kategorier</h2><div className="mt-3 grid grid-cols-2 gap-2">{CATEGORIES.filter(c=>c.slug!==category.slug).map(c=><Link key={c.slug} to="/kategori/$slug" params={{slug:c.slug}} className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-sm text-muted-foreground">{c.title}</Link>)}</div></nav>
  </main>;
}
