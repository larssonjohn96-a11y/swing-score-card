import { useState } from "react";
import { Calendar, Check } from "lucide-react";
import { loadCardProfile, saveCardProfile } from "@/lib/rating-card";

/**
 * Inline åldersinmatning – sparar direkt till profilen utan att navigera
 * bort från sidan. Används både på startsidan (nudge) och på Speed-
 * testets resultatsida (för att direkt kunna visa ålders-bellcurven).
 */
export function AgeInlinePrompt({
  title,
  description,
  onSaved,
  variant = "inline",
}: {
  title: string;
  description: string;
  onSaved: (age: number) => void;
  variant?: "inline" | "reveal";
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function save() {
    const n = Number(value);
    if (!value || !Number.isInteger(n) || n < 5 || n > 100) return;
    saveCardProfile({ ...loadCardProfile(), age: n });
    onSaved(n);
  }

  if (variant === "reveal") {
    const valid =
      value !== "" && Number.isInteger(Number(value)) && Number(value) >= 5 && Number(value) <= 100;
    return (
      <form
        className="text-center text-white"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) save();
        }}
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/25 bg-white/15">
          <Calendar className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-blue-100">
          Din åldersgrupp
        </p>
        <h2 className="mt-3 text-3xl font-black">Hur står sig din fart?</h2>
        <p className="mx-auto mt-4 max-w-xs text-lg leading-relaxed text-blue-100">
          Ange din ålder och se hur du ligger till bland golfare i din åldersgrupp.
        </p>
        <label className="mx-auto mt-7 block max-w-[240px] rounded-3xl bg-white p-5 text-blue-700 shadow-lg shadow-blue-900/15">
          <span className="block text-sm font-bold">Din ålder</span>
          <span className="mt-2 flex items-baseline justify-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={value}
              placeholder="–"
              onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, ""))}
              aria-label="Din ålder i år"
              className="w-28 rounded-xl bg-transparent text-center text-6xl font-black tabular-nums text-blue-700 outline-none placeholder:text-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <span className="text-lg font-bold text-blue-400">år</span>
          </span>
        </label>
        <button
          type="submit"
          disabled={!valid}
          className="mt-6 min-h-14 w-full rounded-full bg-white px-5 text-base font-bold text-blue-700 transition-opacity disabled:opacity-40"
        >
          Visa min jämförelse
        </button>
        <p className="mt-3 text-sm text-blue-100">Sparas i din profil till nästa gång.</p>
      </form>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Calendar className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold leading-tight">{title}</p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={5}
          max={100}
          autoFocus
          value={value}
          placeholder="Din ålder"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={save}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Check className="h-4 w-4" />
          Spara
        </button>
      </div>
    </div>
  );
}
