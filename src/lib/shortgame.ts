/**
 * Närspelstest – ersätter Chip Test och Pitch Test.
 *
 * 6 slag mot avstånd 8/10/12/15/18/20 meter. Lie spelar ingen roll och
 * spelaren väljer själv teknik (chip/pitch/låg wedge/hög wedge) – det som
 * mäts är bara slutresultatet: hur nära hålet bollen stannar.
 *
 * Registrering sker som ett avståndsintervall (inte exakt mätning), och
 * ett representativt mittvärde används vid beräkning.
 *
 * Närspel HCP är kalibrerat mot verklig proximity-data:
 *   Arccos (scratch, median proximity från ruff): 10 yd≈6'1", 15 yd≈7'10",
 *   20 yd≈10'0", 25 yd≈12'6", 30 yd≈15'2" – ger ett ungefär linjärt samband
 *   proximity(m) ≈ 0,143 × avstånd(m) + 0,54 för en scratchspelare.
 *   Shot Scope/MyGolfSpy: snittproximity ökar med ungefär 2–3 fot per 5
 *   handicap-steg (t.ex. 25-handicap ≈ 22 fot i snitt inom 50 yards), vilket
 *   används för att extrapolera övriga handicapnivåer.
 */

export const SHORTGAME_DISTANCES = [8, 10, 12, 15, 18, 20] as const;
export type ShortGameDistance = (typeof SHORTGAME_DISTANCES)[number];

export type Technique = "chip" | "pitch" | "low-wedge" | "high-wedge";

export const TECHNIQUES: { key: Technique; label: string }[] = [
  { key: "chip", label: "Chip" },
  { key: "pitch", label: "Pitch" },
  { key: "low-wedge", label: "Låg wedge" },
  { key: "high-wedge", label: "Hög wedge" },
];

export type IntervalKey =
  | "holed"
  | "0-25cm"
  | "25-50cm"
  | "50cm-1m"
  | "1-1.5m"
  | "1.5-2m"
  | "2-2.5m"
  | "2.5-3m"
  | "3-4m"
  | "4-5m"
  | "5-7m"
  | "7m+";

export const INTERVALS: { key: IntervalKey; label: string; midpoint: number }[] = [
  { key: "holed", label: "Holed", midpoint: 0 },
  { key: "0-25cm", label: "0–25 cm", midpoint: 0.125 },
  { key: "25-50cm", label: "25–50 cm", midpoint: 0.375 },
  { key: "50cm-1m", label: "50 cm–1 m", midpoint: 0.75 },
  { key: "1-1.5m", label: "1–1,5 m", midpoint: 1.25 },
  { key: "1.5-2m", label: "1,5–2 m", midpoint: 1.75 },
  { key: "2-2.5m", label: "2–2,5 m", midpoint: 2.25 },
  { key: "2.5-3m", label: "2,5–3 m", midpoint: 2.75 },
  { key: "3-4m", label: "3–4 m", midpoint: 3.5 },
  { key: "4-5m", label: "4–5 m", midpoint: 4.5 },
  { key: "5-7m", label: "5–7 m", midpoint: 6 },
  { key: "7m+", label: "7+ m", midpoint: 8 },
];

const INTERVAL_MIDPOINT: Record<IntervalKey, number> = Object.fromEntries(
  INTERVALS.map((i) => [i.key, i.midpoint]),
) as Record<IntervalKey, number>;

export const SHORTGAME_TOTAL_SHOTS = SHORTGAME_DISTANCES.length; // 6

export type ShortGameShot = {
  index: number;
  distanceTarget: ShortGameDistance;
  technique?: Technique;
  interval?: IntervalKey;
};

export function emptyShortGameShots(): ShortGameShot[] {
  return SHORTGAME_DISTANCES.map((d, i) => ({ index: i + 1, distanceTarget: d }));
}

/* -------------------------------------------------------------------------
 * Piecewise-linjär interpolation, samma mönster som offtee.ts/speed.ts
 * ---------------------------------------------------------------------- */

type Anchor = { hcp: number; value: number };

function interpolate(input: number, anchors: Anchor[]): number {
  const sorted = [...anchors].sort((a, b) => a.hcp - b.hcp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (input <= first.value) return first.hcp;
  if (input >= last.value) return last.hcp;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (input >= a.value && input <= b.value) {
      const t = (input - a.value) / (b.value - a.value);
      return a.hcp + t * (b.hcp - a.hcp);
    }
  }
  return last.hcp;
}

/** Snittproximity (meter) → handicap, kalibrerat mot Arccos/Shot Scope-data (se filkommentar). */
const PROXIMITY_ANCHORS: Anchor[] = [
  { hcp: -8, value: 0.3 },
  { hcp: -6, value: 1.6 },
  { hcp: 0, value: 2.5 },
  { hcp: 10, value: 4.0 },
  { hcp: 20, value: 5.6 },
  { hcp: 25, value: 6.3 },
  { hcp: 36, value: 8.0 },
];

export function handicapFromProximity(avgProximityM: number): number {
  return Math.max(-8, Math.min(40, interpolate(avgProximityM, PROXIMITY_ANCHORS)));
}

function scoreFromHandicap(hcp: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (hcp + 8) * (100 / 48))));
}

export function handicapLabel(hcp: number): string {
  const v = Math.abs(hcp).toFixed(1).replace(".", ",");
  return hcp < 0 ? `+${v}` : v;
}

export function shortGameLevelLabel(score: number): string {
  if (score >= 85) return "Elitnivå";
  if (score >= 70) return "Stark nivå";
  if (score >= 50) return "Bra nivå";
  if (score >= 30) return "Grundnivå";
  return "Nybörjarnivå";
}

/* -------------------------------------------------------------------------
 * Sammanställning
 * ---------------------------------------------------------------------- */

export type ShortGameResult = {
  count: number;
  totalProximity: number;
  avgProximity: number;
  handicap: number;
  score: number;
  within25cm: number;
  within1m: number;
  within2m: number;
  holed: number;
  analysis: string;
};

export function computeShortGameResult(shots: ShortGameShot[]): ShortGameResult {
  const played = shots.filter((s): s is ShortGameShot & { interval: IntervalKey } =>
    Boolean(s.interval),
  );
  const count = played.length;
  const proximities = played.map((s) => INTERVAL_MIDPOINT[s.interval]);
  const totalProximity = proximities.reduce((a, b) => a + b, 0);
  const avgProximity = count ? totalProximity / count : 0;

  const handicap = count ? handicapFromProximity(avgProximity) : 0;
  const score = count ? scoreFromHandicap(handicap) : 0;

  const within25cm = proximities.filter((p) => p <= 0.25).length;
  const within1m = proximities.filter((p) => p <= 1).length;
  const within2m = proximities.filter((p) => p <= 2).length;
  const holed = proximities.filter((p) => p === 0).length;

  const analysis = buildAnalysis(avgProximity, within2m, count);

  return {
    count,
    totalProximity: Math.round(totalProximity * 100) / 100,
    avgProximity: Math.round(avgProximity * 100) / 100,
    handicap,
    score,
    within25cm,
    within1m,
    within2m,
    holed,
    analysis,
  };
}

function buildAnalysis(avg: number, within2m: number, count: number): string {
  if (!count) return "Genomför testet för att få din analys.";
  const pct2m = Math.round((within2m / count) * 100);
  if (avg <= 1.5) {
    return `Mycket stark närspelskontroll – snitt ${avg.toFixed(2)} m från hål och ${pct2m}% av slagen inom 2 m. Du sätter upp lätta puttar nästan varje gång.`;
  }
  if (pct2m >= 50) {
    return `${pct2m}% av slagen slutade inom 2 m – bra grundnivå. Jobba på att få bort de längre missarna för att sänka snittet ytterligare.`;
  }
  return `Snitt ${avg.toFixed(2)} m från hål och bara ${pct2m}% inom 2 m – fokusera på distanskontroll snarare än att sikta rakt på flaggan varje gång.`;
}

/* -------------------------------------------------------------------------
 * Sessioner
 * ---------------------------------------------------------------------- */

export type ShortGameSession = {
  id: string;
  date: string;
  shots: ShortGameShot[];
  avgProximity: number;
  handicap: number;
  score: number;
  notes?: string;
};

const KEY = "golf-shortgame-sessions-v1";

export function loadShortGameSessions(): ShortGameSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShortGameSession[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persist(sessions: ShortGameSession[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  window.localStorage.setItem(KEY, JSON.stringify(sorted));
  return sorted;
}

export function saveShortGameSession(shots: ShortGameShot[], notes?: string): ShortGameSession {
  const r = computeShortGameResult(shots);
  const session: ShortGameSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    shots,
    avgProximity: r.avgProximity,
    handicap: r.handicap,
    score: r.score,
    notes: notes?.trim() || undefined,
  };
  persist([...loadShortGameSessions(), session]);
  return session;
}

export function deleteShortGameSession(id: string): ShortGameSession[] {
  return persist(loadShortGameSessions().filter((s) => s.id !== id));
}
