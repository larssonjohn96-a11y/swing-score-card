import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Repeat, Shuffle, Grid3x3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatShotShapingRating,
  loadShotShapingRating,
  type ShotShapingRatingResult,
} from "@/lib/shot-shaping-rating";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/shot-shaping")({
  head: () => ({
    meta: [
      { title: "Shot Shaping – Träningstester | SG4" },
      {
        name: "description",
        content:
          "Tre träningstester för bollkontroll: 9 Window Drill, konstant shape och växlande draw/fade. Inga HCP-resultat.",
      },
      { property: "og:title", content: "Shot Shaping – Träningstester | SG4" },
      {
        property: "og:description",
        content: "Mät din kontroll över höjd och form på bollen och följ utvecklingen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShotShapingFamily,
});

const TESTS = [
  {
    to: "/shot-shaping-9-window" as const,
    title: "9 Window Drill",
    meta: "9 slag · 0–9 poäng",
    description: "Låg, medel och hög bollflykt kombinerat med draw, rak och fade. Ett slag per fönster.",
    icon: Grid3x3,
  },
  {
    to: "/shot-shaping-konstant" as const,
    title: "Konstant shape",
    meta: "10 slag · draw eller fade",
    description: "Välj en form och upprepa den tio gånger. Jämför din stock shape mot motsatt form.",
    icon: Repeat,
  },
  {
    to: "/shot-shaping-vaxlande" as const,
    title: "Växlande shape",
    meta: "10 slag · draw/fade varannat",
    description: "Formen byts varje slag. Mäter anpassningsförmåga, inte bara ett inövat slag.",
    icon: Shuffle,
  },
];

function ShotShapingFamily() {
  const [rating, setRating] = useState<ShotShapingRatingResult | null>(null);

  useEffect(() => {
    setRating(loadShotShapingRating());
  }, []);

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-24 pt-6 text-foreground"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/traning"
          search={{ category: undefined }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ej HCP-grundande
        </span>
      </div>

      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Träningstester
      </p>
      <h1 className="mt-1 font-display text-4xl leading-none">Shot Shaping</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Tre olika sätt att mäta bollkontroll: träffa alla fönster, upprepa en form eller växla mellan
        draw och fade.
      </p>

      {rating ? (
        <section className="mt-5 rounded-3xl border border-primary/25 bg-primary/[0.06] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Shot Shaping Rating
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="font-display text-5xl leading-none text-foreground">
              {formatShotShapingRating(rating.rating)}
              <span className="ml-1 text-base text-muted-foreground">/ 10</span>
            </p>
            <p className="pb-1 text-right text-xs leading-relaxed text-muted-foreground">
              Snitt av senaste {rating.count}
              <br />
              Shot Shaping-test{rating.count === 1 ? "" : "er"}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Varje test behåller sitt eget resultat. Ratingen normaliserar testerna till 0–10 och använder högst de senaste 5.
          </p>
        </section>
      ) : null}

      <div className="mt-6 space-y-3">
        {TESTS.map(({ to, title, meta, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl leading-none">{title}</span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                {meta}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </main>
  );
}
