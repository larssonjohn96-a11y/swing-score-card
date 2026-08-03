import { Link, createFileRoute } from "@tanstack/react-router";
import { computeLatestTests } from "@/lib/sg-handicap";

export const Route = createFileRoute("/historik")({
  head: () => ({
    meta: [
      { title: "Historik – SG4" },
      {
        name: "description",
        content:
          "Alla dina genomförda tester i kronologisk ordning, med score och estimerat handicap.",
      },
    ],
  }),
  component: HistorikPage,
});

function fmt(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function HistorikPage() {
  const tests = computeLatestTests(200);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Din resa</p>
          <h1 className="text-4xl leading-none">Historik</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Hem
        </Link>
      </header>

      {tests.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Inga genomförda tester ännu. Kör ditt första test för att börja bygga din historik.
        </p>
      ) : (
        <section className="mt-6 space-y-2">
          {tests.map((t) => (
            <div
              key={t.key}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <div className="text-right">
                {t.score !== undefined && (
                  <p className="font-[family-name:var(--font-display)] text-xl leading-none">
                    {t.score}
                    <span className="text-xs text-muted-foreground">{t.scoreUnit}</span>
                  </p>
                )}
                {t.handicap !== undefined && (
                  <p className="mt-0.5 text-xs text-muted-foreground">HCP {fmt(t.handicap)}</p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
