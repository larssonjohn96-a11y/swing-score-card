import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const BOOTSTRAP_PREFIX = "sg4:multiplayer:bootstrap:";

export type MultiplayerStatus = "active" | "completed" | "cancelled";
export type MultiplayerMode = "turn-based" | "simultaneous";

export type MultiplayerMember = {
  sessionId: string;
  userId: string;
  seat: number;
  displayName: string;
};

export type MultiplayerResult<T = unknown> = {
  sessionId: string;
  userId: string;
  stepIndex: number;
  result: T;
  createdAt: string;
};

export type MultiplayerSession<T = unknown> = {
  id: string;
  hostUserId: string;
  testId: string;
  status: MultiplayerStatus;
  mode: MultiplayerMode;
  totalSteps: number;
  currentStep: number;
  currentPlayerIndex: number;
  createdAt: string;
  completedAt: string | null;
  members: MultiplayerMember[];
  results: MultiplayerResult<T>[];
  config?: Record<string, unknown>;
};

export type MultiplayerTestAdapter<T = unknown> = {
  testId: string;
  mode: MultiplayerMode;
  totalSteps: number;
  maxPlayers?: number;
  createRpc?: string;
  fetchRpc?: string;
  recordRpc?: string;
  toRpcResult?: (result: T) => Record<string, unknown>;
  mapLegacyScore?: (row: any) => T;
};

export function withMultiplayerTimeout<T>(promise: PromiseLike<T>, ms = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Sessionen tog för lång tid att svara.")), ms);
    promise.then((value) => {
      window.clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

function bootstrapKey(testId: string, sessionId: string) {
  return `${BOOTSTRAP_PREFIX}${testId}:${sessionId}`;
}

export function saveMultiplayerBootstrap<T>(session: MultiplayerSession<T>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(bootstrapKey(session.testId, session.id), JSON.stringify(session));
  } catch {
    // Bootstrap is only a fast-path; backend state remains source of truth.
  }
}

export function readMultiplayerBootstrap<T>(testId: string, sessionId: string, consume = false): MultiplayerSession<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const key = bootstrapKey(testId, sessionId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    if (consume) sessionStorage.removeItem(key);
    return JSON.parse(raw) as MultiplayerSession<T>;
  } catch {
    return null;
  }
}

export function mapMultiplayerSession<T>(payload: any, adapter: MultiplayerTestAdapter<T>): MultiplayerSession<T> | null {
  if (!payload?.id) return null;
  const rows = payload.results ?? payload.scores ?? [];
  return {
    id: payload.id,
    hostUserId: payload.host_user_id ?? payload.hostUserId ?? "",
    testId: payload.test_id ?? payload.testId ?? adapter.testId,
    status: payload.status,
    mode: payload.mode ?? adapter.mode,
    totalSteps: payload.total_steps ?? payload.totalSteps ?? adapter.totalSteps,
    currentStep: payload.current_step ?? payload.current_shot ?? payload.currentStep ?? 0,
    currentPlayerIndex: payload.current_player_index ?? payload.currentPlayerIndex ?? 0,
    createdAt: payload.created_at ?? payload.createdAt,
    completedAt: payload.completed_at ?? payload.completedAt ?? null,
    config: payload.config ?? {},
    members: (payload.members ?? []).map((m: any) => ({
      sessionId: m.session_id ?? m.sessionId,
      userId: m.user_id ?? m.userId,
      seat: m.seat,
      displayName: m.display_name ?? m.displayName ?? "Spelare",
    })),
    results: rows.map((r: any) => ({
      sessionId: r.session_id ?? r.sessionId,
      userId: r.user_id ?? r.userId,
      stepIndex: r.step_index ?? r.shot_index ?? r.stepIndex,
      result: r.result ?? (adapter.mapLegacyScore ? adapter.mapLegacyScore(r) : r.points),
      createdAt: r.created_at ?? r.createdAt,
    })),
  };
}

export async function createMultiplayerSession<T>(
  adapter: MultiplayerTestAdapter<T>,
  members: Array<{ id: string; displayName: string }>,
): Promise<string> {
  const maxPlayers = adapter.maxPlayers ?? 4;
  if (members.length < 1 || members.length > maxPlayers - 1) throw new Error(`Välj 1-${maxPlayers - 1} vänner.`);

  const rpc = adapter.createRpc ?? "create_multiplayer_session";
  const args = adapter.createRpc
    ? { p_member_ids: members.map((m) => m.id) }
    : {
        p_test_id: adapter.testId,
        p_member_ids: members.map((m) => m.id),
        p_total_steps: adapter.totalSteps,
        p_mode: adapter.mode,
        p_config: {},
      };

  const { data, error } = await withMultiplayerTimeout(db.rpc(rpc, args), 8000);
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "string") throw new Error("Multiplayer-sessionen skapades inte korrekt.");

  let hostUserId = "";
  try {
    const auth = await withMultiplayerTimeout(supabase.auth.getSession(), 1200);
    hostUserId = auth.data.session?.user.id ?? "";
  } catch {
    // Live fetch fills this in if auth bootstrap is slow.
  }

  const id = data as string;
  saveMultiplayerBootstrap<T>({
    id,
    hostUserId,
    testId: adapter.testId,
    status: "active",
    mode: adapter.mode,
    totalSteps: adapter.totalSteps,
    currentStep: 0,
    currentPlayerIndex: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    config: {},
    members: [
      { sessionId: id, userId: hostUserId, seat: 0, displayName: "Du" },
      ...members.map((m, index) => ({ sessionId: id, userId: m.id, seat: index + 1, displayName: m.displayName })),
    ],
    results: [],
  });
  return id;
}

export async function fetchMultiplayerSession<T>(adapter: MultiplayerTestAdapter<T>, id: string): Promise<MultiplayerSession<T> | null> {
  const bootstrap = readMultiplayerBootstrap<T>(adapter.testId, id, true);
  if (bootstrap) return bootstrap;

  const rpc = adapter.fetchRpc ?? "get_multiplayer_session";
  try {
    const { data, error } = await withMultiplayerTimeout(db.rpc(rpc, { p_session_id: id }), 5000);
    if (!error && data) return mapMultiplayerSession(data, adapter);
  } catch {
    // Table fallback keeps sessions readable while migrations/deployments converge.
  }

  const result = await withMultiplayerTimeout(Promise.all([
    db.from("group_sessions").select("*").eq("id", id).maybeSingle(),
    db.from("group_session_members").select("session_id,user_id,seat,display_name").eq("session_id", id).order("seat"),
    db.from("group_session_scores").select("*").eq("session_id", id).order("shot_index").order("created_at"),
  ]), 5000);
  const [{ data: session, error: sessionError }, { data: sessionMembers, error: memberError }, { data: results, error: resultError }] = result;
  if (sessionError || memberError || resultError || !session) return null;
  return mapMultiplayerSession({ ...session, members: sessionMembers, results }, adapter);
}

export async function recordMultiplayerResult<T>(
  adapter: MultiplayerTestAdapter<T>,
  sessionId: string,
  userId: string,
  stepIndex: number,
  result: T,
) {
  const rpc = adapter.recordRpc ?? "record_multiplayer_result";
  const args = adapter.recordRpc
    ? { p_session_id: sessionId, p_user_id: userId, p_shot_index: stepIndex, ...(adapter.toRpcResult?.(result) ?? { p_result: result }) }
    : { p_session_id: sessionId, p_user_id: userId, p_step_index: stepIndex, p_result: result };
  const { data, error } = await withMultiplayerTimeout(db.rpc(rpc, args), 7000);
  if (error) throw new Error(error.message);
  return data as { status: MultiplayerStatus; currentStep?: number; currentShot?: number; currentPlayerIndex: number };
}

export function subscribeMultiplayerSession(sessionId: string, onChange: () => void) {
  const channel = db
    .channel(`multiplayer-${sessionId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_sessions", filter: `id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_session_scores", filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe();
  return () => { void db.removeChannel(channel); };
}

export function multiplayerTotals<T>(session: MultiplayerSession<T>, score: (result: T) => number) {
  return session.members.map((member) => {
    const results = session.results.filter((r) => r.userId === member.userId);
    return { ...member, score: results.reduce((sum, row) => sum + score(row.result), 0), shots: results.length };
  });
}
