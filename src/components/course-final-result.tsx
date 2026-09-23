import { Trophy } from "lucide-react";
import { courseWinner, matchStatus, netHole, totals, type CourseGame } from "@/lib/short-course";
export function CourseFinalResult({ game }: { game: CourseGame }) {
  const winner = courseWinner(game),
    status = matchStatus(game),
    net = totals(game, true);
  const wins = [0, 0];
  game.scores.forEach((s, i) => {
    const n = netHole(game, s, i);
    if (n.you < n.other) wins[0]++;
    else if (n.other < n.you) wins[1]++;
  });
  const text =
    game.suddenDeath?.result && winner >= 0
      ? "SD"
      : game.format === "match"
        ? winner < 0
          ? "AS"
          : `${Math.abs(status.diff)} UP`
        : `${net[0]}–${net[1]}`;
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg">
      <p className="p-4 text-center text-xs font-bold uppercase tracking-[.16em] text-slate-500">
        Spela på bana · Matchresultat
      </p>
      <div className="grid min-h-36 grid-cols-[1fr_88px_1fr]">
        {[0, 1, 2].map((slot) =>
          slot === 1 ? (
            <div key={slot} className="flex flex-col items-center justify-center px-1 text-center">
              <Trophy className="mb-2 h-7 w-7 text-amber-500" />
              <p className="font-display text-3xl leading-tight">{text}</p>
              <p className="text-[9px] font-bold uppercase text-slate-500">Slutresultat</p>
            </div>
          ) : (
            <div
              key={slot}
              style={
                winner === (slot === 0 ? 0 : 1)
                  ? {
                      clipPath:
                        slot === 0
                          ? "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)"
                          : "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)",
                    }
                  : undefined
              }
              className={`flex flex-col items-center justify-center px-4 py-5 text-center ${slot === 0 ? (winner === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700") : winner === 1 ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}
            >
              <p className="w-full break-words text-sm font-black uppercase">
                {game.names[slot === 0 ? 0 : 1]}
              </p>
              <p className="mt-2 font-display text-5xl">
                {game.format === "match" ? wins[slot === 0 ? 0 : 1] : net[slot === 0 ? 0 : 1]}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase">
                {game.format === "match" ? "Vunna hål" : "Slag netto"}
              </p>
            </div>
          ),
        )}
      </div>
      <div className="border-t border-slate-200 p-5 text-center">
        <h1 className="text-xl font-black">
          {winner < 0
            ? "Oavgjort efter alla hål"
            : `${game.names[winner === 0 ? 0 : 1]} vinner${game.suddenDeath ? " i sudden death" : ""}!`}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {game.holes} hål spelade
          {game.format === "match"
            ? ` · ${game.holes - wins[0] - wins[1]} delade`
            : game.allowance
              ? ` · ${game.allowance} extraslag avräknade`
              : " · Scratch"}
        </p>
      </div>
    </section>
  );
}
