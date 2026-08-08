export type CategoryTest = {
  to:
    | "/bunker"
    | "/bunker-test"
    | "/speed"
    | "/speed-test"
    | "/longdrive"
    | "/fairway"
    | "/teeshot"
    | "/precision"
    | "/approach"
    | "/offtee-test"
    | "/offtee"
    | "/pitch"
    | "/chip"
    | "/narspel"
    | "/narspel-test"
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
        to: "/speed-test",
        number: "4",
        title: "Speed Test",
        subtitle: "6 drives – ball speed & Speed HCP",
        bullets: [
          "Ball speed obligatoriskt, club head speed valfritt per slag.",
          "Speed HCP kalibrerat mot verklig Trackman-data.",
        ],
        result: "RESULTAT: SPEED HCP + SMASH FACTOR",
      },
      {
        to: "/offtee-test",
        number: "18",
        title: "Off the Tee Test",
        subtitle: "6 drives mot samma fairway",
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
        subtitle: "Upptäck dina styrkor och vad som skapar fler birdiechanser.",
        bullets: [
          "9 avstånd × 2 varv, registrera carry och sidled med knappar.",
          "Resultat visas först när alla slag är klara.",
        ],
        result: "18 SLAG · 15 MIN · FÅ ETT HCP-RESULTAT",
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
        to: "/bunker-test",
        number: "3",
        title: "Bunkerslag",
        subtitle: "6 slag – ett per bunkerläge",
        bullets: [
          "Plant läge, uppförslut, nedförslut och tre svårare lägen.",
          "Registrera avstånd som ett intervall, eller att du inte kom upp.",
        ],
        result: "RESULTAT: BUNKER HCP + SPRIDNINGSBILD",
      },
      {
        to: "/narspel-test",
        number: "12",
        title: "Närspelstest",
        subtitle: "6 slag – 8 till 20 meter, fri teknik",
        bullets: [
          "Chip, pitch eller wedge – du väljer teknik, resultatet räknas.",
          "Registrera hur nära hålet bollen stannade som ett intervall.",
        ],
        result: "RESULTAT: NÄRSPEL HCP + SPRIDNINGSBILD",
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
        subtitle: "12 korta puttar – 1 till 3 meter",
        bullets: [
          "Mäter hur säkert du sätter korta, avgörande puttar.",
          "Score 0–100 och ett uppskattat handicap.",
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
