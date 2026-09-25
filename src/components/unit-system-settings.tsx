import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  getUnitSystem,
  setUnitSystem,
  subscribeToUnitSystem,
  type UnitSystem,
} from "@/lib/unit-system";

const OPTIONS: Array<{
  value: UnitSystem;
  title: string;
  description: string;
}> = [
  {
    value: "metric",
    title: "Metric",
    description: "Meter · °C · km/h",
  },
  {
    value: "imperial",
    title: "Imperial",
    description: "Yards · °F · mph",
  },
];

export function UnitSystemSettings() {
  const [unitSystem, setCurrentUnitSystem] = useState<UnitSystem>(() => getUnitSystem());

  useEffect(() => subscribeToUnitSystem(setCurrentUnitSystem), []);

  function select(next: UnitSystem) {
    setCurrentUnitSystem(next);
    setUnitSystem(next);
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inställningar</p>
        <h2 className="mt-1 text-2xl font-semibold">Måttenheter</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Välj vilket enhetssystem SG4 ska använda.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const selected = unitSystem === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => select(option.value)}
              aria-pressed={selected}
              className={`relative rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
              <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                {option.title}
              </p>
              <p className="mt-1 pr-4 text-[11px] leading-relaxed text-muted-foreground">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
