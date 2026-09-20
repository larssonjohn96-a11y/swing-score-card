import { useState } from "react";
import { validShot, toMph, fromMph, type CourseShot, type SpeedUnit } from "@/lib/speed-course";
export function SpeedRoundEntry({
  target,
  initial,
  onScore,
  calibration = false,
}: {
  target: number;
  initial?: CourseShot;
  onScore: (s: CourseShot) => void;
  calibration?: boolean;
}) {
  const [unit, setUnit] = useState<SpeedUnit>(() => {
    try {
      return localStorage.getItem("sg4-speed-round-unit") === "km/h" ? "km/h" : "mph";
    } catch {
      return "mph";
    }
  });
  const [value, setValue] = useState(() =>
    initial ? String(Number(fromMph(initial.ballSpeed, unit).toFixed(1))) : "",
  );
  const n = Number(value.replace(",", "."));
  const shot = { ballSpeed: Number(toMph(n, unit).toFixed(1)) };
  const valid = value.trim() !== "" && validShot(shot);
  function changeUnit(next: SpeedUnit) {
    if (value.trim() && Number.isFinite(n))
      setValue(String(Number(fromMph(toMph(n, unit), next).toFixed(1))));
    setUnit(next);
    try {
      localStorage.setItem("sg4-speed-round-unit", next);
    } catch {}
  }
  return (
    <section
      className="space-y-3"
      aria-label={calibration ? "Kalibrera bollhastighet" : "Registrera bollhastighet"}
    >
      <div className="rounded-2xl border border-blue-100 bg-white p-4 text-center">
        <label htmlFor="speed-ball" className="block text-sm font-bold uppercase text-slate-500">
          Bollhastighet
        </label>
        <div className="my-3 flex items-baseline justify-center gap-2">
          <input
            id="speed-ball"
            aria-label="Bollhastighet"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="–"
            className="w-44 rounded-lg bg-transparent text-center text-5xl font-black text-blue-900 focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-slate-500">{unit}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["mph", "km/h"] as const).map((u) => (
            <button
              key={u}
              aria-pressed={u === unit}
              onClick={() => changeUnit(u)}
              className={`min-h-11 rounded-xl font-bold ${u === unit ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}
            >
              {u}
            </button>
          ))}
        </div>
        {!calibration && (
          <p className="mt-3 text-sm text-slate-500">
            Din referens: {fromMph(target, unit).toFixed(1).replace(".", ",")} {unit}
          </p>
        )}
      </div>
      {value.trim() && !valid && (
        <p role="alert" className="text-center text-sm text-slate-600">
          Ange bollhastighet över 0 och högst {fromMph(250, unit).toFixed(1).replace(".", ",")}{" "}
          {unit}.
        </p>
      )}
      <button className="speed-primary" disabled={!valid} onClick={() => onScore(shot)}>
        {calibration ? "Registrera kalibreringsslag" : "Registrera slag"} →
      </button>
    </section>
  );
}
