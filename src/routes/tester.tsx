import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, Target } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { COACHES } from "@/lib/coach-putting";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Train & Test – SG4" },
      { name: "description", content: "Träna med coach eller gör ett handicaptest i SG4." },
      { property: "og:title", content: "Train & Test – SG4" },
      { property: "og:description", content: "Välj läge: Practice Mode med coach eller Handicap Test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainAndTestPage,
});

function CircleBack({ onClick, to, label }: { onClick?: () => void; to?: "/"; label: string }) {
  const cls = "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm active:scale-[.95]";
  if (to) return <Link to={to} aria-label={label} className={cls}><ChevronLeft className="h-5 w-5" /></Link>;
  return <button type="button" aria-label={label} onClick={onClick} className={cls}><ChevronLeft className="h-5 w-5" /></button>;
}

function SpeechBubble({ text }: { text: string }) {
  const alma = COACHES.find((coach) => coach.id === "alma") ?? COACHES[0];
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center text-[58px] leading-none">{alma.emoji}</div>
      <div className="relative mb-0 flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5 shadow-[0_14px_32px_-20px_rgba(15,23,42,.42)]">
        <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 border-y-[13px] border-y-transparent border-r-[17px] border-r-border" />
        <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 border-y-[11px] border-y-transparent border-r-[15px] border-r-card" />
        <p className="relative text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Alma</p>
        <p className="relative mt-1 text-[15.5px] font-semibold leading-[1.42]">{text}</p>
      </div>
    </div>
  );
}

function TrainAndTestPage() {
  const [view, setView] = useState<"select" | "hcp">("select");
  const navigate = useNavigate();

  if (view === "hcp") return <HandicapTestView onBack={() => setView("select")} />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <CircleBack to="/" label="Tillbaka till hem" />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-muted-foreground">Train &amp; Test</p>
          <p className="text-sm font-black">Välj läge</p>
        </div>
        <span className="h-10 w-10" />
      </header>

      <section className="mt-7">
        <SpeechBubble text="Välj om du vill träna med coach eller göra ett handicaptest. Practice Mode är ditt träningsflöde. Handicap Test ger dig ett HCP-resultat." />
      </section>

      <section className="mt-7 space-y-3.5">
        <button
          type="button"
          onClick={() => navigate({ to: "/coach" })}
          className="flex w-full items-center gap-4 rounded-[28px] border border-emerald-500/35 bg-emerald-500/[.07] px-5 py-6 text-left shadow-[var(--shadow-glow)] transition active:scale-[.985]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[27px] leading-none">Practice Mode</span>
            <span className="mt-2 block text-sm text-muted-foreground">Träna med coach</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600" />
        </button>

        <button
          type="button"
          onClick={() => setView("hcp")}
          className="flex w-full items-center gap-4 rounded-[28px] border border-primary/30 bg-primary/[.06] px-5 py-6 text-left shadow-[var(--shadow-glow)] transition active:scale-[.985]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Target className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[27px] leading-none">Handicap Test</span>
            <span className="mt-2 block text-sm text-muted-foreground">Gör ett test · få ett HCP-resultat</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      </section>
    </main>
  );
}

function HandicapTestView({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <CircleBack onClick={onBack} label="Tillbaka till Train & Test" />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-muted-foreground">Train &amp; Test</p>
          <p className="text-sm font-black">Handicap Test</p>
        </div>
        <span className="h-10 w-10" />
      </header>

      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 font-display text-4xl">Handicap Test</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Mät hur bra du är. Varje test ska ge dig ett tydligt resultat, en nivå eller ett benchmark.</p>
      </div>

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
        <div className="mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-[.18em] text-muted-foreground">Precision &amp; benchmark</p></div>
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
