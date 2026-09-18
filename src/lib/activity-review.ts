/** Raw input stays separate from versioned analysis so calibration can be replayed. */
export const ACTIVITY_REVIEW_VERSION = 1;
export function isActivityComplete(phase: string) {
  return phase === "result" || phase === "summary";
}
export type ActivityOutcome = {
  label: string;
  result: string;
  quality?: "good" | "poor";
  context?: string;
};
export type ActivityReviewInput = {
  title: string;
  outcomes: ActivityOutcome[];
  handicap?: number | null;
  summary?: string;
  modelId?: string;
};

export function buildActivityReview(input: ActivityReviewInput) {
  return {
    ...input,
    version: ACTIVITY_REVIEW_VERSION,
    handicap:
      typeof input.handicap === "number" && Number.isFinite(input.handicap) ? input.handicap : null,
    good: input.outcomes.filter((row) => row.quality === "good").length,
    poor: input.outcomes.filter((row) => row.quality === "poor").length,
  };
}

const fieldLabels: Record<string, string> = {
  distance: "Startavstånd",
  distanceM: "Startavstånd",
  target: "Mål",
  distanceTarget: "Målavstånd",
  actual: "Slaglängd",
  total: "Totallängd",
  sidled: "Sidavvikelse",
  offline: "Sidavvikelse",
  direction: "Riktning",
  technique: "Teknik",
  longitudinal: "Längdavvikelse",
  longitudinalDirection: "Längdriktning",
  lateralDirection: "Sidoriktning",
  carry: "Carry",
  lateral: "Sidavvikelse",
  ballSpeed: "Bollhastighet",
  clubSpeed: "Klubbhastighet",
  points: "Poäng",
  score: "Poäng",
  strokes: "Puttar",
  putts: "Puttar",
  interval: "Resultatzon",
  zone: "Resultatzon",
  outcome: "Resultat",
  result: "Resultat",
  holed: "Sänkt",
  hit: "Träff",
  lie: "Läge",
  proximity: "Kvar till hål",
  remaining: "Kvar till hål",
  remainingDistance: "Kvar till hål",
  feet: "Fot till hål",
  percent: "Procent",
  deviation: "Avvikelse",
  landing: "Landning",
};
const values: Record<string, string> = {
  holed: "Sänkt",
  "not-out": "Kvar i bunkern",
  "0-50cm": "0–50 cm",
  "50cm-1m": "50 cm–1 m",
  "1-2m": "1–2 m",
  "2-3m": "2–3 m",
  "3-4m": "3–4 m",
  "4-6m": "4–6 m",
  "6m+": "Över 6 m",
  "under-1": "Under 1 m",
  "1-2": "1–2 m",
  "2-3": "2–3 m",
  "3-5": "3–5 m",
  "5-plus": "Över 5 m",
  fairway: "Fairway",
  rough: "Ruff",
  out: "Utanför",
  green: "Green",
  miss: "Miss",
  short: "Kort",
  long: "Lång",
  left: "Vänster",
  right: "Höger",
};
function display(value: unknown): string {
  return typeof value === "boolean"
    ? value
      ? "Ja"
      : "Nej"
    : typeof value === "number"
      ? String(Math.round(value * 100) / 100).replace(".", ",")
      : typeof value === "string"
        ? (values[value] ?? value)
        : "";
}

/** Unknown formats get factual results only, never an invented handicap/classification. */
export function rawActivityOutcomes(
  shots: readonly unknown[],
  labels?: readonly string[],
): ActivityOutcome[] {
  return shots.map((shot, index) => {
    const object = shot && typeof shot === "object" ? (shot as Record<string, unknown>) : null;
    const result = object
      ? Object.entries(fieldLabels)
          .flatMap(([field, label]) =>
            object[field] !== undefined && display(object[field])
              ? [`${label}: ${display(object[field])}`]
              : [],
          )
          .join(" · ")
      : display(shot);
    const hit =
      typeof shot === "boolean"
        ? shot
        : typeof object?.holed === "boolean"
          ? object.holed
          : typeof object?.hit === "boolean"
            ? object.hit
            : null;
    return {
      label: labels?.[index] ?? `Försök ${index + 1}`,
      result: result || "Resultat registrerat",
      quality: hit === null ? undefined : hit ? "good" : "poor",
    };
  });
}

export function scoredActivityOutcomes(
  shots: readonly number[],
  options: readonly { value: number; label: string }[],
  labels?: readonly string[],
): ActivityOutcome[] {
  return shots.map((value, index) => ({
    label: labels?.[index] ?? `Försök ${index + 1}`,
    result: options.find((option) => option.value === value)?.label ?? String(value),
  }));
}

export function shortGameReviewInput(
  title: string,
  shots: readonly { distance?: number; points: number; lie?: string }[],
  bunker = false,
): ActivityReviewInput {
  const zones = bunker
    ? ["Missad green", "På green", "Inom 3 m", "Inom 2 m", "Inom 1 m", "Sänkt"]
    : ["Utanför 5 m", "Inom 5 m", "Inom 3 m", "Inom 2 m", "Inom 1 m", "Sänkt"];
  return {
    title,
    modelId: "short-game-zones-v1",
    outcomes: shots.map((shot, index) => ({
      label: `Slag ${index + 1}`,
      context: [shot.distance !== undefined ? `${shot.distance} m` : "", shot.lie ?? ""]
        .filter(Boolean)
        .join(" · "),
      result: zones[shot.points] ?? `${shot.points} poäng`,
      quality: shot.points >= 3 ? "good" : shot.points === 0 ? "poor" : undefined,
    })),
  };
}
