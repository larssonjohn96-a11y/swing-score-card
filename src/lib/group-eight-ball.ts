import { supabase } from "@/integrations/supabase/client";
import type { Friendship } from "@/lib/friends-cloud";
import {
  createMultiplayerSession,
  fetchMultiplayerSession,
  multiplayerTotals,
  readMultiplayerBootstrap,
  recordMultiplayerResult,
  subscribeMultiplayerSession,
  withMultiplayerTimeout,
  type MultiplayerMember,
  type MultiplayerSession,
  type MultiplayerStatus,
} from "@/lib/multiplayer-core";
import { EIGHT_BALL_MULTIPLAYER_ADAPTER, type EightBallMultiplayerResult } from "@/lib/multiplayer-tests";

const db = supabase as any;
const LEGACY_BOOTSTRAP_PREFIX = "sg4:eight-ball-group:bootstrap:";
let createSessionPromise: Promise<string> | null = null;

export type GroupSessionStatus = MultiplayerStatus;
export type GroupMember = MultiplayerMember;
export type GroupScore = { sessionId: string; userId: string; shotIndex: number; points: number; createdAt: string };
export type GroupSession = {
  id: string;
  hostUserId: string;
  testId: string;
  status: GroupSessionStatus;
  currentShot: number;
  currentPlayerIndex: number;
  createdAt: string;
  completedAt: string | null;
  members: GroupMember[];
  scores: GroupScore[];
};

function fromCore(session: MultiplayerSession<EightBallMultiplayerResult> | null): GroupSession | null {
  if (!session) return null;
  return {
    id: session.id,
    hostUserId: session.hostUserId,
    testId: session.testId,
    status: session.status,
    currentShot: session.currentStep,
    currentPlayerIndex: session.currentPlayerIndex,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    members: session.members,
    scores: session.results.map((row) => ({
      sessionId: row.sessionId,
      userId: row.userId,
      shotIndex: row.stepIndex,
      points: row.result.points,
      createdAt: row.createdAt,
    })),
  };
}

function writeLegacyBootstrap(session: GroupSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${LEGACY_BOOTSTRAP_PREFIX}${session.id}`, JSON.stringify(session));
  } catch {
    // Route can still fall back to backend fetch.
  }
}

export function readEightBallBootstrap(id: string): GroupSession | null {
  return fromCore(readMultiplayerBootstrap<EightBallMultiplayerResult>(EIGHT_BALL_MULTIPLAYER_ADAPTER.testId, id));
}

export async function createEightBallGroupSession(friendships: Friendship[]) {
  if (createSessionPromise) return createSessionPromise;
  const selected = friendships.slice(0, 3);
  createSessionPromise = (async () => {
    const id = await createMultiplayerSession(
      EIGHT_BALL_MULTIPLAYER_ADAPTER,
      selected.map((friend) => ({ id: friend.other.id, displayName: friend.other.displayName })),
    );
    const coreBootstrap = readMultiplayerBootstrap<EightBallMultiplayerResult>(EIGHT_BALL_MULTIPLAYER_ADAPTER.testId, id);
    const legacyBootstrap = fromCore(coreBootstrap);
    if (legacyBootstrap) writeLegacyBootstrap(legacyBootstrap);
    return id;
  })();
  try {
    return await createSessionPromise;
  } finally {
    createSessionPromise = null;
  }
}

export async function fetchEightBallGroupSession(id: string): Promise<GroupSession | null> {
  return fromCore(await fetchMultiplayerSession(EIGHT_BALL_MULTIPLAYER_ADAPTER, id));
}

export async function recordEightBallGroupScore(sessionId: string, userId: string, shotIndex: number, points: number) {
  const result = await recordMultiplayerResult(
    EIGHT_BALL_MULTIPLAYER_ADAPTER,
    sessionId,
    userId,
    shotIndex,
    { points },
  );
  return {
    status: result.status,
    currentShot: result.currentShot ?? result.currentStep ?? shotIndex,
    currentPlayerIndex: result.currentPlayerIndex,
  };
}

export async function correctEightBallGroupScore(sessionId: string, userId: string, shotIndex: number, points: number) {
  const { error } = await withMultiplayerTimeout<any>(db.rpc("correct_eight_ball_group_score", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_shot_index: shotIndex,
    p_points: points,
  }), 7000);
  if (error) throw new Error(error.message);
}

export async function undoEightBallGroupScore(sessionId: string) {
  const { data, error } = await withMultiplayerTimeout<any>(db.rpc("undo_eight_ball_group_score", {
    p_session_id: sessionId,
  }), 7000);
  if (error) throw new Error(error.message);
  return data as { status: GroupSessionStatus; currentShot: number; currentPlayerIndex: number; userId: string };
}

export async function listActiveEightBallGroupSessions(): Promise<Array<{ id: string; hostUserId: string; createdAt: string }>> {
  try {
    const { data, error } = await withMultiplayerTimeout<any>(
      db.from("group_sessions")
        .select("id,host_user_id,created_at")
        .eq("test_id", EIGHT_BALL_MULTIPLAYER_ADAPTER.testId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      5000,
    );
    if (error || !data) return [];
    return data.map((session: any) => ({ id: session.id, hostUserId: session.host_user_id, createdAt: session.created_at }));
  } catch {
    return [];
  }
}

export function subscribeEightBallGroupSession(sessionId: string, onChange: () => void) {
  return subscribeMultiplayerSession(sessionId, onChange);
}

export function groupTotals(session: GroupSession) {
  const coreSession: MultiplayerSession<EightBallMultiplayerResult> = {
    id: session.id,
    hostUserId: session.hostUserId,
    testId: session.testId,
    status: session.status,
    mode: "turn-based",
    totalSteps: 40,
    currentStep: session.currentShot,
    currentPlayerIndex: session.currentPlayerIndex,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    members: session.members,
    results: session.scores.map((score) => ({
      sessionId: score.sessionId,
      userId: score.userId,
      stepIndex: score.shotIndex,
      result: { points: score.points },
      createdAt: score.createdAt,
    })),
  };
  return multiplayerTotals(coreSession, (result) => result.points);
}
