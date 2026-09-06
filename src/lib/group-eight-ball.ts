import { supabase } from "@/integrations/supabase/client";
import type { Friendship } from "@/lib/friends-cloud";

const db = supabase as any;

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

export async function createEightBallGroupSession(friendships: Friendship[]) {
  const ids = friendships.slice(0, 3).map((f) => f.other.id);
  const { data, error } = await db.rpc("create_eight_ball_group_session", { p_member_ids: ids });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchEightBallGroupSession(id: string): Promise<GroupSession | null> {
  const [{ data: session, error: sessionError }, { data: members, error: memberError }, { data: scores, error: scoreError }] = await Promise.all([
    db.from("group_sessions").select("id,host_user_id,test_id,status,current_shot,current_player_index,created_at,completed_at").eq("id", id).maybeSingle(),
    db.from("group_session_members").select("session_id,user_id,seat,display_name").eq("session_id", id).order("seat"),
    db.from("group_session_scores").select("session_id,user_id,shot_index,points,created_at").eq("session_id", id).order("shot_index").order("created_at"),
  ]);
  if (sessionError || memberError || scoreError || !session) return null;
  return {
    id: session.id,
    hostUserId: session.host_user_id,
    testId: session.test_id,
    status: session.status,
    currentShot: session.current_shot,
    currentPlayerIndex: session.current_player_index,
    createdAt: session.created_at,
    completedAt: session.completed_at,
    members: (members ?? []).map((m: any) => ({ sessionId: m.session_id, userId: m.user_id, seat: m.seat, displayName: m.display_name })),
    scores: (scores ?? []).map((s: any) => ({ sessionId: s.session_id, userId: s.user_id, shotIndex: s.shot_index, points: s.points, createdAt: s.created_at })),
  };
}

export async function recordEightBallGroupScore(sessionId: string, userId: string, shotIndex: number, points: number) {
  const { data, error } = await db.rpc("record_eight_ball_group_score", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_shot_index: shotIndex,
    p_points: points,
  });
  if (error) throw new Error(error.message);
  return data as { status: GroupSessionStatus; currentShot: number; currentPlayerIndex: number };
}

export async function listActiveEightBallGroupSessions(): Promise<Array<{ id: string; hostUserId: string; createdAt: string }>> {
  const { data, error } = await db.from("group_sessions").select("id,host_user_id,created_at").eq("test_id", "eight-ball").eq("status", "active").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((s: any) => ({ id: s.id, hostUserId: s.host_user_id, createdAt: s.created_at }));
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
