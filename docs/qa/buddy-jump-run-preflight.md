# Buddy jump/run backend preflight

Backend Developer, 2026-10-26. **Decision: no backend change required; ready for Architect gate release.** This completed assessment supersedes the initial blocked checkpoint after Architect obtained the previously unavailable live metadata.

## Scope and baseline

Local bundled jump after confirmed memory-save success, and short stationary run after successful in-memory Travel start/resume. No backend persistence, query, permission, media upload or API contract addition is required.

- Mobile revision `955ecac21ae554ae428c9efb36d2f8ab6406e935`; starting Git status clean.
- Web revision `4ab53cc464f2f99e9d905712678ed5954d94300e`; preserve the three existing untracked nested Supabase `.temp` directories. No feature migrations added.
- Fresh connector project listing confirms hosted/live `gwybjhqgnrpouwcdvusi`, ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11. It is not an isolated write-test target.
- Fresh migration-history read matches all 13 default repository versions through `20261026051106`: core_schema, public_discovery, journey_details, journey_creation, journey_media_15mb, social_loop, travel_tracks, field_test_destinations, journey_media_thumbnail_v1_read, remix_without_media, capture_customize_stops, legacy_media_review and rpc_integrity_hardening. Inventory also retains historical standalone/correction scripts; do not replay them.

## Current-schema evidence and comparison

This specialist's catalog requests stalled, so Architect obtained the successful read-only evidence. Reviewed local `buddy-jump-run-schema-evidence.json` (catalog timestamp **2026-10-26 16:09:08.881052 UTC**, 21:39:08.881052 IST) and `buddy-jump-run-columns-evidence.json`. Architect additionally reported successful inspection of actual `save_journey(jsonb)` definition, owner/config/ACL. No application rows, auth records, Storage objects, secrets or environment files were read.

- Actual save RPC is SECURITY DEFINER owned by `journey_rpc`, empty search_path and 5-second lock_timeout; execute ACL is limited to owner/authenticated/service_role. It derives caller UID through `private.journey_rpc_uid`, locks the owned row, checks `updated_at` optimistic version, validates inputs/media authorization, atomically replaces stops and returns `{id,status,updated_at}`. This agrees with the inspected current hardening migration's save definition, helper/role policy design and authenticated execute grant. Earlier historical preflight's invoker/direct-CRUD state is superseded.
- Current roles `journey_rpc` and `customize_stops_rpc` are NOLOGIN, non-superuser and non-BYPASSRLS. `journeys` and `journey_stops` are owned by postgres with RLS enabled. Anon/authenticated retain SELECT; authenticated retains owned journey DELETE. Actual RPC-only insert/update and child insert/delete policies use UID/ownership checks. Read policies remain published-or-owner. These match the hardening migration's direct write revocations and dedicated role policies; Buddy needs no grants or RLS changes.
- Actual journey/stop UUID ownership/parent fields, sequence uniqueness, coordinate bounds/pairs, status/publication constraints, title/length/day/duration checks and owner/discovery/sequence indexes support the unchanged save/read contract. Reviewed core schema, current hardening changes and current metadata/columns; no new column, constraint, index or relation is necessary.
- `journey-media` and `profile-avatars` remain private, with 15,728,640-byte JPEG/PNG/WebP limits. Actual policies restrict inserts to authenticated owner paths; journey-media also requires owned journey. Existing read/thumbnail policies use owned or referenced published media and retain the hardened helper/role access. Sprites are bundled locally; no bucket, policy, upload or signed-URL change is needed.
- Repository/live migration history now agrees; the older preflight's missing-history drift is resolved. Historical standalone policies remain alongside current policies and are outside this presentation feature. This is a feature-relevant comparison, not a claim of complete database equivalence or an independent backend security audit. No relevant unapplied migration or feature-blocking drift found.

## Client contract and trigger boundary

Read `src/lib/create/queries.ts`, the create screen save completion, and the Travel screen action path. `saveNewJourney` verifies current authenticated owner, invokes `save_journey`, validates returned ID/status/finite timestamp and rejects uncertain/cancelled/error results. Create's controller result `kind === saved` is the confirmed completion boundary; `savingMemory` distinguishes a memory save from unrelated draft/settings/publish operations. Preserve abort/lifetime/focus-generation checks and the photo-save controller's final success semantics. Do not animate on submission, partial photo checkpoint or ambiguous outcome.

Travel uses `tripStore.transition` through focused/foreground interaction guards and explicitly retains an in-memory session, not travel history. Use successful start/resume transitions, not a button tap or unrelated store notification. No `travel_tracks` mutation is introduced. Both features can emit a local transient animation event with deduplication and existing priority/suppression guards, without modifying any backend contract.

## Safe validation and handoff

No backend changes or live writes are required or authorized. Local tests should cover confirmed memory success versus error/cancel/uncertain/partial result, successful versus rejected start/resume, duplicate/overlap rejection, stationary run coordinates, priority/reduced-motion/off/background/keyboard/dialog guards and idle/walk restoration; retain existing editor ownership/version/ambiguous-save regressions. No database fixture writes are necessary. A phone memory-save demonstration requires explicit user action/target approval for a live save, or an isolated synthetic test path clearly identified as such; viewing assets and exercising local Travel state are separate evidence.

No disposable database target was needed or created. If backend scope changes, pause for a refreshed preflight and verified isolated target with owner/other/anonymous authorization cases before any writes. Recover by reverting only this task's edits while preserving baseline work.

Architect gate: **ready for release after Architect records acceptance**. Missing feature-specific schema evidence: none. Next owners: Architect, Mobile Developer, QA and independent review. No migration, live mutation, commit, push or publication performed. Local/unpublished. This specialist changed only `docs/qa/buddy-jump-run-preflight.md`; Architect owns the two referenced evidence files.

Architect acceptance: released 2026-10-26 after reviewing the completed report and current metadata. Local Mobile implementation and isolated tests authorized; live writes and publication remain unauthorized.
