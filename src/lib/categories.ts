export type CategoryTest = {
  to: "/drill" | "/bunker" | "/speed";
  number: string;
  title: string;
  subtitle: string;
  bullets: string[];
  result: string;
};

export type Category = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tests: CategoryTest[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "around-the-green",
    title: "Around the green",
    subtitle: "Shortgame",
    description: "Chip, pitch och bunkerslag runt greenen.",
    tests: [
      {
        to: "/bunker",
        number: "3",
        title: "Bunkerslag",
        subtitle: "6 olika lägen",
        bullets: ["Varierande avstånd och lägen.", "1 boll från varje position."],
        result: "RESULTAT: MÄT AVSTÅNDET TILL HÅLET I FOT",
      },
    ],
  },
  {
    slug: "puttning",
    title: "Puttning",
    subtitle: "På greenen",
    description: "Tester för längdkänsla och korta puttar.",
    tests: [],
  },
  {
    slug: "approach",
    title: "Approach",
    subtitle: "Inspel mot green",
    description: "Precision på fulla och halva inspel.",
    tests: [
      {
        to: "/drill",
        number: "1",
        title: "18 bollar",
        subtitle: "75 / 125 / 150 meter",
        bullets: ["2 bollar per avstånd innan du går vidare.", "Tre varv ger 3.0 i score."],
        result: "RESULTAT: SCORE 0–3.0",
      },
    ],
  },
  {
    slug: "driving",
    title: "Driving",
    subtitle: "Utslag",
    description: "Längd, hastighet och träffsäkerhet från tee.",
    tests: [
      {
        to: "/speed",
        number: "4",
        title: "Speed test",
        subtitle: "Ball speed & club head speed",
        bullets: [
          "Logga bollhastighet i mph, club head speed valfritt.",
          "Datum på x-axeln så du ser progress över tid.",
        ],
        result: "RESULTAT: MPH ÖVER TID + SMASH FACTOR",
      },
    ],
  },
];

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
