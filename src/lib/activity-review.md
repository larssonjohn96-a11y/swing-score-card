# Activity review

All review entry cards, primary actions, dialogs and Premium checks are rendered
by `components/activity-review-shell.tsx`. Change that component for app-wide
presentation updates; do not copy the card into activity routes.

`ActivityReviewInput` is the common contract for factual activity results.
`buildActivityReview` returns a versioned view model; unknown formats retain their
recorded results and leave HCP/quality unclassified. The putting adapter retains
its distance-adjusted model and detailed putting review within the same shell.
Chip/bunker adapters label recorded zones, not inferred technical causes.

Completed routes either pass their own results or mount `StoredActivityReview`,
which reads one latest saved session from the existing session-adapter registry.
History views must pass the selected session directly, never load the latest one.
Putting matches review both sides separately. Sudden death stays excluded.

To calibrate a skill: implement/test its calculation in lib, bump its model
version, then supply its output to the shared review. Do not change scorekeeping
or the established player handicap as a side effect of opening a review.
Raw legacy sessions remain the source of truth. ScoredTest now saves prompts
and scoring options as reviewContext; PEI focus tests now retain raw shots.
Older records without that context cannot recover measurements never recorded.
In-memory-only activity results remain available for the current session;
adding cloud-backed history for these formats is a separate storage migration.
