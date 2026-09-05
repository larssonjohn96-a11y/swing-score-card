/**
 * Lokal persistens för sessionslagret.
 *
 * - Läser/skriver de befintliga legacy-historikerna generiskt via adapters
 *   (aldrig destruktivt: nya poster läggs till, befintliga skrivs inte över).
 * - Outbox: kö med sessioner/borttagningar som väntar på molnet.
 * - Sync-state: per användare, för att slippa göra om bulk-importen.
 */
import { SESSION_LAYER_KEYS } from "./keys";
import {
  SESSION_ADAPTERS,
  adapterForTest,
  fromCanonical,
  isLegacyRecord,
  legacyIdOf,
  toCanonical,
  type SessionAdapter,
} from "./adapters";
import type { LegacyRecord, OutboxItem, SyncState, TestSession, UserSyncState } from "./types";

/** Höj när legacy-mappningen ändras så att bulk-importen körs om (idempotent). */
export const SESSIONS_SCHEMA_VERSION = 1;

export function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Kvot slut eller privat läge – lokal historik behålls som den var.
  }
}

// ─── Legacy-historiker ──────────────────────────────────────────────────────

export function readLegacyStore(adapter: SessionAdapter): LegacyRecord[] {
  const parsed = readJson<unknown>(adapter.storageKey, []);
  return Array.isArray(parsed) ? parsed.filter(isLegacyRecord) : [];
}

function dateOf(adapter: SessionAdapter, record: LegacyRecord): string {
  const value = record[adapter.dateField];
  return typeof value === "string" ? value : "";
}

export function writeLegacyStore(adapter: SessionAdapter, records: LegacyRecord[]) {
  const next = adapter.sortByDate
    ? [...records].sort((a, b) => dateOf(adapter, a).localeCompare(dateOf(adapter, b)))
    : records;
  writeJson(adapter.storageKey, next);
}

/** Alla lokala sessioner i kanonisk form (över samtliga kända historiker). */
export function collectLocalSessions(): TestSession[] {
  const result: TestSession[] = [];
  for (const adapter of SESSION_ADAPTERS) {
    for (const record of readLegacyStore(adapter)) {
      const session = toCanonical(adapter, record);
      if (session) result.push(session);
    }
  }
  return result;
}

/** Kanonisk form av en enskild lokal post (t.ex. direkt efter save). */
export function canonicalize(testId: string, record: LegacyRecord): TestSession | null {
  const adapter = adapterForTest(testId);
  if (!adapter) return null;
  return toCanonical(adapter, record);
}

export type MergeReport = { added: number; kept: number; unmapped: number; addedByTest: Record<string, number> };

/**
 * Lägger in molnsessioner i de lokala legacy-historikerna.
 * Lokala poster med samma id behålls alltid (lokalt vinner). Sessioner utan
 * känd adapter lämnas orörda i molnet.
 */
export function mergeIntoLegacyStores(sessions: TestSession[], skipIds: Set<string> = new Set()): MergeReport {
  const report: MergeReport = { added: 0, kept: 0, unmapped: 0, addedByTest: {} };
  const byTest = new Map<string, TestSession[]>();
  for (const session of sessions) {
    if (skipIds.has(session.id)) continue;
    const list = byTest.get(session.testId) ?? [];
    list.push(session);
    byTest.set(session.testId, list);
  }

  for (const [testId, list] of byTest) {
    const adapter = adapterForTest(testId);
    if (!adapter) {
      report.unmapped += list.length;
      continue;
    }
    const existing = readLegacyStore(adapter);
    const existingIds = new Set(existing.map((r) => r.id));
    const additions: LegacyRecord[] = [];
    for (const session of list) {
      const localId = legacyIdOf(session);
      if (existingIds.has(localId)) {
        report.kept += 1;
        continue;
      }
      existingIds.add(localId);
      additions.push(fromCanonical(adapter, session));
    }
    if (additions.length) {
      const merged = [...existing, ...additions];
      const sorted = adapter.sortByDate
        ? merged
        : [...merged].sort((a, b) => dateOf(adapter, a).localeCompare(dateOf(adapter, b)));
      writeLegacyStore(adapter, sorted);
      report.added += additions.length;
      report.addedByTest[testId] = additions.length;
    }
  }
  return report;
}

/** Ren merge/dedupe på session-id. Första förekomsten vinner (lokalt först). */
export function mergeSessions(...lists: TestSession[][]): TestSession[] {
  const seen = new Map<string, TestSession>();
  for (const list of lists) {
    for (const session of list) {
      if (!seen.has(session.id)) seen.set(session.id, session);
    }
  }
  return [...seen.values()].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
}

// ─── Outbox ────────────────────────────────────────────────────────────────

export function readOutbox(): OutboxItem[] {
  const parsed = readJson<unknown>(SESSION_LAYER_KEYS.outbox, []);
  return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
}

export function writeOutbox(items: OutboxItem[]) {
  writeJson(SESSION_LAYER_KEYS.outbox, items);
}

function itemId(item: OutboxItem) {
  return item.op === "upsert" ? item.session.id : item.id;
}

/** Köar en session för molnet. Ersätter ev. tidigare post med samma id. */
export function enqueueUpsert(session: TestSession) {
  const rest = readOutbox().filter((item) => itemId(item) !== session.id);
  writeOutbox([...rest, { op: "upsert", session, attempts: 0, queuedAt: new Date().toISOString() }]);
}

/** Köar en borttagning. Tar bort ev. väntande upsert med samma id. */
export function enqueueDelete(id: string, testId: string) {
  const rest = readOutbox().filter((item) => itemId(item) !== id);
  writeOutbox([...rest, { op: "delete", id, testId, attempts: 0, queuedAt: new Date().toISOString() }]);
}

export function pendingDeleteIds(): Set<string> {
  return new Set(readOutbox().filter((item) => item.op === "delete").map((item) => itemId(item)));
}

export function removeFromOutbox(ids: Set<string>) {
  writeOutbox(readOutbox().filter((item) => !ids.has(itemId(item))));
}

export function markOutboxFailed(ids: Set<string>, error: string) {
  writeOutbox(
    readOutbox().map((item) =>
      ids.has(itemId(item)) ? { ...item, attempts: item.attempts + 1, lastError: error } : item,
    ),
  );
}

// ─── Sync-state ────────────────────────────────────────────────────────────

export function readSyncState(): SyncState {
  const parsed = readJson<Partial<SyncState> | null>(SESSION_LAYER_KEYS.syncState, null);
  if (!parsed || typeof parsed !== "object") return { schemaVersion: SESSIONS_SCHEMA_VERSION, users: {} };
  return { schemaVersion: SESSIONS_SCHEMA_VERSION, users: parsed.users ?? {} };
}

export function userSyncState(userId: string): UserSyncState {
  return readSyncState().users[userId] ?? {};
}

/**
 * Har någon ANNAN användare redan importerat/återställt historik på den här
 * enheten? Då kan de lokala legacy-historikerna innehålla den användarens
 * sessioner och får inte bulk-importeras till ett nytt konto.
 */
export function otherUserSyncedHere(userId: string): boolean {
  const users = readSyncState().users;
  return Object.entries(users).some(([id, s]) => id !== userId && Boolean(s.importedSchema || s.restoredAt));
}

export function updateUserSyncState(userId: string, patch: UserSyncState) {
  const state = readSyncState();
  state.users[userId] = { ...state.users[userId], ...patch };
  writeJson(SESSION_LAYER_KEYS.syncState, state);
}
