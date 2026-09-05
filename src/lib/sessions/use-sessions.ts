import { useEffect, useState, useSyncExternalStore } from "react";
import { SESSIONS_CHANGED_EVENT, getSyncStatus, subscribeSyncStatus } from "./sync";
import type { SyncStatus } from "./types";

const SERVER_STATUS: SyncStatus = { pending: 0, failed: 0, syncing: false, userId: null };

/** Molnsynk-status för UI (kontosidan). */
export function useSessionSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, () => SERVER_STATUS);
}

/**
 * Räknare som stegas när molnet fyllt på lokala historiker. Läsare som
 * initierar state från localStorage kan använda den som effekt-beroende för
 * att läsa om utan att känna till sessionslagret i övrigt.
 */
export function useSessionsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, bump);
  }, []);
  return version;
}
