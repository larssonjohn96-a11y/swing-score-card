import { useState } from "react";
import { botScore, type CourseGame } from "@/lib/short-course";
import { CourseStrokeInput, CourseHoleResult } from "./course-match-ui";
export function CourseSuddenDeath({
  game,
  onSave,
  onFinish,
}: {
  game: CourseGame;
  onSave: (g: CourseGame) => boolean;
  onFinish: () => void;
}) {
  const sd = game.suddenDeath!;
  const [chosen, setChosen] = useState<[boolean, boolean]>([false, false]);
  const ready = chosen[0] && (game.mode === "bot" || chosen[1]);
  function select(side: "you" | "other", n: number) {
    if (onSave({ ...game, suddenDeath: { ...sd, draft: { ...sd.draft, [side]: n } } }))
      setChosen((v) => (side === "you" ? [true, v[1]] : [v[0], true]));
  }
  function register() {
    if (!ready || sd.result) return;
    const result = { ...sd.draft };
    if (game.mode === "bot") result.other = botScore(result.length, game.botLevel, sd.roll);
    onSave({ ...game, suddenDeath: { ...sd, result } });
  }
  return (
    <>
      <div className="rounded-2xl bg-amber-300 p-3 text-center text-slate-950">
        <h1 className="font-display text-3xl uppercase">Sudden death · hål {sd.round}</h1>
        <p className="text-xs font-bold">
          Inga extraslag. Lägst antal slag vinner. Vid lika spelar ni ett hål till.
        </p>
      </div>
      {sd.result ? (
        <CourseHoleResult
          names={game.names}
          hole={sd.round}
          scores={[sd.result.you, sd.result.other]}
          net={[sd.result.you, sd.result.other]}
          nextLabel={sd.result.you === sd.result.other ? "Nästa särspelshål" : "Visa slutresultat"}
          onNext={() => {
            if (sd.result!.you !== sd.result!.other) onFinish();
            else {
              onSave({
                ...game,
                suddenDeath: {
                  round: sd.round + 1,
                  roll: Math.random(),
                  draft: { you: 3, other: 3, length: sd.draft.length },
                },
              });
              setChosen([false, false]);
            }
          }}
        />
      ) : (
        <>
          {game.mode === "bot" && (
            <label className="block text-sm font-semibold">
              Hållängd
              <select
                className="ml-3 min-h-10 rounded-xl border bg-white px-2"
                value={sd.draft.length}
                onChange={(e) =>
                  onSave({
                    ...game,
                    suddenDeath: { ...sd, draft: { ...sd.draft, length: Number(e.target.value) } },
                  })
                }
              >
                <option value={100}>Upp till 200 m</option>
                <option value={300}>201–400 m</option>
                <option value={500}>Över 400 m</option>
              </select>
            </label>
          )}
          <CourseStrokeInput
            key={`you-${sd.round}`}
            name={game.names[0]}
            value={sd.draft.you}
            onChange={(n) => select("you", n)}
          />
          {game.mode === "friend" && (
            <CourseStrokeInput
              key={`other-${sd.round}`}
              name={game.names[1]}
              tone="red"
              value={sd.draft.other}
              onChange={(n) => select("other", n)}
            />
          )}
          <button
            disabled={!ready}
            onClick={register}
            className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 py-3 font-display text-xl uppercase text-white disabled:bg-slate-300 disabled:text-slate-500"
          >
            Registrera särspelshål
          </button>
        </>
      )}
    </>
  );
}
