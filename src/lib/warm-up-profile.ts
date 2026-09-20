import {
  parseCourse as parsePutt,
  courseStorageKey as puttKey,
  COURSE_DISTANCES as puttDistances,
} from "./putt-course";
import {
  parseCourse as parseChip,
  courseStorageKey as chipKey,
  courseDistances as chipDistances,
} from "./chip-course";
import {
  parseCourse as parseApproach,
  courseStorageKey as approachKey,
  COURSE_DISTANCES as approachDistances,
} from "./approach-course";
import { approachProximity } from "./approach-match";
import { loadLocalShotEvents, loadLocalShotSessions } from "./shot-bank/store";
import type { ShotEvent, ShotSession } from "./shot-bank/types";
import type { WarmProfile } from "./warm-up-routine";
import { chipStorageKey, parseChipProgress } from "./chip-stations";
import type { TestSession } from "./sessions/types";

export type WarmObservation = {
  id: string;
  session: string;
  at: number;
  kind: "putt" | "chip" | "approach";
  distance: number;
  value: number;
};
const recent = (at: number, now: number) =>
  Number.isFinite(at) && at <= now && at >= now - 90 * 86400000;

/** Read only the current account's completed, independent hole-outs. A make/miss
 * record cannot establish a three-putt rate. Never include bots, voids or warm-ups. */
export function puttingObservations(
  events: ShotEvent[],
  sessions: ShotSession[],
  userId: string | null,
  now: number,
): WarmObservation[] {
  const own = new Map(
    sessions
      .filter((s) => s.user_id === userId && s.status === "completed")
      .map((s) => [s.session_id, s]),
  );
  const unique = [
    ...new Map(events.filter((e) => e.user_id === userId).map((e) => [e.event_id, e])).values(),
  ];
  const voided = new Set(
    unique.filter((e) => e.event_type === "shot_voided").map((e) => e.target_event_id),
  );
  return unique.flatMap((e) => {
    if (
      e.event_type !== "shot_recorded" ||
      !own.has(e.session_id) ||
      voided.has(e.event_id) ||
      e.skill !== "putting" ||
      e.payload.kind !== "putting" ||
      e.context.independent_attempt === false ||
      e.context.progression_format ||
      /warm.?up|bot/i.test(e.source)
    )
      return [];
    const { distance_m: distance, strokes_to_hole: putts } = e.payload;
    const at = Date.parse(e.played_at);
    if (
      !recent(at, now) ||
      !Number.isFinite(distance) ||
      distance < 1 ||
      distance > 30 ||
      !Number.isInteger(putts) ||
      putts! < 1 ||
      putts! > 10
    )
      return [];
    return [
      {
        id: e.event_id,
        session:
          typeof e.context.coach_session_id === "string"
            ? e.context.coach_session_id
            : e.session_id,
        at,
        kind: "putt" as const,
        distance,
        value: putts!,
      },
    ];
  });
}

/** Transparent product heuristics, not validated change-points or HCP models.
 * Require multiple sessions, recent data and adequate samples in each bucket. */
export function buildWarmProfile(observations: WarmObservation[], now: number): WarmProfile {
  const rows = [
    ...new Map(
      observations
        .filter((r) => recent(r.at, now) && Number.isFinite(r.distance) && Number.isFinite(r.value))
        .map((r) => [r.id, r]),
    ).values(),
  ].sort((a, b) => b.at - a.at);
  const profile: WarmProfile = {};
  const groups = (kind: WarmObservation["kind"], bucket: (d: number) => number, min: number) => {
    const map = new Map<number, WarmObservation[]>();
    rows
      .filter((r) => r.kind === kind)
      .slice(0, 200)
      .forEach((r) => {
        const d = bucket(r.distance);
        map.set(d, [...(map.get(d) ?? []), r]);
      });
    return [...map]
      .filter(([, a]) => a.length >= min && new Set(a.map((r) => r.session)).size >= 2)
      .sort((a, b) => a[0] - b[0]);
  };
  const putts = groups("putt", (d) => Math.round(d / 2) * 2, 6).filter(([d]) => d >= 4 && d <= 20);
  const rate = (a: WarmObservation[]) => a.filter((r) => r.value >= 3).length / a.length;
  const breakpoint = putts.find(
    ([d, a]) =>
      rate(a) >= 0.25 && putts.some(([shorter, b]) => shorter < d && rate(a) - rate(b) >= 0.15),
  );
  const selected =
    breakpoint ??
    [...putts].filter(([, a]) => rate(a) >= 0.25).sort((a, b) => rate(b[1]) - rate(a[1]))[0];
  if (selected) {
    const [distance, a] = selected;
    profile.putt = {
      distance,
      samples: a.length,
      reason: `Extra längdkänsla runt ${distance} m`,
      detail: `${a.filter((r) => r.value >= 3).length} av ${a.length} registrerade hål runt ${distance} m blev minst 3 puttar.${breakpoint ? " Andelen var högre än på kortare avstånd med tillräckligt underlag." : " Vi ger avståndet lite extra utrymme."} Underlaget är dina sparade övningar och spel de senaste 90 dagarna.`,
    };
  }
  const chips = groups("chip", (d) => Math.round(d / 2) * 2, 9).filter(([d]) => d >= 4 && d <= 30);
  const chip = chips
    .map(([distance, a]) => ({
      distance,
      a,
      outside: a.filter((r) => r.value === 0).length / a.length,
    }))
    .filter((r) => r.outside >= 0.3)
    .sort((a, b) => b.outside - a.outside)[0];
  if (chip)
    profile.chip = {
      distance: chip.distance,
      samples: chip.a.length,
      reason: `Bygg en trygg känsla från ${chip.distance} m`,
      detail: `Valt utifrån ${chip.a.length} sparade chippar från kortklippt läge runt ${chip.distance} m. Vi ger det avståndet extra plats för att förbereda bollkontakt och längdkänsla.`,
    };
  const approach = groups("approach", (d) => Math.round(d / 20) * 20, 6)
    .filter(([d]) => d >= 80 && d <= 200)
    .map(([distance, a]) => ({
      distance,
      a,
      error: a.reduce((n, r) => n + r.value / r.distance, 0) / a.length,
    }))
    .filter((r) => r.error >= 0.1)
    .sort((a, b) => b.error - a.error)[0];
  if (approach)
    profile.approach = {
      distance: approach.distance,
      samples: approach.a.length,
      reason: `Förbered järnslagen runt ${approach.distance} m`,
      detail: `Valt utifrån spridningen i ${approach.a.length} sparade inspel runt ${approach.distance} m. Du kan välja dagens par 3-avstånd i din rutin; appen känner inte automatiskt till banan eller vilken tee du spelar.`,
    };
  return profile;
}
export function readWarmProfile(
  userId: string | null,
  storage: Pick<Storage, "getItem">,
  now: number,
  remote: TestSession[] = [],
): WarmProfile {
  const observations: WarmObservation[] = [];
  // Independent parsers mean one missing/corrupt source does not hide the others.
  const read = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* use other available sources */
    }
  };
  read(() =>
    parsePutt(storage.getItem(puttKey(userId))).history.forEach((r) =>
      r.holes.forEach((h, i) => {
        if (h.length && puttDistances[i])
          observations.push({
            id: `putt-course:${r.id}:${i}`,
            session: `putt-course:${r.id}`,
            at: r.finishedAt,
            kind: "putt",
            distance: puttDistances[i],
            value: h[0],
          });
      }),
    ),
  );
  read(() =>
    parseChip(storage.getItem(chipKey(userId)))
      .history.filter((r) => r.lie === "Fairway")
      .forEach((r) =>
        r.holes.forEach((h, i) =>
          h.forEach((value, j) => {
            observations.push({
              id: `chip-course:${r.id}:${i}:${j}`,
              session: `chip-course:${r.id}`,
              at: r.finishedAt,
              kind: "chip",
              distance: chipDistances(r.model)[i],
              value,
            });
          }),
        ),
      ),
  );
  read(() =>
    parseApproach(storage.getItem(approachKey(userId))).history.forEach((r) =>
      r.holes.forEach((h, i) => {
        if (h.length && approachDistances[i])
          observations.push({
            id: `approach-course:${r.id}:${i}`,
            session: `approach-course:${r.id}`,
            at: r.finishedAt,
            kind: "approach",
            distance: approachDistances[i],
            value: approachProximity(h[0], approachDistances[i]),
          });
      }),
    ),
  );
  read(() => {
    const events = loadLocalShotEvents(storage as Storage);
    const sessions = loadLocalShotSessions(storage as Storage);
    // Course rounds above are a separate source. Exclude mirrors of the same games.
    observations.push(
      ...puttingObservations(
        events.filter((e) => !/putt.course|putt.round|puttrundan/i.test(e.source)),
        sessions,
        userId,
        now,
      ),
    );
  });
  read(() =>
    parseChipProgress(storage.getItem(chipStorageKey(userId)))
      .rounds.filter((r) => r.lie === "Fairway")
      .forEach((r) =>
        r.shots.forEach((value, i) =>
          observations.push({
            id: `chip-station:${r.id}:${i}`,
            session: r.sessionId,
            at: r.at,
            kind: "chip",
            distance: r.distance,
            value,
          }),
        ),
      ),
  );
  observations.push(...testObservations(remote));
  return buildWarmProfile(observations, now);
}

/** Only explicitly understood raw-shot formats. Zone scores are not putt counts. */
export function testObservations(sessions: TestSession[]): WarmObservation[] {
  return sessions.flatMap((s) => {
    const at = Date.parse(s.playedAt);
    const result: WarmObservation[] = [];
    const add = (
      i: number,
      kind: WarmObservation["kind"],
      distance: unknown,
      value: unknown,
      source = s.testId,
      id = s.id,
    ) => {
      if (
        typeof distance === "number" &&
        distance > 0 &&
        Number.isFinite(distance) &&
        typeof value === "number" &&
        Number.isFinite(value)
      )
        result.push({
          id: `${source}:${id}:${i}`,
          session: `${source}:${id}`,
          at,
          kind,
          distance,
          value,
        });
    };
    if (["putt-course-round", "chip-course-round", "approach-course-round"].includes(s.testId)) {
      const round = s.metrics.round as
        { id?: string; lie?: string; model?: number; holes?: unknown[][] } | undefined;
      if (!round?.id || !Array.isArray(round.holes)) return [];
      round.holes.forEach((h, i) => {
        if (!Array.isArray(h)) return;
        if (
          s.testId === "putt-course-round" &&
          Number.isInteger(h[0]) &&
          Number(h[0]) >= 1 &&
          Number(h[0]) <= 10
        )
          add(i, "putt", puttDistances[i], h[0], "putt-course", round.id);
        if (s.testId === "chip-course-round" && round.lie === "Fairway")
          h.forEach((value, j) => {
            if (typeof value === "number" && value >= 0 && value <= 4)
              result.push({
                id: `chip-course:${round.id}:${i}:${j}`,
                session: `chip-course:${round.id}`,
                at,
                kind: "chip",
                distance: chipDistances(round.model)[i],
                value,
              });
          });
        if (s.testId === "approach-course-round") {
          const shot = h[0] as
            { actualDistance?: number; lateral?: number; side?: string } | undefined;
          if (shot && typeof shot.actualDistance === "number" && typeof shot.lateral === "number")
            add(
              i,
              "approach",
              approachDistances[i],
              Math.hypot(
                shot.actualDistance - approachDistances[i],
                shot.side === "center" ? 0 : shot.lateral,
              ),
              "approach-course",
              round.id,
            );
        }
      });
    } else if (Array.isArray(s.shots))
      s.shots.forEach((raw, i) => {
        const shot = raw as Record<string, unknown> | null;
        if (!shot || typeof shot !== "object") return;
        if (
          s.testId === "fifty-putt" &&
          Number.isInteger(shot.strokes) &&
          Number(shot.strokes) >= 1 &&
          Number(shot.strokes) <= 10
        )
          add(i, "putt", shot.distance, shot.strokes);
        if (
          s.testId === "approach-precision" &&
          shot.filled === true &&
          typeof shot.carry === "number" &&
          typeof shot.target === "number" &&
          typeof shot.offline === "number"
        )
          add(i, "approach", shot.target, Math.hypot(shot.carry - shot.target, shot.offline));
        if (
          ["approach-pei", "pei-wedge", "pei-iron"].includes(s.testId) &&
          typeof shot.actual === "number" &&
          typeof shot.target === "number" &&
          typeof shot.lateral === "number"
        )
          add(i, "approach", shot.target, Math.hypot(shot.actual - shot.target, shot.lateral));
      });
    return result;
  });
}

export async function loadWarmProfile(
  userId: string,
  storage: Pick<Storage, "getItem">,
  now: number,
): Promise<WarmProfile> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { fromRow } = await import("./sessions/cloud");
  const { data, error } = await supabase
    .from("test_sessions")
    .select(
      "id,user_id,test_id,category,test_type,played_at,score,test_handicap,metrics,shots,test_version,scoring_version",
    )
    .eq("user_id", userId)
    .gte("played_at", new Date(now - 90 * 86400000).toISOString())
    .order("played_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return readWarmProfile(
    userId,
    storage,
    now,
    (data ?? []).map((row) => fromRow(row as unknown as import("./sessions/types").TestSessionRow)),
  );
}
