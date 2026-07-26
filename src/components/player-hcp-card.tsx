import { useEffect, useState } from "react";
import {
  clearPlayerHcp,
  isValidGolfId,
  isValidHcp,
  levelForHcp,
  loadPlayerHcp,
  minGolfUrl,
  savePlayerHcp,
  type PlayerHcp,
} from "@/lib/hcp";
import { getLevel, saveLevel } from "@/lib/levels";

export function PlayerHcpCard({ onLevelChange }: { onLevelChange?: () => void }) {
  const [saved, setSaved] = useState<PlayerHcp | null>(null);
  const [editing, setEditing] = useState(false);
  const [golfId, setGolfId] = useState("");
  const [hcp, setHcp] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadPlayerHcp();
    setSaved(stored);
    setEditing(!stored);
    if (stored) {
      setGolfId(stored.golfId);
      setHcp(String(stored.hcp));
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = golfId.trim();
    const value = Number(hcp.replace(",", "."));
    if (id && !isValidGolfId(id)) {
      setError("Golf-ID ska skrivas som ÅÅMMDD-XXX, t.ex. 900101-123.");
      return;
    }
    if (!isValidHcp(value)) {
      setError("Ange ett handicap mellan -10 och 54.");
      return;
    }
    const next = savePlayerHcp({ golfId: id, hcp: value });
    setSaved(next);
    setEditing(false);
    const key = levelForHcp(value);
    saveLevel(key);
    onLevelChange?.();
  }

  function reset() {
    clearPlayerHcp();
    setSaved(null);
    setGolfId("");
    setHcp("");
    setEditing(true);
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Mitt handicap</h2>

      {saved && !editing ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-[family-name:var(--font-display)] text-4xl leading-none text-primary">
                {saved.hcp.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {saved.golfId ? `Golf-ID ${saved.golfId}` : "Inget Golf-ID angivet"}
              </p>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              Jämförs mot
              <br />
              <span className="text-foreground">{getLevel(levelForHcp(saved.hcp)).label}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 rounded-2xl border border-border py-2 text-sm text-muted-foreground"
            >
              Ändra
            </button>
            {saved.golfId ? (
              <a
                href={minGolfUrl(saved.golfId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl bg-primary py-2 text-center text-sm font-medium text-primary-foreground"
              >
                Öppna Min Golf
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full text-xs text-muted-foreground underline"
          >
            Ta bort
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Golf-ID (valfritt)
            </span>
            <input
              value={golfId}
              onChange={(e) => setGolfId(e.target.value)}
              placeholder="900101-123"
              maxLength={11}
              inputMode="numeric"
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Exakt handicap
            </span>
            <input
              value={hcp}
              onChange={(e) => setHcp(e.target.value)}
              placeholder="12.4"
              inputMode="decimal"
              maxLength={5}
              required
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>
          {error ? <p className="text-sm text-flag">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-3 font-medium text-primary-foreground"
          >
            Spara handicap
          </button>
          <p className="text-xs text-muted-foreground">
            Min Golf har ingen öppen koppling, så handicapet fylls i här – med Golf-ID får du en
            direktlänk till din sida på Min Golf för att stämma av siffran.
          </p>
        </form>
      )}
    </section>
  );
}
