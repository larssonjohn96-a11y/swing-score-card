import { Link, createFileRoute } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Golftester – shortgame, puttning, approach & driving" },
      {
        name: "description",
        content:
          "Alla dina golftester i fyra kategorier: around the green, puttning, approach och driving. Kör testerna och följ utvecklingen över tid.",
      },
      { property: "og:title", content: "Golftester – fyra kategorier" },
      {
        property: "og:description",
        content: "Välj kategori, kör dina tester och följ utvecklingen över tid.",
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
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Golfträning</p>
          <h1 className="text-5xl leading-none">Tester</h1>
        </div>
        <div className="flex items-center gap-2">
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

