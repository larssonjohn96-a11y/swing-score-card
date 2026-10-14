import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import { peiRankingAverage, type FocusKind, type PeiSession } from "@/lib/pei-ranking";

type Row = { id: string; name: string; count: number; average: number | null };
export function PeiLeaderboard({
  kind,
  history,
  userId,
  playerName,
}: {
  kind: FocusKind;
  history: PeiSession[];
  userId: string | null;
  playerName: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setRows([]);
    if (!userId) {
      setStatus("Logga in för att jämföra med dina vänner.");
      return;
    }
    setStatus("Hämtar vännernas resultat…");
    void (async () => {
      try {
        const synced = await pushPlayerSnapshot(userId);
        const { accepted } = await listFriendships(true);
        const friends = await Promise.all(
          accepted.map(async (f) => {
            const snapshot = await fetchFriendSnapshot(f.other.id, true);
            const metrics = snapshot?.comparisonProfile.training ?? [];
            const average =
              metrics.find((m) => m.key === `pei-${kind}-fixed-average`)?.value ?? null;
            const count = metrics.find((m) => m.key === `pei-${kind}-fixed-count`)?.value ?? 0;
            return {
              id: f.other.id,
              name: f.other.displayName,
              average,
              count: average !== null && Number.isFinite(average) && average >= 0 ? count : 0,
            };
          }),
        );
        if (alive) {
          setRows(friends);
          setStatus(synced ? "" : "Ditt resultat kunde inte synkas. Försök igen.");
        }
      } catch {
        if (alive) setStatus("Topplistan kunde inte hämtas. Försök igen.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, kind, history, retry]);
  const own = peiRankingAverage(history, kind);
  const all = [
    { id: userId ?? "guest", name: playerName === "Du" ? "Du" : `${playerName} · Du`, ...own },
    ...rows,
  ].sort(
    (a, b) =>
      Number(b.count > 0) - Number(a.count > 0) ||
      (a.average ?? Infinity) - (b.average ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white">
      <div className="border-b border-blue-100 p-5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Trophy className="h-5 w-5" />
          Topplista
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Snitt av senaste 5 testerna · lägre PEI är bättre
        </p>
      </div>
      <div className="flex justify-between px-4 pt-3 text-xs font-bold uppercase text-slate-400">
        <span>Spelare</span>
        <span>Snitt PEI</span>
      </div>
      <ol className="px-4">
        {all.map((r) => {
          const rank = r.count
            ? all.filter((x) => x.count > 0 && x.average !== null && x.average < r.average!)
                .length + 1
            : null;
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"
            >
              <span
                className={`w-7 text-center text-sm font-black ${rank === 1 ? "text-amber-600" : "text-slate-400"}`}
              >
                {rank ?? "–"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {r.count
                    ? `${r.count}/5 tester${r.count < 5 ? " · preliminärt" : ""}`
                    : "Inget genomfört test"}
                </p>
              </div>
              <strong className="tabular-nums">
                {r.count && r.average !== null ? `${r.average.toFixed(2).replace(".", ",")}%` : "–"}
              </strong>
            </li>
          );
        })}
      </ol>
      {status && (
        <p className="px-4 pb-3 text-sm text-slate-500">
          {status}
          {status.includes("igen") && (
            <button onClick={() => setRetry((n) => n + 1)} className="ml-2 font-bold text-blue-600">
              Försök igen
            </button>
          )}
        </p>
      )}
      {userId && (
        <Link to="/vanner" className="mx-4 mb-4 block text-sm font-bold text-blue-600">
          Hitta och lägg till vänner →
        </Link>
      )}
    </section>
  );
}
