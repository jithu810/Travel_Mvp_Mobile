# Home globe attribution positioning: backend preflight

Backend Developer, 2026-10-25. **Decision: no backend change required; ready for Architect gate release.**

## Scope and baseline

Move the existing native globe attribution button from top/right to beside the upper-left logo, and use the same anchors for Buddy's protected rectangles. Both SDK controls stay enabled. No change to map sources, journey loading, camera/gesture ownership, saved preferences, authentication or requests is proposed.

- Mobile: clean `main`, `e527e105b7d1b0a45e04d85fa83d771c6cee8380` before this report.
- Web: `main`, `aa36fe8639a8b7b50fc6df4298f214a0db092186`; existing untracked `supabase/customize-stops-jwt-correction/`, `supabase/customize-stops-jwt-rerunnable/`, `supabase/standalone-customize-stops/` preserved. Recursive inventory confirms each contains only nested `.temp/cli-latest` metadata, no SQL.
- Existing shared live target `gwybjhqgnrpouwcdvusi`, established by repository preflight documentation and freshly confirmed by connector project listing: ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11. No environment files or credentials accessed. This target is not isolated or authorized for writes.

## Fresh read-only evidence

Connector `list_projects`, `list_migrations` and two SELECT-only catalog queries succeeded. First catalog timestamp: **2026-10-25 16:15:22.899098 UTC** (21:45:22.899098 IST). Inspected relation RLS/owners, relevant column types/nullability, actual constraints/index definitions, actual public/private discovery/detail function definitions and ACLs, roles/table grants, application/Storage policy expressions and bucket configuration. No application records or Storage object rows were queried.

- Current `public.get_public_journeys` is a stable invoker wrapper into stable definer `private.public_journeys`, empty search paths, explicit published-only projection, destination/traveler/ID filters and limit 100. Detail wrapper/private implementation retains published-or-owner gating. Anon/authenticated execution remains available. No positioning field or new RPC is needed.
- Journeys/stops/profiles/social/travel relations have RLS enabled. Journey/stops read policies retain published-or-owner visibility; authenticated writes require ownership, including both UPDATE predicates. Anon has journey/stops SELECT, authenticated has guarded CRUD. `customize_stops_rpc` exists without LOGIN/BYPASSRLS; `journey_rpc` is absent.
- Journey/stop columns, coordinate/title/publication constraints, parent foreign keys and discovery/owner/sequence indexes support the same unchanged globe data contract. No additional database object or permission is required.
- `journey-media` and `profile-avatars` buckets are private, 15,728,640-byte JPEG/PNG/WebP. Existing journey-media read policy permits owner/exact published-or-owned cover/stop references; insert requires user path and owned journey. Thumbnail read policy is present. Existing Storage access remains sufficient; controls use SDK UI, not uploaded assets.

## Migration comparison and drift

Read the eight default Web migration files: core (`20261001000000`), discovery (`01010000`), details (`01020000`), creation (`20261002000000`), media limit (`02010000`), social (`02020000`), tracks (`20261003000000`), destinations (`20261004000000`). Current inspected core/discovery/detail/media/social/travel/destination objects match the reused feature contracts, including published/owner predicates and worldwide destination constraint.

Hosted history currently lists only `20261024041322 journey_media_thumbnail_v1_read` and `20261025153306 remix_without_media`; the default filenames are not recorded. Hosted standalone-copy policies/private receipt relation and avatar bucket are additional objects. `private.journey_media_readable`, `private.selected_copy_requests`, `private.legacy_journey_media_approvals` and role `journey_rpc` are absent in the inspected inventories. This is existing deployment provenance/structural drift outside this positioning scope; full byte-for-byte database equivalence is not asserted. Do not replay or reconcile migrations for this task.

## Impact, tests and handoff

Database, RPC/API, RLS, grants/ownership and Storage change requirements: **none**. Source inspection of `globe-style.ts` and `buddy/map-controls.ts` confirms presentation constants and pure rectangle projection, without Supabase/RPC/fetch/Storage calls. The change introduces no persistence or new data capability.

Safe tests: focused globe/preview and Buddy geometry cases for new shared anchors/header offsets, preserved logo/attribution flags and compass footprint; TypeScript/lint; short native check of attribution opening and Buddy clearance. No synthetic database fixtures, hosted test writes or migrations are needed. If scope expands into data contracts, pause and define verified disposable database tests before writes. Revert only this task's local positioning changes if recovery is needed.

Missing feature-specific schema evidence: none. Supabase changelog markdown fetch was attempted but the web reader rejected its content type; no Supabase implementation/API change is proposed.

- Architect gate: released by Architect on 2026-10-25 after reviewing this completed report; positioning-only implementation and focused verification may proceed.
- Next owner: Architect, then Mobile implementation, focused QA and independent review.
- Live Supabase changes: **not authorized; none performed**.
- Publication: local/unpublished. Changed file: this report only.
