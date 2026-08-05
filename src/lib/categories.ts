export type CategoryTest = {
  to:
    | "/bunker"
    | "/speed"
    | "/longdrive"
    | "/fairway"
    | "/teeshot"
    | "/precision"
    | "/approach"
    | "/offtee-test"
    | "/offtee"
    | "/pitch"
    | "/chip"
    | "/kortputt"
    | "/short-putting-test"
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
    title: "Off the Tee",
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
        to: "/offtee-test",
        number: "18",
        title: "Off the Tee Test",
        subtitle: "12 drives mot samma fairway",
        bullets: [
          "Bara carry, totalt avstånd och sidled per slag – ingen klubba.",
          "Driving Handicap kalibrerat mot verklig speldata.",
        ],
        result: "RESULTAT: OFF THE TEE SCORE 0–100 + DRIVING HCP",
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
        to: "/approach",
        number: "17",
        title: "Approach Test",
        subtitle: "18 slag – 55 till 165 m",
        bullets: [
          "9 avstånd × 2 varv, registrera carry och sidled med knappar.",
          "Resultat visas först när alla slag är klara.",
        ],
        result: "RESULTAT: APPROACH SCORE 0–100 + EST. HCP",
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
        to: "/short-putting-test",
        number: "14",
        title: "Short Putting Test",
        subtitle: "24 puttar – 4 riktningar × 1–3 m, 2 varv",
        bullets: [
          "Klockan 12, 3, 6 och 9 – en putt vardera från 1, 2 och 3 meter.",
          "Satta puttar viktas efter avstånd (2/3/4 poäng), max 36.",
        ],
        result: "RESULTAT: SCORE 0–100 + EST. HCP-INTERVALL",
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
