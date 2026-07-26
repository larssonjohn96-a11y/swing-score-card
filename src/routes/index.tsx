import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatScore, loadSessions } from "@/lib/drill";
import { loadBunkerSessions } from "@/lib/bunker";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Golftester – 18 bollar & bunkerslag" },
      {
        name: "description",
        content:
          "Samla dina golftester på ett ställe: 18-bollarsdrillen på 75/125/150m och bunkertestet med 6 lägen. Följ utvecklingen över tid.",
      },
      { property: "og:title", content: "Golftester – 18 bollar & bunkerslag" },
      {
        property: "og:description",
        content: "Kör dina tester, spara resultaten och följ utvecklingen över tid.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, displayName } = useAuth();
  const [last, setLast] = useState<{ drill?: string; bunker?: string }>({});

  useEffect(() => {
    const d = loadSessions();
    const b = loadBunkerSessions();
    setLast({
      drill: d.length ? `Senast ${formatScore(d[d.length - 1].score)}` : undefined,
      bunker: b.length ? `Senast ${b[b.length - 1].avgFeet.toFixed(1)} fot i snitt` : undefined,
    });
  }, []);

  const tests = [
    {
      to: "/drill" as const,
      number: "1",
      title: "18 bollar",
      subtitle: "75 / 125 / 150 meter",
      bullets: ["2 bollar per avstånd innan du går vidare.", "Tre varv ger 3.0 i score."],
      result: "RESULTAT: SCORE 0–3.0",
      last: last.drill,
    },
    {
      to: "/bunker" as const,
      number: "3",
      title: "Bunkerslag",
      subtitle: "6 olika lägen",
      bullets: ["Varierande avstånd och lägen.", "1 boll från varje position."],
      result: "RESULTAT: MÄT AVSTÅNDET TILL HÅLET I FOT",
      last: last.bunker,
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Golfträning</p>
          <h1 className="text-5xl leading-none">Tester</h1>
        </div>
        <Link
          to="/konto"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {displayName ?? (user ? "Konto" : "Logga in")}
        </Link>
      </header>

      <nav className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/historik"
          className="rounded-2xl border border-border bg-card py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Historik
        </Link>
        <Link
          to="/topplista"
          className="rounded-2xl border border-border bg-card py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Topplista
        </Link>
      </nav>


      <section className="mt-8 space-y-4">
        {tests.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-flag font-[family-name:var(--font-display)] text-3xl text-primary-foreground">
                {t.number}
              </span>
              <div>
                <h2 className="text-3xl leading-none">{t.title}</h2>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {t.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-flag">•</span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-flag">{t.result}</p>
            {t.last ? <p className="mt-2 text-xs text-muted-foreground">{t.last}</p> : null}
          </Link>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Alla resultat sparas lokalt på din telefon.
      </p>
    </main>
  );
}
