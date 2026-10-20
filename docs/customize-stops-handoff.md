# Customize stops — laptop handoff

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
