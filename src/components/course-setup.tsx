import type { ReactNode } from "react";
export function CourseSetupHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="space-y-5">
      <ol aria-label="Spelinställningar" className="flex gap-2">
        {["Spelare", "Upplägg"].map((label, i) => (
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
      <h1 className="font-display text-4xl uppercase leading-tight text-slate-950">{title}</h1>
    </div>
  );
}
export function CourseSetupBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-black uppercase tracking-[.12em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}
export function CourseHoleChoices({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[3, 6, 9].map((n) => (
        <button
          key={n}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={`min-h-16 rounded-2xl border-2 px-2 py-3 ${value === n ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
        >
          <span className="block font-display text-2xl leading-tight">{n}</span>
          <span className="text-[10px] font-bold uppercase">hål</span>
        </button>
      ))}
      <label
        className={`relative flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 ${![3, 6, 9].includes(value) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
      >
        <span className="font-display text-xl">{[3, 6, 9].includes(value) ? "Annat" : value}</span>
        <span className="text-[10px] font-bold uppercase">1–18 hål</span>
        <select
          aria-label="Valfritt antal hål"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
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
