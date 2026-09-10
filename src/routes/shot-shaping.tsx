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
        content: "Tre träningstester för bollkontroll: växlande draw/fade, 9 Window Drill och konstant shape. Inga HCP-resultat.",
      },
    ],
  }),
  component: ShotShapingFamily,
});

const TESTS = [
  {
    to: "/shot-shaping-vaxlande" as const,
    title: "Växlande shape",
    meta: "10 slag · draw / fade varannat",
    description: "Byt bollform på begäran, slag efter slag. Mäter anpassningsförmåga och kontroll.",
    icon: Shuffle,
    featured: true,
  },
  {
    to: "/shot-shaping-9-window" as const,
    title: "9 Window Drill",
    meta: "9 slag · höjd + shape",
    description: "Låg, medel och hög bollflykt kombinerat med draw, rak och fade.",
    icon: Grid3x3,
    featured: false,
  },
  {
    to: "/shot-shaping-konstant" as const,
    title: "Konstant shape",
    meta: "10 slag · draw eller fade",
    description: "Upprepa samma bollform tio gånger och mät hur repeterbar din stock shape är.",
    icon: Repeat,
    featured: false,
  },
];

function ShotShapingFamily() {
  const [rating, setRating] = useState<ShotShapingRatingResult | null>(null);

  useEffect(() => {
    setRating(loadShotShapingRating());
  }, []);

  const glass = "border-white/60 bg-white/65 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.55)] backdrop-blur-xl";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-24 pt-6 text-foreground">
      <div className="flex items-center justify-between">
        <Link to="/traning" search={{ category: undefined }} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-xl">
          Ej HCP-grundande
        </span>
      </div>

      <section className={`mt-5 overflow-hidden rounded-[30px] border p-5 ${glass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Träningstester</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Shot Shaping</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Träna kontroll över bollens form och höjd. Välj klubba i varje test och följ utvecklingen över tid.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-3 backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Fokus</p>
            <p className="mt-1 font-display text-xl">Shape control</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-3 backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Format</p>
            <p className="mt-1 font-display text-xl">3 tester</p>
          </div>
        </div>
      </section>

      {rating ? (
        <section className={`mt-4 rounded-3xl border p-5 ${glass}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shot Shaping Rating</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="font-display text-5xl leading-none text-foreground">
              {formatShotShapingRating(rating.rating)}
              <span className="ml-1 text-base text-muted-foreground">/ 10</span>
            </p>
            <p className="pb-1 text-right text-xs leading-relaxed text-muted-foreground">Senaste {rating.count} test{rating.count === 1 ? "" : "er"}</p>
          </div>
        </section>
      ) : null}

      <div className="mt-5 space-y-3">
        {TESTS.map(({ to, title, meta, description, icon: Icon, featured }) => (
          <Link
            key={to}
            to={to}
            className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all active:scale-[0.99] ${featured ? "border-sky-200/70 bg-gradient-to-br from-blue-500/[0.11] via-white/68 to-red-500/[0.08] shadow-[0_18px_44px_-32px_rgba(37,99,235,0.55)] backdrop-blur-xl" : glass}`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${featured ? "border-blue-400/20 bg-blue-500/10 text-blue-600" : "border-white/60 bg-white/60 text-foreground"}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="block font-display text-2xl leading-none">{title}</span>
                {featured ? <span className="rounded-full bg-foreground px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-background">Rekommenderad</span> : null}
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
              <span className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] ${featured ? "text-blue-600" : "text-muted-foreground"}`}>{meta}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </main>
  );
}
