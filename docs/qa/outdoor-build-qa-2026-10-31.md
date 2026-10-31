# Journey Outdoor source QA — 2026-10-31

Owner authorized updating the local Outdoor APK and installing it for a startup comparison. QA scope was the stable Mobile source snapshot at `d2c3f0d3763c9ee3d04e93489acb045e5937174b` plus the three existing UI fixes below. Architect owns build/signature/install/phone verification; this report covers automated source checks only.

## Snapshot

| Source | SHA256 before and after QA |
| --- | --- |
| `src/app/discover.tsx` | `21F17B8E67ACBFBC681919C18369A7EB523F6CD54A1BA9D41FA4AFB6B628FE63` |
| `src/components/branded-loading.tsx` | `56D7392F33CF577BF45BF0E49319A55CFB75BB219253A2C91D601DA64A5EA2F5` |
| `src/components/create/place-picker.tsx` | `9C8F7883E1DB8855A399A613216D77DADD15C288CC06E7CBCF6CD292ABCC1155` |

Existing backlog/status/roadmap edits and R5 QA notes were preserved. No application code changed during this QA assignment.

## Results

| Check | Result |
| --- | --- |
| Initial full Node suite | 931 tests: 929 passed, 2 failed, no skips (~60.9 s) |
| TypeScript | `npm.cmd run typecheck` passed |
| Scoped ESLint | Three changed source files passed with zero warnings |
| Isolated PostgreSQL policy retry | 1/1 passed outside sandbox (~87.9 s); fresh disposable local cluster only |
| Create routing regression rerun | `create.test.mjs` + `create-flow.test.mjs`: 92/92 passed (~23.3 s) |
| Test diff whitespace | Passed |

Initial failure classification:

- `tests/create.test.mjs:138`: a pre-existing static source-string assertion required exactly `params: { draft: result.saved.id }`. Both this test and `src/app/create.tsx` matched HEAD before QA. The committed U8 route appends the optional `guide: 'memory'` parameter, so the exact string no longer exists. With Architect's expanded test ownership, removed only that obsolete assertion and retained the rest of the test. Actual normal saved-draft routing is asserted by the executable quick-start test at `create-flow.test.mjs:94`; guided-memory propagation is asserted by the executable test at `create-flow.test.mjs:985` (route assertion at line 993). No replacement static assertion or app change added. Final test SHA256: `C19B85957A324F291B6A32D73D1B372EF3C808CB63D815CA27A23EE0A775B845`.
- `tests/thumbnail-policy.test.mjs`: sandbox process restriction prevented isolated `pg_ctl` startup (restricted-token error 87 / startup error 3). Rerunning only this test outside the sandbox passed. The test verified a newly created local synthetic PostgreSQL cluster and stopped it afterward; no hosted Supabase target was contacted.

The full suite was not repeated after the one-line test-only cleanup. The initial run plus affected reruns resolve both failures; do not describe this as a single 931/931 green run.

Ignored local logs: `.local-tests/outdoor-build-qa-1031/full-test.log`, `typecheck.log`, `lint.log`, `thumbnail-policy-retry.log`, `create-recheck.log`. These are local evidence, not published URLs.

## Limits and handoff

No phone, permissions, location, APK build/signing/install, dependency install, live data writes, environment-file reads or Git publication performed by QA. Mocked/executable source checks do not establish physical release performance. Architect must verify the actual APK/source association, package/certificate compatibility, update installation preserving data, standalone startup and phone behavior. R5 remains open until its broader acceptance criteria are met.

Changed files: `tests/create.test.mjs` and this QA report. Work is local/unpublished. Independent review belongs to the separately assigned Code Reviewer.

## Standalone phone evidence review — 2026-10-31

Physical actions below were performed by Architect; QA independently opened and inspected the resulting five screenshots, without controlling the phone. Architect reports approved local Gradle build/install completion, APK SHA256 `EF949F0F42B5846F50EFD61ED5369B05C9C852CB3280A90A15C7A95DD05E6ECF`, matching public signing certificate, `adb install -r` success, package update time `2026-10-31 08:20:05`, and no `DEBUGGABLE` flag. Those metadata/installation checks are Architect evidence, not independently rerun by QA.

Device: CPH2813 / Android 16, Journey Outdoor package `com.sree8100.journeycreatormobile.outdoor`. Architect stopped Metro 8081 for the standalone checks, made no saves/live writes, and did not clear app data.

| Check | Architect timing / independently visible screenshot outcome |
| --- | --- |
| Cold start 1 | Android `COLD`, TotalTime 840 ms / WaitTime 860 ms. Capture completed at 2676 ms shows branded “Exploring the world...” loader. Capture at 5818 ms shows Home with rendered globe, journey card, Buddy and navigation. Capture at 10824 ms still shows Home, with Account avatar loaded. |
| Cold start 2 | Android `COLD`, TotalTime 683 ms / WaitTime 695 ms. Capture at 3083 ms already shows populated Home/globe, Buddy and navigation. Capture at 5823 ms remains populated, with Account avatar loaded. |
| Short navigation rendering sample | Architect recorded 502 frames / 16 missed deadlines (3.19%), frame percentiles 50th/90th/95th/99th = 9/16/19/46 ms. QA did not execute or independently recalculate this sample. |
| Resource/error sample | Architect recorded PSS 706839 KiB, RSS 905620 KiB, and no errors in the filtered ReactNativeJS/AndroidRuntime window. A single snapshot does not establish leak absence or overall resource acceptance. |

Inspected local screenshots: `C:/Users/sreej/AppData/Local/Temp/journey-outdoor-build-1031/cold-2.png`, `cold-5.png`, `cold-10.png`, `repeat-2.png`, `repeat-5.png`. Filenames are sampling targets; actual capture times above determine the bounds. All five show app content or an honest loader; none shows the previously observed prolonged blank dev-client screen. Home samples contain no development-client Tools overlay. The Account avatar is consistent with an existing authenticated session; screenshots alone cannot prove every persisted record survived the update.

Bounded result: standalone Home startup and native-globe visibility are evidenced on this phone with Metro stopped. Home was visible by 5.818 s and 3.083 s in the two runs; these are sampled upper bounds, not exact time-to-interactive. The earlier 22-second blank dev-client behavior was not reproduced in these two standalone runs. This supports separating development-client startup from release testing, but does not prove a single root cause or guarantee future starts.

The account/dataset differs from the earlier development-client observations, so these numbers are not a controlled before/after benchmark. Broad R5 accessibility, sustained performance/memory, offline/weak-network startup, other devices, trip/GPS behavior, auth transitions, recovery/data retention matrices and all save/upload flows remain unverified by this evidence review. No full R5 pass or closure claimed.
