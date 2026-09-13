import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, ListChecks, Target } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Tester – SG4" },
      { name: "description", content: "Mät din golfnivå med SG4:s handicap- och färdighetstester." },
      { property: "og:title", content: "Tester – SG4" },
      { property: "og:description", content: "Gör tester, få en nivå och följ utvecklingen över tid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestsPage,
});

function TestsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 font-display text-4xl">Tester</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Mät hur bra du är. Varje test ska ge dig ett tydligt resultat, en nivå eller ett benchmark.</p>
      </header>

      <section className="mt-6 rounded-[30px] border border-primary/20 bg-primary/[.05] p-5 shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Target className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-primary">Huvudtester</p><h2 className="font-display text-2xl">Vilken nivå spelar du på?</h2></div></div>
        <div className="mt-4 space-y-2">
          {CATEGORIES.map((category) => <Link key={category.slug} to="/kategori/$slug" params={{ slug: category.slug }} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 active:scale-[.99]">
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">{category.title}</h3><span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-primary">HCP</span></div><p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{category.description}</p></div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>)}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Precision & benchmark</p></div>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/pga-tour-18-puttar" className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><p className="font-display text-xl">18 puttar</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">PGA Tour-inspirerat puttingbenchmark.</p></Link>
          <Link to="/driver-konsekvens" className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><p className="font-display text-xl">Driver</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Mät konsekvens och spridning från tee.</p></Link>
          <Link to="/approach-pei-valj" className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><p className="font-display text-xl">PEI Approach</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Precisionstest för wedge och järn.</p></Link>
          <Link to="/tutor-test" className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><p className="font-display text-xl">Tutor Test</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Benchmark för startlinje och puttingkontroll.</p></Link>
        </div>
      </section>
    </main>
  );
}
