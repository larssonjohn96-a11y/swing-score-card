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
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Korta spel med ett tydligt mål. Jaga poäng, streaks och personliga rekord.</p>
      </header>

      <section className="mt-6 space-y-3">
        {CHALLENGES.map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-4 rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-glow)] active:scale-[.99]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[.08] text-primary"><item.icon className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span></span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>)}
      </section>
    </main>
  );
}
