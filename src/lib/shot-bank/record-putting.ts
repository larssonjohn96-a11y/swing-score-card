import { recordShot, recordShotSession } from "./store";
import { recordedShotEventId, SHOT_SCHEMA_VERSION, type ShotActivityType, type ShotContext } from "./types";

export type PuttingAttemptInput = {
  distance_m: number;
  first_putt_holed: boolean;
  strokes_to_hole?: number;
  context?: ShotContext;
};

export type RecordPuttingSessionInput = {
  session_id: string;
  source: string;
  activity_type: ShotActivityType;
  played_at: string;
  attempts: PuttingAttemptInput[];
  session_metadata?: Record<string, string | number | boolean | null>;
  default_context?: ShotContext;
};

export function recordPuttingSession(input: RecordPuttingSessionInput) {
  const recordedAt = new Date().toISOString();
  recordShotSession({
    session_id: input.session_id,
    schema_version: SHOT_SCHEMA_VERSION,
    user_id: null,
    source: input.source,
    activity_type: input.activity_type,
    started_at: input.played_at,
    completed_at: input.played_at,
    status: "completed",
    metadata: input.session_metadata ?? {},
  });

  input.attempts.forEach((attempt, index) => {
    const sequence = index + 1;
    recordShot({
      event_id: recordedShotEventId(input.session_id, sequence),
      event_type: "shot_recorded",
      schema_version: SHOT_SCHEMA_VERSION,
      user_id: null,
      session_id: input.session_id,
      sequence,
      played_at: input.played_at,
      recorded_at: recordedAt,
      source: input.source,
      activity_type: input.activity_type,
      skill: "putting",
      payload: {
        kind: "putting",
        distance_m: attempt.distance_m,
        first_putt_holed: attempt.first_putt_holed,
        ...(attempt.strokes_to_hole !== undefined ? { strokes_to_hole: attempt.strokes_to_hole } : {}),
      },
      context: { ...input.default_context, ...attempt.context },
    });
  });
}
