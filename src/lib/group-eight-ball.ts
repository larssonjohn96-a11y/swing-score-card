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

export function readEightBallBootstrap(id: string): GroupSession | null {
  return fromCore(readMultiplayerBootstrap<EightBallMultiplayerResult>(EIGHT_BALL_MULTIPLAYER_ADAPTER.testId, id));
}

export async function createEightBallGroupSession(friendships: Friendship[]) {
  if (createSessionPromise) return createSessionPromise;
  const selected = friendships.slice(0, 3);
  createSessionPromise = createMultiplayerSession(
    EIGHT_BALL_MULTIPLAYER_ADAPTER,
    selected.map((friend) => ({ id: friend.other.id, displayName: friend.other.displayName })),
  );
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

export async function listActiveEightBallGroupSessions(): Promise<Array<{ id: string; hostUserId: string; createdAt: string }>> {
  try {
    const { data, error } = await withMultiplayerTimeout(
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
