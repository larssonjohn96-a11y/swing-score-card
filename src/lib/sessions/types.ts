/**
 * Kanonisk representation av en genomförd SG4-testsession.
 *
 * Detta är datagrunden – INTE en beräkningsmotor. HCP/kategori-index räknas
 * fortfarande enbart i src/lib/category-index.ts, som läser de befintliga
 * lokala historikerna. Sessionslagret ser till att samma råa sessionsdata
 * finns lokalt och i molnet, så att gammal och ny enhet ger samma HCP.
 */

export type TestType = "hcp" | "training";

/** Samma kategorislugs som HCP-motorn använder (src/lib/sg-handicap.ts). */
export type SessionCategory =
  | "driving"
  | "approach"
  | "around-the-green"
  | "puttning"
  | "speed";

export type TestSession = {
  /** UUID – primärnyckel i molnet. Samma som legacy-id när det redan är ett UUID. */
  id: string;
  /** Stabilt test-id, t.ex. "approach-precision", "speed", "eight-ball". */
  testId: string;
  category: SessionCategory;
  testType: TestType;
  /** ISO 8601-tidsstämpel. */
  playedAt: string;
  /** Testets huvudresultat (poäng/procent/PEI …) eller null. */
  score: number | null;
  /** Rå test-HCP från just detta test (aldrig stabiliserad). */
  testHandicap: number | null;
  /**
   * Alla övriga fält från den ursprungliga sessionen (platt objekt) plus
   * eventuella reserverade fält: legacyId, legacyDate, variant.
   */
  metrics: Record<string, unknown>;
  /** Råa slag/puttar/poänglista. */
  shots: unknown;
  testVersion: number;
  scoringVersion: number;
};

/** Rad i public.test_sessions. */
export type TestSessionRow = {
  id: string;
  user_id: string;
  test_id: string;
  category: string;
  test_type: string;
  played_at: string;
  score: number | null;
  test_handicap: number | null;
  metrics: unknown;
  shots: unknown;
  test_version: number;
  scoring_version: number;
};

export type OutboxItem =
  | {
      op: "upsert";
      session: TestSession;
      attempts: number;
      queuedAt: string;
      lastError?: string;
    }
  | {
      op: "delete";
      id: string;
      testId: string;
      attempts: number;
      queuedAt: string;
      lastError?: string;
    };

export type UserSyncState = {
  /** Schemaversion för den lokala legacy-importen som gjorts för användaren. */
  importedSchema?: number;
  importedAt?: string;
  restoredAt?: string;
  lastSyncAt?: string;
  lastError?: string;
};

export type SyncState = {
  schemaVersion: number;
  users: Record<string, UserSyncState>;
};

export type SyncStatus = {
  /** Antal sessioner/borttagningar som väntar på molnet. */
  pending: number;
  /** Antal poster som har misslyckats minst en gång. */
  failed: number;
  lastSyncAt?: string;
  lastError?: string;
  syncing: boolean;
  /** Inloggad användare som synken gäller, annars null (gäst = enbart lokalt). */
  userId: string | null;
};

/**
 * Ett generellt legacy-post-objekt: platt, med id, ett datumfält och ett
 * valfritt fält med råa slag.
 */
export type LegacyRecord = Record<string, unknown> & { id: string };

/** Minimal port mot molnet – gör lagret testbart utan nätverk. */
export type CloudGateway = {
  currentUserId(): Promise<string | null>;
  upsert(userId: string, sessions: TestSession[]): Promise<void>;
  remove(userId: string, ids: string[]): Promise<void>;
  fetchAll(userId: string): Promise<TestSession[]>;
};
