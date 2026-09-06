import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LEGACY_KEYS } from "./keys";
import { adapterForTest, fromCanonical, toCanonical } from "./adapters";
import { cloudIdFor, isUuid } from "./ids";
import { collectLocalSessions, mergeIntoLegacyStores, mergeSessions, readOutbox } from "./local";
import { __resetSyncStateForTests, flushOutbox, recordSessionSaved, setCloudGateway, syncForUser } from "./sync";
import type { CloudGateway, TestSession } from "./types";

// ─── Minimal localStorage/window-mock (vitest kör i Node) ──────────────────

function installWindow() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  return localStorage;
}

function readKey<T>(key: string): T[] {
  const raw = (globalThis as unknown as { window: { localStorage: { getItem(k: string): string | null } } }).window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeKey(key: string, value: unknown) {
  (globalThis as unknown as { window: { localStorage: { setItem(k: string, v: string): void } } }).window.localStorage.setItem(key, JSON.stringify(value));
}

function session(overrides: Partial<TestSession> & { id: string }): TestSession {
  return {
    testId: "approach-precision",
    category: "approach",
    testType: "hcp",
    playedAt: "2026-01-01T10:00:00.000Z",
    score: 50,
    testHandicap: 12,
    metrics: {},
    shots: [],
    testVersion: 1,
    scoringVersion: 1,
    ...overrides,
  };
}

function memoryGateway(opts: { failUpsert?: boolean; cloud?: TestSession[] } = {}) {
  const cloud = new Map<string, TestSession>((opts.cloud ?? []).map((s) => [s.id, s]));
  const gateway: CloudGateway & { cloud: Map<string, TestSession>; upserts: number } = {
    cloud,
    upserts: 0,
    async currentUserId() {
      return "user-1";
    },
    async upsert(_userId, sessions) {
      gateway.upserts += 1;
      if (opts.failUpsert) throw new Error("offline");
      for (const s of sessions) if (!cloud.has(s.id)) cloud.set(s.id, s); // ON CONFLICT DO NOTHING
    },
    async remove(_userId, ids) {
      for (const id of ids) cloud.delete(id);
    },
    async fetchAll() {
      return [...cloud.values()];
    },
  };
  return gateway;
}

beforeEach(() => {
  installWindow();
  __resetSyncStateForTests();
});

afterEach(() => {
  setCloudGateway(null);
  delete (globalThis as { window?: unknown }).window;
});

// ─── Merge/dedupe ──────────────────────────────────────────────────────────

describe("mergeSessions", () => {
  it("dedupar på id, lokalt först vinner, sorterar på playedAt", () => {
    const local = [session({ id: "a", score: 1, playedAt: "2026-02-01T00:00:00.000Z" })];
    const cloud = [
      session({ id: "a", score: 99 }),
      session({ id: "b", playedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const merged = mergeSessions(local, cloud);
    expect(merged.map((s) => s.id)).toEqual(["b", "a"]);
    expect(merged.find((s) => s.id === "a")?.score).toBe(1);
  });
});

// ─── Legacy-id och test-HCP bevaras ────────────────────────────────────────

describe("adapters", () => {
  it("mappar icke-UUID-id deterministiskt och återställer originalet", () => {
    const adapter = adapterForTest("speed")!;
    const legacy = { id: "1700000000000", date: "2026-01-05T09:00:00.000Z", shots: [{ ball: 150 }], handicap: 8.4, score: 71 };
    const canon = toCanonical(adapter, legacy)!;
    expect(isUuid(canon.id)).toBe(true);
    expect(canon.id).toBe(cloudIdFor("speed", "1700000000000"));
    expect(canon.metrics.legacyId).toBe("1700000000000");
    // Äldre Speed-sessioner saknar testHandicap → handicap är råvärdet.
    expect(canon.testHandicap).toBe(8.4);
    expect(canon.score).toBe(71);

    const restored = fromCanonical(adapter, canon);
    expect(restored.id).toBe("1700000000000");
    expect(restored.date).toBe(legacy.date);
    expect(restored.shots).toEqual(legacy.shots);
    expect(restored.testHandicap).toBe(8.4);
    expect(restored.handicap).toBe(8.4);
    expect(restored.score).toBe(71);
  });

  it("är förlustfri för HCP-tester (okända fält hamnar i metrics och kommer tillbaka)", () => {
    const adapter = adapterForTest("short-putt")!;
    const id = "3f2c1b0a-1111-4222-8333-444455556666";
    const legacy = { id, date: "2026-03-01T12:00:00.000Z", putts: [1, 0, 1], score: 66.7, handicap: 14, made: 2, variant: "1.5m" };
    const canon = toCanonical(adapter, legacy)!;
    expect(canon.id).toBe(id);
    expect(canon.testHandicap).toBe(14);
    expect(canon.metrics).toEqual({ made: 2, variant: "1.5m" });
    expect(fromCanonical(adapter, canon)).toEqual(legacy);
  });
});

// ─── Offline: lokal session behålls + ligger kvar i outbox ─────────────────

describe("recordSessionSaved offline", () => {
  it("behåller den lokala posten och kön när molnet fallerar", async () => {
    const gateway = memoryGateway({ failUpsert: true });
    setCloudGateway(gateway);
    const record = { id: "5e1d2c3b-aaaa-4bbb-8ccc-dddddddddddd", date: "2026-04-01T08:00:00.000Z", shots: [1], score: 40, handicap: 20 };
    writeKey(LEGACY_KEYS.offtee, [record]);

    recordSessionSaved("off-the-tee", record);
    await flushOutbox("user-1");

    expect(readKey(LEGACY_KEYS.offtee)).toEqual([record]);
    const outbox = readOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].attempts).toBe(1);
    expect(outbox[0].lastError).toBe("offline");
    expect(gateway.cloud.size).toBe(0);
  });

  it("skickar kön när nätet är tillbaka", async () => {
    const failing = memoryGateway({ failUpsert: true });
    setCloudGateway(failing);
    const record = { id: "5e1d2c3b-aaaa-4bbb-8ccc-eeeeeeeeeeee", date: "2026-04-02T08:00:00.000Z", shots: [1], score: 40, handicap: 20 };
    recordSessionSaved("off-the-tee", record);
    await flushOutbox("user-1");
    expect(readOutbox()).toHaveLength(1);

    const online = memoryGateway();
    setCloudGateway(online);
    const result = await flushOutbox("user-1");
    expect(result.sent).toBe(1);
    expect(readOutbox()).toHaveLength(0);
    expect(online.cloud.has(record.id)).toBe(true);
  });
});

// ─── Restore till legacy-cache ─────────────────────────────────────────────

describe("restore", () => {
  it("mergeIntoLegacyStores fyller på legacy-nyckeln utan att skriva över lokala poster", () => {
    const localId = "11111111-2222-4333-8444-555555555555";
    writeKey(LEGACY_KEYS.precision, [{ id: localId, date: "2026-01-01T10:00:00.000Z", shots: [], score: 1, handicap: 30 }]);

    const report = mergeIntoLegacyStores([
      session({ id: localId, score: 999 }), // finns lokalt → lokalt vinner
      session({ id: "66666666-7777-4888-8999-aaaaaaaaaaaa", playedAt: "2026-01-02T10:00:00.000Z", score: 55, testHandicap: 9 }),
    ]);

    expect(report.kept).toBe(1);
    expect(report.added).toBe(1);
    const rows = readKey<{ id: string; score: number; handicap: number; date: string }>(LEGACY_KEYS.precision);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === localId)?.score).toBe(1);
    const added = rows.find((r) => r.id !== localId)!;
    expect(added.score).toBe(55);
    expect(added.handicap).toBe(9);
    expect(added.date).toBe("2026-01-02T10:00:00.000Z");
  });

  it("syncForUser importerar lokalt, hämtar molnet och återskapar legacy-caches på ny enhet", async () => {
    const cloudSpeed = session({
      id: "abcdefab-1111-4222-8333-444444444444",
      testId: "speed",
      category: "speed",
      playedAt: "2026-02-10T10:00:00.000Z",
      score: 70,
      testHandicap: 6.5,
      metrics: { avgBallSpeed: 150, context: "simulator" },
      shots: [{ ball: 150 }],
    });
    const gateway = memoryGateway({ cloud: [cloudSpeed] });
    setCloudGateway(gateway);
    writeKey(LEGACY_KEYS.shortgame, [{ id: "99999999-8888-4777-8666-555555555555", date: "2026-02-01T10:00:00.000Z", shots: [], score: 60, handicap: 11 }]);

    const report = await syncForUser("user-1");

    expect(report.error).toBeUndefined();
    expect(report.imported).toBe(1);
    expect(gateway.cloud.size).toBe(2);
    expect(report.merge.added).toBe(1);
    const speed = readKey<Record<string, unknown>>(LEGACY_KEYS.speed);
    expect(speed).toHaveLength(1);
    expect(speed[0]).toMatchObject({ id: cloudSpeed.id, date: cloudSpeed.playedAt, testHandicap: 6.5, handicap: 6.5, score: 70, avgBallSpeed: 150 });
    // Lokal historik oförändrad
    expect(readKey(LEGACY_KEYS.shortgame)).toHaveLength(1);
    // Kanonisk vy ser båda
    expect(collectLocalSessions().map((s) => s.testId).sort()).toEqual(["short-game", "speed"]);
  });

  it("gäst (ingen användare) lämnar allt lokalt", async () => {
    const gateway = memoryGateway();
    gateway.currentUserId = async () => null;
    setCloudGateway(gateway);
    recordSessionSaved("approach-precision", { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", date: "2026-05-01T10:00:00.000Z", shots: [], score: 1, handicap: 1 });
    await flushOutbox();
    expect(gateway.cloud.size).toBe(0);
    expect(readOutbox()).toHaveLength(1);
  });
});
