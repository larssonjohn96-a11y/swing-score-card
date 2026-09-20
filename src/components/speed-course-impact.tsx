import { useEffect, useState } from "react";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import { speedAverage, roundPoints, type CourseRound } from "@/lib/speed-course";
export function SpeedRoundImpact({
  round,
  before,
  userId,
  fresh,
}: {
  round: CourseRound;
  before: CourseRound[];
  userId: string | null;
  fresh: boolean;
}) {
  const previous = speedAverage(before),
    after = speedAverage([...before, round]);
  const [standing, setStanding] = useState<{
    before: number | null;
    after: number;
    passed: string[];
  } | null>(null);
  useEffect(() => {
    let alive = true;
    setStanding(null);
    if (!userId || !fresh || round.status !== "full") return;
    void (async () => {
      await pushPlayerSnapshot(userId);
      const { accepted } = await listFriendships(true);
      const friends = await Promise.all(
        accepted.map(async (f) => {
          const s = await fetchFriendSnapshot(f.other.id, true);
          const m = s?.comparisonProfile.training ?? [];
          return {
            name: f.other.displayName,
            stars: m.find((m) => m.key === "speed-round-points")?.value ?? 0,
            count: m.find((m) => m.key === "speed-round-count")?.value ?? 0,
          };
        }),
      );
      const eligible = friends.filter((f) => f.count > 0);
      if (alive && eligible.length)
        setStanding({
          before: previous.count
            ? 1 + eligible.filter((f) => f.stars > previous.points).length
            : null,
          after: 1 + eligible.filter((f) => f.stars > after.points).length,
          passed: previous.count
            ? eligible
                .filter((f) => f.stars >= previous.points && f.stars < after.points)
                .map((f) => f.name)
            : [],
        });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, fresh, round.id, round.status, previous.count, previous.points, after.points]);
  if (round.status !== "full") return null;
  return (
    <div className="text-center text-sm text-blue-700">
      {roundPoints(round) > previous.points &&
        previous.count > 0 &&
        after.points < previous.points && <p>En äldre, högre runda lämnar snittet.</p>}
      {after.count < 5 && <p>{after.count} av 5 rundor till ett etablerat snitt</p>}
      {previous.count === 4 && after.count === 5 && (
        <p className="font-bold">Fem rundor! Ditt snitt är etablerat.</p>
      )}
      {standing?.before != null && standing.before !== standing.after && (
        <p>
          Med vännernas aktuella snitt: plats {standing.before} → {standing.after}
        </p>
      )}
      {!!standing?.passed.length && (
        <p className="font-bold">
          Du passerar {standing.passed.slice(0, 2).join(" och ")}
          {standing.passed.length > 2 ? ` och ${standing.passed.length - 2} till` : ""}.
        </p>
      )}
    </div>
  );
}
