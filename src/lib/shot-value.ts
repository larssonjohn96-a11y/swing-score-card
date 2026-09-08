export type ShotValueLevel = "hcp20" | "hcp10" | "scratch" | "tour";
export type ShotValueCategory = "offtee" | "approach" | "around" | "putting";
export type ShotValueLie = "tee" | "fairway" | "rough" | "bunker" | "recovery" | "green" | "penalty";
export type ShotValueSource = "sg4" | "external" | "external-model" | "model";

export type ShotValueResult = {
  level: ShotValueLevel;
  label: string;
  value: number;
};

export type ExpectedStrokePoint = {
  distanceM: number;
  expectedStrokes: number;
  source: ShotValueSource;
  sampleSize?: number;
  confidence?: "low" | "medium" | "high";
  note?: string;
};

export type ExpectedStrokeTable = Partial<
  Record<ShotValueCategory, Partial<Record<ShotValueLevel, Partial<Record<ShotValueLie, ExpectedStrokePoint[]>>>>>
>;

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
    benchmarkNote: "Putting bygger på SG4 expected-strokes-modell",
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
    benchmarkNote: "Putting bygger på SG4 expected-strokes-modell",
  },
];

const p = (
  distanceM: number,
  expectedStrokes: number,
  source: ShotValueSource = "model",
  confidence: ExpectedStrokePoint["confidence"] = "medium",
  note?: string,
): ExpectedStrokePoint => ({ distanceM, expectedStrokes, source, confidence, note });

/**
 * Generic expected-strokes store.
 *
 * Shape: [category][level][lie][distance].
 * Only putting/green is populated today. Around-the-green, approach and off-the-tee
 * can be added without changing the lookup/calculation API.
 *
 * HCP10 contains two externally published Arccos/Lou Stagner anchors:
 * - 5 ft (~1.52 m): a 2-putt loses 0.52 strokes => baseline ~1.48 expected strokes.
 * - 60 ft (~18.29 m): a 2-putt gains 0.49 strokes => baseline ~2.49 expected strokes.
 * Remaining points are SG4 model points and should be replaced/calibrated as stronger
 * licensed/public or SG4 population data becomes available.
 */
export const EXPECTED_STROKES: ExpectedStrokeTable = {
  putting: {
    hcp20: {
      green: [
        p(0, 0), p(0.3, 1.02), p(0.6, 1.08), p(0.9, 1.18), p(1.2, 1.30), p(1.5, 1.42),
        p(2, 1.58), p(3, 1.78), p(4, 1.90), p(5, 1.99), p(7.5, 2.10), p(10, 2.18), p(15, 2.28), p(20, 2.36), p(25, 2.43),
      ],
    },
    hcp10: {
      green: [
        p(0, 0), p(0.3, 1.01), p(0.6, 1.05), p(0.9, 1.12), p(1.2, 1.22),
        p(1.524, 1.48, "external", "high", "Arccos/Lou Stagner: 5 ft two-putt = -0.52 SG vs HCP10"),
        p(2, 1.58, "external-model", "medium"), p(3, 1.76, "external-model", "medium"),
        p(5, 1.95, "external-model", "medium"), p(7.5, 2.08, "external-model", "medium"),
        p(10, 2.18, "external-model", "medium"), p(15, 2.38, "external-model", "medium"),
        p(18.288, 2.49, "external", "high", "Arccos/Lou Stagner: 60 ft two-putt = +0.49 SG vs HCP10"),
        p(20, 2.53, "external-model", "medium"), p(25, 2.62, "external-model", "low"),
      ],
    },
    scratch: {
      green: [
        p(0, 0), p(0.3, 1.00), p(0.6, 1.03), p(0.9, 1.08), p(1.2, 1.16), p(1.5, 1.26),
        p(2, 1.40), p(3, 1.60), p(4, 1.73), p(5, 1.82), p(7.5, 1.93), p(10, 2.01), p(15, 2.11), p(20, 2.19), p(25, 2.26),
      ],
    },
    tour: {
      green: [
        p(0, 0), p(0.3, 1.00), p(0.6, 1.01), p(0.9, 1.04), p(1.2, 1.10), p(1.5, 1.20),
        p(2, 1.35), p(3, 1.55), p(4, 1.68), p(5, 1.76), p(7.5, 1.87), p(10, 1.94), p(15, 2.03), p(20, 2.10), p(25, 2.17),
      ],
    },
  },
};

export function getExpectedStrokePoints(category: ShotValueCategory, level: ShotValueLevel, lie: ShotValueLie) {
  return EXPECTED_STROKES[category]?.[level]?.[lie] ?? null;
}

export function expectedStrokes(
  category: ShotValueCategory,
  level: ShotValueLevel,
  lie: ShotValueLie,
  distanceM: number,
) {
  const points = getExpectedStrokePoints(category, level, lie);
  if (!points?.length) return null;

  const d = Math.max(0, Number.isFinite(distanceM) ? distanceM : 0);
  if (d <= points[0].distanceM) return points[0].expectedStrokes;

  if (d >= points[points.length - 1].distanceM) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    return b.expectedStrokes + (d - b.distanceM) * ((b.expectedStrokes - a.expectedStrokes) / (b.distanceM - a.distanceM));
  }

  for (let i = 1; i < points.length; i += 1) {
    const b = points[i];
    if (d <= b.distanceM) {
      const a = points[i - 1];
      const t = (d - a.distanceM) / (b.distanceM - a.distanceM);
      return a.expectedStrokes + (b.expectedStrokes - a.expectedStrokes) * t;
    }
  }

  return points[points.length - 1].expectedStrokes;
}

export function expectedPutts(level: ShotValueLevel, distanceM: number) {
  return expectedStrokes("putting", level, "green", distanceM) ?? 0;
}

export function shotValue(
  before: { category: ShotValueCategory; level: ShotValueLevel; lie: ShotValueLie; distanceM: number },
  after: { category: ShotValueCategory; lie: ShotValueLie; distanceM: number } | null,
) {
  const beforeValue = expectedStrokes(before.category, before.level, before.lie, before.distanceM);
  if (beforeValue == null) return null;
  if (after == null) return beforeValue - 1;

  const afterValue = expectedStrokes(after.category, before.level, after.lie, after.distanceM);
  if (afterValue == null) return null;
  return beforeValue - 1 - afterValue;
}

export function puttingShotValue(startDistanceM: number, holed: boolean, remainingDistanceM: number, level: ShotValueLevel) {
  return shotValue(
    { category: "putting", level, lie: "green", distanceM: startDistanceM },
    holed ? null : { category: "putting", lie: "green", distanceM: remainingDistanceM },
  ) ?? 0;
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
