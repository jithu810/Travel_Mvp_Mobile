# Story walking Buddy: backend preflight

Backend Developer, 2026-10-27 08:19 IST. **Decision: no backend change required.** Architect may release bounded local Story presentation implementation after recording acceptance.

## Scope and baseline

Replace Story's static Buddy/plane preview and Play/Replay/comparison controls with a real walking sprite; use compact/expanded sizes and move toward the selected existing stop when next/previous cards change. Keep Home Locate walking Buddy, Travel GPS/navigation, ownership, existing public visibility and all prior dirty work intact. No persistence, uploads, new endpoint, location observer or permission change is required.

Web main `4ab53cc464f2f99e9d905712678ed5954d94300e`, with only the same three untracked standalone/customize-stops metadata `.temp` directories; Mobile `codex/buddy-bubbles-outdoor` at `955ecac21ae554ae428c9efb36d2f8ab6406e935`, ahead two, with prior Jump/Run, Story/live-map prototype, completed Home walking Buddy application/assets/tests/docs dirty work. Both baselines inspected read-only; no existing file modified by this preflight. Default repository inventory remains 13 migrations through `20261026051106_rpc_integrity_hardening.sql`; no new migration required.

## Fresh live evidence and comparison

Connected Supabase get_project and list_migrations confirmed existing live target `gwybjhqgnrpouwcdvusi`, ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11, with all 13 migration versions/names matching the default repository chain. Fresh actual catalog SELECT timestamp **2026-10-27 02:48:47.83902 UTC** (08:18:47.83902 IST). No user records, secrets or environment files read; no live writes performed.

Compared actual public get_public_journeys/get_journey_detail and private public_journeys/journey_detail definitions and ACLs, journeys/journey_stops columns/constraints/indexes, table owners/RLS/grants, public/storage policies and private bucket metadata to the previously inspected core/discovery/detail/social_loop/hardening contracts and unchanged current migration inventory.

- Database: existing ordered stop UUID/sequence/latitude/longitude and coordinate pair/bounds constraints, FK, unique sequence and owner/discovery indexes suffice. Selected-card identity and synthetic preview coordinates remain client state; no column/index/constraint/travel-track write needed.
- RPC/API: actual stable public invoker wrappers retain empty search_path and anon/authenticated EXECUTE. Private stable definers retain empty search_path and published-only discovery / published-or-owner detail checks. Detail returns ordered coordinates and existing photos. Current Story already loads these via the public discovery gate then detail RPC; moving the same loaded sprite adds no data read, argument or response field.
- RLS/permissions: both tables retain RLS, postgres ownership and published-or-owner anonymous/authenticated SELECT. Existing owner DELETE and narrow journey_rpc policies/grants remain unchanged. UI selection does not grant visibility or modify ownership.
- Storage: journey-media and profile-avatars remain private, 15728640-byte JPEG/PNG/WebP buckets. Existing owner/referenced read, thumbnail read and owner-path insert policies remain. Bundled walking/idle sheets add no upload, signed URL or policy/bucket requirement.

Default migration history agrees with repository inventory. Existing later creator/destination projections and historical standalone policy/bucket provenance remain as described in Home preflight; full unrelated database equivalence is not asserted. No feature-specific drift or missing schema evidence blocks these unchanged read contracts.

## Safe local test plan

Use synthetic ordered stops and component clocks, without database fixtures/writes. Verify compact/expanded sprite size; actual frame advance while moving; idle at selected stop; next/previous, direct card/pin selection and rapid reversal reject obsolete callbacks; missing/coincident/invalid/date-line coordinates do not invent a location or bridge missing route segments. Preserve selected stop identity, camera control and touch targets. Confirm no legacy Play/Replay/comparison controls in Story, while existing Travel entry remains available as intended by Architect/product scope. Validate reduced motion, preference off, image/layout failure, background/blur, expansion/collapse/unmount and one Buddy presentation owner. Regress Home Locate, editor, Story detail/photo/social controls and authoritative Travel GPS/navigation. Native evidence is required for actual MarkerView animation, sizes, visibility/occlusion and touch/accessibility; mocks do not establish these.

No isolated database target is needed because no backend write is planned. If API/persistence/GPS scope expands, pause for refreshed preflight and a verified disposable database with anonymous/owner/other-user authorization cases before writes. Recovery is limited to this feature's new diff, preserving prior dirty work.

Missing feature-specific evidence: none. Gate recommendation: release local presentation work. Live database changes, commits, pushes and deployments remain unauthorized.

Architect acceptance: **released 2026-10-27 08:20 IST** for bounded local Story walking Buddy presentation implementation and testing.
