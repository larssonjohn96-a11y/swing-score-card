import { netHole, totals, type CourseGame } from "@/lib/short-course";

export function CourseScorecard({ game }: { game: CourseGame }) {
  const net = totals(game, true);
  return (
    <section aria-label="Scorekort" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl font-bold">Hela matchen</h2>
        <p className="text-xs text-slate-500">{game.scores.length} hål spelade</p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-center text-sm">
          <thead>
            <tr className="bg-slate-100 text-xs text-slate-600">
              <th className="sticky left-0 z-10 min-w-24 bg-slate-100 p-3 text-left">Hål</th>
              {game.scores.map((_, i) => (
                <th key={i} className="min-w-12 p-3">
                  {i + 1}
                </th>
              ))}
              <th className="min-w-16 p-3">Totalt</th>
            </tr>
          </thead>
          <tbody>
            {game.names.map((name, player) => (
              <tr key={player} className="border-t border-slate-200">
                <th
                  scope="row"
                  className={`sticky left-0 z-10 max-w-32 break-words bg-white p-3 text-left ${player === 0 ? "text-blue-700" : "text-red-700"}`}
                >
                  {name}
                </th>
                {game.scores.map((score, i) => {
                  const n = netHole(game, score, i);
                  const tie = n.you === n.other;
                  const won = player === 0 ? n.you < n.other : n.other < n.you;
                  return (
                    <td key={i} className="px-1 py-3">
                      <span
                        aria-label={`${name}, hål ${i + 1}: ${player === 0 ? score.you : score.other} slag, ${tie ? "delat hål" : won ? "vann hålet" : "förlorade hålet"}`}
                        className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 font-bold ${won ? (player === 0 ? "bg-blue-600 text-white" : "bg-red-600 text-white") : tie ? "bg-slate-200 text-slate-700" : "text-slate-600"}`}
                      >
                        {player === 0 ? score.you : score.other}
                      </span>
                    </td>
                  );
                })}
                <td className="p-3 font-bold">{net[player]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Blått eller rött = vunnet hål · Grått = delat hål.
        {game.allowance > 0
          ? " Slagen visas brutto. Hålens vinnare och totalen räknas med extraslagen avdragna."
          : ""}
      </p>
      {game.suddenDeath?.result && (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm">
          Sudden death · hål {game.suddenDeath.round}: {game.names[0]} {game.suddenDeath.result.you}{" "}
          – {game.names[1]} {game.suddenDeath.result.other} slag
        </p>
      )}
    </section>
  );
}
