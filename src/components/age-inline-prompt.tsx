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
}: {
  title: string;
  description: string;
  onSaved: (age: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function save() {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n < 5 || n > 100) return;
    saveCardProfile({ ...loadCardProfile(), age: n });
    onSaved(n);
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
