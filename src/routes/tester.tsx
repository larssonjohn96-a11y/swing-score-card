import { Link, createFileRoute } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Alla tester – SG4" },
      {
        name: "description",
        content:
          "Bläddra bland alla golftester i SG4: driving, approach, around the green och puttning.",
      },
    ],
  }),
  component: TesterPage,
});

function TesterPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bläddra</p>
        <h1 className="text-4xl leading-none">Tester</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Välj en kategori för att se och starta dess tester.
        </p>
      </header>

      <section className="mt-6 space-y-4">
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
            <h2 className="mt-1 text-3xl leading-none">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-flag">
              {c.tests.length > 0 ? `${c.tests.length} test` : "Kommer snart"}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
