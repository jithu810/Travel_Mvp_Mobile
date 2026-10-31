# Google OAuth QA — 2026-10-31

## Subsequent owner-reported device evidence

After the local QA runs below, the owner confirmed successful Google login and later successful branded login following Google brand verification/publication on 2026-10-31. Owner described the prompt as "login with travel buddy"; configured brand is Journey Buddy. Device context is Journey Google Test on CPH2813/Android16, canonical checkout via Metro8081. This augments the mocked QA evidence; it is not independent QA observation or verification of exact screen text, cross-account selection, identity linking, cancellation or restart persistence. Those specific cases remain unverified. Earlier statements that real login/branding were wholly untested are superseded only within this owner-reported scope.

QA scope: local automated acceptance and regression checks for native browser Google OAuth. Baseline Mobile `a8f0c74b2cdcd8d76da98e04f6e7a0bd7e0b51b6`. Architect released QA after the application snapshot stabilized. A later one-line strict callback-base validation change was disclosed; all seven independent Google QA tests were rerun against that final parser.

## Acceptance matrix

| Area | Required evidence | Status |
| --- | --- | --- |
| Both auth modes | Google starts from sign-in and registration without requiring email/password or calling registration email lookup | Developer screen-harness evidence: pass; source inspected by QA |
| Browser request | Google provider, exact `journeycreator://auth/callback`, suppressed SDK browser redirect, existing PKCE client | Developer adapter-harness evidence: pass; native adapter inspected by QA |
| Callback validation | Reject wrong scheme/host/path, missing/malformed/duplicate code, fragments, provider errors, unsolicited or expired attempt | Independent QA pass, including 17 malformed URL variants and expired/future transaction markers |
| Session completion | Flow-specific code exchange once; require returned session; browser/router race deduplicated | Independent QA pass for matching flow ID, one in-flight exchange and failed session result |
| Failure recovery | Browser cancel/back, start/exchange errors, safe retry, no sensitive URL/error leakage | Independent QA pass for cancel, retry lock/cleanup, unsolicited callback and sanitized invalid-callback errors; developer adapter tests cover missing module/provider errors |
| Lifecycle/navigation | Pending journey maintained on warm flow; cold flow returns safely without persisting/replaying social actions | Independent coordinator cold-return/validated-destination pass; existing intent tests pass; native navigation remains unverified |
| Email regression | Email-first registration, validation, duplicate lookup, confirmation, password handling and submission lock preserved | Developer screen tests pass; QA independently reran shared auth/query regressions |
| Session/ownership regression | Restoration/event race, sign-out observer, intent consume-once/cancel and private owner gating | Independent QA: auth-remix and social-profile tests pass |
| Static/native dependency | Expo-compatible package, TypeScript and scoped lint; no app secrets | Developer-reported static checks pass; QA whitespace check pass; no independent native build |
| Native and hosted end-to-end | Rebuilt development app/APK, real browser return, account selection/cancel, persistence/sign-out | Not performed; requires separate build/device/live-auth coordination |

## Execution boundary

Only synthetic mocks/local test fixtures are authorized here. No environment files, credentials, live accounts/data, hosted writes, emulator/phone operation, build, installation, GitHub publication or deployment. Mock tests cannot establish native package linkage, Google credential/audience validity, real provider linking, operating-system deep-link delivery or physical-device behavior.

## Checks actually run

- `node --test tests/google-oauth-qa.test.mjs tests/auth-remix.test.mjs tests/social-profile.test.mjs`: 44/44 passed when the independent QA file had six tests. This covers 18 auth/remix and 20 social/profile regression cases.
- Added the malformed URL table and reran `node --test tests/google-oauth-qa.test.mjs`: 7/7 passed. Reran these seven again after the final strict parser change, including normalized dot-segment path rejection: 7/7 passed. Total unique independent QA/regression cases: 45.
- `git diff --check`: passed.
- Reused Mobile Developer evidence for screen/adapter/callback tests, TypeScript and scoped lint; did not duplicate broad suites or native builds.

Independent QA added only `tests/google-oauth-qa.test.mjs` and this report. No application edits. No actionable QA failures remain in the tested scope. Separate Code Reviewer approval is outside this QA result.

## Targeted verification after review fix

Independent review found P2: Google login initiated from Create could return to Account through the callback. The developer added optional trusted `returnTo: 'create'` to the pending transaction and completion, while retaining journey priority and accepting legacy markers without that field. Arbitrary stored/initiation return paths are rejected; callback URL query parameters never choose the destination.

On the stable fixed snapshot, QA reran all seven independent OAuth tests: 7/7 passed. QA inspected the coordinator, callback routing and new regressions, then ran `node --test --test-name-pattern='Create|create' tests/google-native.test.mjs tests/google-callback.test.mjs tests/auth-screen.test.mjs`: 3/3 selected tests passed, covering both auth modes, warm/cold Create return, journey priority, untrusted query parameter rejection and legacy Account fallback. `node --test --test-name-pattern='arbitrary persisted' tests/google-native.test.mjs`: 1/1 passed. Whitespace check passed. Developer-reported 56 affected tests, TypeScript and scoped lint also pass; broad unchanged suites were not repeated by QA. The P2 has passing local regression evidence; reviewer re-verification remains the Architect's separate checkpoint.

## Remaining evidence

The installed development app/APK must be rebuilt to include the new native module before real Google authentication can be verified. Device/model/OS/build, browser version, connectivity, reproduction timestamps and real provider identity-linking/cancel/persistence evidence are unavailable for this local mocked run. No claim of end-to-end readiness, real account creation/sign-in, physical-device QA, hosted configuration validation or publication is made.
