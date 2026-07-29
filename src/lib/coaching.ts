import type { CategoryRating } from "@/lib/focus";

/** Ungefärlig slagbesparing per rond vid 10 % förbättring i kategorin. */
const STROKES_PER_10PCT: Record<string, string> = {
  driving: "1–2",
  approach: "2–3",
  "around-the-green": "2–3",
  puttning: "1–2",
};

export type Insight = {
  weakest?: CategoryRating;
  strongest?: CategoryRating;
  strokes: string;
};

export function buildInsight(ratings: CategoryRating[]): Insight {
  const scored = ratings.filter((r) => typeof r.rating === "number");
  if (!scored.length) return { strokes: "2–3" };
  const weakest = scored.reduce((a, b) => (b.rating! < a.rating! ? b : a));
  const strongest = scored.reduce((a, b) => (b.rating! > a.rating! ? b : a));
  return {
    weakest,
    strongest: strongest.slug === weakest.slug ? undefined : strongest,
    strokes: STROKES_PER_10PCT[weakest.slug] ?? "2–3",
  };
}

export type Drill = {
  title: string;
  detail: string;
  time: string;
};

export const TRAINING_PLAN: {
  slug: string;
  title: string;
  focus: string;
  drills: Drill[];
}[] = [
  {
    slug: "driving",
    title: "Driving",
    focus: "Fart, träffbild och kontroll på fairwayträffar.",
    drills: [
      {
        title: "Speed-stege",
        detail: "3 × 5 svingar: 80 %, 90 %, max. Logga bästa ball speed varje set.",
        time: "15 min",
      },
      {
        title: "Fairwayspel",
        detail: "10 drivar mot en 25 m bred korridor – räkna träffar, inte längd.",
        time: "20 min",
      },
      {
        title: "Tee utan driver",
        detail: "9 slag mot landningsytor 170/195/220 m med valfri klubba.",
        time: "15 min",
      },
    ],
  },
  {
    slug: "approach",
    title: "Approach",
    focus: "Avståndskontroll och proximity på fulla och halva slag.",
    drills: [
    ],
  },
  {
    slug: "around-the-green",
    title: "Around the green",
    focus: "Få bollen på green och nära hål från varierande lägen.",
    drills: [
      {
        title: "Bunkerrundan",
        detail: "6 olika lägen, en boll från varje. Mät avståndet till hål i fot.",
        time: "20 min",
      },
      {
        title: "Upp och in",
        detail: "10 chippar från olika lie – räkna hur många du sätter inom 2 m.",
        time: "20 min",
      },
      {
        title: "Landningspunkt",
        detail: "Sikta på en handduk 3 m in på green, 15 pitchar i rad.",
        time: "15 min",
      },
    ],
  },
  {
    slug: "puttning",
    title: "Puttning",
    focus: "Längdkänsla på långt och säkerhet på kort.",
    drills: [
      {
        title: "Cirkeln",
        detail: "8 puttar runt hålet på 1 m – alla ska i innan du går vidare.",
        time: "10 min",
      },
      {
        title: "Stegen",
        detail: "Puttar på 5, 10, 15 och 20 m – stanna inom en putterlängd.",
        time: "15 min",
      },
      {
        title: "Startlinje",
        detail: "Putta genom en grind av två peggar 30 cm framför bollen.",
        time: "10 min",
      },
    ],
  },
];
