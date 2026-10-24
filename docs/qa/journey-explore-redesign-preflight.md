# Journey explore redesign — backend preflight

Backend Developer; 2026-10-24, live catalog evidence at 07:31:03–07:32 UTC / 13:01–13:02 IST. Local/unpublished. Read-only inspection only; no hosted writes, migrations, seeds, social actions, uploads or production records.

## Scope and baseline

Icon-only social rail with red heart; icon map controls; compact stop cards with author/navigation above; swipe/loading transition into existing foreground, in-memory Travel Mode. Existing Begin Trip remains the explicit timer/GPS start. No persistent trips, GPS history, schema or contract changes.

- Mobile: `main`, `c668bb2e70c46e85c48c6dfeb4bad448579df2b7`. Initial dirty paths: `.env.example` (name only; never read), `src/app/journey/[id].tsx`, `src/components/journey/social-actions.tsx`, `tests/search-explore.test.mjs`; untracked `.github/`, `cd`, `eas`. No Mobile `supabase/` directory.
- Web read-only reference: `codex/web-wip-backup`, `40aae99afce4dea74d0bb6871764fd874b387b41`. Initial deletion `.env.example` (never read), untracked `.temp/cli-latest` under three standalone/corrective Supabase directories. `git ls-files --others --exclude-standard supabase` found only those temp files, no untracked SQL. No writes to Web or integrity-hardening work.
- Read Web workflow, Mobile AGENTS, PROJECT_STATUS/ROADMAP, installed Supabase skill. Exclusive write ownership: this report only.

## Confirmed live target and checks

Supabase connector `get_project` confirmed `gwybjhqgnrpouwcdvusi`, `jithu810's Project`, `ap-northeast-2`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.002. This is the existing hosted app project, treated as live/production, not an isolated test target. Existing non-secret Mobile status documentation identifies the same ref.

Executed connector `list_migrations`, then independently selected `supabase_migrations.schema_migrations`. Both returned only `20261024041322 journey_media_thumbnail_v1_read`. Executed SELECT-only catalog queries over `pg_class`, `pg_namespace`, `pg_policies`, `pg_proc`/`pg_get_functiondef`, `pg_constraint`/`pg_get_constraintdef`, `pg_indexes`, `pg_roles`, information-schema columns/table grants, `storage.buckets`, and `to_regclass`. No user rows or Storage object rows were queried.

Observed current definitions, rather than assuming migration history proves deployment:

- `journeys`, `journey_stops`, `profiles`, `journey_likes`, `saved_journeys`, `travel_tracks` all have RLS enabled; `storage.objects` has RLS enabled.
- Journey reads permit published or caller-owned rows; stop reads require a visible published/owned parent. Author/stop fields already exist: creator information is projected by the existing detail RPC, stops have sequence/photo/coordinates/rating/day.
- Social tables each have primary key `(user_id, journey_id)`, cascade foreign keys to profile/journey and journey lookup indexes. Authenticated grants are SELECT/INSERT/DELETE; no anonymous table grants. SELECT/DELETE policies require caller ownership; INSERT additionally requires a published parent. No UPDATE grant is required for the existing ignore-duplicate upsert path.
- `public.get_journey_detail(target_id uuid)` is SECURITY INVOKER, empty search path, delegates to `private.journey_detail`. Its current ACL explicitly includes anon/authenticated/service_role, not PUBLIC. Private helper is postgres-owned SECURITY DEFINER with empty search path, anon/authenticated EXECUTE, and an explicit published-or-owner predicate. It returns creator identity, title, ordered stops, aggregate likes, and caller-scoped liked/saved flags. These actual definitions match the UI's existing detail/social needs.
- Public/private schema USAGE for anon/authenticated exists. Social tables are postgres-owned; client roles are not owners. Existing private Customize Stops role is NOLOGIN/NOBYPASSRLS; no role/grant changes are needed here.
- Current constraints include published state consistency, coordinate pairs/ranges, unique journey stop sequence, rating/day bounds, title bounds and duration 1–365. No new sort/order/author fields or indexes are needed for layout changes.
- `journey-media` and `profile-avatars` are private buckets, 15 MiB, JPEG/PNG/WebP. Current journey-media SELECT policies allow owner or published referenced originals plus the separate thumbnail policy; INSERT remains authenticated owner-path/owned-parent checked. Avatar SELECT uses owner path or referenced-avatar helper; INSERT checks owner path. Existing anonymous signed-image resolution and fallback remain unchanged.

## Repository comparison and drift

Inventoried all SQL under Web `supabase/`, including nested standalone migration directories. Inspected relevant object declarations, policies/grants and definitions in core schema `20261001000000`, public discovery `20261001010000`, journey details `20261001020000`, journey creation `20261002000000`, 15 MiB media `20261002010000`, social loop `20261002020000`, travel tracks `20261003000000`, field destinations `20261004000000`, legacy review `20261005000000`, integrity hardening `20261005010000`, selected copy `20261020164047`, standalone variants `20261021024312`/`20261021030409`, JWT corrections `20261021063838`/`20261021070751`, and auth-usage patch. Also read Mobile `docs/backend/image-thumbnails.review.sql`.

The live journey/detail/social/media baseline corresponds to the earlier core/details/social-loop model, with field-destination and standalone Customize Stops objects and the thumbnail read policy. Migration history is incomplete relative to existing objects; absence of a history row alone cannot classify every legacy migration as unapplied.

Concrete pre-existing drift: `private.legacy_journey_media_approvals` and `private.journey_media_authorizations` are absent, `journey_rpc` role is absent, and authenticated direct journey/stop write grants remain. Therefore the repository legacy-review/integrity-hardening chain is not the live baseline. `private.standalone_selected_copy_receipts` exists, matching the alternate standalone branch, and its policies use the corrected JWT helper. Do not apply the root migration chain or reconcile this drift as part of a UI change. Thumbnail policy is live and represented by the Mobile reviewed SQL/history entry, while absent from Web root migration inventory. No new/pending migration is introduced by this feature.

This is a feature-relevant comparison, not certification that every unrelated RPC body matches every historical migration byte-for-byte.

## Decision and safe validation

**No backend change required for the bounded presentation/navigation scope.** Existing social handler uses `get_journey_detail`, authenticated user verification and owner-keyed existing table writes; this task must retain those handlers. Share uses the native share/public-link flow; moving or restyling controls requires no API. Map fitting/fullscreen and stop selection remain client operations. Trip session source uses an in-memory Map, and the route opens existing Travel Mode; no Supabase trip write is required or authorized.

Safe implementation tests use synthetic journeys/mocked social ports and local native state only. Verify swipe threshold/cancel/reset, duplicate completion guard, blur/background/unmount cancellation, reduced motion and accessible alternate activation; completion navigates once without starting GPS/timer before existing Begin Trip. Retain guest sign-in intent, loading/error/disabled states, liked/saved counts, selected stop, map camera ownership and photo fallback. Check short-screen/large-text layout and icon spoken labels/touch targets. Existing social/Travel unit regressions, TypeScript/lint and Android export are appropriate; physical Android visual/gesture testing remains separate evidence.

No database fixture writes are needed. If later requirements introduce persisted starts or change authorization, reopen preflight and first confirm an isolated disposable local PostgreSQL/Supabase target, with synthetic anonymous/owner/other-user cases and no production credentials. Reconcile migration ordering before applying any old chain there; integrity hardening depends on explicit legacy review, and standalone versus hardened branches are not interchangeable. Never run hosted migration/seed/like/save/upload tests under this preflight. Local UI rollback is limited to task-owned edits after preserving the recorded dirty baseline; no Git reset/checkout/clean.

Limitations: live metadata inspection proves definitions, not authenticated end-to-end authorization execution. Changelog markdown fetch was attempted via web (unsupported MIME) and shell (network socket denied); no Supabase implementation or API change is proposed, so current product documentation is not needed to select a new API. No .env files were read. No application tests run by this preflight owner.

Architect gate: report complete; Architect must record acceptance/release before feature coding. Live Supabase changes: not authorized. Publication/commit/push/deployment: not performed or authorized by this assignment.

Architect gate: RELEASED on 2026-10-24 after review of this completed report. Local Mobile UI implementation and isolated tests only; existing Begin Trip consent retained. No live changes or publication authorized.
