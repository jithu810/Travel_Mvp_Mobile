# Customize stops — laptop handoff

## Successful Android retry and PR publication — 2026-10-21

The latest authorized retry passed after the user's backend correction. Church To home was customized to keep original stops 1/3/4 (Left from church, Puliyurkode line, Reached home) and skip Lullu mall at original position 2. One confirmation opened Create with Saved privately and 3 memories. Save Draft was pressed once without error. Account then showed the new private draft and a count increase from 5 to 6; reopening retained exactly those three names in compact order. Photos were omitted as expected. The older missing-RPC and auth-schema-permission notes below are historical, superseded for this tested path.

Fresh verification passed 543/543 tests, TypeScript, zero-warning lint and whitespace checks. The UI/test snapshot matches the earlier independent review. User authorized publishing only the tested UI, tests and three status/handoff documents to existing codex/customize-stops / PR #3. No application changes were needed for the successful retry. No SQL was run or applied during retry/publication; Web migration files and PR #2 remain untouched. No merge or deployment. GitHub reported no check/status runs, and its protection requirements were inaccessible to the integration (403). Broad SQL/RLS/concurrency, screen-reader, enlarged-font and iOS checks are not claimed.

## Live Android acceptance — 2026-10-21

The user reports the standalone selected-copy migration applied successfully to project gwybjhqgnrpouwcdvusi; photos are intentionally omitted by that deployed alternative. The older review-only/missing-RPC notes below are historical and do not describe the latest failure. No SQL artifact was applied from this mobile checkout.

One explicitly authorized phone confirmation was attempted for Church To home: kept original stops 1/3/4 and skipped Lullu mall at position 2. It failed with “Couldn’t create this selection. The source may have changed; review your stops and retry.” Read-only backend logs identify the actual cause as SQLSTATE 42501, permission denied for schema auth, at (select auth.uid()) during initialization of private.standalone_copy_journey_selected. Read-only catalog checks confirm owner customize_stops_rpc has auth.uid() EXECUTE but lacks auth schema USAGE. No draft insert was reached; Account contained no matching copy. Creation/editor/reopen persistence acceptance remains blocked.

Do not fix this by changing selection IDs or bypassing the RPC in Mobile. Backend owner must separately review the effective permission; no grant/schema/migration change is authorized by this handoff. After that correction, rerun one confirmation and verify the selected names/order after reopening from Account. Mobile Developer and QA Tester reviewed the contract/failure evidence; no app code changed in this run. Exact baseline and evidence are in PROJECT_STATUS.md.

## Android UX follow-up — 2026-10-20

Selection now uses a compact card with fixed Keep/Skip/Undo controls and visible swipe directions; swiping is optional. Review separates selected/skipped groups, shows counts and original positions, and explains Restore with a Restored · selected label. Native Android 16 checks covered taps, both swipe directions, vertical scrolling, mixed review and restore without confirming a draft. See PROJECT_STATUS.md for exact evidence and pending checks.

Follow-up verification: 543/543 tests (12 focused customization cases), TypeScript, zero-warning lint and whitespace checks passed. Independent Code Reviewer found no actionable findings and independently passed all 12 focused cases. Android Back retained decisions and native route rendering was observed; review/route screenshots contain a development Refreshing banner, so settled overlay-free rendering remains unverified. TalkBack/VoiceOver, enlarged fonts, iOS and backend end-to-end behavior remain pending. UI/tests were reviewed at HEAD 8fdedf51bd937d2172ed5738646b93f8046e33ab plus the local diff; exact snapshot hashes are in PROJECT_STATUS.md. Five changed files are the component, focused tests and these three status/handoff documents. No commit or push has been performed for this follow-up.

For this Windows session, Metro runs outside the network-restricted sandbox with `npx expo start --dev-client --localhost` and a process-only `NODE_OPTIONS=--dns-result-order=ipv4first` preference (localhost otherwise bound only to IPv6). Existing USB forwarding is `tcp:8081 tcp:8081`. The installed package registers `journeycreator` and the development-client link is `journeycreator://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. No client rebuild is needed for these UI changes.

The user's existing server-unavailable message is the client branch for PGRST202/42883 from the selected-copy RPC. It is separate from the earlier Metro manifest/network failure, which was resolved at runtime. Do not retry confirmation against production as a diagnostic; the backend contract below remains review-only and no draft is claimed.

This feature branches from verified Mobile `origin/main` at `90f121eb2b898d5e4130561bceb56adeaa494d94`. Navigation PR #2 is separate and is not required or included. Both original repository working trees were clean at inspection and remain untouched.

## Flow

Journey actions retain **Use all stops** (existing Travel Mode) and **Remix** (existing whole-journey private copy), alongside **Customize stops**. Keep/Skip buttons and horizontal swipes make the same immutable selection updates; Undo restores earlier decisions. Cards use source order, existing photo fallbacks, description/day metadata when available and an honest category fallback because the current contract has no category.

Review lists original positions and kept/skipped status, supports restoring stops and revisiting decisions, and previews only selected stops. Start/end follow that order. A single selected stop needs no road request; multiple stops reuse existing Directions requests for adjacent selected pairs. Skipped stops are never submitted as required waypoints. Roads may still pass their physical locations. Existing source geometry is not reused. Empty selections, more than 50 stops, duplicate IDs and invalid coordinates block confirmation with an explanation. No automatic reordering or active-navigation changes.

Confirmation requires the existing authenticated session, returning to the same selection after sign-in. It creates a private attributed copy via an atomic selected-copy contract and opens the existing Create editor. A synchronous operation lock, stable client draft UUID, in-process result/uncertainty store, and server receipt protect repeated confirmation. Unconfirmed writes remain blocked with Account recovery. Selection edits/exit do not initiate writes. Selections are in memory, not persistent across process termination.

## Backend prerequisite — review only

`docs/backend/` contains the required contract/migration review artifacts. The current deployed `copy_journey(source_id)` cannot filter stops; `save_journey` cannot set source attribution. The feature requires a separately reviewed backend change before hosted confirmation can work. No migration is registered in the web repository or applied to a hosted resource. A missing selected-copy RPC produces an unavailable-feature message and retains selections. Review and validate the contract in a nonproduction environment before any rollout; this PR does not authorize deployment.

## Laptop/device acceptance

Fetch this branch into a separate worktree, run `npm ci`, and configure the existing ignored mobile environment file locally. Start `npx expo start --dev-client` and load the existing Mapbox development client. Do not combine navigation PR #2 into this branch. Native dependencies did not change.

On Android/iOS check swipe threshold versus vertical scrolling, accessible button labels/focus/live announcements with TalkBack/VoiceOver, large text and safe areas, reduced-motion settings, photo fallbacks and native map loading/camera/route visibility. Test Keep/Skip/Undo, review Back, Restore, auth cancel/return and exit without draft. With an approved nonproduction backend, verify selected first/last/intermediate stops, one-stop draft, route retry/offline cancellation, double confirmation, uncertain-result recovery, attribution and source immutability. Physical devices, native development-client execution and end-to-end hosted contract parity remain pending. Never use production writes as testing.

## Automated verification and independent review

- Full direct Node run: 541 passing tests across 39 files, zero failures. The ten new customization tests include actual selection/review component interactions and a real loading-hook stale/cancelled-response check.
- TypeScript and zero-warning lint passed. Android Hermes export succeeded. Offline Expo compatibility reports dependencies up to date, with offline validation caveat. Whitespace checks passed.
- Independent Code Reviewer inspected application changes and proposed SQL against checked-in schema/RLS/grants; no actionable findings. Independently ran the ten focused tests and whitespace checks successfully.
- No device, native development-client or hosted database validation is claimed. Backend runtime verification status is recorded in docs/backend/README.md.
