import { useEffect, useState } from "react";
import { topScores, type Highlight } from "@/lib/highlights";

export function TopScores() {
  const [items, setItems] = useState<Highlight[] | null>(null);

  useEffect(() => {
    setItems(topScores());
  }, []);

  if (!items) return null;

  return (
    <section className="mt-6">
      <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Top scores
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((h) => (
          <div key={h.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{h.label}</p>
            <p className="mt-1 font-display text-3xl leading-none">
              {typeof h.value === "number" ? (
                <>
                  {h.value.toFixed(h.decimals)}
                  <span className="ml-1 text-sm text-muted-foreground">{h.unit}</span>
                </>
              ) : (
                <span className="text-lg text-muted-foreground">–</span>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground">{h.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
