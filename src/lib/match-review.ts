import { buildActivityReview, rawActivityOutcomes, shortGameReviewInput } from "./activity-review";
import { buildPuttingMatchReview } from "./putting-match-review";
import { handicapFromProximity, handicapLabel } from "./shortgame";

export type MatchReviewHole = {
  challenge: { title: string };
  winner: "blue" | "red" | "tie" | null;
  blueStrokes?: number;
  redStrokes?: number;
  bluePoints?: number;
  redPoints?: number;
  blueApproach?: { proximity: number };
  redApproach?: { proximity: number };
  blueSpeed?: number;
  redSpeed?: number;
};

export function buildPlayerMatchReview(
  kind: string,
  holes: readonly MatchReviewHole[],
  side: "blue" | "red",
) {
  const played = holes.filter((h) => h.winner !== null);
  const distance = (h: MatchReviewHole) => Number.parseFloat(h.challenge.title.replace(",", "."));
  if (kind === "putting") {
    const putting = buildPuttingMatchReview(
      played.map((h) => ({
        distance: distance(h),
        yourValue: side === "blue" ? h.blueStrokes : h.redStrokes,
        completed: true,
      })),
    );
    const review = buildActivityReview({
      title: "Puttning",
      outcomes: putting.rows.map((row) => ({
        label: `Hål ${row.hole}`,
        context: `${String(row.distance).replace(".", ",")} m`,
        result: `${row.putts} ${row.putts === 1 ? "putt" : "puttar"}`,
        category: row.category.label,
        rank: -row.gained,
      })),
    });
    return {
      ...review,
      hcp: putting.hcpBand ? `${putting.hcpBand.low}–${putting.hcpBand.high}` : "–",
    };
  }
  if (kind === "around-the-green" || kind === "bunker") {
    const shots = played.flatMap((h) => {
      const points = side === "blue" ? h.bluePoints : h.redPoints;
      return points === undefined ? [] : [{ distance: distance(h), points }];
    });
    // Same proximity-to-HCP model as solo chipping, with match's six result zones.
    const metres = [7, 4, 2.5, 1.5, 0.5, 0];
    const hcp =
      kind === "around-the-green" && shots.length >= 3
        ? handicapLabel(
            handicapFromProximity(
              shots.reduce((sum, s) => sum + metres[s.points], 0) / shots.length,
            ),
          )
        : "–";
    return {
      ...buildActivityReview(shortGameReviewInput("Närspel", shots, kind === "bunker")),
      hcp,
    };
  }
  const outcomes = rawActivityOutcomes(
    played.map((h) =>
      kind === "approach"
        ? { ...(side === "blue" ? h.blueApproach : h.redApproach), distance: distance(h) }
        : kind === "speed"
          ? { ballSpeed: side === "blue" ? h.blueSpeed : h.redSpeed }
          : {
              result:
                h.winner === side
                  ? "Vunnet hål"
                  : h.winner === "tie"
                    ? "Delat hål"
                    : "Förlorat hål",
            },
    ),
  );
  return { ...buildActivityReview({ title: "Match", outcomes }), hcp: "–" };
}
