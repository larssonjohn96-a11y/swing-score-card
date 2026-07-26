import { LEVELS, type LevelKey } from "@/lib/levels";

export function LevelToggle({
  value,
  onChange,
}: {
  value: LevelKey;
  onChange: (key: LevelKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
      {LEVELS.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => onChange(l.key)}
          aria-pressed={value === l.key}
          className={`flex-1 whitespace-nowrap rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
            value === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
