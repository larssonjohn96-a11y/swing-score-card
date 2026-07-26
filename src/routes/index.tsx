import { Link, createFileRoute } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrainingFocus } from "@/components/training-focus";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SG4 – Testa hela ditt spel och sänk ditt handicap" },
      {
        name: "description",
        content:
          "SG4 mäter ditt spel i fyra kategorier: driving, approach, around the green och puttning. Kör testerna, följ utvecklingen och få personliga träningsprogram.",
      },
      { property: "og:title", content: "SG4 – Testa hela ditt spel" },
      {
        property: "og:description",
        content: "Mät, följ och förbättra ditt golfspel från utslag till putt med SG4.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, displayName } = useAuth();

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Strokes Gained</p>
          <span className="mt-1 font-display text-5xl leading-none tracking-wide text-foreground">
            SG4
          </span>
          <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
            Testa hela ditt spel – från utslag till putt – och få personliga träningsprogram som sänker ditt handicap och dina scorer.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <Link
          to="/konto"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {displayName ?? (user ? "Konto" : "Logga in")}
        </Link>
        </div>
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

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Vad är Strokes Gained?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Strokes Gained jämför dina slag med en referensnivå och visar var du vinner eller förlorar slag. SG4 delar spelet i fyra kategorier – driving, approach, around the green och puttning – så du ser exakt var du har mest att vinna och kan träna smartare.
        </p>
      </section>

      <TrainingFocus />

      <section className="mt-8 space-y-4">
        <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Kategorier</h2>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to="/kategori/$slug"
            params={{ slug: c.slug }}
            className="block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {c.subtitle}
            </p>
            <h3 className="mt-1 text-3xl leading-none">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-flag">
              {c.tests.length > 0 ? `${c.tests.length} test` : "Kommer snart"}
            </p>
          </Link>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Alla resultat sparas lokalt och på ditt konto.
      </p>
    </main>
  );
}

