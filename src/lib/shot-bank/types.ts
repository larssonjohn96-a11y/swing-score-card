export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const SHOT_SCHEMA_VERSION = 1 as const;

export type ShotActivityType = "test" | "training" | "match" | "game" | "other";
export type ShotSkill = "putting" | "chip" | "approach" | "bunker" | "driver" | "speed";
export type ShotSessionStatus = "started" | "completed" | "abandoned";

export type ShotContext = {
  hcp_eligible?: boolean;
  independent_attempt?: boolean;
  progression_format?: boolean;
  format_id?: string;
  direction?: string;
  green_type?: string;
  [key: string]: JsonValue | undefined;
};

export type PuttingShotPayload = {
  kind: "putting";
  distance_m: number;
  first_putt_holed: boolean;
  strokes_to_hole?: number;
};

export type GenericShotPayload = {
  kind: Exclude<ShotSkill, "putting">;
  data: { [key: string]: JsonValue };
};

export type ShotPayload = PuttingShotPayload | GenericShotPayload;

export type ShotRecordedEvent = {
  event_id: string;
  event_type: "shot_recorded";
  schema_version: typeof SHOT_SCHEMA_VERSION;
  user_id: string | null;
  session_id: string;
  sequence: number;
  played_at: string;
  recorded_at: string;
  source: string;
  activity_type: ShotActivityType;
  skill: ShotSkill;
  payload: ShotPayload;
  context: ShotContext;
};

export type ShotVoidedEvent = {
  event_id: string;
  event_type: "shot_voided";
  schema_version: typeof SHOT_SCHEMA_VERSION;
  user_id: string | null;
  session_id: string;
  sequence: number;
  played_at: string;
  recorded_at: string;
  source: string;
  activity_type: ShotActivityType;
  skill: ShotSkill;
  payload: { kind: "void" };
  context: ShotContext;
  target_event_id: string;
  reason: string;
};

export type ShotEvent = ShotRecordedEvent | ShotVoidedEvent;

export type ShotSession = {
  session_id: string;
  schema_version: typeof SHOT_SCHEMA_VERSION;
  user_id: string | null;
  source: string;
  activity_type: ShotActivityType;
  started_at: string;
  completed_at: string | null;
  status: ShotSessionStatus;
  metadata: { [key: string]: JsonValue };
};

export function recordedShotEventId(sessionId: string, sequence: number) {
  return `${sessionId}:shot:${sequence}`;
}

export function voidShotEventId(targetEventId: string, nonce: string) {
  return `${targetEventId}:void:${nonce}`;
}
