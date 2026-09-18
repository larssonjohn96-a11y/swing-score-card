/** Raw input stays separate from versioned analysis so calibration can be replayed. */
export const ACTIVITY_REVIEW_VERSION = 2;
export const ACTIVITY_CATEGORIES = ["Exceptionellt", "Utmärkt", "Bra", "Förväntat", "Svagt", "Stort tapp"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export function isActivityComplete(phase: string) {
  return phase === "result" || phase === "summary";
}
export type ActivityOutcome = {
  label: string;
  result: string;
  quality?: "good" | "poor";
  context?: string;
  category?: ActivityCategory;
  /** Lower is better; comparable only within this activity's model. */
  rank?: number;
  basis?: string;
};
export type ActivityReviewInput = {
  title: string;
  outcomes: ActivityOutcome[];
  handicap?: number | null;
  summary?: string;
  modelId?: string;
};

export function buildActivityReview(input: ActivityReviewInput) {
  const outcomes = input.outcomes.map(row => ({
    ...row,
    category: row.category ?? (row.quality === "good" ? "Bra" : row.quality === "poor" ? "Svagt" : undefined),
  }));
  const ranked = outcomes.filter(row => row.category && typeof row.rank === "number" && Number.isFinite(row.rank));
  const best = [...ranked].sort((a, b) => a.rank! - b.rank!)[0];
  const worst = [...ranked].sort((a, b) => b.rank! - a.rank!)[0];
  return {
    ...input,
    outcomes,
    best,
    worst: worst && (worst.category === "Svagt" || worst.category === "Stort tapp") ? worst : undefined,
    counts: ACTIVITY_CATEGORIES.map(category => ({ category, count: outcomes.filter(row => row.category === category).length })),
    version: ACTIVITY_REVIEW_VERSION,
    handicap:
      typeof input.handicap === "number" && Number.isFinite(input.handicap) ? input.handicap : null,
    good: outcomes.filter(row => row.category && ACTIVITY_CATEGORIES.indexOf(row.category) <= 2).length,
    poor: outcomes.filter(row => row.category && ACTIVITY_CATEGORIES.indexOf(row.category) >= 4).length,
  };
}

/** Provisional, versioned rules; these classify outcomes, not official HCP or strokes gained. */
function classifyRaw(object: Record<string, unknown> | null): Partial<ActivityOutcome> {
  if (!object) return {};
  const zoneRanks: Record<string, number> = {
    holed: 0, "0-50cm": 1, "50cm-1m": 1, "under-1": 1,
    "1-2m": 2, "1-2": 2, "2-3m": 3, "2-3": 3,
    "3-4m": 4, "4-6m": 4, "3-5": 4, "6m+": 5, "5-plus": 5, "not-out": 5,
  };
  const zone = object.interval ?? object.zone;
  if (typeof zone === "string" && Object.hasOwn(zoneRanks, zone)) {
    const rank = zoneRanks[zone];
    return { category: ACTIVITY_CATEGORIES[rank], rank, basis: "Bedömt efter registrerad resultatzon. Startavstånd och läge är ännu inte viktade." };
  }
  const number = (key: string) => typeof object[key] === "number" && Number.isFinite(object[key]) ? object[key] as number : undefined;
  const distance = number("target") ?? number("distance");
  const carry = number("carry") ?? number("actualDistance") ?? number("actual");
  const offline = number("offline") ?? (object.side === "center" ? 0 : number("lateral"));
  const feet = number("feet");
  const remaining = feet !== undefined ? feet * 0.3048 : number("proximity");
  let error = remaining;
  if (number("target") !== undefined && carry !== undefined && offline !== undefined) {
    error = Math.hypot(carry - number("target")!, offline);
  }
  if (distance !== undefined && distance > 0 && error !== undefined && error >= 0) {
    const ratio = error / distance;
    const index = ratio <= .02 ? 0 : ratio <= .05 ? 1 : ratio <= .1 ? 2 : ratio <= .2 ? 3 : ratio <= .35 ? 4 : 5;
    return { category: ACTIVITY_CATEGORIES[index], rank: ratio, basis: `Kvar till mål: ${error.toFixed(1)} m · ${Math.round(ratio * 100)} % av startavståndet.` };
  }
  const total = number("total");
  const sidled = number("sidled");
  if (total !== undefined && total > 0 && sidled !== undefined) {
    const ratio = Math.abs(sidled) / total;
    const index = ratio <= .015 ? 0 : ratio <= .03 ? 1 : ratio <= .05 ? 2 : ratio <= .075 ? 3 : ratio <= .11 ? 4 : 5;
    return { category: ACTIVITY_CATEGORIES[index], rank: ratio, basis: `Riktningsprecision: ${Math.abs(sidled)} m sidled på ${total} m. Bedömer riktning, inte slaglängdens kvalitet.` };
  }
  if (typeof object.hit === "boolean") return { category: object.hit ? "Bra" : "Svagt", rank: object.hit ? 0 : 1, basis: "Baserat på registrerad träff eller miss. Avvikelsens storlek saknas." };
  return {};
}

const fieldLabels: Record<string, string> = {
  distance: "Startavstånd",
  distanceM: "Startavstånd",
  target: "Mål",
  distanceTarget: "Målavstånd",
  actual: "Slaglängd",
  actualDistance: "Slaglängd",
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
      ...classifyRaw(object),
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
    modelId: "short-game-zones-v2",
    outcomes: shots.map((shot, index) => ({
      label: `Slag ${index + 1}`,
      context: [shot.distance !== undefined ? `${shot.distance} m` : "", shot.lie ?? ""]
        .filter(Boolean)
        .join(" · "),
      result: zones[shot.points] ?? `${shot.points} poäng`,
      quality: shot.points >= 3 ? "good" : shot.points === 0 ? "poor" : undefined,
      category: Number.isInteger(shot.points) && shot.points >= 0 && shot.points <= 5 ? ACTIVITY_CATEGORIES[5 - shot.points] : undefined,
      rank: Number.isInteger(shot.points) && shot.points >= 0 && shot.points <= 5 ? 5 - shot.points : undefined,
      basis: "Bedömt efter registrerad resultatzon. Startavstånd och läge är ännu inte viktade.",
    })),
  };
}
