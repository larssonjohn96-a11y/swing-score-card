import { useEffect, useState } from "react";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import { puttAverage, roundStars, type CourseRound } from "@/lib/putt-course";
export function PuttRoundImpact({
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
  const previous = puttAverage(before),
    after = puttAverage([...before, round]);
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
            stars: m.find((m) => m.key === "putt-round-stars")?.value ?? 0,
            count: m.find((m) => m.key === "putt-round-count")?.value ?? 0,
          };
        }),
      );
      const eligible = friends.filter((f) => f.count > 0);
      if (alive && eligible.length)
        setStanding({
          before: previous.count
            ? 1 + eligible.filter((f) => f.stars > previous.stars).length
            : null,
          after: 1 + eligible.filter((f) => f.stars > after.stars).length,
          passed: previous.count
            ? eligible
                .filter((f) => f.stars >= previous.stars && f.stars < after.stars)
                .map((f) => f.name)
            : [],
        });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, fresh, round.id, round.status, previous.count, previous.stars, after.stars]);
  if (round.status !== "full") return null;
  return (
    <div className="text-center text-sm text-blue-700">
      {roundStars(round) > previous.stars && previous.count > 0 && after.stars < previous.stars && (
        <p>En äldre, högre runda lämnar snittet.</p>
      )}
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
