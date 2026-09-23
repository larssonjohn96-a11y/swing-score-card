# Ball Speed Challenge redesign

## Goal
Replace the existing course-like Speedrundan presentation with one focused three-drive Ball Speed Challenge, while preserving compatible history, account sync, and all unrelated tests.

## Implementation
- Rework the existing `/speedrundan` experience into a single intro → three-shot test → direct result flow with one sticky back header.
- Add a vertical high-striker speed meter with fixed pre-test personal-best and last-five-test average markers, unit switching, stable numeric entry, per-shot feedback, and reduced-motion-safe record/average celebrations.
- Define historical comparison helpers around completed three-shot ball-speed tests only: average each test’s best shot across the latest five, all-time best for PB, frozen snapshots at each new attempt, and no invented baseline for first-time users.
- Keep the existing account-scoped local/cloud storage format and deterministic sync IDs where compatible; save exactly one completed result after the third accepted shot and ignore incomplete attempts in comparisons.
- Replace the result with best speed, all three values, approximate driver carry interval, honest record/average feedback, and retry.
- Refactor the existing blue expandable Speed analysis so Speed-HCP, age comparison, level explanation, and historical progression appear only inside it, using the established putting reveal behavior.
- Route the existing Ball Speed Challenge entry points to this redesigned flow and remove duplicate/course-specific UI only from this challenge.

## Validation
- Add focused tests for unit conversion and validation, completed-history baseline/PB rules, first-test behavior, PB precedence, and reducer/save idempotency.
- Run relevant tests and the project typecheck/build checks.
- Exercise the complete three-shot and retry flows in the mobile preview, checking overflow, header/back behavior, fixed markers, direct result content, and analysis separation.

## Assumptions and limits
- Existing compatible `speed-course-round` records remain the canonical synced history; older standalone Speed Test records are retained but not mixed unless they can be safely identified as completed three-ball ball-speed tests.
- Driver carry uses the project’s documented TrackMan-derived carry model and is presented as an approximate interval, never total roll.
- Friend ranking/next-target UI appears only when the existing data source provides real comparable data; otherwise it is omitted.
- No backend migration, dependency change, or production publish is planned.
