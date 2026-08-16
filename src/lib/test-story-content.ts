import type { TestStoryConfig } from "@/components/test-story";

/**
 * "Så fungerar testet"-innehåll för alla sju tester. Ren konfiguration,
 * ingen egen UI – TestHowItWorksLink/TestStoryModal (test-story.tsx)
 * renderar samma fyra generiska slides för alla. Siffror, avstånd och
 * registreringsalternativ är hämtade direkt ur respektive tests riktiga
 * implementation (lib/*.ts), inte påhittade.
 */

export const APPROACH_STORY: TestStoryConfig = {
  testId: "approach",
  what: {
    title: "TESTA DITT APPROACHSPEL",
    description:
      "5 slag från 5 avstånd mäter din precision och längdkontroll mot mål – från korta wedgeslag till längre inspel.",
    tags: ["50 m", "75 m", "100 m", "125 m", "150 m"],
  },
  how: {
    title: "ETT SLAG I TAGET",
    steps: ["AVSTÅND", "SLÅ", "REGISTRERA", "NÄSTA"],
    caption: "1 slag per avstånd, 5 totalt.",
  },
  register: {
    title: "VAR HAMNAR BOLLEN?",
    description: "Ange carry och hur mycket bollen landade till vänster eller höger om målet.",
    options: ["Carry (m)", "Vänster / höger", "Sidled (m)", "Auto-nästa"],
  },
  level: {
    title: "SE DIN APPROACH-NIVÅ",
    metricLabel: "Approach HCP",
    exampleValue: "7,4",
    progression: ["12,1", "9,8", "7,4"],
    caption: "Se vilken HCP-nivå ditt approachspel motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/approach",
};

export const OFFTEE_STORY: TestStoryConfig = {
  testId: "offtee",
  what: {
    title: "TESTA DIN DRIVE",
    description:
      "6 drives mot samma standardiserade fairway mäter längd, precision och jämnhet från tee.",
    tags: ["Simulator eller range", "6 slag"],
  },
  how: {
    title: "ETT SLAG I TAGET",
    steps: ["SLÅ", "REGISTRERA", "NÄSTA"],
    caption: "Samma fairway för alla sex slagen.",
  },
  register: {
    title: "VAR HAMNAR BOLLEN?",
    description: "Ange carry, totalt avstånd och hur mycket bollen gick till vänster eller höger.",
    options: ["Carry (m)", "Totalt (m)", "Vänster / höger", "Sidled (m)"],
  },
  level: {
    title: "SE DIN DRIVING-NIVÅ",
    metricLabel: "Driving HCP",
    exampleValue: "9,1",
    progression: ["14,3", "11,6", "9,1"],
    caption: "Se vilken HCP-nivå ditt spel från tee motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/offtee-test",
};

export const SPEED_STORY: TestStoryConfig = {
  testId: "speed",
  what: {
    title: "TESTA DIN BOLLHASTIGHET",
    description:
      "6 drives mäter din rena bollhastighet – oavsett teknik. Fart är en av de största faktorerna bakom längd från tee.",
    tags: ["Simulator eller range", "6 slag"],
  },
  how: {
    title: "ETT SLAG I TAGET",
    steps: ["SLÅ", "REGISTRERA", "NÄSTA"],
    caption: "Mät med samma maskin genom hela testet.",
  },
  register: {
    title: "HUR SNABB VAR BOLLEN?",
    description: "Ball speed är obligatoriskt. Club head speed kan du lägga till om du har det.",
    options: ["Ball speed (mph)", "Club speed (valfritt)"],
  },
  level: {
    title: "SE DIN SPEED-NIVÅ",
    metricLabel: "Speed HCP",
    exampleValue: "11,0",
    progression: ["18,4", "14,7", "11,0"],
    caption: "Se vilken HCP-nivå din bollhastighet motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/speed-test",
};

export const SHORTGAME_STORY: TestStoryConfig = {
  testId: "narspel",
  what: {
    title: "TESTA DITT NÄRSPEL",
    description:
      "6 slag från 8–20 meter. Chip eller pitch – fri teknik, putter är inte tillåten. Vi mäter hur nära du får bollen, inte hur du gör det.",
    tags: ["8 m", "10 m", "12 m", "15 m", "18 m", "20 m"],
  },
  how: {
    title: "ETT SLAG I TAGET",
    steps: ["AVSTÅND", "SLÅ", "REGISTRERA", "NÄSTA"],
    caption: "Fairway eller ruff – valfri teknik, bara resultatet räknas.",
  },
  register: {
    title: "HUR NÄRA HÅLET?",
    description: "Ange hur nära hålet bollen stannade som ett intervall.",
    options: ["Holed", "0–50 cm", "1–2 m", "2–3 m", "4–6 m", "6+ m"],
  },
  level: {
    title: "SE DIN NÄRSPELS-NIVÅ",
    metricLabel: "Närspel HCP",
    exampleValue: "8,2",
    progression: ["13,5", "10,9", "8,2"],
    caption: "Se vilken HCP-nivå ditt närspel motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/narspel-test",
};

export const BUNKER_STORY: TestStoryConfig = {
  testId: "bunker",
  what: {
    title: "TESTA DINA BUNKERSLAG",
    description: "6 likvärdiga bunkerslag mäter hur nära hålet du får bollen ur sanden.",
    tags: ["6 slag", "Fri teknik"],
  },
  how: {
    title: "ETT SLAG I TAGET",
    steps: ["LÄGG UPP", "SLÅ", "REGISTRERA", "NÄSTA"],
    caption: "Bollen läggs upp på nytt i bunkern inför varje slag.",
  },
  register: {
    title: "HUR NÄRA HÅLET?",
    description: "Ange hur nära hålet bollen stannade, eller att du inte kom upp ur bunkern.",
    options: ["Holed", "0–50 cm", "1–2 m", "2–3 m", "4–6 m", "Kom inte upp"],
  },
  level: {
    title: "SE DIN BUNKER-NIVÅ",
    metricLabel: "Bunker HCP",
    exampleValue: "13,6",
    progression: ["19,2", "16,4", "13,6"],
    caption: "Se vilken HCP-nivå dina bunkerslag motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/bunker-test",
};

export const SHORTPUTT_STORY: TestStoryConfig = {
  testId: "kortputt",
  what: {
    title: "TESTA DINA KORTA PUTTAR",
    description: "12 puttar från fyra riktningar runt hålet mäter din träffsäkerhet på 1–3 meter.",
    tags: ["1 m", "2 m", "3 m", "Klockan 12/3/6/9"],
  },
  how: {
    title: "EN PUTT I TAGET",
    steps: ["RIKTNING & AVSTÅND", "PUTTA", "REGISTRERA", "NÄSTA"],
    caption: "Rak eller lutande green väljer du innan du börjar.",
  },
  register: {
    title: "SATT ELLER MISSAD?",
    description: "Registrera bara om putten gick i eller inte – snabbt och enkelt.",
    options: ["Satt", "Missad"],
  },
  level: {
    title: "SE DIN PUTT-NIVÅ",
    metricLabel: "Short Putting HCP",
    exampleValue: "4,5",
    progression: ["8,0", "6,2", "4,5"],
    caption: "Se vilken HCP-nivå din kortputtning motsvarar.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/short-putting-test",
};

export const LAGPUTT_STORY: TestStoryConfig = {
  testId: "lagputt",
  what: {
    title: "TESTA DIN LAGPUTTNING",
    description:
      "6 långa puttar från 8–18 meter, i slumpad ordning varje gång, mäter din distanskontroll.",
    tags: ["8 m", "10 m", "12 m", "14 m", "16 m", "18 m"],
  },
  how: {
    title: "EN PUTT I TAGET",
    steps: ["AVSTÅND", "PUTTA", "REGISTRERA", "NÄSTA"],
    caption: "Gå en annan riktning från hålet varje gång.",
  },
  register: {
    title: "HUR NÄRA HÅLET?",
    description: "Ange hur många meter som var kvar till hålet – 0 om putten gick i.",
    options: ["Meter kvar", "0 = gick i", "Inom 1 m = godkänt"],
  },
  level: {
    title: "SE DIN LAGPUTT-NIVÅ",
    metricLabel: "Godkända puttar",
    exampleValue: "83%",
    progression: ["58%", "71%", "83%"],
    caption: "Räknas ihop med Short Putting Test till ditt totala Putting HCP.",
  },
  ctaLabel: "Gå till testet",
  ctaTo: "/lagputt",
};
