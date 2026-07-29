export type CategoryTest = {
  to:
    | "/drill"
    | "/bunker"
    | "/speed"
    | "/longdrive"
    | "/fairway"
    | "/teeshot"
    | "/precision"
    | "/pitch"
    | "/chip"
    | "/kortputt"
    | "/tornado"
    | "/lagputt";

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
      {
        to: "/teeshot",
        number: "11",
        title: "Landningsytor från tee",
        subtitle: "9 slag utan driver – 170, 195, 220 m",
        bullets: [
          "Tre stationer × 3 varv, alla klubbor utom driver.",
          "Inom längdspann (±10 m) och 25 m bredd = 1 poäng.",
        ],
        result: "RESULTAT: POÄNG 0–9",

      },
    ],
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
        to: "/precision",
        number: "17",
        title: "Approach Precision Test",
        subtitle: "18 slag – 55 till 165 m",
        bullets: [
          "9 avstånd × 2 varv, mata in carry och sidled.",
          "Appen räknar ut längdfel, sidledsfel och avstånd till flaggan.",
        ],
        result: "RESULTAT: SNITT PROXIMITY + KONSISTENS",
      },
    ],
  },
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
      {
        to: "/pitch",
        number: "12",
        title: "Pitch",
        subtitle: "6 slag – 8 till 18 m",
        bullets: [
          "Sex pitchar från 8, 12, 16, 10, 14 och 18 meter.",
          "Mät avståndet till hålet i meter.",
        ],
        result: "RESULTAT: MÄT AVSTÅNDET TILL HÅLET I METER",
      },
      {
        to: "/chip",
        number: "13",
        title: "Chippar",
        subtitle: "6 slag – 8 till 18 m",
        bullets: [
          "Sex chippar från 8, 12, 16, 10, 14 och 18 meter.",
          "Mät avståndet till hålet i fot.",
        ],
        result: "RESULTAT: MÄT AVSTÅNDET TILL HÅLET I FOT",
      },
    ],
  },
  {
    slug: "puttning",
    title: "Puttning",
    subtitle: "På greenen",
    description: "Tester för längdkänsla och korta puttar.",
    tests: [
      {
        to: "/kortputt",
        number: "14",
        title: "Kortputt",
        subtitle: "12 puttar inom 1,5 m",
        bullets: [
          "4 puttar från vardera 0,5, 1,0 och 1,5 meter.",
          "Räkna isatta puttar per avstånd.",
        ],
        result: "RESULTAT: ANDEL ISATTA PUTTAR I %",
      },
      {
        to: "/tornado",
        number: "16",
        title: "Tornado drill",
        subtitle: "10 puttar runt hålet – 1, 2 och 3 m",
        bullets: [
          "3 puttar från 1 m, 4 från 2 m och 3 från 3 m i slumpad ordning.",
          "Ny position runt hålet varje putt. 10 poäng per isatt putt.",
        ],
        result: "RESULTAT: POÄNG 0–100",
      },
      {
        to: "/lagputt",
        number: "15",
        title: "Lagputt",
        subtitle: "6 puttar – 8 till 18 m",
        bullets: [
          "En putt från 8, 10, 12, 14, 16 och 18 meter.",
          "Allt inom 1 meter från hålet är godkänt.",
        ],
        result: "RESULTAT: ANDEL GODKÄNDA + SNITT KVAR",
      },
    ],
  },
];

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
