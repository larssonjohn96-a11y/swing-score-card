import { supabase } from "@/integrations/supabase/client";
import { loadSessions, type SessionRecord } from "@/lib/drill";
import { loadBunkerSessions, type BunkerSession } from "@/lib/bunker";

export type DrillRow = {
  user_id: string;
  display_name: string;
  best_score: number;
  avg_score: number;
  sessions: number;
  last_played: string;
};

export type BunkerRow = {
  user_id: string;
  display_name: string;
  best_avg_feet: number;
  avg_feet: number;
  sessions: number;
  last_played: string;
};

function drillRow(userId: string, s: SessionRecord) {
  return {
    id: s.id,
    user_id: userId,
    played_at: s.date,
    score: s.score,
    laps: s.laps,
    stages_cleared: s.stagesCleared,
    shots: s.shots,
  };
}

function bunkerRow(userId: string, s: BunkerSession) {
  return {
    id: s.id,
    user_id: userId,
    played_at: s.date,
    total_feet: s.totalFeet,
    avg_feet: s.avgFeet,
    shots: s.shots,
  };
}

/** Sparar ett 18-bollarspass i molnet om spelaren är inloggad. */
export async function pushDrillSession(record: SessionRecord) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("drill_sessions").upsert(drillRow(data.user.id, record));
}

/** Sparar ett bunkertest i molnet om spelaren är inloggad. */
export async function pushBunkerSession(record: BunkerSession) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("bunker_sessions").upsert(bunkerRow(data.user.id, record));
}

/** Flyttar upp allt som redan ligger sparat lokalt på telefonen. */
export async function syncLocalSessions(userId: string) {
  const drills = loadSessions();
  const bunkers = loadBunkerSessions();
  if (drills.length) {
    await supabase.from("drill_sessions").upsert(drills.map((s) => drillRow(userId, s)));
  }
  if (bunkers.length) {
    await supabase.from("bunker_sessions").upsert(bunkers.map((s) => bunkerRow(userId, s)));
  }
}

export async function fetchDrillLeaderboard(): Promise<DrillRow[]> {
  const { data, error } = await supabase.rpc("drill_leaderboard");
  if (error) throw error;
  return (data ?? []) as DrillRow[];
}

export async function fetchBunkerLeaderboard(): Promise<BunkerRow[]> {
  const { data, error } = await supabase.rpc("bunker_leaderboard");
  if (error) throw error;
  return (data ?? []) as BunkerRow[];
}
