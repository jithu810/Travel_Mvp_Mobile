# Journey Buddy independent QA

QA Tester, 2026-10-25 17:54 IST (12:24 UTC). Local/unpublished; application, assets and tests were read-only during QA.

## Tested snapshot

- Base: `7c113f07a595af7977a54a961752dfb4e0598ea7`, branch `codex/remove-3d-companion`.
- 31 changed/new application, test and asset files; digest before and after testing: **`922333366bcaf2a33f2ad2f47a214af11797486a844ddff06494465f7eb9a6ae`**.
- Digest algorithm: lexicographically sort relative paths from tracked changes plus nonignored untracked files under `src/`, `tests/` and `assets/journey-buddy/`; concatenate each UTF-8 path, NUL, raw file bytes, NUL; SHA256. Documentation is excluded.
- Final host SHA256: `0a28e8efa6f14b067d5fabc72115c87bed13ef91f320e831ad5d7d38e40cc548`; store: `ee15d2888d8e938ea27b70518429bea4260f47b164ba07467e6d06ae67e6986c`.
- The earlier reviewer digest `9f8d9501...` preceded the last host lint-cleanup change. Architect obtained targeted final re-review at **12:24:45 UTC**: no actionable findings against this exact 31-file digest and host/store hashes. The tested and finally reviewed contents therefore match.

## Checks actually run

- Initial `npm test` invocation was blocked by PowerShell's `npm.ps1` execution policy before any tests ran. No policy was changed. Normal Windows `npm.cmd test` invocation then ran the full suite once.
- Full suite: **655 tests, 654 pass, 1 fail, 0 skipped**, duration **30,746.6513 ms**. All **26 Journey Buddy tests** and the guarded editor integration test passed within this run. No focused rerun was necessary for Buddy.
- Sole failure: existing `tests/thumbnail-policy.test.mjs` disposable PostgreSQL policy test. Its new local cluster could not start: `pg_ctl: could not create restricted token: error code 87`; server-start error 3. This is the same Windows sandbox startup restriction documented before Buddy. No application assertion or Buddy behavior failed. QA did not escalate, change/skip the test, or attempt hosted database writes.
- Architect separately reran only that disposable local policy test outside the sandbox: **1/1 passed in 46.54 seconds**, including public/owner/other/path/rollback boundaries. Therefore all **655 cases passed across the full run and isolated retry**; this is not a claim of one entirely green full-suite invocation. No hosted writes were used.
- `git diff --check` passed.
- All three bundled PNGs match the product owner's supplied files byte-for-byte. Walk SHA256 `6120a207a90e280619ae76008d4ecbce1f7a591c9e9c35d94eb4d3380bd30d5b`; Idle `05547c437dc7278f3d7f3df260be9492c3155e0dc8f2bf3cd7f149d7138be86a`; reference `8426aaddcea42e3c6d2f95538b867093a34bf9e82540dc787749795ddde260b8`.

Architect/Mobile Developer separately own TypeScript, lint, Expo compatibility and Android export results. Those checks were not repeated by QA. Architect reports the final export's host source content matches the tested file: 1,711 modules, 56 assets, Hermes `entry-aec6bc6dfcd3c039966401a142eb3650.hbc`, 4,057,788 bytes. Offline dependency compatibility passed with Expo's offline reliability caveat. Full lint's existing historical `.local-tests/publication` import errors remain distinct from current-source lint.

## Acceptance coverage and gaps

Passing tests exercise default-off/restore/write races and failures; frame geometry and sprite fallback; isolated frame-clock cleanup; future non-loop completion; route/screen ownership and fresh callbacks; existing guarded memory-editor integration; transparent host gating; low-frequency native-driven roaming; tap/drag distinction and clamping; reduced motion; keyboard/background/disabled cleanup; 34dp bottom safe-area clearance; Home/Travel fixed-control clearance; parked pose restoration; delayed native scalar coordinates and obsolete capture rejection; and bounded stationary Travel progress reactions without replay or maneuver interference. Existing editor, Home, account, Story, GPS/navigation and arrival regressions also passed.

No additional automated defect was found. These are Node/native mocks and geometry checks, not physical-device acceptance. Exact React Native hit-testing, Mapbox gesture coexistence, image sampler sharpness, actual Strict Mode/native asynchronous timing, TalkBack focus, large-font presentation, rotation and safe-area rendering still require a real device. Low battery use and smooth frame pacing are architectural goals, not measurements established by this suite.

Phone-session status supplied by Architect: no connected device and Metro down. QA did not run adb or Metro, obtain screenshots, start travel/GPS, create/save/upload/delete records, or perform backend writes. Device model, Android version, app/build, permission state, network/GPS conditions and live screens are unverified. No iOS native acceptance is claimed.

## Handoff

Only `docs/qa/journey-buddy-independent.md` was written by QA. The full suite's environment-dependent PostgreSQL case is now covered by Architect's successful isolated local retry; physical-device acceptance remains pending. Final-host review reconciliation is complete. Architect owns integration documentation and product-owner handoff. No commits, pushes, deployments, installs or live changes were performed by QA.

## Follow-up: physical-device drag correction

This chronological follow-up supersedes the earlier host/test snapshot for the gesture correction only; the original run and its limitations above are retained.

Architect subsequently connected the physical CPH2813 on Android 16 (1080x2344 screen, guest app session) and reproduced a real native defect missed by the earlier mocks: dragging the nested Pressable opened the helper rather than moving Buddy. Mobile Developer replaced it with one bounded 64dp accessible View that owns the responder, eliminating the competing press target. The corrected test checks one gesture owner, capture/drag behavior, ordinary tap opening once and accessibility activation. These native observations were obtained by Architect, not QA.

- Follow-up snapshot: **31 files**, SHA256 **`def2bc45d0e35212e06761b48cbec1422a5c3a0c121cc86b78bc93bcb110c8ac`**, using the same path/bytes digest algorithm. It matched before and after QA testing.
- Host SHA256: `6e75b388f00db596760653ae7ab0ebf785e986cf643afdb62d4fe91142c5519e`.
- Buddy test SHA256: `200b51baaf8b78c68ebe6fd8a555828e5efa8582c6ec2e001650f854d862729e`.
- Ran every `tests/*.test.mjs` file **except unchanged `tests/thumbnail-policy.test.mjs`**, using Node's test runner with an explicit PowerShell file list. Result: **655/655 pass, 0 failures, 0 skips**, duration **23,566.5313 ms**, including all **27 Buddy tests**. The excluded PostgreSQL test was not silently skipped and was not rerun: it already passed in Architect's earlier isolated local retry, and this follow-up changes only host gesture handling and its tests, with no SQL/backend changes. This is not a new all-files suite invocation.
- `git diff --check` passed. Writer separately reports TypeScript and scoped lint passed; QA did not repeat them.
- Architect reports a precise native swipe moved the cyan character bounds from `(45,1903)-(182,2035)` to `(596,1899)-(720,2036)` without opening the helper; position persisted after Settings hide/restore. This establishes that particular native drag/parking case, not general TalkBack, rotation, every screen/GPS condition or battery acceptance.
- Architect observed Account Settings default off, enable showing the supplied sprite above navigation, disable removing it, and re-enable restoring it. Buddy was left enabled on Account, with Metro 8081 running. Evidence is local screenshots under `C:/Users/sreej/AppData/Local/Temp/journey-buddy-device/`, including `fixed-drag-after`, `fixed-park-restored`, `disabled` and `final-enabled`; these are local evidence, not published links.
- The server was started with `EXPO_NO_DOTENV=1`; maps/backend were unconfigured in that session. No authentication, GPS trip, editor save, upload or hosted write was attempted, so those native flows remain unverified. TalkBack, rotation and battery measurement remain pending.
- Independent reviewer rechecked the exact follow-up digest and host/test hashes at **2026-10-25 12:40:40 UTC** and reported no actionable findings.
- Architect's final Android export passed: **1,711 modules, 56 assets**, Hermes `entry-86e6aff052cfb9af4016eabb989d25dd.hbc`, **4,058,228 bytes**. The exported source map's host content exactly matches the final source file. This supersedes the earlier export for the drag correction.
- Architect also verified a post-fix ordinary tap opens the helper (`fixed-helper.png`); Android back closes it and leaves Buddy visible on Account. Metro 8081 reported `packager-status:running` at **12:42:05 UTC**. No schema or hosted writes were performed.

QA made no application/test/device changes and no live writes. Broader native appearance/accessibility/performance limitations above remain pending except for the specific later observations recorded here. This follow-up is complete and remains local/unpublished.
