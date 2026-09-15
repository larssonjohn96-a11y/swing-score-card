# SG4 Shot Contract v1

This contract is the durable boundary between golf activity UI and SG4 intelligence.

## Invariants

1. `shot_events` is append-only. A recorded shot is never updated or deleted.
2. Corrections are compensating events: `shot_voided` references the original `event_id`.
3. `event_id` is globally unique and is the idempotency key for retries/offline sync.
4. `session_id` groups attempts that belong to one test, training session, game or match.
5. `sequence` is stable within a session and describes the original attempt order.
6. Rating time is deterministic: weighting uses `played_at` plus an explicit `as_of`. `recorded_at` is audit/transport metadata only.
7. Product UI must never interpret raw shot events directly. UI consumes profile/service APIs.
8. Eligibility is versioned independently from the raw schema. A shot can be stored while being excluded from HCP/rating.
9. Raw events are the source material. Derived profiles/snapshots can always be rebuilt.

## Event envelope

Every v1 event contains `event_id`, `event_type`, `schema_version`, nullable `user_id`, `session_id`, `sequence`, `played_at`, `recorded_at`, stable machine-readable `source`, `activity_type`, `skill`, a typed `payload`, and extensible `context`.

`shot_voided` additionally references `target_event_id` and stores a human/debuggable `reason`. The original event remains untouched.

## Session envelope

A session has `session_id`, nullable `user_id`, `source`, `activity_type`, `started_at`, nullable `completed_at`, `status` (`started`, `completed`, `abandoned`), `schema_version`, and extensible metadata.

Eligibility may depend on session state. For example, v1 pooled putting requires a completed session and an independent/comparable attempt.

## Putting v1

Putting events use metres as the canonical distance unit. Normal independent attempts can feed the putting profile. Progression/streak attempts are valuable history but are explicitly ineligible for pooled HCP/rating because reaching later attempts depends on earlier outcomes.
