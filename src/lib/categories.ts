export type CategoryTest = {
  to: "/drill" | "/bunker" | "/speed" | "/longdrive" | "/fairway" | "/wedge" | "/combine";
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
        title: "18 bollar - jÖNKÖPINGS RAnGE",
        subtitle: "75 / 125 / 150 meter",
        bullets: ["2 bollar per avstånd innan du går vidare.", "Tre varv ger 3.0 i score."],
        result: "RESULTAT: SCORE 0–3.0",
      },
      {
        to: "/wedge",
        number: "7",
        title: "Wedge matrix",
        subtitle: "20 slag – 40 till 120 m",
        bullets: [
          "5 avstånd × 2 bollar × 2 varv.",
          "Mät avstånd till hål – snitt och spridning per avstånd.",
        ],
        result: "RESULTAT: MEDELPROXIMITY + SPRIDNING",
      },
    ],
  },
  {
    slug: "combine",
    title: "Combine",
    subtitle: "Approach + driving",
    description: "Komplett test som mäter både inspel och driver i samma score.",
    tests: [
      {
        to: "/combine",
        number: "8",
        title: "Combine test",
        subtitle: "30 eller 60 slag – 55 till 165 m + driver",
        bullets: [
          "3 slag per station, två varv (small 5 stationer, large 10).",
          "Avstånd till hål och driverns carry ger totalpoäng 0–100.",
        ],
        result: "RESULTAT: SCORE 0–100 + NIVÅ",
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
      {
        to: "/longdrive",
        number: "5",
        title: "Long drive",
        subtitle: "6 försök – bara carry",
        bullets: [
          "Sex utslag per test, endast carry räknas.",
          "Längsta och snitt sparas med datum.",
        ],
        result: "RESULTAT: LÄNGSTA CARRY + SNITT",
      },
      {
        to: "/fairway",
        number: "6",
        title: "Fairway challenge",
        subtitle: "10 drivar – träff & längd",
        bullets: [
          "Tio drivar: fairway, ruff eller out plus carry.",
          "Långa fairwayträffar ger mest, out ger minuspoäng.",
        ],
        result: "RESULTAT: TOTALPOÄNG 0–100",
      },
    ],
  },
];

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
