# Nine-cover live backfill: independent scoped QA

QA Tester, 2026-11-01. Scope: stable untracked `scripts/explore-cover-backfill-plan.mjs`, `scripts/explore-cover-backfill-upload.mjs` and `tests/explore-cover-backfill.test.mjs` over Mobile baseline `89125d9`. Existing Explore implementation and other agents' changes preserved. QA created this report only: no app/helper edits, environment-file reads, phone operations, hosted connections/writes, commits or publication.

## Completed verification

- `node --test tests/explore-cover-backfill.test.mjs`: **9/9 passed**, zero failed/skipped, approximately 17 seconds. The SQL integration cases executed actual generated activation/rollback transactions in the already-installed sibling Web PGlite engine, using synthetic tables/data and no hosted fallback. Uploader ports were mocked.
- `node node_modules/eslint/bin/eslint.js scripts/explore-cover-backfill-plan.mjs scripts/explore-cover-backfill-upload.mjs tests/explore-cover-backfill.test.mjs --max-warnings=0`: **passed**, exit 0, zero warnings/errors.

After the SDK missing-object classification patch, QA reran the complete current helper suite: **10/10 passed**, zero failed/skipped, approximately 18 seconds. Scoped lint of both helpers and the test passed again with zero warnings/errors. The new case verifies recognized SDK missing-object responses resolve to absence, while unavailable/ambiguous existence checks stop rather than authorizing an upload. QA inspected the narrow classifier and HEAD-400 metadata fallback; this does not relax create-only PUT behavior, collision detection or owner checks. No application suite rerun was needed because app code was unchanged.

This bounded maintenance helper addition does not change application TypeScript, native dependencies, routes or rendering. Previously completed full application verification remains applicable; no unrelated full-suite rerun was needed for this scope.

## Preservation and concurrency

QA inspected actual helper SQL and transport code in addition to executing tests:

- Exactly nine unique approved source identities and source/review manifest hashes bind the operation. Actual manifest file bytes are hashed before parsing/transport, canonical owner/journey/cover paths are enforced, and unexpected destinations/duplicates are rejected.
- Every selected source and destination is checked before the first selected upload. Prepared local bytes and remote source SHA256/size/ETag are verified. Owner identity is checked for the selected batch and again before each upload; a mismatch stops work.
- Uploads are create-only (`upsert:false`, `x-upsert:false`). A private fsynced started-event precedes each upload request; content-verified events follow downloaded hash verification. Uncertain transport outcomes, changed owner and incorrect uploaded bytes stop without retry or activation. Existing objects and source originals are never overwritten/deleted by the helpers.
- Content verification alone is insufficient for activation: fresh object IDs, versions, sizes and MIME metadata must be attached before selected activation SQL can be built.
- Activation locks selected parent journeys in deterministic order, existing stops and original/destination object metadata, then checks exact cover/version/owner/status, non-cover journey digest, ordered stop-row digest, existing authorization digest and object identity/version/size. Only new cover authorization and cover reference are changed; ordinary journey version advancement is preserved.
- Tests confirm preservation of all original object rows, stop content and timestamps, saved/social rows and copy receipts. Late-item version/source/authorization/destination drift aborts the whole batch rather than leaving earlier items active.
- Receipt-bound rollback requires exact new versions and unchanged records; it restores cover references and removes only the operation's unreferenced new authorization. It never restores old timestamps or deletes source/new objects. Concurrent user edits cause an atomic refusal rather than overwrite.
- The smallest source is selected as the canary. Canary and remaining-eight SQL retain the same immutable nine-item operation digest, and synthetic SQL tests verify one then eight activation and combined rollback. The remaining eight still require their own content-verified destination metadata.

## Outcome and operational limits

No actionable finding remains in this scoped offline QA snapshot. These tests establish helper contracts and rollback behavior, not a completed live rollout or actual public/native byte savings.

Architect's owner-match gate, independent destination catalog checks, public canary byte/hash verification and explicit release of the remaining eight are operational checkpoints. The CLI does not autonomously prove public canary acceptance before accepting the explicit `--remaining-eight` selection; the supervised Architect/Backend workflow must enforce that order. This report does not release the live gate or authorize execution on behalf of the owner.

A lost upload/COMMIT response is not proof of failure. Stop and reconcile private journals, current references, object metadata and authorization state read-only; do not automatically replay activation, invent a missing receipt or execute rollback. No real rollback or hosted write was executed by QA. Final live owner-match/rollout and measured transfer evidence belong to the Architect/Backend execution records.
