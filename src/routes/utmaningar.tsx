import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Flame, Gauge, Target, Trophy, Wind } from "lucide-react";

export const Route = createFileRoute("/utmaningar")({
  head: () => ({ meta: [{ title: "Utmaningar – SG4" }] }),
  component: ChallengesPage,
});

const CHALLENGES = [
  { to: "/putting-streak", title: "Putting Streak", detail: "Bygg en streak och slå ditt PB.", icon: Flame },
  { to: "/fairway-streak", title: "Fairway Streak", detail: "Hur många fairways kan du träffa i rad?", icon: Target },
  { to: "/longdrive", title: "Long Drive", detail: "Jaga längd och nytt personbästa.", icon: Gauge },
  { to: "/tornado", title: "Tornado", detail: "Poängutmaning med varierade slag.", icon: Wind },
  { to: "/wedge-stege", title: "Wedge Stege", detail: "Precision över flera wedgeavstånd.", icon: Trophy },
] as const;

function ChallengesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 font-display text-4xl">Utmaningar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">En personlig Daily Challenge varje dag – plus fristående spel när du vill göra mer.</p>
      </header>

      <Link to="/daily-challenge" className="mt-6 block rounded-[30px] bg-[#082d23] p-5 text-white shadow-[0_22px_48px_-30px_rgba(4,47,36,.75)] active:scale-[.99]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200"><Flame className="h-4 w-4 fill-emerald-300" /> Daily Challenge</div>
            <h2 className="mt-3 font-display text-[34px] leading-none">Din Challenge Point</h2>
            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-white/72">Välj 1 av 3 kategorier. Tre liv. En challenge per dag.</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12"><ChevronRight className="h-5 w-5" /></span>
        </div>
      </Link>

      <section className="mt-8">
        <div className="mb-3"><h2 className="text-xl font-black">Fler utmaningar</h2><p className="mt-1 text-xs text-muted-foreground">Fristående – spela när du vill.</p></div>
        <div className="space-y-3">
          {CHALLENGES.map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-4 rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-glow)] active:scale-[.99]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[.08] text-primary"><item.icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span></span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>)}
        </div>
      </section>
    </main>
  );
}
