import { supabase } from "@/integrations/supabase/client";
import type { ShotEvent, ShotSession } from "./types";

const EVENT_CACHE_KEY = "sg4.shot-bank.events.v1";
const SESSION_CACHE_KEY = "sg4.shot-bank.sessions.v1";
const OUTBOX_KEY = "sg4.shot-bank.outbox.v1";

export type ShotStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ShotSyncState = "pending" | "synced" | "failed";

type OutboxItem = {
  key: string;
  kind: "session" | "event";
  status: ShotSyncState;
  attempts: number;
  last_error?: string;
  data: ShotSession | ShotEvent;
};

export type ShotSyncStatus = {
  pending: number;
  failed: number;
  synced: number;
  state: "synced" | "pending" | "failed";
};

const listeners = new Set<(status: ShotSyncStatus) => void>();
let syncPromise: Promise<void> | null = null;
let onlineHandlerInstalled = false;

function browserStorage(): ShotStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function parseArray<T>(storage: ShotStorage | null, key: string): T[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(storage: ShotStorage | null, key: string, value: T[]) {
  storage?.setItem(key, JSON.stringify(value));
}

function loadOutbox(storage: ShotStorage | null = browserStorage()) {
  return parseArray<OutboxItem>(storage, OUTBOX_KEY);
}

function emit(storage: ShotStorage | null = browserStorage()) {
  const status = getShotSyncStatus(storage);
  listeners.forEach((listener) => listener(status));
}

function saveOutbox(items: OutboxItem[], storage: ShotStorage | null = browserStorage()) {
  const synced = items.filter((item) => item.status === "synced").slice(-300);
  const active = items.filter((item) => item.status !== "synced");
  writeArray(storage, OUTBOX_KEY, [...synced, ...active]);
  emit(storage);
}

export function loadLocalShotEvents(storage: ShotStorage | null = browserStorage()): ShotEvent[] {
  return parseArray<ShotEvent>(storage, EVENT_CACHE_KEY);
}

export function loadLocalShotSessions(storage: ShotStorage | null = browserStorage()): ShotSession[] {
  return parseArray<ShotSession>(storage, SESSION_CACHE_KEY);
}

function enqueue(item: OutboxItem, storage: ShotStorage) {
  const outbox = loadOutbox(storage);
  if (outbox.some((row) => row.key === item.key)) return;
  saveOutbox([...outbox, item], storage);
}

export function persistShotSessionLocally(session: ShotSession, storage: ShotStorage | null = browserStorage()) {
  if (!storage) return session;
  const sessions = loadLocalShotSessions(storage);
  const existing = sessions.find((row) => row.session_id === session.session_id);
  if (!existing) writeArray(storage, SESSION_CACHE_KEY, [...sessions, session]);
  enqueue({ key: `session:${session.session_id}`, kind: "session", status: "pending", attempts: 0, data: session }, storage);
  return existing ?? session;
}

export function persistShotEventLocally(event: ShotEvent, storage: ShotStorage | null = browserStorage()) {
  if (!storage) return event;
  const events = loadLocalShotEvents(storage);
  const existing = events.find((row) => row.event_id === event.event_id);
  if (existing) return existing;
  writeArray(storage, EVENT_CACHE_KEY, [...events, event]);
  enqueue({ key: `event:${event.event_id}`, kind: "event", status: "pending", attempts: 0, data: event }, storage);
  return event;
}

export function getShotSyncStatus(storage: ShotStorage | null = browserStorage()): ShotSyncStatus {
  const outbox = loadOutbox(storage);
  const pending = outbox.filter((item) => item.status === "pending").length;
  const failed = outbox.filter((item) => item.status === "failed").length;
  const synced = outbox.filter((item) => item.status === "synced").length;
  return { pending, failed, synced, state: failed ? "failed" : pending ? "pending" : "synced" };
}

export function subscribeShotSyncStatus(listener: (status: ShotSyncStatus) => void) {
  listeners.add(listener);
  listener(getShotSyncStatus());
  return () => listeners.delete(listener);
}

export function recordShotSession(session: ShotSession) {
  persistShotSessionLocally(session);
  scheduleShotSync();
  return session;
}

export function recordShot(event: ShotEvent) {
  const stored = persistShotEventLocally(event);
  scheduleShotSync();
  return stored;
}

function scheduleShotSync() {
  if (typeof window === "undefined") return;
  queueMicrotask(() => void syncShotOutbox());
}

function schemaNotReady(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("shot_events") || error.message?.includes("shot_sessions");
}

async function syncOne(item: OutboxItem, userId: string) {
  if (item.kind === "session") {
    const session = item.data as ShotSession;
    // Generated Database types are refreshed after the migration is applied remotely.
    // @ts-expect-error shot_sessions is introduced by the migration in this change.
    return supabase.from("shot_sessions").upsert({
      session_id: session.session_id,
      user_id: userId,
      source: session.source,
      activity_type: session.activity_type,
      started_at: session.started_at,
      completed_at: session.completed_at,
      status: session.status,
      schema_version: session.schema_version,
      metadata: session.metadata,
    }, { onConflict: "session_id", ignoreDuplicates: true });
  }

  const event = item.data as ShotEvent;
  // Generated Database types are refreshed after the migration is applied remotely.
  // @ts-expect-error shot_events is introduced by the migration in this change.
  return supabase.from("shot_events").upsert({
    event_id: event.event_id,
    user_id: userId,
    event_type: event.event_type,
    schema_version: event.schema_version,
    session_id: event.session_id,
    sequence: event.sequence,
    played_at: event.played_at,
    recorded_at: event.recorded_at,
    source: event.source,
    activity_type: event.activity_type,
    skill: event.skill,
    payload: event.payload,
    context: event.context,
    target_event_id: event.event_type === "shot_voided" ? event.target_event_id : null,
    reason: event.event_type === "shot_voided" ? event.reason : null,
  }, { onConflict: "event_id", ignoreDuplicates: true });
}

export async function syncShotOutbox() {
  if (syncPromise) return syncPromise;
  if (typeof window === "undefined" || (typeof navigator !== "undefined" && navigator.onLine === false)) return;

  syncPromise = (async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    let outbox = loadOutbox();
    const pending = [
      ...outbox.filter((item) => item.status === "pending" && item.kind === "session"),
      ...outbox.filter((item) => item.status === "pending" && item.kind === "event"),
    ];

    for (const item of pending) {
      const result = await syncOne(item, user.id);
      outbox = loadOutbox();
      const index = outbox.findIndex((row) => row.key === item.key);
      if (index < 0) continue;
      const error = result.error as { code?: string; message?: string } | null;
      if (!error) {
        outbox[index] = { ...outbox[index], status: "synced", attempts: outbox[index].attempts + 1, last_error: undefined };
      } else if (schemaNotReady(error)) {
        outbox[index] = { ...outbox[index], attempts: outbox[index].attempts + 1, last_error: error.message };
      } else {
        outbox[index] = { ...outbox[index], status: "failed", attempts: outbox[index].attempts + 1, last_error: error.message };
      }
      saveOutbox(outbox);
    }
  })().finally(() => { syncPromise = null; });

  return syncPromise;
}

export function retryShotSync() {
  const outbox = loadOutbox().map((item) => item.status === "failed" ? { ...item, status: "pending" as const, last_error: undefined } : item);
  saveOutbox(outbox);
  return syncShotOutbox();
}

export function startShotSync() {
  if (typeof window === "undefined") return () => undefined;
  void syncShotOutbox();
  if (!onlineHandlerInstalled) {
    window.addEventListener("online", syncShotOutbox);
    onlineHandlerInstalled = true;
  }
  return () => undefined;
}
