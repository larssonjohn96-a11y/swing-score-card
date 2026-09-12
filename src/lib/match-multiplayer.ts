import { supabase } from "@/integrations/supabase/client";
import { withMultiplayerTimeout } from "@/lib/multiplayer-core";

const db = supabase as any;

export type MatchPlayerSnapshot = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type MatchCloudState = {
  mode: "singles" | "fourball" | "foursomes";
  category: "off-the-tee" | "approach" | "around-the-green" | "putting";
  categoryTitle: string;
  matchType: string;
  scoringMode: "match" | "stroke";
  matchLength: 5 | 9 | 18;
  holes: unknown[];
  holeIndex: number;
  finalText: string;
  blueTeam: MatchPlayerSnapshot[];
  redTeam: MatchPlayerSnapshot[];
};

export type MatchCloudSession = {
  id: string;
  hostUserId: string;
  status: "active" | "completed" | "cancelled";
  currentStep: number;
  totalSteps: number;
  state: MatchCloudState | null;
};

function mapSession(payload: any): MatchCloudSession | null {
  if (!payload?.id) return null;
  return {
    id: payload.id,
    hostUserId: payload.host_user_id ?? "",
    status: payload.status,
    currentStep: payload.current_step ?? 0,
    totalSteps: payload.total_steps ?? 0,
    state: (payload.config?.matchState ?? null) as MatchCloudState | null,
  };
}

export async function createMatchMultiplayerSession(
  members: Array<{ id: string; displayName: string }>,
  state: MatchCloudState,
) {
  const { data, error } = await withMultiplayerTimeout<any>(db.rpc("create_multiplayer_session", {
    p_test_id: "match-play",
    p_member_ids: members.map((member) => member.id),
    p_total_steps: state.matchLength,
    p_mode: "turn-based",
    p_config: {
      categoryTitle: state.categoryTitle,
      matchType: state.matchType,
      scoringMode: state.scoringMode,
      matchState: state,
    },
  }), 8000);
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "string") throw new Error("Matchsessionen kunde inte skapas.");
  return data as string;
}

export async function fetchMatchMultiplayerSession(id: string): Promise<MatchCloudSession | null> {
  const { data, error } = await withMultiplayerTimeout<any>(db.rpc("get_multiplayer_session", { p_session_id: id }), 6000);
  if (error) throw new Error(error.message);
  return mapSession(data);
}

export async function updateMatchMultiplayerState(
  id: string,
  state: MatchCloudState,
  currentStep: number,
  status: "active" | "completed" = "active",
) {
  const { error } = await withMultiplayerTimeout<any>(db.rpc("update_match_play_state", {
    p_session_id: id,
    p_state: state,
    p_current_step: currentStep,
    p_status: status,
  }), 6000);
  if (error) throw new Error(error.message);
}

export function subscribeMatchMultiplayerSession(id: string, onChange: () => void) {
  const channel = db
    .channel(`match-play-${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_sessions", filter: `id=eq.${id}` }, onChange)
    .subscribe();
  return () => { void db.removeChannel(channel); };
}
