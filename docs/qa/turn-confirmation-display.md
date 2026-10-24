# Turn confirmation display - local task record

Base: c910b36085f8858b3772570df89d38418126cdd5 (Mobile PR #9 merge).
Branch: codex/turn-confirmation-display. Worktree: D:/Travel_Mvp_Mobile_Worktrees/turn-confirmation-display.
Scope: display Confirming turn while outgoing fixes are awaiting existing confirmation; hide stale to-maneuver distance. No arrow, GPS cadence, progress threshold, dependency or backend change.

## Read-only original-folder comparison against PR #9

Compared Mobile main c668bb2...origin/main c910b36 incoming paths with tracked modified and untracked paths. Original folder remains on main, one commit behind. No sync or cleanup performed. Environment file contents were not read.

| Overlapping path | Original folder status | Comparison with origin/main |
| --- | --- | --- |
| `PROJECT_STATUS.md` | Modified | Identical after CRLF/LF normalization |
| `ROADMAP.md` | Modified | Identical after CRLF/LF normalization |
| `docs/qa/draft-editor-redesign-preflight.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/draft-editor-redesign-review.md` | Untracked | Byte-identical |
| `docs/qa/draft-editor-redesign.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/draft-empty-state-preflight.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/draft-empty-state-review.md` | Untracked | Byte-identical |
| `docs/qa/draft-empty-state.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/draft-memory-stack-review.md` | Untracked | Byte-identical |
| `docs/qa/draft-memory-stack.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/journey-explore-redesign-preflight.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/journey-explore-redesign-review.md` | Untracked | Byte-identical |
| `docs/qa/journey-explore-redesign.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/mobile-design-publication-20261024-final.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/mobile-design-publication-review-20261024.md` | Untracked | Identical after CRLF/LF normalization |
| `docs/qa/navigation-background-review.md` | Untracked | Byte-identical |
| `docs/qa/navigation-background.md` | Untracked | Identical after CRLF/LF normalization |
| `src/app/create.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/app/journey/[id].tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/create/draft-route-illustration.tsx` | Untracked | Identical after CRLF/LF normalization |
| `src/components/create/editor-action-icon.tsx` | Untracked | Identical after CRLF/LF normalization |
| `src/components/create/memory-deck.tsx` | Untracked | Identical after CRLF/LF normalization |
| `src/components/create/memory-row.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/floating-navigation.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/journey-action-icon.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/journey-options.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/map/journey-map.native.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/map/map-frame.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/map/native-map.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/social-actions.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/stop-card-deck.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/stop-timeline.tsx` | Modified | Identical after CRLF/LF normalization |
| `src/components/journey/swipe-journey-start.tsx` | Untracked | Identical after CRLF/LF normalization |
| `tests/create-flow.test.mjs` | Modified | Identical after CRLF/LF normalization |
| `tests/draft-memory-deck.test.mjs` | Untracked | Identical after CRLF/LF normalization |
| `tests/map-navigation-marker.test.mjs` | Modified | Identical after CRLF/LF normalization |
| `tests/navigation.test.mjs` | Modified | Byte-identical |
| `tests/search-explore.test.mjs` | Modified | Identical after CRLF/LF normalization |
| `tests/stop-card-deck.test.mjs` | Modified | Identical after CRLF/LF normalization |
| `tests/story-interaction.test.mjs` | Modified | Identical after CRLF/LF normalization |
| `tests/swipe-journey-start.test.mjs` | Untracked | Identical after CRLF/LF normalization |

All 40 overlapping files match origin/main after line-ending normalization. The untracked PR #9 copies are already published content, not extra unique edits. They remain untouched.
.env.example is modified but outside PR #9; its contents were not inspected. Other untracked paths outside PR #9:
- `.github/ISSUE_TEMPLATE/agent-task.md`
- `.github/pull_request_template.md`
- `cd`
- `eas`

## Timing assessment (calculation, not physical-device measurements)

Existing outgoing candidate requires at least 12 m along the outgoing step, then a distinct fix at least 1 s later with at least 3 m additional forward movement. Updates are requested every 3 s; actual delivery may vary.

At constant speed v, ideal minimum after the first eligible outgoing fix is max(1 s, 3 m / v). With regular 3 s fixes it is 3 * ceil(max(1, 3/v)/3) seconds, assuming valid fixes and continuous candidate eligibility. Stationary fixes cannot finish confirmation.

| Illustrative speed | Ideal minimum from candidate | At regular 3 s fixes | From junction, including first 12 m and sample phase |
| --- | --- | --- | --- |
| Walking 1.4 m/s (~5 km/h) | 2.14 s | 3 s | ~11.6-14.6 s |
| Driving 8.33 m/s (30 km/h) | 1 s | 3 s | ~4.4-7.4 s |
| Driving 13.89 m/s (50 km/h) | 1 s | 3 s | ~3.9-6.9 s |

These are illustrative calculations, not guaranteed latency. They assume prior accepted progress is within the existing 40 m approach window, accurate fresh fixes, and no rejected jump, backward movement, interruption or candidate reset. The Confirming turn display starts only after an eligible outgoing fix, not at the physical junction.

Reducing the 1 s minimum alone has no effect with 3 s GPS updates. Reducing 3 m or 12 m weakens drift protection; shortening the location interval may reduce latency but increases location/battery load and needs separate scoped testing and approval. This task changes none of these safeguards.

## Backend preflight

Backend Developer read-only preflight completed 2026-10-24 15:23-15:24 IST (09:53-09:54 UTC). Confirmed project gwybjhqgnrpouwcdvusi ACTIVE_HEALTHY, PostgreSQL 17.11, matching Mobile non-environment docs. Connected migration history and an independent schema_migrations SELECT both report 20261024041322 journey_media_thumbnail_v1_read. Catalog checks confirm all six public app tables, private receipts and storage.objects have RLS enabled; owner/published journey/stop policies, owner-only social/travel reads, authenticated owner media INSERT and original/thumbnail SELECT predicates remain present. Legacy approval/media-authorization tables and journey_rpc role are absent while standalone receipts are present: pre-existing alternate migration-chain/incomplete-history drift, unrelated to this fix; no reconciliation attempted.

Repository baseline: c910b36085f8858b3772570df89d38418126cdd5, clean worktree application baseline. Mobile repository backend migration intent and earlier preflight records were compared with actual catalog and history by Backend Developer. Mobile contains no supabase/ migration directory; its three tracked SQL artifacts are selected-copy review SQL, thumbnail review SQL and thumbnail rollback SQL. Actual thumbnail SELECT policy matches reviewed owner/published-parent intent. Selected-copy docs predate deployed standalone selected-copy RPC/receipts. Existing detail/discovery RPC grants are anon/authenticated; selected-copy and track-append RPCs are authenticated. Both media buckets remain private, 15 MiB, JPEG/PNG/WebP, with owner/path upload predicates. No pending original-folder changes under supabase/ or docs/backend/. This was a bounded catalog comparison, not a full audit of unrelated RPC bodies or authenticated end-to-end authorization certification.

Impact: turn-guidance.ts and maneuver-panel.tsx are local derivation/presentation code, no Supabase/RPC/API/Storage calls. No database, RLS, grants, auth, Storage or backend contract changes required. No live writes authorized or performed.

Safe test plan: synthetic local route/GPS replay including fresh/duplicate/stationary/forward fixes and lifecycle regressions, full Node tests, TypeScript, lint, offline Expo compatibility and Android export where available. No database fixtures or writes needed. Revert only this isolated worktree diff for recovery; original folder remains untouched.

Architect gate: RELEASED for approved local display fix only, based on completed read-only no-change report; no live schema changes or publication authorized.

## Implementation, verification and review

Implemented locally: optional confirmingTurn derives from the existing outgoing candidate. During that window the model withholds stale distance; panel replaces previous instruction with Confirming turn visually and in accessibility text. Subscriber equality includes the flag. The candidate logic, accepted progress/geometry, maneuver index/icon, arrow/map files and GPS cadence are unchanged.

Validation: npm test 646/646 passed, zero skips (including disposable local PostgreSQL; test data/logs only inside the worktree); npm run typecheck passed; npm run lint passed with zero warnings; git diff --check passed. Offline Expo compatibility reported dependencies up to date with its offline reliability caveat. Android export passed: 1633 modules, 4.5 MB bundle at dist/turn-confirmation-android, with environment-file loading disabled. Dependencies reused via junction; no installation or manifest/lockfile change.

Independent QA: 19/19 focused tests passed, no application defects; timing arithmetic and unchanged arrow/location code confirmed. Independent Code Reviewer: no actionable findings on the same five-path SHA256 snapshot below. QA found a tab in the documented phone path; Architect corrected it to forward slashes and verified no tabs remain. No application changes after testing/review.

Physical Android/iOS/GPS/permissions/network/TalkBack acceptance is pending; an Android JS bundle export is not a new native build or on-device acceptance. No phone test was performed, dev server started, commit/push/PR/merge/deployment or live Supabase change made. Original Mobile working files and Web working files unchanged. Local/unpublished; task-owned changes only will be staged.

Snapshot (SHA256):

- `src/lib/journey/turn-guidance.ts`: `9BEE4CFE6A1392BE6A10A4DEDD7E8437BCD5CBA2990A10B5327610D0FC4EEB68`
- `src/lib/journey/navigation.ts`: `757468D3AD17AD39C82A7592DD368D0D5115691FB700AA8027677826C5CFD5C7`
- `src/components/journey/maneuver-panel.tsx`: `CDB8D904930AED5B9A708E7D6B5F5DFF3FA7D3CBD7EB233EBE868B2E62FF3CD9`
- `tests/turn-guidance.test.mjs`: `145467724A12A5BA06FFE8878F8176353FABF642185543FDCBC8FBF517B7D775`
- `tests/maneuver-panel.test.mjs`: `BA9AD2C5D78B9C4CE97662B62FCB428F36C2611E08FD3ADFB6BEF93C3AC3237F`

## Phone testing

Use the installed custom development client (Mapbox requires native modules; Expo Go is unsuitable). Reuse the existing native build; no dependency or native configuration change is needed. From PowerShell:

```powershell
Set-Location 'D:/Travel_Mvp_Mobile_Worktrees/turn-confirmation-display'
# Owner action: copy your existing local environment into this isolated worktree.
Copy-Item -LiteralPath 'D:/Travel_Mvp_Mobile/.env.local' -Destination './.env.local'
npx expo start --dev-client --lan --port 8083
```

The agent did not read or copy any environment file. If your configuration is supplied through another local file or shell variables, supply the same values yourself instead. Do not post them in chat. The dependency directory is a junction to the existing Mobile node_modules; no installation was performed. Use the same Wi-Fi, open the printed QR/development URL in your existing Journey Creator development client, and verify its URL uses port 8083. Existing Metro servers were not stopped.

Replay: open a published journey -> Travel Mode -> Begin Trip explicitly -> approach and complete a right turn. During outgoing confirmation expect Confirming turn with no distance-to-maneuver; after valid further forward movement expect the next instruction. Stopping after the first outgoing fix must not advance the turn. Confirm the navigation arrow is unchanged; repeat Pause/resume and background/foreground. Physical-device results are pending.

Completion checkpoint: 2026-10-24 15:33 IST. Architect coordinator; Mobile Developer implementation, independent QA Tester and Code Reviewer complete on the recorded snapshot. Eight task-owned files staged locally; no commit/publication. QA rechecked corrected phone commands. Physical-device acceptance is the next owner action.
