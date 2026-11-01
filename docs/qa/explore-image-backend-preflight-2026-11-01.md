# Explore image optimization: read-only backend preflight

Backend Developer; 2026-11-01, initial live inspection 02:55:16–02:56:11 UTC, followed by a confirming aggregate over the actual RPC projection. Scope: Explore layout, native image loading and existing signed-URL cache reuse. No hosted writes, uploads, downloads, schema changes or migrations performed.

## Gate recommendation

**No backend API/schema/RLS change is required for the proposed local implementation.** Existing public RPC results, original/thumbnail naming, public signing permissions and native cache contracts suffice. Architect may release the client implementation gate after recording this report. Live thumbnail backfill/reference transitions remain separately gated and unapproved.

Mobile baseline `0ee9d92`, `codex/app-wide-dark-theme`, clean at assignment. Web has three unrelated untracked `supabase/*/.temp/` directories, preserved. Secret/environment files were not read. Confirmed existing shared project `gwybjhqgnrpouwcdvusi`, ACTIVE_HEALTHY, PostgreSQL 17.11, matching nonsecret repository activation reports. This is a bounded preflight, not certification of unrelated backend features.

## Current schema and repository comparison

Read-only connector checks: project metadata, migration listing plus independent `supabase_migrations.schema_migrations` SELECT; information_schema columns/grants; pg_class RLS/owners; pg_policies definitions/roles; pg_proc definitions/ACL/search_path/owners; pg_constraint; pg_indexes; private schema privileges; bucket configuration; aggregate referenced-object metadata. No user content, raw object names, signed URLs or credentials were returned in inventory output.

- All 13 migration versions in Web `supabase/migrations/` are present live, through `20261026051106_rpc_integrity_hardening`; live additionally records `20261031071032_registration_email_check`, represented by the separate registration feature artifacts. No pending/untracked migration in the assigned image scope was found. Mobile has reviewed SQL artifacts rather than a canonical Supabase migration directory. Standalone customize-stop migration copies are historical alternatives, not instructions to replay them.
- Inspected relevant repository intent: Web migrations `20261001010000_public_discovery`, `20261001020000_journey_details`, `20261002000000_journey_creation`, `20261002010000_journey_media_15mb`, `20261002020000_social_loop`, `20261024041322_journey_media_thumbnail_v1_read`, `20261026051105_legacy_media_review`, `20261026051106_rpc_integrity_hardening`; Mobile `docs/backend/image-thumbnails.review.sql` and rollback SQL, `src/lib/discovery/{queries,model,request-cache}.ts`, `src/lib/media/image-variants.ts`, `src/lib/create/{photo-save,photo-queries,thumbnail-model,thumbnail-device.native}.ts` and existing backfill documentation/preparer.
- Current `journeys` and `journey_stops` columns retain cover/photo path text fields and all client-required identity/status/ordering fields. Constraints retain UUID keys, journey foreign keys, unique journey/sequence, finite coordinate bounds/pairs, path length limits and publication-state guards. Published/discovery indexes and owner/primary-key indexes exist. No column/index/constraint change is needed.
- Public `get_public_journeys(text,text,uuid)` is an invoker SQL wrapper over `private.public_journeys`; both anon/authenticated have EXECUTE. Current private body returns published journeys with destination/traveler fields, ordered `published_at desc,id`, limited to 100. Stop projection has descriptions/positions, **no stop photo paths**. Preserve this order and contract.
- Public `get_journey_detail(uuid)` remains an invoker wrapper over `private.journey_detail`; the private body gates published/owner and includes cover/stops/photos. `get_account_journeys(uuid,text)` retains published/drafts/saved guards and existing ACLs. Private RPCs inspected have empty search_path; public browse/detail private implementations are owned by postgres. No RPC replacement is needed.
- `journeys`, `journey_stops`, `storage.objects`, `private.journey_media_authorizations` and legacy approvals have RLS. Anonymous/authenticated table reads are protected by published/owner policies; direct write grants remain restricted after hardening. The non-login `journey_rpc` capability path is present. Anonymous/authenticated have required private-schema USAGE and approved helper EXECUTE.
- `journey_media_read` now permits owner-prefix access or `private.journey_media_readable(name)`; that RLS-bound helper checks a journey-specific media authorization and an active reference with published/owner visibility. This matches the applied integrity-hardening migration, superseding historical October 24 reports that said authorizations were absent.
- `journey_media_thumbnail_v1_read` remains the referenced full-v1 sibling policy for anon/authenticated; checked actual predicate, roles and literal single-backslash regex (double-backslash check false). It maps thumb-512-v1.jpg to full-v1.jpg/png/webp and requires published/owner reference. Integrity hardening intentionally preserves this policy. Do not replay old reviewed policy SQL: its pre-hardening guard now correctly rejects the current authorization-table state.
- Both `journey-media` and `profile-avatars` are private, 15,728,640-byte limit, JPEG/PNG/WebP. Existing authenticated upload policy requires owner prefix and an owned journey. No bucket/policy/grant change is required.

## Measured current inventory

Read-only metadata snapshot; byte totals are stored object sizes, **not observed network transfer**. Explore scope follows the live public RPC ordering/filter/100-row bound; non-demo count is 14 journeys. Distinct paths deduplicate reused covers. No image bytes were fetched.

| Scope | Distinct referenced paths | Existing originals | Legacy/unversioned | full-v1 references | Discoverable paired thumbnails | Original bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Explore covers | 9 | 9 | 9 | 0 | 0 | 6,029,211 |
| All journey covers | 9 | 9 | 9 | 0 | 0 | 6,029,211 |
| All stop photos | 28 | 28 | 28 | 0 | 0 | 15,425,447 |

All 37 distinct cover/stop references match legacy canonical UUID filenames; all are Storage paths, with no external references. A confirming aggregate over `get_public_journeys()` returned 14 rows, all non-demo, with the same nine covers and byte totals (rather than relying solely on a reconstruction of its predicate). Explore cover size range: 142,365–2,013,736 bytes. Total referenced original bytes: 21,454,658. Whole bucket inventory contains 56 non-thumbnail objects and 3 `.thumb-512-v1.jpg` objects; those three do not correspond to current full-v1 references and do not establish usable thumbnail coverage.

Therefore current Explore covers will continue using originals until separately approved legacy activation. A complete cache-miss download of these nine unique covers totals about 6.03 MB, before protocol overhead. Repeating it about 13–27 times would be in the reported 80–160 MB range; this is arithmetic, **not attribution or a measured daily request count**. Shared web traffic, detail views and other clients also use this project.

## New-upload generation and configuration

Source generates 512px JPEG quality .7 siblings before saving the full-v1 reference when `EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED` is exactly `true`. Source defaults false when absent. `eas.json` does not declare the flag. Historical `docs/qa/thumbnail-activation.md:57` records an enabled development Metro session on October 24, but is not evidence for the currently running bundle or production EAS environment. The active flag is **unverified** without reading prohibited environment files. Verify it via a dedicated nonsecret bundle/runtime capability check or owner-provided build configuration; configure the public boolean true in each intended build environment and restart/rebuild the relevant JS bundle. No flag/config change was performed by this preflight, and no production upload test is authorized.

## Safe local verification plan

No database or backend implementation is proposed, so isolated mocked client tests are sufficient for the client gate: fake signing transport, fake clock and synthetic journeys only; never use live uploads as tests. Verify refresh invalidates collection results while preserving valid signed URLs; TTL expiry renews; duplicates share signatures; cancelled/failed work does not populate caches; changed object paths get new signatures; thumbnail failure falls back only for rendered items; search/order and Saved/detail callers retain existing behavior. Verify native Image reuse by exact URL identity, without asserting a cache hit from a mocked load. Android QA must measure actual native image requests/cache outcomes separately.

For any later backend/backfill implementation, first use a disposable local database/storage emulator with synthetic anon/owner/other-user/privileged fixtures. Test published versus draft originals and thumbnails, cross-owner references, no overwrites, stale concurrency tokens, partial uploads and retries. Current live policies must be recreated as inspected rather than replaying the pre-hardening artifact blindly. No migration is needed or approved now.

Executed local check: `node --test tests/backfill-preparation.test.mjs` passed 4/4. It verifies offline bounded thumbnail output/hash preservation, refusal to overwrite, input/traversal/encoding validation and collision handling with networking explicitly denied. No live backfill test was run. Procedure: `docs/explore-thumbnail-backfill-procedure.md`.

Architect gate: recommendation released for bounded client-only changes; Architect records final release. Missing evidence: active build flag, device cache-hit/egress measurements, private reviewed per-object source manifest and backfill execution approval. Live Supabase changes: **not authorized**.
