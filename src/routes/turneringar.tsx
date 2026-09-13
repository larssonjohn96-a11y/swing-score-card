import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Lock, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/turneringar")({
  head: () => ({ meta: [{ title: "Turneringar – SG4" }] }),
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 font-display text-4xl">Turneringar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Återkommande events där samma challenge spelas av alla och resultatet hamnar på en leaderboard.</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-[30px] border border-amber-500/25 bg-gradient-to-br from-amber-500/[.10] via-card to-card p-5 shadow-[var(--shadow-glow)]">
        <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Trophy className="h-6 w-6" /></span><span className="rounded-full border border-border bg-card px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-muted-foreground">Kommer snart</span></div>
        <h2 className="mt-5 font-display text-3xl">Weekly SG4</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">En ny utmaning varje vecka. Samma regler för alla, flera försök och leaderboard när veckan är slut.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-background/70 p-3"><CalendarDays className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold">Veckoevent</p></div><div className="rounded-2xl border border-border bg-background/70 p-3"><Users className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold">Leaderboard</p></div></div>
      </section>

      <section className="mt-3 rounded-[26px] border border-border bg-card p-4 opacity-70"><div className="flex items-center gap-3"><Lock className="h-5 w-5 text-muted-foreground" /><div><h3 className="font-display text-xl">Club & Friends</h3><p className="mt-1 text-xs text-muted-foreground">Privata turneringar för kompisar, träningsgrupper och klubbar.</p></div></div></section>
    </main>
  );
}
