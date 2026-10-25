# Journey Buddy flicker independent QA

## Scope and preparation

Independent QA for repeated Buddy flicker during Home Locate and Journey loading. Architect identifies idle map-pin projections repeatedly setting geometry pending and unmounting/remounting the Buddy actor as the suspected trigger. This is a hypothesis until the final source and runtime evidence are checked.

- Preserve the existing dirty Journey Buddy/floating work from base `7c113f07a595af7977a54a961752dfb4e0598ea7`; the prior accepted 61-file snapshot is `240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8`.
- Writer owns pin-hook/map-adapter implementation and focused tests. QA owns only this report and may add a separate flicker test only after coordinating ownership. No application edits, delegation, environment-file reads, dependency changes, hosted writes or device actions by QA.
- Application changes are in progress. No test execution or final-source acceptance is claimed at this preparation checkpoint.

## Native baseline reported by Architect

With the phone and Metro confirmed working, Architect sampled Home Locate screenshots roughly 1.2 seconds apart: Buddy was absent at approximately 1-3 seconds, visible at 4-6 seconds, and absent again at 8-9 seconds. This establishes the reported visible cycling for that baseline reproduction; QA did not operate or independently time the phone. The attempted Journey baseline capture was blank and is not treated as reliable flicker evidence. Architect subsequently confirmed the device was Dozing with `isKeyguardShowing=true`: the black capture was a locked-device state, not an established application failure. Metro remained running and the expected app was behind the lockscreen. Product-owner unlock is pending before dependent native checks. Architect plans a cold restart after the source freezes. Android screen recording was denied by the device OS; screenshots remain available.

## Expected verification

- Repeated idle events and equivalent pin projections must not repeatedly mark geometry pending or cycle actor visibility when the accepted geometry is unchanged.
- Actual camera movement and genuinely changed pin locations must still protect controls/pins; stale native projection results must not overwrite newer geometry.
- Initial/no-geometry, rejected or hung projections must remain bounded and conservative without a permanent hidden state.
- Preserve foreground/disabled/blur cleanup, route ownership, measurement epochs, reduced motion, parked position, native gesture ownership and ordinary controls.
- After writer freeze, run focused relevant tests and the full non-PostgreSQL suite, plus TypeScript and current-source lint excluding preserved `.local-tests` snapshots. Record every deliberate exclusion and exact tested snapshot before/after.
- Architect owns physical Home Locate/Journey load reproductions and Android export. Mocked tests do not prove absence of visible flicker on a phone; final runtime evidence and snapshot identities must be reconciled separately.

## First frozen automated checkpoint

QA began only after Mobile Developer confirmed application and tests frozen. The writer changed pin projection/cache behavior and the two native map event adapters, with focused fixture changes; the Buddy host/layer/layout/drag implementation remains unchanged.

- Final tested snapshot: **61 changed/new source, test and asset files**, SHA256 **`553836f2310e58bf7302674834dfd253466bcb83ba0626b975b1a4c267f00cf0`**, identical before and after verification. Algorithm: lexicographically sorted existing paths from tracked changes plus nonignored untracked files under `src/`, `tests/` and `assets/journey-buddy/`; for each, UTF-8 relative path + NUL + raw bytes + NUL, then SHA256. Documentation is excluded.
- Pin hook SHA256: `091611d9051bfa44d3fdd92d345ec9ea700761abd455cced41e6bfb37adb3836`.
- Home native adapter SHA256: `78df70fd54dacf4c3c7698775cd325aa4a24b5a2e6e2253483726c83b337dbc5`.
- Journey native adapter SHA256: `3036926cf61c37b776ae013011b6ab0bc3b3e584046d6d62365390f63fe9d0fc`.
- Unchanged host SHA256: `bbdde6f015a670c4e8db80c34e6e7b47c582e8f186d2174b9daffa3517ddfedb`.

Checks actually run independently by QA:

- Full non-PostgreSQL suite: **677/677 pass, 0 failures, 0 skips**, duration **34,314.8149 ms**, including all **49 Buddy/floating tests**. Every top-level `tests/*.test.mjs` file was included except explicitly excluded, unchanged `tests/thumbnail-policy.test.mjs`. That disposable PostgreSQL case already passed in Architect's earlier isolated retry; no SQL/backend change required another retry. This is not a claim that the excluded file ran in this invocation. Complete output is in ignored local `.local-tests/journey-buddy-flicker-qa-full.log`.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint -- --ignore-pattern .local-tests/**`: passed with zero warnings. Preserved historical snapshots under `.local-tests` are deliberately excluded; this is current-source lint, not a claim that those old snapshots lint cleanly.
- `git diff --check`: passed. Git's existing LF/CRLF notices for Architect-owned status files are not test/lint errors.

The full suite includes focused checks for 100 duplicate idle/camera notifications without eligibility churn or extra accepted-pin queries; same-key single-flight requests without resetting deadlines; cached relative pins translated for origin-only movement; genuine size/coordinate/readiness/map-identity invalidation; latest-origin publication from an active query; subpixel jitter without ignoring accumulated real movement; zoom/bearing/pitch sensitivity; rejected-projection cooldown and genuine-camera recovery; late callbacks after map replacement; projection timeout and lifecycle cleanup. Existing geometry safety, native gesture/layer, parking, no-layout-reservation, editor, Home, Story and navigation regressions also pass.

No additional automated application defect was found. Mocked eligibility and query counts do not prove that every visible phone transition is flicker-free. No separate QA test file was added because the writer's focused regressions exercise the relevant hook/state behavior directly and the full suite includes them.

## Review follow-up checkpoint

A later diagnostic/review follow-up added initial map-frame ownership and invalid-camera-pose cache regressions. QA started a further run with pre-run 61-file digest `81a29394a0eeaa12b65059226e7bc35dd9f4cf1853fc2461033279faad347931` and pin-hook hash `c23a51580750f564f3899e75dbf74a682102138073a39b786d195bee2f895aa2`. It completed **679/679 non-PostgreSQL tests, 0 failures, 0 skips**, duration **34,247.1294 ms**, with TypeScript and current-source zero-warning lint also passing. Output is in ignored `.local-tests/journey-buddy-flicker-qa-followup.log`.

During that checkpoint Architect reported another independent-review finding: initialization with a present map target but no measured frame must remain pending rather than publish empty protection. Architect became the sole writer for a small fix and regression. The 679-case run is therefore **intermediate evidence only**, not final acceptance of the correction; no stable post-run digest is asserted for that active-writer period. QA stopped all processes and waited for the new frozen snapshot verified below.

## Final automated verification

Architect completed the missing-bounds correction and froze source/tests again: a rendered map whose frame is unknown retains pending protection after initialization and movement deadlines; only an absent/unrendered map may release after the bounded initialization watchdog. Repeated idle notifications do not extend the initialization deadline. The new regression exercises both initialization and movement-deadline cases.

- Final snapshot: **61 files**, SHA256 **`8db188794999ab396e83b063bf48c9e96755896e7306d64e03b3e3d446484b18`**, identical before and after the final QA run using the same path/NUL/raw-bytes/NUL algorithm.
- Final pin hook SHA256: **`10bb9e309e7f5db479aa4b7cf6aa3c8297fd5bcb55f3c28a3bba1e50626d72cf`**. Host and store diagnostics were removed and their prior hashes restored; the host remains `bbdde6f015a670c4e8db80c34e6e7b47c582e8f186d2174b9daffa3517ddfedb` and store remains `b201c5fde7a0a08ea47c8ee95f4d66ca03eb2fd6bed9db10e555643c9b641b99`.
- Full non-PostgreSQL suite: **680/680 pass, 0 failures, 0 skips**, duration **39,014.8894 ms**, including all **52 Buddy/floating tests**. Explicitly excluded only unchanged `tests/thumbnail-policy.test.mjs`, whose earlier isolated pass is historical coverage, not a new execution. No backend/SQL change required rerunning that disposable PostgreSQL case.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint -- --ignore-pattern .local-tests/**`: passed with zero warnings. Historical `.local-tests` snapshots remain preserved/excluded.
- `git diff --check`: passed. Complete final output: ignored local `.local-tests/journey-buddy-flicker-qa-verified.log`.

The final suite retains all earlier idle/cache/single-flight/lifecycle, geometry, drag, layer, editor and navigation coverage and adds invalid-camera-pose cache invalidation, initial owner protection before a measured map frame, non-resetting initialization watchdog behavior, and continued protection for rendered maps with unknown bounds. No additional automated defect was found. QA has no remaining running processes.

## Native/review/export reconciliation and handoff

Architect supplied the following final evidence for the same `8db188794999ab396e83b063bf48c9e96755896e7306d64e03b3e3d446484b18` snapshot. QA records these as attributed results; QA did not operate the device, acquire/time the screenshots, run the export or perform the independent code review.

- **Home Locate:** ten clean native screenshots spanning **1.33-12.39 seconds** show Buddy visible in every sample after **5.98 seconds**, through the final frame. A brief appearance between cinematic stages precedes actual camera movement, during which conservative hiding remains intentional. Acceptance is stable visibility after the camera settles, not uninterrupted visibility during every motion stage. Evidence: `flicker-verified-locate-0.png` through `-9.png` under `C:/Users/sreej/AppData/Local/Temp/journey-buddy-device/`.
- **Journey entry:** twelve screenshots spanning **1.16-12.33 seconds**; sample 0 remains Home during navigation. Journey samples show Buddy visible during loading and on the ready map, including a Walk pose in the final frame, with no repeated disappearance observed in the sampled Journey frames. Evidence: `flicker-verified-journey-0.png` through `-11.png` and `flicker-verified-contact.png` in the same local scratch directory. The phone was Awake/unlocked with no Fast Refresh banner. Buddy was left enabled on Journey with Metro running. The earlier Dozing/locked black captures remain excluded.
- **Final review:** independent reviewer reported **no remaining actionable findings** at **2026-10-25 15:09:03 UTC** against the final tested snapshot. Both invalid-camera-input caching and rendered-but-unmeasured-map protection findings were fixed before this acceptance. Intentional hiding during genuine camera movement remains; no global visibility hysteresis was added.
- **Final Android export:** passed with **1,714 modules, 56 assets**, Hermes `entry-0fa62539be6ddf1ad6c4fcda79429f51.hbc`, **4,081,544 bytes**, under ignored `.expo/buddy-flicker-export`. Architect verified the source-map contents of the final pin hook, two native adapters, host and store match the final source after newline normalization. This is an export, not a new native build.
- **Expo compatibility:** offline check reports dependencies up to date, with Expo's stated offline-validation reliability caveat. No dependency changes were required.

See Architect's complete integration/device record in [journey-buddy-flicker.md](journey-buddy-flicker.md). Automated, reviewed and exported snapshot identities are reconciled, and the final sampled native cases meet the scoped acceptance criteria. No remaining blocker is reported for this local correction.

Screenshot cadence is approximately one second and cannot establish the absence of subframe artifacts or every possible transition. TalkBack, broad rotation/large-font behavior, active GPS guidance, long-session frame pacing and battery measurements remain outside this verified scope. No GPS trip or live save was started for the final native checks.

Only this report and ignored test-output logs were written by QA. No application/test edits, device actions, environment reads, installs, hosted writes or Git publication were performed by QA. No further tests or processes were started for this evidence-only finalization. Local/unpublished; no commit, push, merge, deployment, native build or live-service write is claimed.
