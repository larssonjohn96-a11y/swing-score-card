import type { ReactNode } from "react";
export function CourseSetupHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="space-y-5">
      <ol aria-label="Spelinställningar" className="flex gap-2">
        {["Spelare", "Matchval"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? "step" : undefined}
            className={`flex flex-1 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${step === i ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${step === i ? "bg-white/20" : "bg-white"}`}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <h1 className="font-sans text-3xl font-bold tracking-normal leading-tight text-slate-950">
        {title}
      </h1>
    </div>
  );
}
export const courseSetupAction =
  "flex min-h-[68px] w-full items-center justify-center gap-3 rounded-[22px] bg-blue-600 px-5 py-4 font-sans text-lg font-bold tracking-normal leading-tight text-white shadow-[0_6px_0_#1d4ed8,0_10px_20px_-12px_#1d4ed8] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none";
export function CourseSetupBlock({
  title,
  children,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      aria-label={title}
      className={`min-w-0 space-y-3 rounded-[24px] border p-4 transition-colors ${disabled ? "border-slate-200 bg-slate-200/70" : "border-slate-200 bg-white shadow-sm"}`}
    >
      <h2
        className={`text-center font-sans text-xl font-bold tracking-normal leading-snug ${disabled ? "text-slate-400" : "text-slate-800"}`}
      >
        {title}
      </h2>
      <div className={`space-y-3 ${disabled ? "pointer-events-none opacity-35 grayscale" : ""}`}>
        {children}
      </div>
    </fieldset>
  );
}
export function CourseHoleChoices({
  value,
  onChange,
  confirmed = true,
}: {
  value: number;
  confirmed?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[3, 6, 9].map((n) => (
        <button
          key={n}
          aria-pressed={confirmed && value === n}
          onClick={() => onChange(n)}
          className={`min-h-16 rounded-2xl border-2 px-2 py-3 ${confirmed && value === n ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
        >
          <span className="block font-sans font-bold text-2xl leading-tight">{n}</span>
          <span className="text-[10px] font-bold">hål</span>
        </button>
      ))}
      <label
        className={`relative flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 ${confirmed && ![3, 6, 9].includes(value) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
      >
        <span className="font-sans font-bold text-base">
          {[3, 6, 9].includes(value) ? "Annat" : value}
        </span>
        <span className="text-[10px] font-bold">1–18 hål</span>
        <select
          aria-label="Valfritt antal hål"
          value={confirmed ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          <option value="" disabled>
            Välj antal hål
          </option>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} hål
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
