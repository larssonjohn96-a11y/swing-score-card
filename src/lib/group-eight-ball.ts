import { supabase } from "@/integrations/supabase/client";
import type { Friendship } from "@/lib/friends-cloud";

const db = supabase as any;
let createSessionPromise: Promise<string> | null = null;

export type GroupSessionStatus = "active" | "completed" | "cancelled";
export type GroupMember = { sessionId: string; userId: string; seat: number; displayName: string };
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

function withTimeout<T>(promise: Promise<T>, ms = 7000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Sessionen tog för lång tid att öppna.")), ms);
    promise.then((value) => {
      window.clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

function mapSession(payload: any): GroupSession | null {
  if (!payload?.id) return null;
  return {
    id: payload.id,
    hostUserId: payload.host_user_id,
    testId: payload.test_id,
    status: payload.status,
    currentShot: payload.current_shot,
    currentPlayerIndex: payload.current_player_index,
    createdAt: payload.created_at,
    completedAt: payload.completed_at,
    members: (payload.members ?? []).map((m: any) => ({ sessionId: m.session_id, userId: m.user_id, seat: m.seat, displayName: m.display_name })),
    scores: (payload.scores ?? []).map((s: any) => ({ sessionId: s.session_id, userId: s.user_id, shotIndex: s.shot_index, points: s.points, createdAt: s.created_at })),
  };
}

export async function createEightBallGroupSession(friendships: Friendship[]) {
  if (createSessionPromise) return createSessionPromise;
  const ids = friendships.slice(0, 3).map((f) => f.other.id);
  createSessionPromise = withTimeout((async () => {
    const { data, error } = await db.rpc("create_eight_ball_group_session", { p_member_ids: ids });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "string") throw new Error("Gruppsessionen skapades inte korrekt.");
    return data as string;
  })(), 8000);
  try {
    return await createSessionPromise;
  } finally {
    createSessionPromise = null;
  }
}

export async function fetchEightBallGroupSession(id: string): Promise<GroupSession | null> {
  try {
    const { data, error } = await withTimeout(db.rpc("get_eight_ball_group_session", { p_session_id: id }));
    if (!error && data) return mapSession(data);
  } catch {
    // Fall back to the original table reads while older deployments catch up
    // with the latest multiplayer migration.
  }

  const result = await withTimeout(Promise.all([
    db.from("group_sessions").select("id,host_user_id,test_id,status,current_shot,current_player_index,created_at,completed_at").eq("id", id).maybeSingle(),
    db.from("group_session_members").select("session_id,user_id,seat,display_name").eq("session_id", id).order("seat"),
    db.from("group_session_scores").select("session_id,user_id,shot_index,points,created_at").eq("session_id", id).order("shot_index").order("created_at"),
  ]));
  const [{ data: session, error: sessionError }, { data: members, error: memberError }, { data: scores, error: scoreError }] = result;
  if (sessionError || memberError || scoreError || !session) return null;
  return mapSession({ ...session, members, scores });
}

export async function recordEightBallGroupScore(sessionId: string, userId: string, shotIndex: number, points: number) {
  const { data, error } = await withTimeout(db.rpc("record_eight_ball_group_score", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_shot_index: shotIndex,
    p_points: points,
  }));
  if (error) throw new Error(error.message);
  return data as { status: GroupSessionStatus; currentShot: number; currentPlayerIndex: number };
}

export async function listActiveEightBallGroupSessions(): Promise<Array<{ id: string; hostUserId: string; createdAt: string }>> {
  try {
    const { data, error } = await withTimeout(db.from("group_sessions").select("id,host_user_id,created_at").eq("test_id", "eight-ball").eq("status", "active").order("created_at", { ascending: false }));
    if (error || !data) return [];
    return data.map((s: any) => ({ id: s.id, hostUserId: s.host_user_id, createdAt: s.created_at }));
  } catch {
    return [];
  }
}

export function subscribeEightBallGroupSession(sessionId: string, onChange: () => void) {
  const channel = db
    .channel(`eight-ball-group-${sessionId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_sessions", filter: `id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_session_scores", filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe();
  return () => { void db.removeChannel(channel); };
}

export function groupTotals(session: GroupSession) {
  return session.members.map((member) => ({
    ...member,
    score: session.scores.filter((s) => s.userId === member.userId).reduce((sum, s) => sum + s.points, 0),
    shots: session.scores.filter((s) => s.userId === member.userId).length,
  }));
}
