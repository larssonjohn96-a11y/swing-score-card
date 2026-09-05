/**
 * Molnport för sessionslagret (public.test_sessions).
 *
 * Importeras dynamiskt från sync.ts så att sessionslagret kan användas (och
 * testas) utan att Supabase-klienten initieras.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CloudGateway, SessionCategory, TestSession, TestSessionRow, TestType } from "./types";

const PAGE_SIZE = 1000;
const UPSERT_BATCH = 100;

export function toRow(userId: string, s: TestSession) {
  return {
    id: s.id,
    user_id: userId,
    test_id: s.testId,
    category: s.category,
    test_type: s.testType,
    played_at: s.playedAt,
    score: s.score,
    test_handicap: s.testHandicap,
    metrics: (s.metrics ?? {}) as Json,
    shots: (s.shots ?? null) as Json,
    test_version: s.testVersion,
    scoring_version: s.scoringVersion,
  };
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function fromRow(row: TestSessionRow): TestSession {
  return {
    id: row.id,
    testId: row.test_id,
    category: row.category as SessionCategory,
    testType: row.test_type as TestType,
    playedAt: row.played_at,
    score: num(row.score),
    testHandicap: num(row.test_handicap),
    metrics: row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
      ? (row.metrics as Record<string, unknown>)
      : {},
    shots: row.shots ?? null,
    testVersion: row.test_version ?? 1,
    scoringVersion: row.scoring_version ?? 1,
  };
}

export const supabaseGateway: CloudGateway = {
  async currentUserId() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  },

  async upsert(userId, sessions) {
    for (let i = 0; i < sessions.length; i += UPSERT_BATCH) {
      const batch = sessions.slice(i, i + UPSERT_BATCH).map((s) => toRow(userId, s));
      // Sessioner är oföränderliga när de väl är genomförda: ON CONFLICT DO
      // NOTHING gör upserten idempotent vid retry/dubbeltryck och skyddar mot
      // RLS-krockar om samma id redan råkar finnas hos en annan användare.
      const { error } = await supabase
        .from("test_sessions")
        .upsert(batch, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
  },

  async remove(userId, ids) {
    if (!ids.length) return;
    const { error } = await supabase
      .from("test_sessions")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);
    if (error) throw new Error(error.message);
  },

  async fetchAll(userId) {
    const result: TestSession[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("test_sessions")
        .select("id,user_id,test_id,category,test_type,played_at,score,test_handicap,metrics,shots,test_version,scoring_version")
        .eq("user_id", userId)
        .order("played_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as TestSessionRow[];
      result.push(...rows.map(fromRow));
      if (rows.length < PAGE_SIZE) break;
    }
    return result;
  },
};
