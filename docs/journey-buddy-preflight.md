# Journey Buddy backend preflight

Backend Developer; 2026-10-25, initial live evidence at 11:48:58 UTC (17:18:58 IST), completed after Architect's bounded direct catalog recovery. **Decision: no backend change required. Recommend Architect release feature implementation after recording this report.**

## Scope and baseline

- Journey Buddy is a bundled 2D sprite overlay with device-local AsyncStorage opt-in. Help opens existing Create/draft routes or invokes the existing guarded memory-editor callback. Travel reactions consume semantic state from existing foreground GPS/navigation controllers. No new backend calls, background tracking, uploaded artwork, cloud preferences or autonomous save/upload actions are proposed.
- Mobile: clean `codex/remove-3d-companion`, revision `7c113f07a595af7977a54a961752dfb4e0598ea7` before this report.
- Web: `main`, revision `aa36fe8639a8b7b50fc6df4298f214a0db092186`. Existing untracked `supabase/customize-stops-jwt-correction/`, `supabase/customize-stops-jwt-rerunnable/`, `supabase/standalone-customize-stops/` preserved; each contains only a CLI cache file, with no pending SQL found.
- Inspected both AGENTS.md files, shared workflow and Supabase skill. No environment files, credentials or application user records read. No live writes or publication.

## Repository evidence and expected impact

Eight default migrations inspected through SQL inventory and focused definitions: `20261001000000_core_schema`, `20261001010000_public_discovery`, `20261001020000_journey_details`, `20261002000000_journey_creation`, `20261002010000_journey_media_15mb`, `20261002020000_social_loop`, `20261003000000_travel_tracks`, `20261004000000_field_test_destinations`.

- Database: existing profiles/journeys/stops/social/tracks model suffices. Buddy introduces no columns, constraints, indexes or tables. Existing travel state is process-local and foreground-only; no track persistence is requested.
- RPC/API: current mobile create queries call `save_journey(payload)`; draft listing uses `get_account_journeys`, detail uses `get_journey_detail`, discovery uses `get_public_journeys`. Buddy should register existing UI callbacks rather than introduce RPCs or alter request payloads. Repository save definition is security invoker, checks authentication, owner/version, at most 50 stops and valid owned media references.
- RLS/permissions: repository journeys permit published-or-owner reads and authenticated owner writes; stops inherit parent ownership. Existing editor authentication and busy/uncertain-save guards must remain authoritative. Buddy needs no extra role, grants or policy.
- Storage: sprites remain bundle assets. Existing journey-media uploads and signing remain behind current photo/save controls. Repository bucket intent is private JPEG/PNG/WebP, 15,728,640-byte limit after media-size migration. No Buddy bucket, policy or upload is required.

These are repository observations and expected impact, not a fresh live-schema equivalence claim.

## Live checks actually completed

- Supabase connected `list_migrations(project_id=gwybjhqgnrpouwcdvusi)` succeeded at approximately 11:48:58 UTC and returned exactly `20261024041322 journey_media_thumbnail_v1_read`. Target matches the existing shared live project named in earlier repository preflight documentation; this task has not yet independently recovered current project details.
- Hosted migration history therefore differs from the eight default repository filenames. The hosted thumbnail-read migration is not in those default filenames. This is pre-existing provenance drift; do not reconcile it as part of Buddy.
- Next tool cell called `get_project` then a bounded single SELECT/UNION over application relation RLS/ACLs, bucket configuration and role privileges. The cell returned no payload and was interrupted after 218.7 seconds. Neither call result is claimed as successful, and the catalog query may not have started because execution was sequential.
- Parent requested no additional network calls pending status recovery. No further connector retry was launched by Backend Developer.
- Earlier `docs/companion-removal-preflight.md` records same-day actual schema evidence, but this report does not substitute that historical task result for required fresh affected-contract checks.
- Architect recovered a direct small `execute_sql` on the same project at 11:53:28.965679 UTC: current database `postgres`; actual `journeys`, `journey_stops`, `profiles`, `saved_journeys` all have RLS enabled. This establishes fresh target access without claiming the interrupted project-details call succeeded.
- Architect subsequently recovered actual `pg_get_functiondef` and `proacl` for all four public RPCs and `private.public_journeys`. Actual `save_journey` is PL/pgSQL SECURITY INVOKER with empty search_path; it rejects null auth UID, validates payload and stops <=50, checks current owner row and optimistic updated_at, checks own media path/existing Storage reference, updates only the owner journey and replaces its stops. EXECUTE ACL includes postgres/authenticated/service_role, excluding anon/PUBLIC. This is consistent with repository creation/destination intent and requires no Buddy change.
- Actual public discovery wrapper is SQL/STABLE with empty search_path and delegates to `private.public_journeys`; that implementation filters published journeys and projects creator/stops. Actual `get_journey_detail` delegates to `private.journey_detail`, with anon/authenticated/service_role EXECUTE. Actual `get_account_journeys` is SECURITY DEFINER with empty search_path; draft access requires owner_id=auth.uid() plus matching journey owner/draft status, while published and own saved collections retain their separate guarded branches. Its ACL permits anon/authenticated/service_role. No Buddy input/output or new RPC is required. Detail private implementation is not changed by Buddy and full bytewise database equivalence is not asserted.
- Local source inspection additionally confirms saveNewJourney verifies auth.getUser identity and retains timeout/cancellation and ambiguous-save handling; loadEditableDraft filters owner/status and rechecks updated_at. Existing foreground-location explicitly retains one current fix without storage/history/backend; tripStore is process-memory only. Buddy must reuse these paths rather than weaken them.
- Architect's final bounded UNION returned actual affected policies, table ACLs and bucket configuration. Journeys read policy permits anon/authenticated published-or-owner access; authenticated insert/update/delete require ownership, with both USING and WITH CHECK for updates. Stops read through published/owned parent and write through owned parent, with both update predicates. Existing customize_stops_rpc standalone policies remain unrelated. Both table ACLs grant anon SELECT, authenticated SELECT/INSERT/UPDATE/DELETE, customize_stops_rpc SELECT and full postgres/service_role rights.
- Actual Storage journey_media_insert requires authenticated role, journey-media bucket, UID first path segment and an owned journey in the second segment. journey_media_read permits anon/authenticated owner-path access or exact referenced cover/stop of a published/owned journey. thumbnail_v1_read additionally checks the exact UUID suffix/pattern and referenced full-v1 variants. Actual journey-media bucket is private, limit 15,728,640 bytes, JPEG/PNG/WebP. These match the reuse assumptions; sprites need none of these upload/read paths.
- Root-provided fresh SQL evidence completes the affected-contract comparison. Owner/version/save restrictions, published/private reads, relation privileges and private media behavior remain compatible with repository intent. Hosted thumbnail/standalone-copy additions and migration-history mismatch are existing unrelated drift; this report does not claim whole-database byte-for-byte equivalence or propose reconciliation.

## Safe test plan and release conditions

No backend change is required: bundled artwork, local opt-in and read-only semantic travel state need no new database objects, RPC/API contracts, RLS, permissions or Storage changes. Existing action callbacks preserve the current authenticated save/media contracts. No database fixtures or database writes are needed to validate this feature: use mocked screen action callbacks, local preference storage, app lifecycle tests and existing editor/travel regressions; export Android and verify touch/animation behavior on a device without saving/uploading hosted records.

Fresh affected-contract evidence is complete through Architect's successful direct read-only catalog checks against the established shared live project. No user or Storage object rows were needed. If any backend change becomes necessary, stop and first define a verified disposable database, synthetic anonymous/owner/other-user fixtures, migration order, positive/negative RPC and Storage checks and rollback before any isolated write.

- Missing feature-specific evidence / blocker: none after root catalog recovery. Interrupted get_project remains an explicitly disclosed connector limitation, not a successful check.
- Next owner: Architect to record/release gate and assign Mobile implementation, then QA and independent review.
- Architect gate: **released** by Architect after reading this completed no-change report on 2026-10-25; Mobile implementation may proceed within the approved local scope.
- Live Supabase changes: **not authorized**.
- Publication: local/unpublished documentation only.
