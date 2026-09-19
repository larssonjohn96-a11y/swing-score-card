import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { roundStars, holePoints, type CourseRound } from "@/lib/chip-course";
const format = (n: number) => n.toFixed(1).replace(".", ",");
export function ChipProgress({ history }: { history: CourseRound[] }) {
  const rounds = history
    .filter((r) => r.model === 4 && r.status === "full")
    .slice()
    .sort((a, b) => a.finishedAt - b.finishedAt);
  const [selected, setSelected] = useState<string | null>(null);
  const values = rounds.map((r) => roundStars(r) / 6);
  const current = rounds.find((r) => r.id === selected) ?? rounds.at(-1);
  const span = (rounds.at(-1)?.finishedAt ?? 0) - (rounds[0]?.finishedAt ?? 0);
  const x = (i: number) =>
    rounds.length < 2
      ? 160
      : 22 +
        276 *
          (span ? (rounds[i].finishedAt - rounds[0].finishedAt) / span : i / (rounds.length - 1));
  const y = (value: number) => 124 - value * 36;
  const chart = (interactive: boolean) => (
    <svg
      viewBox="0 0 320 148"
      className="w-full"
      role="img"
      aria-label="Snittstjärnor per sexhålsrunda över tid"
    >
      {[0, 1, 2, 3].map((n) => (
        <g key={n}>
          <line x1="22" x2="300" y1={y(n)} y2={y(n)} stroke="#dbeafe" />
          <text x="3" y={y(n) + 4} fill="#64748b" fontSize="10">
            {n}
          </text>
        </g>
      ))}
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <g key={rounds[i].id}>
          {interactive && (
            <circle
              role="button"
              aria-label={`Runda ${i + 1}, ${format(v)} stjärnor`}
              tabIndex={0}
              cx={x(i)}
              cy={y(v)}
              r="14"
              fill="transparent"
              onClick={() => setSelected(rounds[i].id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(rounds[i].id);
                }
              }}
            />
          )}
          <circle pointerEvents="none" cx={x(i)} cy={y(v)} r="4" fill="#2563eb" />
        </g>
      ))}
    </svg>
  );
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="mt-4 w-full rounded-2xl border border-blue-100 bg-white p-4 text-left">
          <span className="flex items-center justify-between font-bold">
            <span>Din utveckling</span>
            <span className="text-sm text-blue-700">
              {values.length ? `${format(values.at(-1)!)} ★` : "Se progress"}
            </span>
          </span>
          {values.length ? (
            <div className="mx-auto max-w-[260px]">{chart(false)}</div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Spela en hel runda för att börja din kurva.
            </p>
          )}
          <span className="text-xs text-slate-500">Snittstjärnor · hela rundor →</span>
        </button>
      </DialogTrigger>
      <DialogContent className="!animate-none !fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none overflow-y-auto bg-white p-6 pt-14 text-slate-950">
        <div className="mx-auto w-full max-w-md">
          <DialogTitle className="text-2xl font-black">Din utveckling</DialogTitle>
          <DialogDescription className="mt-2">
            Snittstjärnor per sexhålsrunda. Högre är bättre.
          </DialogDescription>
          {rounds.length ? (
            <>
              <div className="mt-8">{chart(true)}</div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{new Date(rounds[0].finishedAt).toLocaleDateString("sv-SE")}</span>
                <span>{new Date(rounds.at(-1)!.finishedAt).toLocaleDateString("sv-SE")}</span>
              </div>
              {current && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-5">
                  <p className="text-sm text-slate-500">
                    {new Date(current.finishedAt).toLocaleDateString("sv-SE")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-blue-700">
                    {format(roundStars(current) / 6)} ★
                  </p>
                  <p className="mt-2">
                    {current.holes.reduce((s, h) => s + holePoints(h), 0)} poäng totalt
                  </p>
                </div>
              )}
              <p className="mt-4 text-sm text-slate-500">Tryck på en punkt för att se rundan.</p>
            </>
          ) : (
            <p className="mt-8 text-slate-500">
              Här visas din första punkt när du har spelat klart sex hål.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
