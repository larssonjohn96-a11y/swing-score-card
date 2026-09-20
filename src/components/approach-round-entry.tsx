import { useState } from "react";
import { approachProximity, type ApproachResult } from "@/lib/approach-match";
import { validShot } from "@/lib/approach-course";
export function ApproachRoundEntry({
  target,
  initial,
  onScore,
}: {
  target: number;
  initial?: ApproachResult;
  onScore: (shot: ApproachResult) => void;
}) {
  const [length, setLength] = useState(String(initial?.actualDistance ?? target)),
    [lateral, setLateral] = useState(String(initial?.lateral ?? 0)),
    [side, setSide] = useState<"left" | "right">(initial?.side === "left" ? "left" : "right");
  const actual = Number(length.replace(",", ".")),
    offset = Number(lateral.replace(",", "."));
  const shot: ApproachResult = {
    actualDistance: actual,
    lateral: offset,
    side: offset === 0 ? "center" : side,
  };
  const valid = length.trim() !== "" && lateral.trim() !== "" && validShot(shot);
  function adjust(field: "length" | "lateral", delta: number) {
    const set = field === "length" ? setLength : setLateral;
    const value = field === "length" ? actual : offset;
    set(
      String(
        Math.max(
          0,
          Math.min(field === "length" ? 400 : 200, (Number.isFinite(value) ? value : 0) + delta),
        ),
      ),
    );
  }
  return (
    <section aria-label="Registrera inspel">
      <div className="grid grid-cols-2 gap-3">
        {(["length", "lateral"] as const).map((field) => (
          <div key={field} className="rounded-2xl border border-blue-100 bg-white p-3">
            <label
              htmlFor={`approach-${field}`}
              className="block text-center text-xs font-bold uppercase text-slate-500"
            >
              {field === "length" ? "Total längd" : "Sidled"}
            </label>
            <div className="mt-1 flex items-baseline justify-center">
              <input
                id={`approach-${field}`}
                aria-label={field === "length" ? "Total längd" : "Sidled"}
                inputMode="decimal"
                value={field === "length" ? length : lateral}
                onChange={(e) => (field === "length" ? setLength : setLateral)(e.target.value)}
                className="w-20 bg-transparent text-center text-3xl font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-sm text-slate-400">m</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[-5, 5, -1, 1].map((d) => (
                <button
                  type="button"
                  key={d}
                  aria-label={`${field === "length" ? "Total längd" : "Sidled"} ${d > 0 ? "+" : ""}${d} m`}
                  onClick={() => adjust(field, d)}
                  className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-900"
                >
                  {d > 0 ? "+" : ""}
                  {d}
                </button>
              ))}
            </div>
            {field === "lateral" &&
              (offset > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {(["left", "right"] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      aria-pressed={side === s}
                      onClick={() => setSide(s)}
                      className={`min-h-10 rounded-xl text-xs font-bold ${side === s ? "bg-blue-600 text-white" : "border bg-white text-slate-600"}`}
                    >
                      {s === "left" ? "Vänster" : "Höger"}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 flex h-10 items-center justify-center text-xs text-slate-400">
                  0 m = rakt
                </p>
              ))}
          </div>
        ))}
      </div>
      <p className="my-2 text-center text-sm font-bold text-blue-900" aria-live="polite">
        {valid
          ? `${approachProximity(shot, target).toFixed(1).replace(".", ",")} m från målet`
          : "Ange en giltig längd och sidled."}
      </p>
      <button className="approach-primary" disabled={!valid} onClick={() => onScore(shot)}>
        Registrera slag →
      </button>
    </section>
  );
}
