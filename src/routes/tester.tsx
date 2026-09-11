import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Flag, ListChecks, Target, BriefcaseBusiness } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "Testa – SG4" },
      {
        name: "description",
        content: "Mät din nivå, träna med syfte, tävla och bygg din bag.",
      },
      { property: "og:title", content: "Testa – SG4" },
      {
        property: "og:description",
        content: "Handicap-test, träning, tävling och bag på ett ställe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TesterPage,
});

function TesterPage() {
  const [hcpOpen, setHcpOpen] = useState(false);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">SG4</p>
        <h1 className="mt-1 text-4xl leading-none">Testa</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Mät din nivå, träna med syfte och utmana dina vänner.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => setHcpOpen((open) => !open)}
          className={`w-full overflow-hidden rounded-3xl border text-left shadow-[var(--shadow-glow)] transition-colors ${hcpOpen ? "border-primary/35 bg-tint" : "border-primary/20 bg-card hover:border-primary/35 hover:bg-tint/60"}`}
        >
          <div className="flex items-center gap-4 px-5 py-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint-strong text-primary">
              <Target className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl leading-none">Handicap-test</h2>
                <span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">HCP</span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">Testa din nivå och få ett SG4-resultat i varje kategori.</p>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition-transform ${hcpOpen ? "rotate-180" : ""}`} />
          </div>

          {hcpOpen ? (
            <div className="border-t border-primary/15 bg-background/45 px-3 pb-3 pt-3">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Välj kategori</p>
              <div className="space-y-2">
                {CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    to="/kategori/$slug"
                    params={{ slug: category.slug }}
                    onClick={(event) => event.stopPropagation()}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary hover:bg-tint"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-none">{category.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{category.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </button>

        <Link
          to="/traning"
          search={{ category: undefined }}
          className="flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-5 shadow-[var(--shadow-glow)] transition-colors hover:border-primary hover:bg-tint/50"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/70 text-foreground">
            <ListChecks className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl leading-none">Träning</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Träna</span>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">Träna med syfte, gör träningen roligare och mät dina framsteg över tid.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          to="/match"
          className="flex items-center gap-4 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.055] via-card to-red-500/[0.055] px-5 py-5 shadow-[var(--shadow-glow)] transition-colors hover:border-red-500/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-red-500 text-white shadow-sm">
            <Flag className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl leading-none">Tävla</h2>
              <span className="rounded-full bg-red-500/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-500">H2H</span>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">Utmana en vän i Off the Tee, Approach, Närspel eller Putting.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-red-500/70" />
        </Link>
      </section>

      <section className="mt-7 border-t border-border pt-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Din utrustning</p>
        <Link
          to="/min-bag"
          className="flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-glow)] transition-colors hover:border-primary hover:bg-tint/50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/60 text-foreground">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl leading-none">My Bag</h2>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">Se dina klubbor, carry-längder och gapping.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </main>
  );
}
