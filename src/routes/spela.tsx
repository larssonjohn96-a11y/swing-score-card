import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, ChevronRight, Flag, Swords, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/spela")({
  head: () => ({ meta: [{ title: "Spela – SG4" }] }),
  component: PlayPage,
});

function PlayPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 font-display text-4xl">Spela</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Välj motståndare eller spelläge. Här handlar allt om att vinna.</p>
      </header>

      <section className="mt-6 space-y-3">
        <Link to="/match-bot" className="flex min-h-[108px] items-center gap-4 rounded-[28px] border border-primary/20 bg-primary/[.06] p-5 shadow-[var(--shadow-glow)] active:scale-[.99]">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Bot className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-2xl">Mot bot</span><span className="mt-1 block text-sm text-muted-foreground">Välj en golfpersona och spela direkt.</span></span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link to="/match" className="flex min-h-[108px] items-center gap-4 rounded-[28px] border border-blue-500/20 bg-gradient-to-r from-blue-500/[.07] via-card to-red-500/[.07] p-5 shadow-[var(--shadow-glow)] active:scale-[.99]">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white"><Swords className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-2xl">Mot vän</span><span className="mt-1 block text-sm text-muted-foreground">Head-to-head, Fourball och Foursomes.</span></span>
          <ChevronRight className="h-5 w-5 text-red-500/70" />
        </Link>

        <Link to="/tester" className="flex min-h-[96px] items-center gap-4 rounded-[26px] border border-border bg-card p-5 shadow-[var(--shadow-glow)] active:scale-[.99]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Target className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-xl">HCP-utmaning</span><span className="mt-1 block text-xs text-muted-foreground">Spela mot en definierad nivå i ett SG4-test.</span></span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <Link to="/utmaningar" className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><Flag className="h-5 w-5 text-primary" /><h2 className="mt-4 font-display text-xl">Utmaningar</h2><p className="mt-1 text-xs text-muted-foreground">Korta scoring-spel och PB-jakt.</p></Link>
        <Link to="/turneringar" className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-glow)]"><Trophy className="h-5 w-5 text-amber-500" /><h2 className="mt-4 font-display text-xl">Turneringar</h2><p className="mt-1 text-xs text-muted-foreground">Events, ranking och återkommande tävlingar.</p></Link>
      </section>
    </main>
  );
}
