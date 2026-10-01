/** Shared by the test hub and the actual test starts. Distances are metres. */
export type DistanceTestMode = "total" | "short" | "medium" | "long";
export type DistanceTestFamily = "approach" | "putting";
export type DistanceTestDefinition = {
  readonly mode: DistanceTestMode;
  readonly label: string;
  readonly title: string;
  readonly targets: readonly number[];
  readonly range: string;
};

const modeLabels: Record<DistanceTestMode, string> = {
  total: "Alla längder", short: "Korta", medium: "Medel", long: "Långa",
};

export function distanceRange(targets: readonly number[]): string {
  if (!targets.length) return "–";
  const format = (value: number) => String(value).replace(".", ",");
  return `${format(Math.min(...targets))}–${format(Math.max(...targets))} m`;
}

function define(mode: DistanceTestMode, title: string, targets: readonly number[]): DistanceTestDefinition {
  return Object.freeze({ mode, label: modeLabels[mode], title, targets: Object.freeze([...targets]), range: distanceRange(targets) });
}

/**
 * SG4's practical metre bands, not an official universal golf classification.
 * See docs/hcp-distance-tests.md for research and the choice of boundaries.
 * Every approach target is a multiple of 10. Six shots in each mode.
 */
export const APPROACH_TESTS: readonly DistanceTestDefinition[] = Object.freeze([
  define("total", "Inspel totalt", [50, 80, 110, 140, 160, 180]),
  define("short", "Korta inspel", [50, 60, 70, 80, 90, 100]),
  define("medium", "Medellånga inspel", [110, 120, 130, 140, 120, 130]),
  define("long", "Långa inspel", [150, 160, 170, 180, 160, 170]),
]);

/** Keep the existing putting distances and smart-shuffle inputs unchanged. */
export const PUTTING_TESTS: readonly DistanceTestDefinition[] = Object.freeze([
  define("total", "Putting totalt", [1, 1.5, 2, 1.5, 3, 5, 7, 10, 18]),
  define("short", "Korta puttar", [1, 1.5, 2, 1, 1.5, 2]),
  define("medium", "Medellånga puttar", [3, 5, 7, 4, 6, 3]),
  define("long", "Långa puttar", [8, 12, 16, 10, 16, 18]),
]);

export function distanceTests(family: DistanceTestFamily): readonly DistanceTestDefinition[] {
  return family === "approach" ? APPROACH_TESTS : PUTTING_TESTS;
}

export function isDistanceTestMode(value: unknown): value is DistanceTestMode {
  return value === "total" || value === "short" || value === "medium" || value === "long";
}

export function getDistanceTest(family: DistanceTestFamily, mode: unknown): DistanceTestDefinition {
  const tests = distanceTests(family);
  return tests.find((test) => test.mode === mode) ?? tests[0];
}

export const FAVORITES_KEY = "sg4-game-favorites-v1";
export const FAVORITES_CHANGED = "sg4-game-favorites-changed";
export const distanceTestPath = (family: DistanceTestFamily) => family === "approach" ? "/inspelsrundan" as const : "/puttrundan" as const;
export const distanceFavoriteId = (family: DistanceTestFamily, mode: DistanceTestMode) => `${distanceTestPath(family)}?mode=${mode}`;

export function normalizeTestFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string").map((id) =>
    id === "/inspelsrundan" || id === "/puttrundan" ? `${id}?mode=total` : id,
  ))];
}

export function readTestFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try { return normalizeTestFavorites(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]")); }
  catch { return []; }
}

export type HcpHubCard = {
  readonly to: "/speedrundan" | "/driverrundan" | "/inspelsrundan" | "/puttrundan" | "/chipprundan" | "/bunkerrundan";
  readonly title: string;
  readonly subtitle: string;
  readonly image: string;
  readonly section: "Utslag" | "Inspel" | "Putting" | "Närspel";
  readonly mode?: DistanceTestMode;
};

function distanceCard(family: DistanceTestFamily, test: DistanceTestDefinition): HcpHubCard {
  const section = family === "approach" ? "Inspel" : "Putting";
  return {
    to: distanceTestPath(family), mode: test.mode, section,
    title: test.mode === "total" ? section : test.title,
    subtitle: `${test.range} · ${test.targets.length} ${family === "approach" ? "slag" : "hål"}`,
    image: family === "approach" ? "/Approach_shot.png" : "/Putting_1.png",
  };
}

export const HCP_MAIN_TESTS: readonly HcpHubCard[] = [
  { to: "/speedrundan", title: "Ball Speed", subtitle: "Bollhastighet med driver", image: "/Off_the_tee.png", section: "Utslag" },
  { to: "/driverrundan", title: "Driver", subtitle: "Längd och precision", image: "/Off_the_tee.png", section: "Utslag" },
  distanceCard("approach", getDistanceTest("approach", "total")),
  distanceCard("putting", getDistanceTest("putting", "total")),
  { to: "/chipprundan", title: "Chipping", subtitle: "Precision runt green", image: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png", section: "Närspel" },
  { to: "/bunkerrundan", title: "Bunker", subtitle: "Från sand till green", image: "/bunker-round.svg", section: "Närspel" },
];

/** Variants are shortcuts, not extra primary tests. Old favorites keep working. */
export const HCP_FAVORITE_TESTS: readonly HcpHubCard[] = [
  ...HCP_MAIN_TESTS,
  ...APPROACH_TESTS.filter((test) => test.mode !== "total").map((test) => distanceCard("approach", test)),
  ...PUTTING_TESTS.filter((test) => test.mode !== "total").map((test) => distanceCard("putting", test)),
];
export const hubFavoriteId = (card: HcpHubCard) => card.mode ? `${card.to}?mode=${card.mode}` : card.to;
