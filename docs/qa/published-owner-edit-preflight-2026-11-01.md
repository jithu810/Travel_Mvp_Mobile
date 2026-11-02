# Published journey owner editing: read-only backend preflight

Backend Developer, 2026-11-01. Live observations: 12:36:16–12:38 UTC (18:06–18:08 IST). Scope: owner loads their existing published journey, stages edits, and explicitly republishes the same journey; other viewers retain Remix/Make it yours. No application implementation, hosted data writes, uploads, migrations, auth actions or configuration changes were performed by this preflight.

## Decision and gate recommendation

**No database/RPC/RLS/Storage migration is needed. Recommend releasing local client implementation after Architect records this report and the test plan below.** The existing live `save_journey(jsonb)` supports owner-authorized published-to-published updates atomically. Existing Storage INSERT policy permits immutable new objects for an existing owned journey regardless of publication state and regardless of whether a new stop has already been saved.

The client needs an explicit published-edit mode. Its current draft-only loader, hydration, photo verification and draft-checkpoint behavior cannot simply be reused unchanged. In particular, never save `status=draft` as an intermediate checkpoint when editing a published journey. This would unpublish it before the requested republish confirmation.

Live Supabase changes, live republication tests and GitHub publication remain **not authorized**. Preflight completion permits local feature work and isolated tests only.

## Baseline and target

- Mobile: `main`, HEAD `13a40b803797d114f55b0eb91fe7407eb6a23f24`. Dirty baseline preserved: PROJECT_STATUS.md, ROADMAP.md, src/app/create.tsx, src/lib/auth/google-model.ts, src/lib/auth/google.native.ts, tests/create-flow.test.mjs, tests/google-native.test.mjs; untracked docs/qa/outdoor-google-callback-2026-11-01.md. Create screen/test changes belong to the preceding scroll/hint task.
- Web read-only reference: `codex/journey-buddy-public-pages`, HEAD `3acff9d54f5ebf976510b94ad03eb60d48c7b428`. Three unrelated untracked `supabase/*/.temp/` directories preserved. No pending/untracked SQL migration in the canonical chain.
- Nonsecret prior repository preflights identify project `gwybjhqgnrpouwcdvusi`; fresh connected `get_project` confirms jithu810's Project, ap-northeast-2, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. Treat as hosted live/production, never an isolated test target. No environment files, environment values, Expo logs, credentials or user content were read.

## Checks actually performed

Connected tools: project metadata; migration listing; independent SELECT from `supabase_migrations.schema_migrations`; SELECT-only actual pg_proc definitions/ACL/owner/config; pg_class RLS and owners; pg_roles/memberships; pg_policies; information_schema columns and mutation column grants; pg_constraint; pg_indexes; trigger definitions; bounded journey-media bucket configuration. No journey rows, Auth records or Storage object rows were queried.

All 13 canonical Web migrations are recorded live, through `20261026051106_rpc_integrity_hardening`. Live additionally records `20261031071032_registration_email_check`, already documented by the existing registration feature; it is outside this feature and absent from the Web canonical chain. Mobile has no canonical supabase migration directory. Historical standalone customize-stop migration directories are alternatives, not migrations to replay. Inspected canonical core, details, creation, media-size, destination and hardening definitions, and relevant thumbnail/remix/capture dependencies through existing targeted preflight references. No new migration is proposed.

Compared actual function source against `20261026051106_rpc_integrity_hardening.sql` with whitespace removed, using MD5 only as a source-equivalence checksum. All four match exactly:

| Function | Source checksum |
| --- | --- |
| public.save_journey(jsonb) | f30cf242c68e7ce418a1ed42d8f85ee5 |
| private.journey_rpc_uid() | c09e1b21dc855198d1dd163cdad96372 |
| private.journey_media_readable(text) | 483e5dd5aa0a25a09f3c1d5034d78c34 |
| private.advance_journey_version() | bcc8a6e7913e43e2ffbbf96d5af03ddf |

Actual relevant column, constraint, index, RLS, trigger and grant definitions agree with the hardening chain. No affected-object drift found. This bounded result does not certify unrelated schema objects. Older preflight descriptions of save_journey as postgres-owned SECURITY INVOKER are stale; the current hardening definition is authoritative.

## Current contracts and permissions

`save_journey` is SECURITY DEFINER, owned by `journey_rpc`, empty search_path and 5-second lock timeout. EXECUTE is authenticated/service_role plus its owner, with no anon/PUBLIC execution. `journey_rpc` is NOLOGIN, NOINHERIT, non-superuser and NOBYPASSRLS; only postgres membership was observed. Caller identity comes from the private postgres-owned auth.uid projection, executable by journey_rpc only. The RPC role has narrowly scoped column mutation privileges and remains bound by table RLS.

The function locks the row by journey ID **and authenticated owner**, requires the exact optimistic updated_at version, and permits desired status draft or published without a restriction on prior status. For published-to-published it retains `coalesce(current_row.published_at, now())`, keeps the journey ID/creator/lineage unchanged, and advances updated_at through the strictly monotonic trigger. Validation, metadata update, stop replacement and media authorization updates occur in the same transaction; validation or conflicts roll back the whole call. Stale or lock conflicts return 40001. There is no need to copy/delete the journey or reset social records. Existing likes/saves refer to the unchanged parent ID.

Validation includes bounded title/description/destination/traveler/duration; at most 50 unique, consecutively sequenced stops; valid coordinate pairs/rating/day metadata; at least one located stop on publication. Constraints additionally enforce finite journey version, draft/null versus published/non-null publication timestamp, valid fields, stop primary keys, parent foreign key and unique parent/sequence. Existing indexes cover parent ID, owner lookup, published discovery and child ordering; no new query/index is needed for owner-ID-keyed edit loading.

Journeys/stops/private media authorization tables have RLS enabled. Clients can read published journeys or their own drafts; stops follow parent visibility. Client direct INSERT/UPDATE on journeys/stops is revoked (including mutation column grants); authenticated parent DELETE is owner-filtered. RPC policies enforce owner mutation; user_id has no RPC UPDATE grant. The private media authorization table has no client grants and is mutation-accessible only to the restricted RPC role with owner predicates.

The private journey-media bucket accepts JPEG/PNG/WebP, limit 15,728,640 bytes. Actual `journey_media_insert` permits authenticated INSERT when bucket matches, first path segment is auth.uid, and second segment identifies an existing journey belonging to that user. It contains **no draft status or saved-stop predicate**. No journey-media UPDATE/DELETE policy was observed, so preserve immutable new names and `upsert:false`. Existing owner READ allows the uploader to inspect unreferenced new objects; public READ requires current referenced/authorized published media (or the matching thumbnail policy). Consequently uploaded new media stays owner-readable until the atomic republish references it. Removed/replaced media is not deleted by this feature; pre-existing signed URLs can retain their normal lifetime.

## Required client strategy

Inspected Mobile src/lib/create/queries.ts, editor-model.ts, photo-save.ts, photo-queries.ts and photo-model.ts, plus the Create save flow and Journey options. Current `loadEditableDraft`/`hydrateDraft` intentionally reject published rows; `checkPhotoDraft` requires draft status/version and returns persisted stop IDs; the photo controller checkpoints missing parents/stops as draft. These protections remain for ordinary private drafts.

For explicit owner published-edit mode:

1. Authenticate and load the owned, non-demo published row and every raw stop/media path, with a consistent version reread. Never hydrate from public signed-photo projections or trust the card's owner check as the only authorization check. Recheck account/abort identity around async loads and saves.
2. Stage memory/settings/cover changes locally. Memory Save and any Save action must not write draft status or publish changes silently. Preserve discard/leave safeguards. Require the explicit republish control/confirmation for the final operation.
3. Before uploading, verify existing parent owner, is_demo=false, status=published and exact version. Permit newly staged stop IDs belonging to the validated local form without a draft checkpoint; the live upload policy requires the owned parent, not persisted stops. Preserve all path/size/type validation and immutable full/thumbnail pairing.
4. Upload candidates using owned parent paths, then call existing save_journey **once with status=published** and the original full-precision version. New stops and their photo references are committed together. All intermediate failures leave the old published journey visible. No metadata checkpoint is needed because the parent already exists.
5. Preserve ambiguous-result blocking, upload ledger/no blind retries, account-switch protection and final version conflict handling. Uploaded orphan objects can remain private after failure; do not introduce deletion or overwrite cleanup. Abort does not prove a submitted server operation was cancelled.

## Safe isolated verification plan

No backend implementation or migration is needed. Start with Mobile mocked transport/component tests against synthetic owner/other-user/anonymous states. Verify owner/non-demo Edit versus other-user Make it yours; direct-link guards; raw photo preservation; consistent version reread; edit buffers/settings/new-stop saves cause zero RPC/uploads; cancellation causes zero writes; republish submits status=published exactly once; added-stop photos do not cause draft checkpoints; uploaded-but-unreferenced candidates stay uncommitted on upload error; stale version/account switch/abort/unknown responses block unsafe retries. Existing draft/photo/checkpoint regressions must continue passing, including thumbnail enabled/disabled paths.

For database contract verification, existing Web `scripts/lib/offline-db.mjs` creates an in-memory PGlite target with synthetic auth/storage tables, no sockets, no environment files or hosted DSN. Replay the canonical migration chain into a fresh instance; insert synthetic owner/other-user fixtures only there. Exercise anonymous denial, nonowner republish denial, owner published-to-published with preserved published_at/ID, updated version, stop add/remove/reorder and raw media changes, invalid stops rolling back, stale-version 40001, parent-owned Storage INSERT for a new stop before its final save, and public denial of unreferenced objects followed by authorized reference visibility. Run existing integrity regression scripts if backend-contract test coverage is expanded. A full Storage HTTP emulator and real PostgreSQL concurrency run are separate evidence; PGlite does not establish those behaviors. Dispose of the instance after tests. No remote cleanup/rollback is needed because live writes are excluded.

Current-schema evidence and safe plan are complete. No remaining backend preflight blocker for this client strategy. Architect owns final gate release, implementation/QA/review assignment and any later explicit live action approval.

Documentation consulted: Supabase skill; connected documentation search for Storage access; [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). The changelog markdown fetch returned unsupported content-type, so no changelog content was relied upon. No new Supabase API or package change is proposed; current catalog definitions and installed repository contracts establish this feature's backend behavior.

## Executed isolated contract verification

At Architect's follow-up assignment, added only `tests/published-republish-contract.test.mjs` and this report update. Command: `node --test tests/published-republish-contract.test.mjs` from Mobile. Result: **8/8 passing** (seven behavioral subtests plus the enclosing lifecycle test), zero failures/skips, approximately 3.6 seconds. A fresh in-memory PGlite instance replayed the actual canonical Web migration chain using the existing `scripts/lib/offline-db.mjs` fixture; synthetic auth users/profiles, journeys, stops, social links and Storage metadata only. The database was closed in finally. No DSN, network, environment files, remote query or hosted write was used by this test.

Verified: anon and nonowner republication denial; owner upload of an unreferenced new-stop object before the stop exists, while the journey remains published and unchanged; denial of another user's upload under that parent; public/nonowner inability to read that object before the final reference; one published-to-published save adding the photographed stop with unchanged parent/creator/lineage/first publication time and retained social links; updated optimistic version; public read access after commit; stale-version rejection without snapshot changes; a deliberate cross-journey stop primary-key collision after the journey update/deletion proving full transaction rollback; subsequent successful stop removal/reordering with parent/social records intact.

Limitations: this checks actual database policies and RPC execution with an in-memory SQL Storage fixture, not the hosted Storage HTTP service, image bytes, concurrent real PostgreSQL sessions, native app behavior or owner live republish. This optional backend contract test uses the sibling Web checkout and its installed PGlite package when available, without adding a Mobile dependency. In a Mobile-only checkout it explicitly skips with a clear reason instead of failing module resolution. No full Web suite was run. Application implementation QA and independent review remain Architect-owned next steps.

Publication packaging verification: the fixture import is now dynamic and occurs only after confirming the shared helper exists and its PGlite dependency resolves. Current sibling environment rerun: **8/8 pass**. A temporary copy under an isolated synthetic Mobile checkout with no sibling helper: **1 explicit skip, exit 0**. Adding a synthetic helper without its optional PGlite dependency: **1 explicit skip, exit 0**. Providing a resolvable synthetic dependency but a deliberately broken helper: **expected nonzero import failure**, proving unexpected fixture errors are not swallowed. Real workspace directories were neither moved nor removed. No new environment dependency or hosted access was introduced.
