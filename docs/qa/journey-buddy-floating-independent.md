# Journey Buddy floating-layout independent QA

## Scope and state

QA Tester: independent screenshot assessment and verification for the correction that removes Buddy's reserved layout band and supports protected floating movement. This report preserves preparation and failed checkpoints chronologically; the latest layer-corrected results appear at the end.

- Base revision remains `7c113f07a595af7977a54a961752dfb4e0598ea7`; preserve the existing local Buddy work and historical `journey-buddy-independent.md` evidence.
- Accepted correction: remove the 72dp/safe-area Buddy dock; enabled/disabled content geometry must match. Buddy may move within the viewport's measured clear areas, with an 8dp protected gap; automatic walks must avoid collisions. No wrapper may reserve layout space. Hide only when measurements are pending or no valid space remains.
- Preserve the single native gesture owner, reduced motion and parked position on the current route. No new backend calls, location watchers, dependencies or live writes are in scope. Architect reports the refreshed no-change backend gate in `../journey-buddy-floating-preflight.md`.
- QA owns only this report. No application/test edits, device actions, builds, environment-file access, live writes or publication were performed by QA.

## Intermediate screenshot assessment

Images inspected directly:

- `C:/Users/sreej/AppData/Local/Temp/journey-buddy-device/floating-journey-before-ready.png`
- `C:/Users/sreej/AppData/Local/Temp/journey-buddy-device/floating-journey-initial-after.png`
- Product-owner reference `1-Photo-1.jpg` supplied in the conversation.

Architect identifies the native screenshots as CPH2813, Android 16, 1080x2344, with the configured Metro session and restored account. QA did not obtain these screenshots or interact with the device. No travel/GPS write is reported.

The before-ready screenshot and the product-owner photo show the Journey card clipped above the swipe-start control, with Buddy occupying a large reserved empty band above navigation. The initial-after screenshot visibly restores vertical content: the card's title, Read story link, author and bottom action row fit, while the swipe-start control and navigation remain visible below. This is evidence of improved layout in that captured state; identical enabled/off geometry still requires final checks.

The intermediate after screenshot also shows Buddy overlapping the right portion of map stop marker 1. Architect reports that camera-idle marker protection is being added. The top-right map controls appear crowded in the screenshot, but Buddy is elsewhere; this observation alone does not attribute that existing control arrangement to the floating-layout change.

No final acceptance is claimed from these intermediate images.

## First frozen automated checkpoint

- Application/test files were frozen before inspection and testing. The snapshot contained 58 existing changed/new files under `src/`, `tests/` and `assets/journey-buddy/`, SHA256 `2370e03f5f9aa71cce9f42aeced312de398bd7db45121421d173511efb3ae50f`. Algorithm: lexicographically sorted relative paths, each UTF-8 path + NUL + raw bytes + NUL, then SHA256. Documentation is excluded. The prior untracked `src/components/buddy/buddy-space.tsx` is absent; no deletion of a tracked baseline file is implied.
- Ran all top-level `tests/*.test.mjs` except unchanged `tests/thumbnail-policy.test.mjs`. This first run exited 1 because strict native-map test fixtures rejected the newly imported `@/hooks/use-buddy-geometry` before existing assertions could execute. Output truncation hid the full aggregate summary; no exact full-run count is claimed for this failed checkpoint.
- Focused diagnosis of `tests/map-navigation-marker.test.mjs` and `tests/navigation.test.mjs`: **17 tests, 14 pass, 3 fail**. The failed cases were off-route marker preservation, map-relative course/fallback, and separate foreground blue-route rendering. All three stopped at the missing geometry-hook fixture import. No native application defect was established by these failures.
- Architect assigned Mobile Developer neutral geometry/map-pin adapter additions to those strict fixtures, preserving existing assertions. QA paused tests while that work proceeded. A new stable snapshot and complete full-run summary are required before acceptance.
- After the two strict fixtures were updated, a 60-file frozen snapshot had digest `3c5c06c2168a9843c7797acd6ceaf342a0c0a980a9049f0f3b002488c856b8a4`. The captured full non-PostgreSQL run produced **668 tests, 667 pass, 1 fail, 0 skips** in **22,621.9002 ms**. The sole remaining failure was `tests/discovery-camera-motion.test.mjs:149`: its static source assertion required the former exact single-call `onCameraChanged` expression, while the callback now also invokes pin protection. The existing observation call must remain asserted when that source contract is adapted. The three native-map fixture cases passed. Complete output is in the ignored local `.local-tests/journey-buddy-floating-qa-final.log`; QA paused again pending that assertion update.

## Automated checkpoint before native-layer correction

- Mobile Developer adapted the remaining source contract to execute the actual TSX camera callback and assert that pin invalidation is followed by observation of the original state. The existing touch, scale-bar, branding and framing guards remain asserted. Its affected tests passed before the final suite.
- Final frozen snapshot: **61 changed/new source, test and asset files**, SHA256 **`83ef230a8a93bd93580b4ad2e98d21d68c440affc0864d14ee91e9a0d5bcc74e`**. It matched before and after QA testing, using the same relative-path/NUL/raw-bytes/NUL algorithm. Documentation is excluded. The former untracked Buddy spacer file remains absent.
- Ran every top-level `tests/*.test.mjs` file except explicitly excluded, unchanged `tests/thumbnail-policy.test.mjs`. Result: **668/668 pass, 0 failures, 0 skips**, duration **23,003.653 ms**, including all **40 Buddy/floating tests**. The excluded disposable PostgreSQL policy test already passed in Architect's earlier isolated retry; it was not rerun for UI-only geometry and fixture changes. This is a complete non-PostgreSQL regression run, not a claim that the excluded file ran again.
- Complete final output: ignored local `.local-tests/journey-buddy-floating-qa-final-verified.log`. The earlier failed log remains separate. `git diff --check` passed.
- Writer separately reports final TypeScript and current-source lint passed with zero warnings; full lint has only the 40 preserved historical unresolved imports in `.local-tests/publication` snapshots. QA did not repeat type/lint/export or alter those artifacts.

Passing checks cover unchanged viewport geometry; enabled/off absence of Buddy spacer/padding/margin/height dependencies; exact controls with an 8dp gap; overlapping obstacle unions and nearest safe placement; no-fit hiding; collision-free swept automatic walks; measured map-control origins; route-specific scrolling and blur cleanup; stale measurement epochs; coalescing 200 animated layout events into a settled batch; native protected-ref cancellation; actual fallback Retry protection and scrolling; settled map-pin projection with stale-camera rejection; projection failure/timeout; missing-idle recovery and moving-camera deadline; background/disabled timer cleanup; plus the retained single-owner drag, parking, reduced-motion, help/editor, GPS/navigation and arrival regressions.

No automated application defect remains from the final run. The initial failures were strict fixture/source-contract updates and are preserved above rather than described as successful first attempts.

## Final native and release evidence

Architect owns the final device comparisons, independent reviewer and Android export evidence. The earlier screenshots above are intermediate. Final geometry/toggle/marker acceptance must be attached to the final snapshot before claiming it. Screenshots and mocks do not establish every gesture path, TalkBack, rotation, GPS guidance, long-session frame pacing or battery consumption.

**Historical native acceptance hold (resolved below):** after the passing automated checkpoint, Architect observed Buddy visible on Home and Account but hidden on a loaded Journey for more than a minute, including after Fit/camera idle despite clear map space. Restored card/footer/navigation layout was confirmed, but Journey Buddy visibility was not accepted. Architect assigned a runtime diagnosis of pin projection/conservative whole-map protection or pending geometry. QA paused until the source was frozen again after the fix and native visibility verified. The 668-test pass above identifies a prior checkpoint and must not be presented as acceptance of later source changes.

Architect supplied quantified evidence from the frozen pre-diagnostic version: RGB pixel comparisons between `floating-journey-off` and `floating-journey-on-settled` found **0 changed pixels out of 1,061,100** in card/footer crop `(200,740)-(1010,2050)`, **0/180,000** in start-slider crop `(40,1870)-(1040,2050)`, and **0/265,600** in card text/actions crop `(180,1455)-(1010,1775)`. This confirms identical content geometry in those captured native regions, while the separate Buddy visibility failure remains open. QA did not perform the pixel comparison or acquire those device images.

The pre-diagnostic Android export also passed: **1,714 modules, 56 assets**, Hermes `entry-df800ea5c7cd6ce6979eef85a8610433.hbc`, **4,078,288 bytes**. Architect verified exported source-map content matched the tested host, geometry module and geometry/map-pin hooks. This export belongs to the pre-diagnostic checkpoint and does not verify a subsequent runtime fix.

## Native-layer correction and current verification

Architect's runtime investigation established that Buddy was eligible with valid geometry but covered by the native map texture. The final correction adds explicit overlay root `zIndex: 30` and elevation 20, while retaining `pointerEvents="box-none"`, startup loading above it and native modals above the host. No pin/geometry behavior was changed for this fix, and temporary diagnostics were removed. QA did not perform the device diagnosis or edit application code.

- Final layer-corrected frozen snapshot: **61 files**, SHA256 **`240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8`**, matching before and after the final run with the same path/bytes algorithm.
- Final host SHA256 `bbdde6f015a670c4e8db80c34e6e7b47c582e8f186d2174b9daffa3517ddfedb`; unchanged map-pin hook `79b16f7c58a5950c98fabaf0ca37f6742ab49d938c7a761e70f4a7055c2cc5af`; store `b201c5fde7a0a08ea47c8ee95f4d66ca03eb2fd6bed9db10e555643c9b641b99`.
- Final non-PostgreSQL regression run: **668/668 pass, 0 failures, 0 skips**, duration **21,311.6655 ms**, including all **40 Buddy/floating tests** and explicit overlay/startup layer-order and touch-passthrough assertions. Only unchanged `tests/thumbnail-policy.test.mjs` was explicitly excluded; its earlier isolated pass remains historical and was not rerun. This is not a new all-files/PostgreSQL invocation.
- Complete output: ignored local `.local-tests/journey-buddy-floating-qa-layer-final.log`. `git diff --check` passed. Architect/Mobile Developer separately report final TypeScript and current-source zero-warning lint passed; QA did not repeat them.
- QA directly inspected the Architect-acquired native `floating-layer-journey-ready.png`. Buddy is visibly rendered on the loaded Journey map, clear of stop markers 1/2, attribution/logo and fixed top controls. The full card title, Read story link, author/actions, start slider and navigation remain visible, without the former reserved band. This resolves the specific captured ready-map visibility failure and the intermediate marker overlap; it does not prove every gesture/camera state or a numeric 8dp gap from the screenshot alone.
- Architect verified a fresh 1.2-second drag from screen point `(966,422)` to `(165,420)` after locating the sprite around `(898,356)-(1034,488)`. `floating-drag-after.png` shows Buddy on the left map area, clear of Fit, branding and pins, without opening the helper. Architect's pixel comparison found the card/footer crop `(190,750)-(1020,2050)` exactly unchanged before/after drag (0 changed pixels). QA directly inspected the resulting screenshot; it confirms the captured clear placement and unchanged visible card/footer, while the drag action and pixel comparison were performed by Architect.
- Architect tapped the Previous Memory control, changing Stop 3 to Stop 2 while the map camera followed and Buddy remained visible/parked in clear space. QA directly inspected `floating-controls-verified.png`. This verifies that particular control/camera transition; it is not a GPS trip or proof of all camera paths. Buddy was left enabled on Journey.
- Final Android export passed: **1,714 modules, 56 assets**, Hermes `entry-5a00358fa0f57970e0797b9330bc7b2a.hbc`, **4,078,348 bytes**. Architect verified exported source-map content exactly matches the final host, geometry module, geometry hook and map-pin hook. This supersedes the pre-diagnostic export.
- Independent reviewer reported **no actionable findings** at **2026-10-25 14:16:16 UTC**, confirming the same 61-file digest `240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8` tested by QA.

The Journey visibility hold is **resolved** for the verified final native cases. Automated, reviewed and exported snapshot identities are reconciled. Only this report and ignored local test-output logs were written by QA. No app/test edits, device actions, environment reads, installs, live-service changes or Git publication were performed by QA. Local/unpublished; no native build, backend change, GPS start or hosted write was required. TalkBack, rotation, actual GPS guidance, long-session frame pacing and battery measurements remain pending.
