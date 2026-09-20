import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { speedAverage } from "@/lib/speed-course";
import { fetchFriendSnapshot, listFriendships, pushPlayerSnapshot } from "@/lib/friends-cloud";
import type { CourseRound } from "@/lib/speed-course";
type Row = ReturnType<typeof speedAverage> & { id: string; name: string };
export function SpeedLeaderboard({
  userId,
  history,
  playerName,
}: {
  userId: string | null;
  history: CourseRound[];
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
            const value = (key: string) => metrics.find((m) => m.key === key)?.value ?? 0;
            return {
              id: f.other.id,
              name: f.other.displayName,
              count: value("speed-round-count"),
              points: value("speed-round-points"),
              stars: value("speed-round-stars"),
            };
          }),
        );
        if (alive) {
          setRows(friends);
          setStatus(synced ? "" : "Ditt snitt kunde inte synkas. Försök igen.");
        }
      } catch {
        if (alive) setStatus("Topplistan kunde inte hämtas. Försök igen.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, history, retry]);
  const all = [
    {
      id: userId ?? "guest",
      name: playerName === "Du" ? "Du" : `${playerName} · Du`,
      ...speedAverage(history),
    },
    ...rows,
  ].sort(
    (a, b) =>
      Number(b.count > 0) - Number(a.count > 0) ||
      b.points - a.points ||
      a.name.localeCompare(b.name),
  );
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white">
      <div className="bg-blue-600 p-4 text-white">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Trophy className="h-5 w-5" />
          Topplista Vänner
        </h2>
        <p className="mt-1 text-sm text-blue-100">Snitt av senaste 5 hela rundorna</p>
      </div>
      <div className="flex justify-between px-4 pt-3 text-xs font-bold uppercase text-slate-400">
        <span>Spelare</span>
        <span>Speedpoäng</span>
      </div>
      <ol className="p-2">
        {all.map((r) => {
          const rank = r.count
            ? all.filter((x) => x.count > 0 && x.points > r.points).length + 1
            : null;
          return (
            <li
              key={r.id}
              className={`my-1 flex items-center gap-3 rounded-2xl p-3 ${r.id === (userId ?? "guest") ? "bg-blue-50" : "bg-slate-50"}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black ${rank === 1 ? "bg-amber-100 text-amber-700" : "bg-white text-slate-500"}`}
              >
                {rank ?? "–"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {r.count
                    ? `${r.count}/5 rundor${r.count < 5 ? " · preliminärt" : ""}`
                    : "Inga synkade rundor"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-blue-700">{r.count ? fmt(r.points) : "–"}</p>
                <p className="text-xs text-slate-500">{r.count ? `av 100 p` : ""}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {status && (
        <p className="px-4 pb-3 text-sm text-slate-500">
          {status}
          {status.includes("igen") && (
            <button className="ml-2 font-bold text-blue-600" onClick={() => setRetry((x) => x + 1)}>
              Försök igen
            </button>
          )}
        </p>
      )}
      {userId && (
        <Link to="/vanner" className="mx-4 mb-3 block text-sm font-bold text-blue-600">
          Hitta och lägg till vänner →
        </Link>
      )}
      <p className="px-4 pb-4 text-xs text-slate-500">
        Bara hela rundor med samma poängsystem räknas. Vännernas snitt uppdateras när deras app
        synkar.
      </p>
    </section>
  );
}
