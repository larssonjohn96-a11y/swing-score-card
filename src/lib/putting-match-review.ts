import { expectedPutts } from "@/lib/shot-value";

export type ReviewHole = {
  distance?: number;
  yourValue?: number;
  winner?: "you" | "bot" | "tie";
};

export const PUTT_REVIEW_CATEGORIES = [
  { id: "exceptional", label: "Exceptionellt", symbol: "★", tone: "text-teal-700 bg-teal-50" },
  { id: "excellent", label: "Utmärkt", symbol: "!", tone: "text-blue-700 bg-blue-50" },
  { id: "good", label: "Bra", symbol: "✓", tone: "text-green-700 bg-green-50" },
  { id: "expected", label: "Förväntat", symbol: "=", tone: "text-slate-600 bg-slate-100" },
  { id: "weak", label: "Svagt", symbol: "?", tone: "text-orange-700 bg-orange-50" },
  { id: "loss", label: "Stort tapp", symbol: "!", tone: "text-red-700 bg-red-50" },
] as const;

export function puttingReviewCategory(gained: number) {
  if (gained >= 1) return PUTT_REVIEW_CATEGORIES[0];
  if (gained >= 0.5) return PUTT_REVIEW_CATEGORIES[1];
  if (gained >= 0.15) return PUTT_REVIEW_CATEGORIES[2];
  if (gained >= -0.25) return PUTT_REVIEW_CATEGORIES[3];
  if (gained >= -0.9) return PUTT_REVIEW_CATEGORIES[4];
  return PUTT_REVIEW_CATEGORIES[5];
}

/** Activity-only model, never written to the established/official handicap.
 * Uses SG4's existing scratch/HCP20 expected-putt curves. Linear interpolation
 * (and extrapolation above 20) is a provisional model, not a validated HCP fit.
 * A broad display band is not a statistical confidence interval.
 */
export function buildPuttingMatchReview(holes: readonly ReviewHole[]) {
  const rows = holes.flatMap((hole, index) => {
    const { distance, yourValue: putts } = hole;
    if (
      !hole.winner ||
      typeof distance !== "number" ||
      !Number.isFinite(distance) ||
      distance <= 0 ||
      distance > 25 ||
      typeof putts !== "number" ||
      !Number.isInteger(putts) ||
      putts < 1 ||
      putts > 5
    )
      return [];
    const expected = expectedPutts("hcp20", distance);
    const gained = expected - putts;
    return [
      {
        hole: index + 1,
        distance,
        putts,
        expected,
        gained,
        category: puttingReviewCategory(gained),
      },
    ];
  });
  const total = rows.reduce((sum, row) => sum + row.putts, 0);
  const scratchTotal = rows.reduce((sum, row) => sum + expectedPutts("scratch", row.distance), 0);
  const hcp20Total = rows.reduce((sum, row) => sum + row.expected, 0);
  const estimate =
    rows.length >= 3 && hcp20Total > scratchTotal
      ? Math.max(0, Math.min(54, (20 * (total - scratchTotal)) / (hcp20Total - scratchTotal)))
      : null;
  const hcpBand =
    estimate === null
      ? null
      : {
          low: Math.max(0, Math.floor((estimate - 10) / 5) * 5),
          high: Math.min(54, Math.ceil((estimate + 10) / 5) * 5),
        };
  const ordered = [...rows].sort((a, b) => b.gained - a.gained || a.hole - b.hole);
  const weakest = ordered.at(-1);
  return {
    rows,
    total,
    hcpBand,
    average: rows.length ? total / rows.length : 0,
    onePutts: rows.filter((row) => row.putts === 1).length,
    threePutts: rows.filter((row) => row.putts >= 3).length,
    best: ordered[0] ?? null,
    biggestLoss: weakest && weakest.gained < -0.25 ? weakest : null,
    categories: PUTT_REVIEW_CATEGORIES.map((category) => ({
      ...category,
      count: rows.filter((row) => row.category.id === category.id).length,
    })),
    bands: [
      { label: "Korta", range: "≤ 3 m", min: 0, max: 3 },
      { label: "Medel", range: "> 3–8 m", min: 3, max: 8 },
      { label: "Långa", range: "> 8 m", min: 8, max: 25 },
    ].map((band) => {
      const selected = rows.filter((row) => row.distance > band.min && row.distance <= band.max);
      return {
        ...band,
        count: selected.length,
        average: selected.length
          ? selected.reduce((sum, row) => sum + row.putts, 0) / selected.length
          : null,
      };
    }),
  };
}
