import { useState } from "react";
import { useSubscription } from "@/lib/subscription";

/**
 * Diskret flytande kontroll för att snabbt växla Free/SG4+ under utveckling,
 * utan att behöva gå via Inställningar varje gång. Renderas ENDAST i
 * `import.meta.env.DEV` (Vites inbyggda flagga, alltid false i en
 * produktionsbygge) – visas aldrig för riktiga användare.
 */
export function DevPlanSwitcher() {
  const { plan, setDeveloperPlan } = useSubscription();
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-24 right-3 z-[90]">
      {open && (
        <div className="mb-2 w-40 rounded-2xl border border-border bg-card p-2 shadow-lg">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Preview as
          </p>
          {(["free", "plus"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setDeveloperPlan(p);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs font-medium ${
                plan === p ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              {p === "free" ? "FREE" : "SG4+"}
              {plan === p && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-lg backdrop-blur"
      >
        DEV · {plan === "plus" ? "SG4+" : "FREE"}
      </button>
    </div>
  );
}

/**
 * Fullständig Developer/Preview-panel för Inställningar-sidan (till skillnad
 * från den flytande DevPlanSwitcher ovan, som är en snabbgenväg). Samma
 * renderas-bara-i-dev-regel gäller.
 */
export function DeveloperPreviewPanel() {
  const { plan, isDeveloperOverrideActive, setDeveloperPlan } = useSubscription();

  if (!import.meta.env.DEV) return null;

  return (
    <section className="mt-6 rounded-3xl border border-dashed border-border bg-card/60 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Developer / Preview
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Syns bara i utvecklingsläge, aldrig för riktiga användare.
      </p>

      <p className="mt-4 text-[11px] uppercase tracking-wide text-muted-foreground">Preview plan</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {(["free", "plus"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setDeveloperPlan(p)}
            className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
              plan === p
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {p === "free" ? "FREE" : "SG4+"}
          </button>
        ))}
      </div>

      {isDeveloperOverrideActive && (
        <button
          onClick={() => setDeveloperPlan(null)}
          className="mt-3 w-full rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground"
        >
          Nollställ premium preview
        </button>
      )}
    </section>
  );
}
