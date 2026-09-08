import { Minus, Plus, Repeat2 } from "lucide-react";

function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Math.abs(rounded).toFixed(1).replace(".", ",");
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${text}`;
}

export function ShotRoundImpact({
  shotValue,
  frequency,
  onFrequencyChange,
}: {
  shotValue: number;
  frequency: number;
  onFrequencyChange: (value: number) => void;
}) {
  const roundImpact = shotValue * frequency;
  const positive = roundImpact > 0.1;
  const negative = roundImpact < -0.1;

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vad betyder det över en rond?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ett litet värde per slag kan bli stort när samma typ av situation återkommer.</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        <div className="px-2 py-4 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Per slag</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{signed(shotValue)}</p>
        </div>
        <div className="px-2 py-4 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Liknande lägen</p>
          <p className="mt-1 text-xl font-bold tabular-nums">×{frequency}</p>
        </div>
        <div className="px-2 py-4 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Rondeffekt</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${positive ? "text-primary" : negative ? "text-red-600" : ""}`}>{signed(roundImpact)}</p>
        </div>
      </div>

      <div className="border-t border-border bg-muted/35 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Repeat2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold">Hur ofta möter du ett liknande läge?</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Justera för att se din ungefärliga rondeffekt.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background p-1">
            <button type="button" onClick={() => onFrequencyChange(Math.max(1, frequency - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg" aria-label="Minska frekvens"><Minus className="h-3.5 w-3.5" /></button>
            <span className="min-w-7 text-center text-sm font-bold tabular-nums">{frequency}</span>
            <button type="button" onClick={() => onFrequencyChange(Math.min(18, frequency + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg" aria-label="Öka frekvens"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      <p className="px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">Rondeffekten är en enkel projektion: slagvärde × antal liknande situationer. Den är till för att göra storleksordningen begriplig, inte för att förutsäga din exakta score.</p>
    </section>
  );
}
