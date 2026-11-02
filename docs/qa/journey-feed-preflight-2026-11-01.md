# Vertical journey viewer: backend preflight

Backend Developer; 2026-11-01. Full bounded read-only preflight for Search-ordered vertical journey viewing, bounded process-memory public-detail caching, adjacent detail/first-image prefetch and lifecycle cancellation. Tier: major/sensitive because navigation/lifecycle and caching behavior change. Only this report is writable in this assignment.

**Decision: no backend change required, verified against current live definitions. Recommend Architect release local implementation after recording this report and accepting the client constraints/test plan below. Architect gate remains paused until that record.** No schema/RPC/RLS/grant/Storage migration, new index, new backend or authenticated read path is needed. This does not authorize live changes or publication.

## Baseline and target

- Mobile HEAD `76370ebdbd0ec83b3f7deb07aeb5be1d942ee50e`, branch `codex/published-journey-edit-buddy`. Preserved dirty baseline: `PROJECT_STATUS.md`, `ROADMAP.md`, `src/app/journey/[id].tsx`, `src/components/journey/social-actions.tsx`, `src/lib/auth/google-model.ts`, `src/lib/auth/google.native.ts`, `tests/google-native.test.mjs`; untracked `docs/qa/outdoor-google-callback-2026-11-01.md`.
- Web read-only reference HEAD `3acff9d54f5ebf976510b94ad03eb60d48c7b428`; three untracked `supabase/*/supabase/.temp/` directories preserved. No pending/untracked canonical SQL migration. Existing integrity-hardening and alternate historical SQL remain untouched.
- Nonsecret repository preflight/rollout reports identify `gwybjhqgnrpouwcdvusi`. Fresh connector `list_projects` confirms that sole project: ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11.0.002. Treat as shared hosted/live production, never an isolated write-test target.
- No `.env` or `.env.*` file, credentials, user rows, Storage object rows or private content read. No hosted RPC execution, writes, uploads, auth actions, installs, phone operations, commits, pushes or deployments.

## Fresh live evidence

Connected `list_migrations` and independent SELECT of `supabase_migrations.schema_migrations` agree: all 13 canonical Web migration version/name pairs through `20261026051106_rpc_integrity_hardening`, plus `20261031071032_registration_email_check`. The latter is the known cross-repository reconciliation gap, not a new viewer dependency. No missing canonical migration observed. Historical standalone/superseded migration directories are alternatives, not a replay plan.

Catalog-only SELECTs at **14:10:34.644655–14:11:30.112216 UTC (19:40:34–19:41:30 IST)** inspected actual function source/owner/ACL/search_path/security mode; table/schema ACLs; all relevant policies and RLS flags; journeys/stops columns, constraints and indexes; private capability-table metadata; journey-media bucket metadata; identity/media helpers; and migration history. A subsequent source-checksum SELECT matched all six local sources exactly with whitespace removed (MD5 is an equivalence checksum only):

| Actual live function | Matching repository source | Source MD5 |
| --- | --- | --- |
| public.get_public_journeys(text,text,uuid) | 20261001010000_public_discovery.sql | a9002f9d3ca87594cd54790c554638c2 |
| public.get_journey_detail(uuid) | 20261001020000_journey_details.sql | ad97a2715b4f4481aeab6495ac3220ac |
| private.public_journeys(text,text,uuid) | 20261004000000_field_test_destinations.sql | d0e480e22ee3654577a5e5962025e7ea |
| private.journey_detail(uuid) | 20261001020000_journey_details.sql | d8eb679e7dce1f75d3e12fa08d56f0b9 |
| private.journey_media_readable(text) | 20261026051106_rpc_integrity_hardening.sql | 483e5dd5aa0a25a09f3c1d5034d78c34 |
| private.journey_rpc_uid() | 20261026051106_rpc_integrity_hardening.sql | c09e1b21dc855198d1dd163cdad96372 |

Supporting intent inspected in core, public-discovery, details, creation, social-loop, destination, thumbnail and integrity-hardening migrations. Current relevant policy/constraint/index definitions agree with those sources. No affected-object drift found. This bounded assessment does not certify unrelated schema objects or reconcile the email-check history gap.

## Contracts, authorization and Storage

Public wrappers are stable SECURITY INVOKER, postgres-owned, empty search_path, EXECUTE granted to anon/authenticated/service_role, no PUBLIC execute. Their private implementations are postgres-owned SECURITY DEFINER with empty search_path and explicit visibility predicates, callable by anon/authenticated without PUBLIC execute. Private schema USAGE is present for those roles.

`get_public_journeys` returns at most 100 published journeys with nonnull destination/traveler values, ordered by published_at descending then ID; optional journey_filter restricts by UUID. Its projection includes creator identity/display data, aggregate likes and ordered stop cards. `get_journey_detail` returns published or caller-owned content, including raw photo paths and ordered stops. The isolated anonymous client makes auth.uid null, so owner drafts and personalized liked/saved state cannot enter this public cache. Preserve the existing first public-card gate and normalization; never populate this cache from authenticated owner/edit/social loaders.

Journeys, stops, profiles, likes, saved journeys and storage.objects all have RLS enabled. Anonymous direct SELECT exists on journeys/stops only among those app tables; policies require published parent visibility. Authenticated reads allow owner drafts, while profile/like/save policies restrict to caller ownership. Direct client journey/stop insertion/update is absent; social writes remain existing authenticated flows. No change to those boundaries is proposed.

Journeys/stops have UUID keys, parent FK/cascade, unique parent/sequence, bounded metadata/duration/rating/coordinates, paired coordinates, positive sequence and publication-state constraints. Existing primary-key, owner, published/discovery and parent/sequence indexes cover these unchanged ID/detail queries. The feed must preserve the Search result's client ordering rather than add a new SQL ordering/pagination contract.

`journey-media` is private, 15,728,640-byte limit, JPEG/PNG/WebP. Original SELECT permits uploader ownership or `private.journey_media_readable`, which requires an authorization record, current journey reference and published/owner visibility. Its owner journey_rpc is NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS; identity delegates to auth.uid. The private authorization table has RLS and no client grants. Thumbnail SELECT requires the canonical thumbnail path and a referenced original on a visible journey. Authenticated upload requires caller-owned path/existing journey; no new upload/update/delete is needed. Failed signing remains a photo fallback, never a reason to bypass the private bucket.

## Required client constraints

Inspected `src/lib/discovery/queries.ts`, `request-cache.ts` and `src/lib/supabase/public.ts`. Existing collection TTL is 45 seconds; signed URL cache is bounded at 512 entries/3,300,000 ms and signatures request 3,600 seconds. Public reads use a distinct nonpersistent client with no saved user's bearer token; fetch/signing already have bounded timeouts/concurrency.

1. Cache only normalized anonymous public detail in bounded process memory, keyed by validated journey ID, with a short explicit TTL (recommend no more than existing 45 seconds). No persistent/offline detail store, tokens or personalized social state. Clone mutable nested values when handing them to consumers.
2. Before presenting a cached or prefetched detail on activation/refocus, perform the existing fresh public-membership/card read. A stale Search result or cached card is not proof of current publication. Null/denied/malformed/error must not reveal cached detail; evict denied/null entries and show unavailable/retry behavior. Preserve current public normalization to handle an unpublish race between card and detail calls. Recheck on refresh/resume; do not promise instantaneous revocation while a journey is continuously visible.
3. Cache raw normalized paths and resolve photos per activation, or track actual signed-URL expiry separately. A new short detail TTL does not make a reused 55-minute-old signed URL fresh. Avoid extending the existing signature lifetime through a newly cached resolved detail. Clear detail/inflight generations when invalidating public collections and after relevant local publish/edit/unpublish refreshes. Late completions must not repopulate cleared generations.
4. Share in-flight reads without one cancelled subscriber cancelling other active consumers. Last-consumer cancellation/blur/background must stop or ignore pending work, prohibit stale screen updates and bound outstanding transports. Prefetch only the next intended detail plus its first displayed image; never recursively fan out through the result set or preload every stop image. Existing resolvePhotos signs all detail paths: signing URLs is distinct from downloading image bytes, and first-image prefetch must remain explicit/bounded.
5. Use the unchanged public client/RPCs and preserve authenticated write/session/social flows. Never merge owner-private detail into viewer-independent cache after login/account switch. Keep ordered result IDs in memory/navigation state without content credentials or new backend persistence.

Supabase documents fixed signature expiry and inability to revoke an individual signed URL; bytes already downloaded/native cached and previously issued URLs can outlive an unpublish event. Fresh public gating prevents redisplaying denied cached details but cannot retract earlier disclosure. Do not claim immediate revocation or add object deletion/key rotation as part of this task.

## Safe isolated verification plan

Use synthetic fixtures and mocked public RPC/Storage/image transports in local Node tests; no production records or hosted writes. Test public versus private/null/malformed detail, mismatched IDs, changed/unpublished membership before cache activation, TTL expiry/eviction, deduplicated concurrent callers, independent cancellation, all-consumer abort, timeout/error recovery, invalidation during inflight resolution, account-switch separation and signed URL expiry. Assert exact existing RPC names/arguments and no authenticated client calls. Verify next-only detail and first-image prefetch, stable Search ordering, terminal result boundaries, rapid swipes, blur/background/resume and stale-response suppression. Expected: only currently gated public content is displayed, request/cache budgets hold, social/auth paths stay unchanged, failures show fallback/retry.

If SQL changes become necessary, pause and reassess. Use only a verified disposable/local database with synthetic anon/owner/other-user roles and ordered canonical migrations; independently handle the known registration migration dependency before assuming full cross-repository reproducibility. No DB writes are needed for this feature's present plan. Recovery is local cache clear/restart and scoped patch revision; no live cleanup or rollback action is authorized.

Preflight checks performed: repository/status inspection, current live metadata/history comparison, six source-equivalence checks, relevant current official docs. No application tests/typecheck/lint/device checks run because no application code changed; implementer/QA must execute the plan and major-tier navigation/lifecycle verification. Independent application review remains required. Report is local/unpublished; no approval needed for this completed read-only preflight, but live changes/publication/deployment require their respective explicit owner authorizations.

## Current documentation checked

Supabase skill read. The requested changelog.md fetch was unsupported by the web fetcher and direct shell fetch was unavailable; reviewed the HTML [changelog](https://supabase.com/changelog) instead and followed the relevant [Data API explicit-grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). Existing actual grants were inspected; no new table is proposed. Also reviewed [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [signed URL expiry](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) and [signed URL revocation/cache limits](https://supabase.com/docs/guides/storage/serving/downloads). No current API change requires altering this feature's existing read contract.
