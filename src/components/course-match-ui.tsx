import { useState } from "react";

export function CourseStrokeInput({
  name,
  value,
  onChange,
  tone = "blue",
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  tone?: "blue" | "red";
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const choose = (n: number) => {
    setSelected(n);
    onChange(n);
  };
  const red = tone === "red";
  const active = red
    ? "border-red-600 bg-red-600 text-white"
    : "border-blue-600 bg-blue-600 text-white";
  const idle = "border-slate-300 bg-slate-50 text-slate-700";
  const suggested = "border-slate-400 bg-slate-50 text-slate-700 ring-1 ring-slate-400/50";
  return (
    <section
      className={`course-stroke rounded-[26px] border p-4 shadow-sm ${red ? "border-red-200 bg-gradient-to-br from-red-50 to-white" : "border-blue-200 bg-gradient-to-br from-blue-50 to-white"}`}
    >
      <div
        className={`course-stroke-header mb-4 flex items-start justify-between gap-3 ${red ? "text-red-700" : "text-blue-700"}`}
      >
        <h2 className="min-w-0 break-words font-display text-3xl uppercase leading-tight">
          {name}
        </h2>
        <p aria-live="polite" className="shrink-0 pt-1 font-sans text-2xl font-bold leading-tight">
          {value} slag
        </p>
      </div>
      <div className="course-stroke-grid grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${name}: ${n} slag`}
            aria-pressed={selected === n && value === n}
            onClick={() => choose(n)}
            className={`course-stroke-choice flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-2 shadow-sm ${value === n ? (selected === n ? active : suggested) : idle}`}
          >
            <span className="font-display text-2xl leading-tight">{n}</span>
            <span className="text-[9px] font-semibold uppercase">slag</span>
          </button>
        ))}
        <label
          className={`course-stroke-choice relative flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-2 shadow-sm ${value >= 8 ? (selected === value ? active : suggested) : idle}`}
        >
          <span className="font-display text-2xl leading-tight">{value >= 8 ? value : "8+"}</span>
          <span className="text-[9px] font-semibold uppercase">slag</span>
          <select
            aria-label={`${name}: 8 eller fler slag`}
            value={value >= 8 ? value : ""}
            onChange={(e) => choose(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="" disabled>
              Välj antal slag
            </option>
            {Array.from({ length: 5 }, (_, i) => i + 8).map((n) => (
              <option key={n} value={n}>
                {n} slag
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
export function CourseMatchBar({
  names,
  holes,
  current,
  results,
  margin,
  format,
  strokeTotals,
  netTotals = false,
}: {
  names: [string, string];
  holes: number;
  current: number;
  results: number[];
  margin: number;
  format: "match" | "stroke";
  strokeTotals?: [number, number];
  netTotals?: boolean;
}) {
  const leader = margin > 0 ? 0 : margin < 0 ? 1 : null;
  return (
    <section
      aria-label="Matchställning"
      className="overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-sm"
    >
      <div className="course-match-top grid min-h-[70px] grid-cols-[1fr_88px_1fr] items-stretch">
        <div
          style={
            leader === 0 ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined
          }
          className={`flex min-w-0 flex-col justify-center py-3 pl-3 pr-5 ${leader === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-800"}`}
        >
          <p className="break-words text-xs font-black uppercase leading-tight">{names[0]}</p>
          {format === "stroke" && strokeTotals && (
            <p className="mt-1 text-sm font-bold">
              {strokeTotals[0]}{" "}
              <span className="text-[10px] font-semibold">
                {netTotals ? "slag netto" : "slag totalt"}
              </span>
            </p>
          )}
          {leader === 0 && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider">Leder</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center px-1 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            {current >= holes ? `${holes}/${holes} spelade` : `Hål ${current + 1} av ${holes}`}
          </p>
          <p
            className={`mt-1 font-display text-2xl leading-tight ${leader === 0 ? "text-blue-600" : leader === 1 ? "text-red-600" : "text-slate-950"}`}
          >
            {margin === 0
              ? format === "match"
                ? "AS"
                : "LIKA"
              : `${Math.abs(margin)} ${format === "match" ? "UP" : "SLAG"}`}
          </p>
        </div>
        <div
          style={
            leader === 1
              ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" }
              : undefined
          }
          className={`flex min-w-0 flex-col justify-center py-3 pl-5 pr-3 text-right ${leader === 1 ? "bg-red-600 text-white" : "bg-red-50 text-red-800"}`}
        >
          <p className="break-words text-xs font-black uppercase leading-tight">{names[1]}</p>
          {format === "stroke" && strokeTotals && (
            <p className="mt-1 text-sm font-bold">
              {strokeTotals[1]}{" "}
              <span className="text-[10px] font-semibold">
                {netTotals ? "slag netto" : "slag totalt"}
              </span>
            </p>
          )}
          {leader === 1 && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider">Leder</p>
          )}
        </div>
      </div>
      <div className="course-match-progress flex flex-wrap justify-center gap-1 border-t border-slate-200 px-2 py-2">
        {Array.from({ length: holes }, (_, i) => (
          <span
            key={i}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Hål ${i + 1}: ${i < results.length ? (results[i] > 0 ? names[0] + " vann" : results[i] < 0 ? names[1] + " vann" : "lika") : i === current ? "aktuellt" : "återstår"}`}
            className={`flex shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${holes > 12 ? "h-4 w-4" : "h-6 w-6"} ${i === current ? "ring-1 ring-slate-600 ring-offset-1" : ""} ${i < results.length ? (results[i] > 0 ? "bg-blue-600 text-white" : results[i] < 0 ? "bg-red-600 text-white" : "bg-slate-300 text-slate-700") : "bg-slate-100 text-slate-500"}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CourseHoleResult({
  names,
  hole,
  net,
  onNext,
  nextLabel,
}: {
  names: [string, string];
  hole: number;
  scores: [number, number];
  net: [number, number];
  onNext: () => void;
  nextLabel: string;
}) {
  const winner = net[0] < net[1] ? 0 : net[0] > net[1] ? 1 : null;
  return (
    <div className="space-y-4">
      <section
        role="status"
        aria-live="polite"
        className={`flex min-h-[280px] flex-col items-center justify-center rounded-[28px] px-6 py-8 text-center shadow-sm ${winner === 0 ? "bg-blue-600 text-white" : winner === 1 ? "bg-red-600 text-white" : "bg-slate-200 text-slate-800"}`}
      >
        <p className="text-xs font-bold uppercase tracking-[.2em]">Hål {hole} klart</p>
        <h2 className="mt-4 break-words font-display text-4xl uppercase leading-tight">
          {winner === null ? "Hålet delas" : `${names[winner]} vinner hål ${hole}`}
        </h2>
      </section>
      <button
        onClick={onNext}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-display text-xl uppercase text-white"
      >
        {nextLabel} →
      </button>
    </div>
  );
}
