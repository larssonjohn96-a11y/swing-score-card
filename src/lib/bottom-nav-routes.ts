import { normalizeHeaderPath } from "@/lib/hub-header";

export const BOTTOM_TABS = [
  { id: "home", to: "/", label: "Hem" },
  { id: "tests", to: "/spela-runda", label: "Testa" },
  { id: "games", to: "/spel", label: "Spel" },
  { id: "match", to: "/spela", label: "Match" },
  { id: "analysis", to: "/utveckling", label: "Analys" },
] as const;

export type BottomTabId = (typeof BOTTOM_TABS)[number]["id"];

const TEST_PATHS = new Set([
  "/spela-runda", "/speedrundan", "/driverrundan", "/inspelsrundan", "/puttrundan", "/chipprundan", "/bunkerrundan",
  "/standardiserade-tester", "/tester", "/hcp-tests", "/offtee-test", "/approach", "/putting", "/narspel-test", "/bunker-test", "/speed-test",
]);

export function activeBottomTab(pathname: string): BottomTabId {
  const path = normalizeHeaderPath(pathname.split(/[?#]/)[0] ?? "/");
  if (path === "/spel" || path.startsWith("/spel/")) return "games";
  if (path === "/spela" || path.startsWith("/match")) return "match";
  if (path.startsWith("/utveckling") || path.startsWith("/jamfor") || path.startsWith("/framsteg")) return "analysis";
  if (TEST_PATHS.has(path) || path.startsWith("/kategori/")) return "tests";
  return "home";
}

const TRAINING_FLOW_PATHS = new Set([
  "/traning-scroll", "/traning", "/traning-progress", "/speed", "/longdrive", "/fairway-streak", "/driver-konsekvens",
  "/approach-pei-valj", "/approach-pei", "/approach-pei-wedge", "/approach-pei-iron", "/shot-shaping", "/8-bollar", "/upp-och-in",
  "/bunker-traning", "/putting-streak", "/lagputt-ladder", "/klock-putt", "/pga-tour-18-puttar", "/50-bollar", "/lagputt", "/tutor-test",
  "/green-reading", "/putting-data", "/50-bollar-resultat", "/8-bollar-historik", "/lagputt-historik", "/driver-konsekvens-historik",
  "/green-reading-historik", "/pga-tour-18-puttar-historik", "/tutor-test-historik", "/approach-pei-historik", "/approach-pei-wedge-historik",
  "/approach-pei-iron-historik", "/shot-shaping-9-window-historik", "/shot-shaping-konstant-historik", "/shot-shaping-vaxlande-historik", "/wedge-stege-historik",
]);

/** Only full-screen activity routes are excluded; analysis belongs to the main navigation. */
export function hideBottomNavOnRoute(pathname: string): boolean {
  const path = normalizeHeaderPath(pathname.split(/[?#]/)[0] ?? "/");
  return path.startsWith("/match") || path.startsWith("/learn") ||
    TRAINING_FLOW_PATHS.has(path) || path.startsWith("/shot-shaping-");
}