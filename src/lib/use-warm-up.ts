import { useEffect, useState, useRef } from "react";
import { emptyWarm, parseWarm, warmKey, type WarmState } from "./warm-up";
export function useWarmUp(userId: string | null, loading = false) {
  const key = warmKey(userId),
    [state, setState] = useState(emptyWarm),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    ref = useRef(state);
  useEffect(() => {
    setReady(false);
    if (loading) return;
    const read = () => {
      try {
        const next = parseWarm(localStorage.getItem(key));
        ref.current = next;
        setState(next);
        setError(false);
      } catch {
        setError(true);
      }
      setReady(true);
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("sg4-warm-updated", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("sg4-warm-updated", read);
    };
  }, [key, loading]);
  function save(next: WarmState) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      ref.current = next;
      setState(next);
      setError(false);
      window.dispatchEvent(new Event("sg4-warm-updated"));
      return true;
    } catch {
      setError(true);
      return false;
    }
  }
  return {
    state,
    ready,
    error,
    save,
    update: (fn: (s: WarmState) => WarmState) => save(fn(ref.current)),
  };
}
