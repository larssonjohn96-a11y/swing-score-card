/**
 * Short Putting Test (tidigare "Kortputt").
 *
 * Fyra startlinjer runt hålet (klockan 12/3/6/9) × tre avstånd (1/2/3 m),
 * i två varv = 24 puttar totalt (samma upplägg som Approach Test). De fyra
 * riktningarna fångar uppförs-, nedförs- och sidlutande puttar på samma
 * green, så testet mäter både startlinje/teknik och – på en lutande green
 * – greenläsning och fartkontroll.
 *
 * Innan testet startar väljer spelaren om hålet man puttar mot är rakt
 * eller lutande, så resultatet går att jämföra rättvist över tid och
 * mellan tester.
 *
 * Varje putt registreras bara som Satt eller Missad. En miss straffar mer
 * ju kortare putten är (en 1-metersputt ska normalt sättas betydligt oftare
 * än en 3-metersputt), så satta puttar viktas efter avstånd:
 *   1 m = 2 poäng, 2 m = 3 poäng, 3 m = 4 poäng.
 *
 * Ett HCP-baserat resultat efter ett enda test är fortfarande ett relativt
 * litet stickprov – resultatsidan visar därför en HCP-*range* snarare än
 * en falskt exakt decimal. Ett stabilare, mer precist tal fås genom det
 * rullande snittet av de senaste 3–5 testerna (se lib/sg-handicap.ts).
 */

export type Direction = "12" | "3" | "6" | "9";

export const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: "12", label: "Klockan 12" },
  { key: "3", label: "Klockan 3" },
  { key: "6", label: "Klockan 6" },
  { key: "9", label: "Klockan 9" },
];

export const SHORT_PUTT_DISTANCES = [1, 2, 3] as const;
export type ShortPuttDistance = (typeof SHORT_PUTT_DISTANCES)[number];

/** Poäng för en satt putt, per avstånd. */
export const POINTS_BY_DISTANCE: Record<ShortPuttDistance, number> = { 1: 2, 2: 3, 3: 4 };

export const SHORT_PUTT_ROUNDS = 1;
export const SHORT_PUTT_TOTAL = DIRECTIONS.length * SHORT_PUTT_DISTANCES.length * SHORT_PUTT_ROUNDS; // 12
export const MAX_POINTS =
  DIRECTIONS.length *
  SHORT_PUTT_ROUNDS *
  SHORT_PUTT_DISTANCES.reduce((a, d) => a + POINTS_BY_DISTANCE[d], 0); // 72

export type GreenType = "flat" | "sloped";

export type ShortPutt = {
  direction: Direction;
  distance: ShortPuttDistance;
  round: 1 | 2;
  holed: boolean;
  /** 1-baserat index i spelordning */
  index: number;
};

/** Tom serie i spelordning: varv för varv, riktning för riktning, 1 → 2 → 3 m inom varje. */
export function emptyShortPutts(): ShortPutt[] {
  const putts: ShortPutt[] = [];
  let index = 1;
  for (let round = 1; round <= SHORT_PUTT_ROUNDS; round += 1) {
    for (const { key } of DIRECTIONS) {
      for (const distance of SHORT_PUTT_DISTANCES) {
        putts.push({ direction: key, distance, round: round as 1 | 2, holed: false, index });
        index += 1;
      }
    }
  }
  return putts;
}

export type ShortPuttSession = {
  id: string;
  date: string;
  putts: ShortPutt[];
  greenType: GreenType;
  /** antal isatta puttar */
  holed: number;
  /** andel isatta puttar, % */
  pct: number;
  /** viktad poäng, 0–MAX_POINTS */
  points: number;
  /** Short Putting Score 0–100, härlett ur points/MAX_POINTS */
  score: number;
  /** punktskattning av Short Putting HCP (1–3 m) */
  handicap: number;
  notes?: string;
};

/* -------------------------------------------------------------------------
 * Analys av en genomförd/pågående serie
 * ---------------------------------------------------------------------- */

export type ShortPuttDistanceStat = {
  distance: ShortPuttDistance;
  holed: number;
  count: number;
};

export type ShortPuttDirectionStat = {
  direction: Direction;
  label: string;
  holed: number;
  count: number;
  pct: number;
};

export function shortPuttStats(putts: ShortPutt[]): ShortPuttDistanceStat[] {
  return SHORT_PUTT_DISTANCES.map((distance) => {
    const rows = putts.filter((p) => p.distance === distance);
    return { distance, holed: rows.filter((p) => p.holed).length, count: rows.length };
  });
}

export function shortPuttDirectionStats(putts: ShortPutt[]): ShortPuttDirectionStat[] {
  return DIRECTIONS.map(({ key, label }) => {
    const rows = putts.filter((p) => p.direction === key);
    const holed = rows.filter((p) => p.holed).length;
    return {
      direction: key,
      label,
      holed,
      count: rows.length,
      pct: rows.length ? (holed / rows.length) * 100 : 0,
    };
  });
}

function weightedPoints(putts: ShortPutt[]): number {
  return putts.filter((p) => p.holed).reduce((sum, p) => sum + POINTS_BY_DISTANCE[p.distance], 0);
}

/** Handicap-punktskattning ur Short Putting Score, samma princip som övriga tester. */
export function handicapFromScore(score: number): number {
  return Math.max(-4, Math.min(36, 30 - score * 0.34));
}

export type ShortPuttResult = {
  holed: number;
  count: number;
  pct: number;
  points: number;
  score: number;
  byDistance: ShortPuttDistanceStat[];
  byDirection: ShortPuttDirectionStat[];
  bestDirection?: ShortPuttDirectionStat;
  worstDirection?: ShortPuttDirectionStat;
  /** punktskattning */
  handicap: number;
  /** osäkerhetsintervall kring punktskattningen – visas hellre än en falskt exakt decimal efter ett enda test */
  handicapRange: [number, number];
  analysis: string;
};

export function computeShortPuttResult(putts: ShortPutt[], greenType?: GreenType): ShortPuttResult {
  const count = putts.length;
  const holed = putts.filter((p) => p.holed).length;
  const pct = count ? (holed / count) * 100 : 0;
  const points = weightedPoints(putts);
  const score = count ? Math.round((points / MAX_POINTS) * 100) : 0;
  const byDistance = shortPuttStats(putts);
  const byDirection = shortPuttDirectionStats(putts).filter((d) => d.count > 0);

  const sortedByPct = [...byDirection].sort((a, b) => b.pct - a.pct);
  const bestDirection = sortedByPct[0];
  const worstDirection = sortedByPct[sortedByPct.length - 1];

  const handicap = handicapFromScore(score);
  const handicapRange: [number, number] = [
    Math.round(Math.max(-4, handicap - 2.5)),
    Math.round(Math.min(36, handicap + 2.5)),
  ];

  const analysis = buildAnalysis(byDistance, byDirection, bestDirection, worstDirection, greenType);

  return {
    holed,
    count,
    pct,
    points,
    score,
    byDistance,
    byDirection,
    bestDirection,
    worstDirection,
    handicap,
    handicapRange,
    analysis,
  };
}

function buildAnalysis(
  byDistance: ShortPuttDistanceStat[],
  byDirection: ShortPuttDirectionStat[],
  best?: ShortPuttDirectionStat,
  worst?: ShortPuttDirectionStat,
  greenType?: GreenType,
): string {
  if (!byDistance.some((d) => d.count > 0)) return "Genomför testet för att få din analys.";

  const near = byDistance.find((d) => d.distance === 1);
  const far = byDistance.find((d) => d.distance === 3);
  const parts: string[] = [];

  if (near && far && near.count && far.count) {
    const nearPct = (near.holed / near.count) * 100;
    const farPct = (far.holed / far.count) * 100;
    if (nearPct >= 75 && farPct <= 50) {
      parts.push("Du är mycket säker från 1 meter men tappar tydligt från 3 meter.");
    } else if (farPct >= nearPct) {
      parts.push("Du håller jämnare nivå ju längre putten är, ovanligt bra distanskontroll.");
    } else {
      parts.push(
        `Träffprocenten sjunker med avståndet, som väntat – från ${nearPct.toFixed(0)} % på 1 m till ${farPct.toFixed(0)} % på 3 m.`,
      );
    }
  }

  if (worst && worst.pct < 60 && byDirection.length > 1) {
    const missDirections = byDirection
      .filter((d) => d.pct <= worst.pct + 5)
      .map((d) => d.label.toLowerCase());
    const list = missDirections.length > 1 ? missDirections.join(" och ") : missDirections[0];
    if (greenType === "flat") {
      parts.push(
        `Missarna kommer främst från ${list}. Eftersom hålet var rakt tyder det snarare på en teknisk snedhet i startlinjen än greenläsning.`,
      );
    } else {
      parts.push(
        `Missarna kommer främst från ${list}, vilket kan tyda på att sidlutningen på det hålet begränsar resultatet.`,
      );
    }
  } else if (best && best.pct === 100 && worst && worst.direction !== best.direction) {
    parts.push(`Starkast från ${best.label.toLowerCase()}.`);
  }

  return parts.join(" ");
}

/** Kort, lättillgängligt nivåord som komplement till HCP-intervallet. */
export function puttingLevelLabel(score: number): string {
  if (score >= 85) return "Elitnivå";
  if (score >= 70) return "Stark nivå";
  if (score >= 50) return "Bra nivå";
  if (score >= 30) return "Grundnivå";
  return "Nybörjarnivå";
}

/* -------------------------------------------------------------------------
 * Lagring
 * ---------------------------------------------------------------------- */

const KEY = "golf-shortputt-sessions-v4";

export function loadShortPuttSessions(): ShortPuttSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShortPuttSession[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShortPuttSession(
  putts: ShortPutt[],
  greenType: GreenType,
  notes?: string,
): ShortPuttSession {
  const result = computeShortPuttResult(putts);
  const record: ShortPuttSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    putts,
    greenType,
    holed: result.holed,
    pct: result.pct,
    points: result.points,
    score: result.score,
    handicap: result.handicap,
    notes: notes?.trim() || undefined,
  };
  window.localStorage.setItem(KEY, JSON.stringify([...loadShortPuttSessions(), record]));
  return record;
}

export function deleteShortPuttSession(id: string): ShortPuttSession[] {
  const all = loadShortPuttSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
