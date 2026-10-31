# R3 creation recovery verification

2026-10-30, approximately 21:03-21:12 IST. CPH2813 / Android 16, native dev client, Codex Metro 8081 serving D:/Travel_Mvp_Mobile on MSI. Focused verification of unchanged implementation; Architect operated the physical phone. Prior implementation independent review had no remaining blocking findings. No new review claimed.

Baseline: feature/backlog-phase1 with local U1/R2 changes in IMPROVEMENT_BACKLOG.md, PROJECT_STATUS.md, ROADMAP.md and untracked docs/qa/r2-phone-recovery-2026-10-30.md. Preserved.

Assessment: no application/schema/API/auth/Storage changes; only verification and documentation. Inspected create.tsx, use-creation-recovery.ts, create/recovery.ts, recovery-store.ts, queries.ts and quick-journey-setup.tsx. Existing user-scoped AsyncStorage recovery and save contracts retained; no live-schema preflight needed for unchanged code. Owner explicitly approved one private test draft and failed/interrupted attempts/retries. Target: current phone account, confirmed in Account as Sreejith Gs. No other live writes authorized or performed.

## Evidence

1. `node --test tests/create-recovery.test.mjs tests/create-flow.test.mjs`: 87 passed, 0 failed/skipped. Includes same-base restore, fresh IDs for unsaved journeys, account isolation, sign-out, ordered clear, debounce/flush, editor save-clear and failed/uncertain UI guards.
2. Entered unsaved title R3 recovery test 2026-10-30. Cold relaunch and Create offered Restore unsaved changes. Restore retained the title and traveller choice. Selected Goa, India, one day, Couple. No stops/photos.
3. Through the dev inspector, temporarily wrapped global fetch only for /rest/v1/rpc/save_journey. First request returned a synthetic 400 / SQLSTATE 22023; no save request was forwarded. UI showed The server rejected these journey details; title, destination, duration and traveller remained. Interception count 1. This is fault injection on a real native app, not an observed server failure.
4. Reselecting the same traveller choice cleared the error. Changed the temporary wrapper to hold the save request before sending. UI showed Saving and disabled fields; interception count 2. Force-stopped the app while pending. Cold relaunch and Restore recovered all test fields. The process restart removed the temporary fetch override, verified before live save.
5. Pressed Create my journey with no override. Live service saved the approved draft; editor showed Saved privately and 0/50 memories. Read-only AsyncStorage key-count check returned zero journey-recovery:v1: keys. No IDs, tokens or coordinates printed.
6. Cold relaunch, Account: two drafts, the one test draft and pre-existing Vettukadu remix. Reopened test draft; Saved privately, no recovery prompt. Exactly one test draft visible. Left it private; deletion not approved. No photos uploaded or publication attempted.

Temporary screenshots outside repo include r3-named.png, r3-cold-prompt.png, r3-destination.png, r3-error-visible.png, r3-retry-ready.png, r3-saving-held.png, r3-interrupted-prompt.png, r3-interrupted-restored.png, r3-live-saved.png, r3-account-confirm.png and r3-saved-reopened.png.

## Limits and follow-up

Physical success/clear/reopen and pre-submission interruption verified. Failure cases used deterministic runtime injection; no deliberate device-wide network outage. A commit reaching the server while its response is lost was not reproduced live; no interrupted media uploads on the phone (no photos approved). Those remain existing automated coverage, not physical-device claims; broader connectivity reliability belongs to R4.

R5 finding: after the rejection message, the Quick Start layout pushed Create my journey out of view, even when its inner controls were scrolled. Reselecting the same traveller cleared the error and exposed the button; retry then worked. This usability issue remains open, with no data-loss observed and no application fix in this task.

Documentation diff check passed. No application changes, dependency changes, GitHub publication, deployment or schema changes. Full suite/typecheck/lint not repeated for unchanged application code. R3 marked complete under this explicitly recorded mixed phone/automated scope; R4/R5 remain open.

## Create retry layout fix - 2026-10-30

LOCAL, UNPUBLISHED. Focused UI-only fix: moved the existing Create my journey / Save Changes action into QuickJourneySetup's existing ScrollView, after feedback. On this phone, a separate footer could be clipped when error text increased form height. Retry now scrolls with its error and fields; callbacks, disabled/saving guards, keyboardShouldPersistTaps, authentication, persistence, API and Storage behavior unchanged. Inspected quick-journey-setup.tsx, Create screen sizing, shared Action styles and affected create-flow tests; no backend impact or live check required. Baseline was 7d28f97 on feature/backlog-phase1 plus preserved U1/R2/R3 documentation changes.

CPH2813 / Android 16 / Codex Metro 8081: reproduced clipping with blank-title validation before the fix; afterward the error and Create button were both visible/reachable, including with keyboard open and after scroll. Retry tapped with keyboard open; blank-form validation reran, no live save. Temporary images: create-layout-error-before.png, create-layout-scrolled-after.png, create-layout-keyboard-after.png, create-layout-retry-after.png. No device-wide font-scale change or TalkBack check. Settings editor uses the same scroll-contained Save Changes action; its behavior is covered by existing tests, not a new live save.

87/87 create-flow/create-recovery tests pass. Existing layout expectations updated to cover error and retry sharing the scroller. Independent Code Reviewer: no actionable findings; reviewed settings-modal sizing, keyboard handling, disabled states and accessibility order, reusing reported test/device evidence. Full suite not repeated for this bounded presentation fix. R5 remains open for its broader matrix; the specific disappearing-button finding is resolved. B3/U8 not started.

Final static checks for the layout fix: npx.cmd tsc --noEmit, scoped ESLint (quick-journey-setup.tsx and create-flow.test.mjs) and git diff --check passed. PowerShell blocked the npx.ps1 launcher initially; using npx.cmd completed the checks without changing execution policy.
