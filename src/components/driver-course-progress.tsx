import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { roundPoints, type CourseRound } from "@/lib/driver-course";
export function DriverProgress({ history }: { history: CourseRound[] }) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const rounds = history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => a.finishedAt - b.finishedAt);
  const values = rounds.map(roundPoints);
  const points = values.map((v, i) => ({
    x: 25 + (values.length === 1 ? 130 : (i * 260) / (values.length - 1)),
    y: 155 - v * (128 / 100),
  }));
  const path = points
    .map((p, i) =>
      i === 0
        ? `M${p.x},${p.y}`
        : `C${(points[i - 1].x + p.x) / 2},${points[i - 1].y} ${(points[i - 1].x + p.x) / 2},${p.y} ${p.x},${p.y}`,
    )
    .join(" ");
  const graph = (interactive: boolean) => (
    <svg
      viewBox="0 0 310 185"
      role="img"
      aria-label="Driverpoäng per hel runda, från 0 till 100"
      className="w-full"
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1="25"
            x2="290"
            y1={155 - v * (128 / 100)}
            y2={155 - v * (128 / 100)}
            stroke="#e2e8f0"
          />
          <text x="2" y={159 - v * (128 / 100)} fontSize="10" fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      {points.map((p, i) => (
        <g
          key={i}
          {...(interactive
            ? {
                role: "button",
                tabIndex: 0,
                "aria-label": `Runda ${i + 1}: ${values[i]} driverpoäng`,
                onClick: () => setSelected(i),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(i);
                  }
                },
              }
            : {})}
        >
          <circle cx={p.x} cy={p.y} r="13" fill="transparent" />
          <circle cx={p.x} cy={p.y} r={selected === i && interactive ? 6 : 3.5} fill="#2563eb" />
        </g>
      ))}
      <text x="25" y="178" fontSize="10" fill="#64748b">
        Första rundan
      </text>
      <text x="245" y="178" fontSize="10" fill="#64748b">
        Senaste
      </text>
    </svg>
  );
  return (
    <>
      <button
        className="mt-4 w-full rounded-3xl border bg-white p-4 text-left"
        onClick={() => setOpen(true)}
      >
        <h2 className="font-black">
          Resultat över tid <span className="float-right text-blue-600">↗</span>
        </h2>
        {values.length ? (
          graph(false)
        ) : (
          <p className="mt-2 text-sm text-slate-500">Din första hela runda startar kurvan.</p>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!inset-0 !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none bg-white text-slate-950">
          <div className="m-auto w-full max-w-lg">
            <DialogTitle>Resultat över tid</DialogTitle>
            <DialogDescription className="my-3">
              Driverpoäng per hel runda · max 100
            </DialogDescription>
            {graph(true)}
            <p className="mt-4 text-center font-bold text-blue-700">
              {selected !== null && rounds[selected]
                ? `${new Date(rounds[selected].finishedAt).toLocaleDateString("sv-SE")} · ${values[selected]} av 100 p`
                : values.length
                  ? "Tryck på en runda för resultatet"
                  : "Spela en hel runda för att börja."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
