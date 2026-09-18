import { useEffect, useState } from "react";
import { adapterForTest } from "@/lib/sessions/adapters";
import { rawActivityOutcomes, type ActivityReviewInput } from "@/lib/activity-review";
import { ActivityReview } from "./activity-review";
import { PuttingMatchReview } from "./putting-match-review";
import { coachPuttingReviewHoles, type ReviewHole } from "@/lib/putting-match-review";

/** Mount only on a completed activity. Read the saved raw session, never aggregate history. */
export function StoredActivityReview({ testId }: { testId: string }) {
  const [input, setInput] = useState<ActivityReviewInput | null>(null);
  const [puttingHoles, setPuttingHoles] = useState<ReviewHole[] | null>(null);
  useEffect(() => {
    const adapter = adapterForTest(testId);
    if (!adapter) {
      setInput(null);
      return;
    }
    const read = () => {
      setPuttingHoles(null);
      try {
        const saved = JSON.parse(window.localStorage.getItem(adapter.storageKey) ?? "[]");
        if (!Array.isArray(saved)) {
          setInput(null);
          return;
        }
        const session = [...saved]
          .filter((row) => row && typeof row === "object")
          .sort((a, b) => Date.parse(a[adapter.dateField]) - Date.parse(b[adapter.dateField]))
          .at(-1);
        if (!session) {
          setInput(null);
          return;
        }
        const shots =
          adapter.shotsField && Array.isArray(session[adapter.shotsField])
            ? session[adapter.shotsField]
            : [];
        const score = adapter.scoreField ? session[adapter.scoreField] : null;
        if (testId === "fifty-putt") setPuttingHoles(coachPuttingReviewHoles(shots));
        const outcomes =
          testId === "eight-ball"
            ? shots.map((points: number, i: number) => ({
                label: `Slag ${i + 1}`,
                result:
                  ["Över 3 m", "Inom 3 m", "Inom 2 m", "Inom 1 m", "Sänkt"][points] ??
                  String(points),
                quality:
                  points >= 2 ? ("good" as const) : points === 0 ? ("poor" as const) : undefined,
              }))
            : rawActivityOutcomes(shots);
        setInput({
          title: adapter.label,
          modelId: `${testId}:existing-v${adapter.scoringVersion}`,
          handicap: adapter.handicapField ? session[adapter.handicapField] : null,
          outcomes,
          summary: shots.length
            ? `${shots.length} registrerade försök`
            : typeof score === "number"
              ? `Resultat ${score}`
              : "Registrerat resultat",
        });
      } catch {
        setInput(null);
      }
    };
    read();
    window.addEventListener("sg4:sessions-changed", read);
    return () => window.removeEventListener("sg4:sessions-changed", read);
  }, [testId]);
  return puttingHoles ? (
    <PuttingMatchReview holes={puttingHoles} activity="training" />
  ) : input ? (
    <ActivityReview input={input} />
  ) : null;
}
