export type ShotValueLevel = "hcp20" | "hcp10" | "scratch" | "tour";
export type ShotValueCategory = "offtee" | "approach" | "around" | "putting";

export type ShotValueResult = {
  level: ShotValueLevel;
  label: string;
  value: number;
};

export type SavedShotReference = {
  id: string;
  category: "putting";
  startDistanceM: number;
  holed: boolean;
  remainingDistanceM: number;
  count: number;
  createdAt: string;
};

export type ShotValueScenario = {
  id: string;
  category: ShotValueCategory;
  title: string;
  situation: string;
  goodLabel: string;
  badLabel: string;
  difference: [number, number];
  roundImpact?: [number, number];
  takeaway: string;
  benchmarkNote: string;
};

export const SHOT_VALUE_STORAGE_KEY = "sg4:shot-value:references:v1";

export const SHOT_VALUE_LEVELS: Array<{ key: ShotValueLevel; label: string }> = [
  { key: "hcp20", label: "HCP 20" },
  { key: "hcp10", label: "HCP 10" },
  { key: "scratch", label: "Scratch" },
  { key: "tour", label: "Tour" },
];

export const SHOT_VALUE_SCENARIOS: ShotValueScenario[] = [
  {
    id: "ott-fairway-penalty",
    category: "offtee",
    title: "Tee shot · spelbar vs problem",
    situation: "Samma hål, samma längd från tee",
    goodLabel: "Fairway / bra vinkel",
    badLabel: "Recovery eller pliktrisk",
    difference: [0.5, 1.2],
    roundImpact: [2, 5],
    takeaway: "Att hålla bollen spelbar är ofta mycket mer värt än några extra meter.",
    benchmarkNote: "Bred SG4-referens · exakt värde beror på distans och lie",
  },
  {
    id: "ott-fairway-rough",
    category: "offtee",
    title: "Fairway vs lätt ruff",
    situation: "Bra drive men olika lie",
    goodLabel: "Fairway",
    badLabel: "Lätt ruff",
    difference: [0.1, 0.3],
    roundImpact: [1, 3],
    takeaway: "Små lägesfördelar är små per hål men kan bli tydliga över en rond.",
    benchmarkNote: "Bred SG4-referens",
  },
  {
    id: "approach-safe-shortside",
    category: "approach",
    title: "Miss på säkra sidan vs short-side",
    situation: "Samma approach, två olika missar",
    goodLabel: "Far side · mycket green",
    badLabel: "Short-side · lite green",
    difference: [0.3, 0.7],
    roundImpact: [2, 4],
    takeaway: "Säkra sidan ger ofta ett mycket enklare nästa slag även om båda missarna är lika långt från pin.",
    benchmarkNote: "Bred SG4-referens · educational range",
  },
  {
    id: "approach-fairway-rough-150",
    category: "approach",
    title: "150 m · fairway vs ruff",
    situation: "Samma avstånd till pin",
    goodLabel: "150 m från fairway",
    badLabel: "150 m från ruff",
    difference: [0.2, 0.5],
    roundImpact: [1, 3],
    takeaway: "Samma meter betyder inte samma svårighetsgrad. Lie ändrar värdet på nästa slag.",
    benchmarkNote: "Bred SG4-referens",
  },
  {
    id: "around-bunker-shortside",
    category: "around",
    title: "Par 3-miss · bunker",
    situation: "Båda missarna hamnar greenside",
    goodLabel: "Far side · mycket green",
    badLabel: "Short-sided bunker",
    difference: [0.4, 0.8],
    roundImpact: [2, 4],
    takeaway: "Short-sided bunker kan kosta nästan ett helt slag mer än en miss med green att arbeta med.",
    benchmarkNote: "Bred SG4-referens · exakt värde beror på lie, avstånd och green",
  },
  {
    id: "around-chip-shortside",
    category: "around",
    title: "Chip · long-side vs short-side",
    situation: "Liknande avstånd från green",
    goodLabel: "Mycket green att jobba med",
    badLabel: "Kort om landningsyta",
    difference: [0.2, 0.6],
    roundImpact: [1, 3],
    takeaway: "Placeringen av missen kan vara viktigare än själva missavståndet.",
    benchmarkNote: "Bred SG4-referens",
  },
  {
    id: "putt-2m-make-miss",
    category: "putting",
    title: "2 m putt · sänkt vs miss",
    situation: "Kortputt där utfallet förändrar hålet direkt",
    goodLabel: "Sänkt",
    badLabel: "Miss · 1 m kvar",
    difference: [0.8, 1.1],
    roundImpact: [2, 4],
    takeaway: "En missad kortputt kostar mycket mer än den känns eftersom du både missar chansen och fortfarande har ett slag kvar.",
    benchmarkNote: "Putting bygger på SG4 expected-putts v1",
  },
  {
    id: "putt-lag-10m",
    category: "putting",
    title: "10 m lag putt",
    situation: "Samma startläge, olika fartkontroll",
    goodLabel: "50–60 cm kvar",
    badLabel: "2 m kvar",
    difference: [0.2, 0.5],
    roundImpact: [1, 3],
    takeaway: "Bra fartkontroll ser liten ut på ett slag men minskar risken för treputtar under rundan.",
    benchmarkNote: "Putting bygger på SG4 expected-putts v1",
  },
];

// SG4 reference model v1. Values are expected putts, intentionally rounded and
// displayed as approximate guidance rather than false precision. The table is
// isolated here so it can later be replaced by validated SG4 population data.
const EXPECTED_PUTTS: Record<ShotValueLevel, Array<[number, number]>> = {
  hcp20: [[0,0],[0.3,1.02],[0.6,1.08],[0.9,1.18],[1.2,1.30],[1.5,1.42],[2,1.58],[3,1.78],[4,1.90],[5,1.99],[7.5,2.10],[10,2.18],[15,2.28],[20,2.36],[25,2.43]],
  hcp10: [[0,0],[0.3,1.01],[0.6,1.05],[0.9,1.12],[1.2,1.22],[1.5,1.33],[2,1.48],[3,1.68],[4,1.81],[5,1.90],[7.5,2.01],[10,2.09],[15,2.19],[20,2.27],[25,2.34]],
  scratch: [[0,0],[0.3,1.00],[0.6,1.03],[0.9,1.08],[1.2,1.16],[1.5,1.26],[2,1.40],[3,1.60],[4,1.73],[5,1.82],[7.5,1.93],[10,2.01],[15,2.11],[20,2.19],[25,2.26]],
  tour: [[0,0],[0.3,1.00],[0.6,1.01],[0.9,1.04],[1.2,1.10],[1.5,1.20],[2,1.35],[3,1.55],[4,1.68],[5,1.76],[7.5,1.87],[10,1.94],[15,2.03],[20,2.10],[25,2.17]],
};

export function expectedPutts(level: ShotValueLevel, distanceM: number) {
  const d = Math.max(0, Number.isFinite(distanceM) ? distanceM : 0);
  const points = EXPECTED_PUTTS[level];
  if (d <= points[0][0]) return points[0][1];
  if (d >= points[points.length - 1][0]) {
    const [x1,y1] = points[points.length - 2];
    const [x2,y2] = points[points.length - 1];
    return y2 + (d - x2) * ((y2 - y1) / (x2 - x1));
  }
  for (let i = 1; i < points.length; i += 1) {
    const [x2,y2] = points[i];
    if (d <= x2) {
      const [x1,y1] = points[i - 1];
      const t = (d - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  return points[points.length - 1][1];
}

export function puttingShotValue(startDistanceM: number, holed: boolean, remainingDistanceM: number, level: ShotValueLevel) {
  const before = expectedPutts(level, startDistanceM);
  const after = holed ? 0 : expectedPutts(level, remainingDistanceM);
  return before - 1 - after;
}

export function comparePuttingShot(startDistanceM: number, holed: boolean, remainingDistanceM: number): ShotValueResult[] {
  return SHOT_VALUE_LEVELS.map(({ key, label }) => ({
    level: key,
    label,
    value: puttingShotValue(startDistanceM, holed, remainingDistanceM, key),
  }));
}

export function approximateShotLevel(results: ShotValueResult[]) {
  return [...results].sort((a,b) => Math.abs(a.value) - Math.abs(b.value))[0] ?? null;
}

export function shotValueLabel(value: number) {
  if (value > 0.3) return "Mycket bra";
  if (value > 0.1) return "Bra";
  if (value >= -0.1) return "Normalt";
  if (value >= -0.3) return "Kostsamt";
  return "Mycket kostsamt";
}

export function formatRange(range: [number, number]) {
  return `${String(range[0]).replace(".", ",")}–${String(range[1]).replace(".", ",")}`;
}

export function roundImpactText(scenario: ShotValueScenario) {
  if (!scenario.roundImpact) return null;
  return `Om det här mönstret upprepas under en rond kostar det oftast ungefär ${formatRange(scenario.roundImpact)} slag.`;
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function referenceKey(startDistanceM: number, holed: boolean, remainingDistanceM: number) {
  return `putting:${roundHalf(startDistanceM)}:${holed ? "holed" : roundHalf(remainingDistanceM)}`;
}

export function loadSavedShotReferences(): SavedShotReference[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOT_VALUE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShotReference(startDistanceM: number, holed: boolean, remainingDistanceM: number) {
  if (typeof window === "undefined") return [] as SavedShotReference[];
  const current = loadSavedShotReferences();
  const key = referenceKey(startDistanceM, holed, remainingDistanceM);
  const existing = current.find((item) => referenceKey(item.startDistanceM, item.holed, item.remainingDistanceM) === key);
  const next = existing
    ? current.map((item) => item.id === existing.id ? { ...item, count: item.count + 1 } : item)
    : [...current, {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
        category: "putting" as const,
        startDistanceM: roundHalf(startDistanceM),
        holed,
        remainingDistanceM: holed ? 0 : roundHalf(remainingDistanceM),
        count: 1,
        createdAt: new Date().toISOString(),
      }];
  localStorage.setItem(SHOT_VALUE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteShotReference(id: string) {
  if (typeof window === "undefined") return [] as SavedShotReference[];
  const next = loadSavedShotReferences().filter((item) => item.id !== id);
  localStorage.setItem(SHOT_VALUE_STORAGE_KEY, JSON.stringify(next));
  return next;
}
