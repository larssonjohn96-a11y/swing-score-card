import { useEffect, useState } from "react";
import { FAVORITES_CHANGED, FAVORITES_KEY, readTestFavorites } from "./hcp-distance-tests";

/** Reuses existing saved IDs, including specialist shortcuts from the old hub. */
export function useTestFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const refresh = () => setFavorites(readTestFavorites());
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY || event.key === null) refresh();
    };
    refresh();
    window.addEventListener(FAVORITES_CHANGED, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle(id: string) {
    const current = readTestFavorites();
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setFavorites(next);
      setSaveError(false);
      window.dispatchEvent(new Event(FAVORITES_CHANGED));
    } catch { setSaveError(true); }
  }
  return { favorites, toggle, saveError };
}
