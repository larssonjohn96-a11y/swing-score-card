/**
 * Orkestrering: lokalt först, molnet därefter.
 *
 *   recordSessionSaved()   – anropas av varje save*Session direkt efter att
 *                            posten skrivits lokalt. Köar molnupsert.
 *   recordSessionDeleted() – motsvarande för borttagningar.
 *   flushOutbox()          – skickar kön till molnet om en användare är inloggad.
 *   syncForUser()          – vid inloggning/appstart: importera lokal legacy-
 *                            historik, hämta molnet och återställ lokala
 *                            historiker (utan att skriva över något).
 *
 * Ett nätverksfel får aldrig kosta ett genomfört test: posten ligger redan i
 * den lokala historiken och blir kvar i outboxen tills nästa försök lyckas.
 */
import { cloudIdFor } from "./ids";
import {
  SESSIONS_SCHEMA_VERSION,
  canonicalize,
  collectLocalSessions,
  enqueueDelete,
  enqueueUpsert,
  hasStorage,
  markOutboxFailed,
  mergeIntoLegacyStores,
  otherUserSyncedHere,
  pendingDeleteIds,
  readOutbox,
  removeFromOutbox,
  updateUserSyncState,
  userSyncState,
  type MergeReport,
} from "./local";
import type { CloudGateway, LegacyRecord, SyncStatus, TestSession } from "./types";

export const SESSIONS_CHANGED_EVENT = "sg4:sessions-changed";

// ─── Molnport (utbytbar i tester) ──────────────────────────────────────────

let gatewayOverride: CloudGateway | null = null;
let gatewayPromise: Promise<CloudGateway> | null = null;

export function setCloudGateway(gateway: CloudGateway | null) {
  gatewayOverride = gateway;
  gatewayPromise = null;
}

async function getGateway(): Promise<CloudGateway> {
  if (gatewayOverride) return gatewayOverride;
  if (!gatewayPromise) gatewayPromise = import("./cloud").then((m) => m.supabaseGateway);
  return gatewayPromise;
}

// ─── Status (för UI, t.ex. kontosidan) ─────────────────────────────────────

let statusSnapshot: SyncStatus = { pending: 0, failed: 0, syncing: false, userId: null };
let syncing = 0;
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function computeStatus(): SyncStatus {
  const items = hasStorage() ? readOutbox() : [];
  const user = currentUserId ? userSyncState(currentUserId) : {};
  return {
    pending: items.length,
    failed: items.filter((item) => item.attempts > 0).length,
    lastSyncAt: user.lastSyncAt,
    lastError: user.lastError,
    syncing: syncing > 0,
    userId: currentUserId,
  };
}

function emit() {
  statusSnapshot = computeStatus();
  for (const listener of listeners) listener();
}

export function getSyncStatus(): SyncStatus {
  return statusSnapshot;
}

export function subscribeSyncStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSIONS_CHANGED_EVENT));
}

// ─── Skriv-hookar ──────────────────────────────────────────────────────────

/**
 * Registrerar en nyss lokalt sparad session. Returnerar den kanoniska
 * sessionen (eller null om testet saknar adapter/ogiltigt datum).
 */
export function recordSessionSaved(testId: string, record: LegacyRecord): TestSession | null {
  if (!hasStorage()) return null;
  const session = canonicalize(testId, record);
  if (!session) return null;
  enqueueUpsert(session);
  emit();
  void flushOutbox().catch(() => undefined);
  return session;
}

/** Registrerar en lokalt borttagen session så att molnet följer med. */
export function recordSessionDeleted(testId: string, legacyId: string) {
  if (!hasStorage()) return;
  enqueueDelete(cloudIdFor(testId, legacyId), testId);
  emit();
  void flushOutbox().catch(() => undefined);
}

// ─── Outbox → moln ─────────────────────────────────────────────────────────

let flushing: Promise<{ sent: number; failed: number }> | null = null;

export function flushOutbox(userIdHint?: string): Promise<{ sent: number; failed: number }> {
  if (flushing) return flushing;
  flushing = doFlush(userIdHint).finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(userIdHint?: string) {
  const empty = { sent: 0, failed: 0 };
  if (!hasStorage()) return empty;
  const items = readOutbox();
  if (!items.length) return empty;

  let gateway: CloudGateway;
  let userId: string | null;
  try {
    gateway = await getGateway();
    userId = userIdHint ?? (await gateway.currentUserId());
  } catch {
    return empty;
  }
  if (!userId) return empty; // gäst – kön väntar tills någon loggar in
  currentUserId = userId;

  let sent = 0;
  let failed = 0;
  const upserts = items.filter((i) => i.op === "upsert");
  const deletes = items.filter((i) => i.op === "delete");

  if (upserts.length) {
    const ids = new Set(upserts.map((i) => (i.op === "upsert" ? i.session.id : "")));
    try {
      await gateway.upsert(userId, upserts.map((i) => (i.op === "upsert" ? i.session : null!)).filter(Boolean));
      removeFromOutbox(ids);
      sent += ids.size;
    } catch (error) {
      markOutboxFailed(ids, error instanceof Error ? error.message : String(error));
      failed += ids.size;
    }
  }

  if (deletes.length) {
    const ids = new Set(deletes.map((i) => (i.op === "delete" ? i.id : "")));
    try {
      await gateway.remove(userId, [...ids]);
      removeFromOutbox(ids);
      sent += ids.size;
    } catch (error) {
      markOutboxFailed(ids, error instanceof Error ? error.message : String(error));
      failed += ids.size;
    }
  }

  if (sent) updateUserSyncState(userId, { lastSyncAt: new Date().toISOString() });
  emit();
  return { sent, failed };
}

// ─── Inloggning/appstart: import + restore ─────────────────────────────────

export type SyncReport = {
  userId: string;
  imported: number;
  /** true när bulk-importen hoppades över för att ett annat konto redan synkat på enheten. */
  importSkippedSharedDevice?: boolean;
  fetched: number;
  merge: MergeReport;
  error?: string;
};

const inFlight = new Map<string, Promise<SyncReport>>();
const syncedThisLoad = new Set<string>();

export function syncForUser(userId: string, options: { force?: boolean } = {}): Promise<SyncReport> {
  const running = inFlight.get(userId);
  if (running) return running;
  if (!options.force && syncedThisLoad.has(userId)) {
    return Promise.resolve({ userId, imported: 0, fetched: 0, merge: { added: 0, kept: 0, unmapped: 0, addedByTest: {} } });
  }
  const promise = doSync(userId).finally(() => inFlight.delete(userId));
  inFlight.set(userId, promise);
  return promise;
}

async function doSync(userId: string): Promise<SyncReport> {
  const report: SyncReport = { userId, imported: 0, fetched: 0, merge: { added: 0, kept: 0, unmapped: 0, addedByTest: {} } };
  if (!hasStorage()) return report;
  currentUserId = userId;
  syncing += 1;
  emit();
  try {
    const gateway = await getGateway();
    const state = userSyncState(userId);

    // 1. Engångsimport av all lokal legacy-historik (idempotent upsert).
    //    Hoppas över på delade enheter: har ett annat konto redan synkat här kan
    //    de lokala historikerna innehålla dess sessioner. Nya tester går ändå
    //    via outboxen, så inget som spelas efter inloggning går förlorat.
    if (state.importedSchema !== SESSIONS_SCHEMA_VERSION) {
      if (otherUserSyncedHere(userId)) {
        report.importSkippedSharedDevice = true;
      } else {
        const tombstones = pendingDeleteIds();
        const local = collectLocalSessions().filter((s) => !tombstones.has(s.id));
        if (local.length) await gateway.upsert(userId, local);
        report.imported = local.length;
      }
      updateUserSyncState(userId, { importedSchema: SESSIONS_SCHEMA_VERSION, importedAt: new Date().toISOString() });
    }

    // 2. Skicka det som ligger i kön (nya tester, borttagningar).
    await flushOutbox(userId);

    // 3. Hämta molnet och fyll på lokala historiker där något saknas.
    const cloud = await gateway.fetchAll(userId);
    report.fetched = cloud.length;
    report.merge = mergeIntoLegacyStores(cloud, pendingDeleteIds());

    updateUserSyncState(userId, { restoredAt: new Date().toISOString(), lastSyncAt: new Date().toISOString(), lastError: undefined });
    syncedThisLoad.add(userId);
    if (report.merge.added > 0) notifySessionsChanged();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.error = message;
    updateUserSyncState(userId, { lastError: message });
  } finally {
    syncing -= 1;
    emit();
  }
  return report;
}

/** Endast för tester: nollställ in-memory-tillstånd. */
export function __resetSyncStateForTests() {
  inFlight.clear();
  syncedThisLoad.clear();
  flushing = null;
  syncing = 0;
  currentUserId = null;
  statusSnapshot = { pending: 0, failed: 0, syncing: false, userId: null };
}
