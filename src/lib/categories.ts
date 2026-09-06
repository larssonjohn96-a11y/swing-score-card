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
    | "/lagputt"
    | "/lagputt-test"
    | "/putting"
    | "/50-bollar";

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
    description: "Hur bra du presterar från tee – längd, riktning och bollen i spel.",
    tests: [
      {
        to: "/offtee-test",
        number: "18",
        title: "Off the Tee Test",
        subtitle:
          "Ett snabbt nivåtest av ditt spel från tee. Resultatet bygger på hur långt och hur rakt du slår, och hur ofta du håller bollen i spel.",
        bullets: [
          "Carry, totalt avstånd och sidled per slag.",
          "Ger ett Driving HCP som ingår i ditt totala SG4 HCP.",
        ],
        result: "RESULTAT: DRIVING HCP",
      },
    ],
  },
  {
    slug: "approach",
    title: "Approach",
    subtitle: "Inspel mot green",
    description: "Din aktuella nivå på inspel mot green.",
    tests: [
      {
        to: "/approach",
        number: "9",
        title: "Approach Test",
        subtitle:
          "Nio inspel över nio avstånd. Ett snabbt test som visar vilken Approach-HCP din precision motsvarar just nu.",
        bullets: [
          "9 avstånd från 55 till 165 meter, ett slag per avstånd.",
          "Registrera carry och sidled – resultatet visas först när testet är klart.",
        ],
        result: "RESULTAT: APPROACH HCP",
      },
    ],
  },
  {
    slug: "around-the-green",
    title: "Around the Green",
    subtitle: "Shortgame",
    description: "Din aktuella nivå runt green, inklusive bunker.",
    tests: [
      {
        to: "/bunker-test",
        number: "3",
        title: "Bunkerslag",
        subtitle:
          "Bunkerspel handlar om att komma upp ur sanden med kontroll och lämna bollen nära hålet.",
        bullets: [
          "Ingen teknik väljs – bara resultatet räknas.",
          "Bunkerresultatet är en del av Around the Green HCP.",
        ],
        result: "RESULTAT: BUNKER HCP",
      },
      {
        to: "/narspel-test",
        number: "12",
        title: "Närspelstest",
        subtitle:
          "Chip, pitch eller wedge – tekniken är fri. Testet mäter bara hur nära flaggan du kommer.",
        bullets: [
          "Registrera hur nära hålet bollen stannade.",
          "Resultatet är den andra delen av Around the Green HCP.",
        ],
        result: "RESULTAT: NÄRSPEL HCP",
      },
    ],
  },
  {
    slug: "puttning",
    title: "Putting",
    subtitle: "På greenen",
    description: "En snabb ögonblicksbild av din puttingnivå.",
    tests: [
      {
        to: "/putting",
        number: "10",
        title: "Putting Test",
        subtitle:
          "Ett snabbt HCP-test som kombinerar säkerhet på korta puttar med längdkontroll på lagputtar.",
        bullets: [
          "6 korta puttar: två från 1, 2 och 3 meter.",
          "4 lagputtar från 8, 12, 16 och 18 meter – registrera antal puttar tills bollen är hålad.",
        ],
        result: "RESULTAT: PUTTING HCP",
      },
    ],
  },
];

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
