# Journey Buddy loading/Locate flicker backend preflight refresh

Backend Developer, 2026-10-25 14:33 UTC (20:03 IST). **Decision: no backend change required; prior completed same-conversation live-schema assessment remains applicable to this UI lifecycle bug. Ready for Architect release.**

## Scope and baseline

User reports Buddy flickering during Home Locate and Journey loading before settling. This correction concerns overlay visibility, protected-region measurement, animation/component lifecycle and position continuity. It must retain existing touch protection, foreground/background cleanup, preferences, helper actions and travel behavior. No new read/write API, GPS watcher, authentication or Storage operation is requested.

- Mobile: `codex/remove-3d-companion`, HEAD `7c113f07a595af7977a54a961752dfb4e0598ea7`, preserving the existing dirty Buddy/floating-layout implementation, tests, assets, status and reports. Only this new report is owned by Backend Developer.
- Web: `main`, HEAD `aa36fe8639a8b7b50fc6df4298f214a0db092186`; the same three untracked customize-stops CLI cache directories are preserved. A fresh recursive filename check confirms they contain no pending SQL.
- Default migration inventory remains the same eight filenames from `20261001000000_core_schema` through `20261004000000_field_test_destinations`.
- Fresh scoped diff check reports no changes in mobile Supabase adapters, create/remix/journey backend/domain modules, discovery query implementation or package manifests/lockfile. No backend or migration scope has materially changed since the completed floating-layout preflight.

## Evidence and comparison

Read current Buddy host, geometry registration and screen integration. Home Locate updates selection/version and shows a changing map-selection notice. Journey loads through the existing unchanged loadPublicJourney loader, then mounts JourneyStoryContent when data is available. Buddy host currently gates actor mounting on preference/screen suppression/geometry readiness and available space. Protected-bounds registrations request asynchronous window measurements. These observations locate the investigation in UI loading and measurement lifecycle; they are not a final root-cause or fix claim.

The existing completed `docs/journey-buddy-floating-preflight.md` records actual read-only schema evidence on confirmed shared live target `gwybjhqgnrpouwcdvusi`, recovered at 2026-10-25 13:10:24.64695 UTC in this conversation:

- Journeys/stops/profiles/saved_journeys RLS enabled; affected table ACLs and owner/published visibility policies checked directly.
- Actual save_journey definition retains authentication, ownership, optimistic-version, stop-count and owned-media validation; get_public_journeys/get_journey_detail wrappers and get_account_journeys own-draft/collection guards and ACLs checked directly.
- Journey-media bucket remains private, 15,728,640-byte JPEG/PNG/WebP limit. Actual upload/read/thumbnail policies retain owned-path/journey and exact-reference guards.
- Hosted history contains `20261024041322 journey_media_thumbnail_v1_read` only, unlike the eight default repository filenames. Existing thumbnail/standalone-copy deployment provenance drift is documented and unrelated; no reconciliation is proposed.

This refresh reuses that completed affected-schema comparison because the same established target and contracts apply, the bug adds no backend capability, and fresh repository/scope checks found no material migration or affected-contract change. **No new live query was run for this narrowly bounded lifecycle correction.** This is not a claim of a new live observation at 14:33 UTC or whole-database equivalence. If investigation expands to data/loading contracts, changes migration baseline or discovers target/schema drift, pause and repeat the affected live checks before proceeding.

## Impact and safe validation

Database tables/columns/constraints/indexes: none. RPC/API interfaces: unchanged. RLS/grants/roles: unchanged. Storage/bundled assets: unchanged. Authentication and GPS ownership: unchanged. Buddy should react to the existing loading results and measured geometry without changing any query/save/media pipeline.

Validate actor continuity and frame/position preservation during repeated Locate, banner appearance/disappearance, public Journey loading/error/retry/data transitions, stale/delayed measurements and route changes. Keep modal/background/keyboard hiding and protected-control collision safety intact. Run affected Buddy/Home/Journey tests, TypeScript and lint; verify native Locate/loading behavior without save/create/upload/delete actions. No database fixture, migration, isolated DB write or live write is needed. Backend scope expansion requires a refreshed preflight and an isolated synthetic authorization test plan before any proposed backend implementation.

- Missing feature-specific evidence/blockers: none for UI-only scope.
- Architect gate: ready for release based on completed applicable assessment; Architect records release.
- Live Supabase changes: not authorized.
- Publication: local/unpublished report only.
