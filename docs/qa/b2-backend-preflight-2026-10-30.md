# B2 device-only Buddy preferences — backend preflight

Backend Developer; 2026-10-30. Decision: **no backend change required; recommend Architect release the bounded local implementation after recording this report and test plan**. No application implementation, live writes, user-row reads, environment-file reads or publication performed.

## Scope and baseline

Optional explicit travel interests (Nature/Food/Culture) and pace (Relaxed/Packed), with view/edit/forget controls. Store only a versioned device-local record per signed-in user. Guest suggestions stay generic. Preferences affect manual Buddy help tips on Home/Search only; no ranking, filtering, itinerary feasibility claims, new requests or background inference. Product choices remain Architect/owner decisions.

Mobile branch feature/backlog-phase1, HEAD ca2ce8d490ec1716e6ed9676ca71ab85fc21e4e1. Preexisting dirty paths preserved: IMPROVEMENT_BACKLOG.md, PROJECT_STATUS.md, ROADMAP.md, src/app/{create,discover,search}.tsx, src/components/buddy/{buddy-intro,journey-buddy-host}.tsx, src/hooks/use-journey-buddy.tsx, src/lib/buddy/{help-actions,model}.ts, tests/{create-flow,home-polish,journey-buddy,search-explore}.test.mjs; untracked B3/U8 QA reports, src/components/first-outcome-hint.tsx, src/lib/first-outcome.ts, tests/first-outcome.test.mjs. No B2 source written.

Web branch codex/mobile-backlog-guidance, HEAD 560f036b44edc96007b33baa851ebcfb9f097853. Three untracked .temp directories in customize-stops-jwt-correction, customize-stops-jwt-rerunnable and standalone-customize-stops preserved. Separate alternative/superseded SQL paths exist outside main migrations and are not assumed applied merely because present.

Inspected Mobile AGENTS.md, shared workflow, Supabase skill, existing journey-buddy-preflight.md and home-photo-fit-preflight.md, src/lib/buddy/preference.ts, help-actions.ts, contextual-lines.ts, src/hooks/use-journey-buddy.tsx, use-session.ts, src/lib/auth/session.ts, src/app/account.tsx, create/recovery-store.ts. Existing session identity and on/off preference behavior must remain unchanged.

## Confirmed target and actual checks

Existing tracked preflight documents identify gwybjhqgnrpouwcdvusi. Fresh connector list_projects confirmed the same sole project, jithu810's Project, ap-northeast-2, ACTIVE_HEALTHY, Postgres 17.11.0.002. This is the shared hosted application project, **not a write-test target**. No URL/key was recovered from environment files.

Fresh list_migrations returned 13 versions matching the main repository filenames: 20261001000000 core_schema; 20261001010000 public_discovery; 20261001020000 journey_details; 20261002000000 journey_creation; 20261002010000 journey_media_15mb; 20261002020000 social_loop; 20261003000000 travel_tracks; 20261004000000 field_test_destinations; 20261024041322 journey_media_thumbnail_v1_read; 20261025153306 remix_without_media; 20261026045508 capture_customize_stops; 20261026051105 legacy_media_review; 20261026051106 rpc_integrity_hardening. No missing main-migration version observed. Focused definition comparisons read core_schema, public_discovery, social_loop and rpc_integrity_hardening; this is not a byte-for-byte equivalence audit of every migration/object.

Two successful read-only SELECT catalog queries on this target at **2026-10-30 16:34:32.068837 UTC** and **16:34:46.393961 UTC** inspected actual relation columns/ACLs/RLS, constraints/index definitions for identity-related profiles/saved_journeys, role flags, pg_get_functiondef for public discovery/detail/account wrappers and private discovery/detail implementations, pg_policies for relevant public tables and Storage, and storage.buckets configuration. No application user rows or storage objects were queried.

- Database: profiles (7 columns, 7 constraints, 2 indexes), journeys (17 columns, 16 constraints, 5 indexes), journey_stops (13 columns, 14 constraints, 2 indexes) and saved_journeys (3 columns, 3 constraints, 2 indexes) all have RLS enabled. No column containing buddy or preference exists in public/private. B2 needs no new relation, column, constraint or index. Profile identity remains FK to auth.users; saved membership remains composite user_id/journey_id PK with FKs.
- RPC/API: actual get_public_journeys and get_journey_detail are SQL/STABLE security invokers with empty search_path; they delegate to private SECURITY DEFINER implementations. Actual private discovery only projects published journeys and limits latest results to 100; detail restricts to published-or-owner. Actual get_account_journeys is SQL/STABLE SECURITY DEFINER with empty search_path and guards drafts by owner_id=auth.uid(), journey ownership and draft status; Saved requires signed-in membership. All retain anon/authenticated/service_role execute grants as currently deployed. B2 modifies neither signatures nor arguments/results, and adds no RPC calls.
- Authorization/roles: actual profiles policies use auth.uid() ownership; saved_journeys uses user ownership and published journey requirement. Actual anon/authenticated/journey_rpc are non-superuser without BYPASSRLS; service_role has BYPASSRLS and must never be introduced into the client. Current catalog policies/grants show journey_rpc and standalone customization policies consistent with layered existing migrations/alternative deployments; B2 does not call or extend those surfaces.
- Storage: journey-media and profile-avatars are private; both limit files to 15,728,640 bytes with JPEG/PNG/WebP allowlist. Read/insert policies remain path/owner or authorized-reference guarded. No B2 bucket, upload, signed URL or media access is needed.

Known comparison limits/drift: the earliest public_discovery migration uses stop position while live definitions use sequence and include later destination/creator projections. Live additional standalone customization policies are outside the 13 main filename sequence. These are existing layered schema/provenance differences, not new B2 requirements. No blanket live/repository equality claim is made. Since B2 reads no backend object for preferences and keeps existing requests unchanged, these differences do not block its local-only implementation and must not be reconciled here.

Supabase skill: Markdown changelog endpoint returned unsupported content-type; HTML https://supabase.com/changelog was inspected. Current TLS deprecation and platform changes do not require an SDK/backend change for this local AsyncStorage scope. No Supabase API implementation is being added.

## Account boundaries and required implementation contract

Use an explicit versioned local key namespaced by validated signed-in user.id; do not use user_metadata as authorization, email or access tokens in keys. Records belong to an account **on this device only** and are not synchronized. Guests never inherit a record. During auth loading/error or user switch, synchronously mask old preferences before rendering or applying tips, even before an effect runs. Load completion must match the captured current user/generation; late results from user A cannot publish under B or guest.

Retaining A's device record after sign-out is acceptable only with plain disclosure: it is hidden while signed out, returns when A signs in again on this device, and remains until Forget. This is device persistence, not server account storage or a sign-out deletion guarantee. Do not change auth infrastructure to implement this. If owner chooses clear-on-signout instead, return to Architect for the changed persistence contract/test plan.

Serialize save/forget operations per store; capture intended owner at operation start, reject stale UI callbacks after account change, and never allow an earlier queued save to recreate a record after Forget. Save success means local write actually completed; failed save/forget must report failure without claiming success. Invalid/oversized/unknown-version values must resolve to neutral preferences safely. Interests and pace are explicit finite options only, no free text, photos, GPS, sensitive inference or cross-account migration.

## Safe isolated test plan before release

Target: in-memory AsyncStorage-compatible adapter and synthetic users only; a disposable adapter fixture identifies itself as isolated. No database, hosted Auth or Storage writes are needed or permitted.

1. Positive persistence: defaults neutral, select/edit each finite option, save, recreate store and reload same synthetic user; exact canonical values persist. No preference alone enables Buddy or overwrites its existing on/off choice.
2. Negative boundaries: guest, loading/error, different user and invalid user key receive no previous choices or tips; A -> B -> guest -> A displays only A's record when valid. No network/query calls or token storage occurs.
3. Races: deferred A load resolves after B selection; old save/forget callback fires after switch; save queued before Forget; concurrent edits and repeated Forget; unmounted consumer completion. Latest valid owner/generation must win without recreating forgotten choices.
4. Recovery: read/write/remove reject, invalid JSON, wrong version/types, extra keys, duplicate/out-of-range values. Neutral-safe state plus actionable local error; no false Saved/Forgotten message. Retry succeeds and restarts do not restore a successfully forgotten record.
5. Tips: every explicit preference yields honest relevant manual guidance; empty preferences preserve existing generic help. Resume/saved journey authoritative context keeps priority; no eligibility, ranking, opening hours, safety or GPS claims.
6. UI/QA: settings view/edit/forget, cancelled editing, disabled controls while writing, live-region feedback, large-text scrolling and touch targets; real phone may save/forget only this newly introduced local preference namespace, no hosted writes. Mock account-switch tests must be distinguished from actual phone account changes.
7. Regression: existing Buddy intro/on-off/greetings/first-outcome/B3 actions and Account sign-in/sign-out tests; affected suite/typecheck/lint. Independent review checks storage race ordering and synchronous identity masking.

Cleanup/recovery: each in-memory test clears its isolated map. Device QA should record previous B2 state and restore/forget only its own synthetic selection; never clear app data or unrelated keys. Rollback source changes locally without resetting unrelated work; unsupported future record versions remain ignored, no live migration rollback required.

## Architect handoff

All relevant backend areas assessed; **no backend change verified necessary for this scope**. Recommended gate: release local B2 implementation after Architect records this report/test-plan and settles optional product choices. Current-source baseline and fresh relevant live metadata are sufficient for this bounded no-backend-effect decision. Gate is an Architect decision, not silently exercised by Backend Developer.

Live Supabase changes: not authorized. Commits/push/merge/deployment: not authorized. Only changed file: this report. Remaining verification: implementation, specialist QA, independent review and phone UI evidence.
