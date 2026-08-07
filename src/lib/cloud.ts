import { supabase } from "@/integrations/supabase/client";
import { loadBunkerSessions, type BunkerSession } from "@/lib/bunker";

export type BunkerRow = {
  user_id: string;
  display_name: string;
  best_avg_feet: number;
  avg_feet: number;
  sessions: number;
  last_played: string;
};

function bunkerRow(userId: string, s: BunkerSession) {
  // Molntabellen/leaderboarden (bunker_sessions, bunker_leaderboard-RPC) är
  // byggd kring fot – testet mäter numera i meter via intervall, så vi
  // konverterar här istället för att kräva en schemaändring i databasen.
  const avgFeet = s.avgProximity * 3.28084;
  return {
    id: s.id,
    user_id: userId,
    played_at: s.date,
    total_feet: Math.round(avgFeet * s.shots.length * 10) / 10,
    avg_feet: Math.round(avgFeet * 10) / 10,
    shots: s.shots,
  };
}

/** Sparar ett bunkertest i molnet om spelaren är inloggad. */
export async function pushBunkerSession(record: BunkerSession) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("bunker_sessions").upsert(bunkerRow(data.user.id, record));
}

/** Flyttar upp allt som redan ligger sparat lokalt på telefonen. */
export async function syncLocalSessions(userId: string) {
  const bunkers = loadBunkerSessions();
  if (bunkers.length) {
    await supabase.from("bunker_sessions").upsert(bunkers.map((s) => bunkerRow(userId, s)));
  }
}

export async function fetchBunkerLeaderboard(): Promise<BunkerRow[]> {
  const { data, error } = await supabase.rpc("bunker_leaderboard");
  if (error) throw error;
  return (data ?? []) as BunkerRow[];
}
