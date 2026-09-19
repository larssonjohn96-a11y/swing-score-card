import {
  courseStorageKey,
  emptyCourse,
  roundStars,
  parseCourse,
  type CourseRound,
  type CourseState,
} from "./putt-course";
import { deterministicUuid } from "./sessions/ids";
import type { TestSession } from "./sessions/types";

export const PUTT_ROUND_TEST_ID = "putt-course-round";
export function puttSession(userId: string, round: CourseRound): TestSession {
  return {
    id: deterministicUuid(`${PUTT_ROUND_TEST_ID}:${userId}:${round.id}`),
    testId: PUTT_ROUND_TEST_ID,
    category: "puttning",
    testType: "training",
    playedAt: new Date(round.finishedAt).toISOString(),
    score: roundStars(round),
    testHandicap: null,
    metrics: { round },
    shots: round.holes,
    testVersion: round.model,
    scoringVersion: round.model,
  };
}
export function mergePuttRounds(local: CourseState, remote: CourseRound[]): CourseState {
  const byId = new Map(local.history.map((r) => [r.id, r]));
  for (const r of remote) if (!byId.has(r.id)) byId.set(r.id, r);
  return {
    ...local,
    history: [...byId.values()].sort(
      (a, b) => a.finishedAt - b.finishedAt || a.id.localeCompare(b.id),
    ),
  };
}
export type PuttCloudPort = {
  currentUser(): Promise<string | null>;
  readLocal(user: string): CourseState;
  writeLocal(user: string, state: CourseState): void;
  upload(user: string, rounds: CourseRound[]): Promise<void>;
  fetch(user: string): Promise<CourseRound[]>;
};
/** Re-read local state after network waits: never replace a round being played or saved meanwhile. */
export async function reconcilePuttRounds(user: string, port: PuttCloudPort): Promise<CourseState> {
  const check = async () => {
    if ((await port.currentUser()) !== user) throw new Error("Kontot ändrades under synkningen.");
  };
  await check();
  const initial = port.readLocal(user);
  await port.upload(user, initial.history);
  await check();
  const remote = await port.fetch(user);
  await check();
  const latest = port.readLocal(user);
  const uploaded = new Set(initial.history.map((r) => r.id));
  const pending = latest.history.filter((r) => !uploaded.has(r.id));
  if (pending.length) {
    await port.upload(user, pending);
    await check();
  }
  const merged = mergePuttRounds(port.readLocal(user), remote);
  port.writeLocal(user, merged);
  return merged;
}
const queues = new Map<string, Promise<CourseState>>();
export function syncPuttRounds(user: string): Promise<CourseState> {
  const previous = queues.get(user);
  const run = (
    previous ? previous.catch(() => emptyCourse()) : Promise.resolve(emptyCourse())
  ).then(async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { supabaseGateway } = await import("./sessions/cloud");
    return reconcilePuttRounds(user, {
      currentUser: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.user.id ?? null;
      },
      readLocal: (id) => parseCourse(localStorage.getItem(courseStorageKey(id))),
      writeLocal: (id, state) => {
        localStorage.setItem(courseStorageKey(id), JSON.stringify(state));
        window.dispatchEvent(new CustomEvent("sg4-putt-cloud-updated", { detail: { userId: id } }));
      },
      upload: (id, rounds) =>
        supabaseGateway.upsert(
          id,
          rounds.map((r) => puttSession(id, r)),
        ),
      fetch: async (id) => {
        const rounds: CourseRound[] = [];
        for (let from = 0; ; from += 500) {
          const { data, error } = await supabase
            .from("test_sessions")
            .select("metrics")
            .eq("user_id", id)
            .eq("test_id", PUTT_ROUND_TEST_ID)
            .order("id")
            .range(from, from + 499);
          if (error) throw new Error(error.message);
          for (const row of data ?? []) {
            const metric = row.metrics as { round?: unknown } | null;
            rounds.push(
              ...parseCourse(JSON.stringify({ version: 1, history: [metric?.round] })).history,
            );
          }
          if (!data || data.length < 500) break;
        }
        return rounds;
      },
    });
  });
  queues.set(user, run);
  void run
    .finally(() => {
      if (queues.get(user) === run) queues.delete(user);
    })
    .catch(() => {});
  return run;
}
