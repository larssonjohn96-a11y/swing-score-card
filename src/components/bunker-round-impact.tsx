import { useEffect, useState } from "react";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import { bunkerAverage, roundStars, type CourseRound } from "@/lib/bunker-course";
export function BunkerRoundImpact({
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
  const previous = bunkerAverage(before),
    after = bunkerAverage([...before, round]);
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
            points: m.find((m) => m.key === "bunker-round-points")?.value ?? 0,
            stars: m.find((m) => m.key === "bunker-round-stars")?.value ?? 0,
            count: m.find((m) => m.key === "bunker-round-count")?.value ?? 0,
          };
        }),
      );
      const compare = (
        a: { stars: number; points: number },
        b: { stars: number; points: number },
      ) => a.stars - b.stars || a.points - b.points;
      const eligible = friends.filter((f) => f.count > 0);
      if (alive && eligible.length)
        setStanding({
          before: previous.count
            ? 1 + eligible.filter((f) => compare(f, previous) > 0).length
            : null,
          after: 1 + eligible.filter((f) => compare(f, after) > 0).length,
          passed: previous.count
            ? eligible
                .filter((f) => compare(f, previous) >= 0 && compare(f, after) < 0)
                .map((f) => f.name)
            : [],
        });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [
    userId,
    fresh,
    round.id,
    round.status,
    previous.count,
    previous.stars,
    previous.points,
    after.stars,
    after.points,
  ]);
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
