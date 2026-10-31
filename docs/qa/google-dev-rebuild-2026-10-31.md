# Google login development rebuild — 2026-10-31

## Latest owner test result

2026-10-31: owner confirms the branded Google login works, with the prompt now identifying the app instead of the Supabase hostname (owner wording "travel buddy"; configured brand Journey Buddy). Google Console branding verified/published status was owner-reported. Codex reconnected CPH2813/Android16 at owner-supplied wireless endpoint `192.168.1.2:33117`, restored Metro8081 reverse mapping and opened the existing Google Test package. Existing Metro PID760 still served the expected canonical checkout; agent screenshot confirmed the app loaded on Search. The subsequent Google consent/login result is owner-reported, not agent-observed. No new build/install/account action was performed by the agent. Shared-scheme app selection and untested linking/cancel/restart cases remain limitations; Mobile source remains unpublished.

Owner authorized rebuilding the development app for testing, confirmed phone availability at `192.168.1.2:40859`, and explicitly allowed Expo/Metro to load existing local configuration without agent inspection/copying/display. No environment file was read by the agent. No Google client secret was added to the app.

Baseline is the local unpublished Google OAuth snapshot on `feature/backlog-phase1` at `a8f0c74`, with all previously listed modified/untracked implementation/test/status files preserved. This is focused native packaging verification of the already-reviewed feature; its 56 affected checks, independent QA and review are reused. Existing backend preflight applies; packaging adds no backend changes or hosted writes.

## Preparation

- Followed shared phone-session skill. CPH2813, Android 16, reachable/unlocked. Two adb entries identify the same phone (IP and mDNS), not two distinct phones.
- Generated ignored canonical `android/` with `EXPO_NO_DOTENV=1` and Expo prebuild `--platform android --no-install`. Restored only prebuild's unsolicited android/ios script changes, retaining the Google dependency.
- Local debug ARM64 build uses Java 22, Android SDK build tools 36, Gradle 9.3.1 and existing `D:/GHome` cache. Offline attempt lacked three development-client dependencies; retried online without package upgrades.
- Autolinking reports `expo-web-browser 57.0.3`.
- Metro started for this session on 8081, PID 760, expected canonical checkout. Logs/evidence in system temporary directory `journey-google-dev-20261031`. Owner-authorized Expo configuration loading; variable values not inspected.
- Installed development APK backed up to `development-before.apk` in that temporary directory, 345266066 bytes. Installed package `com.sree8100.journeycreatormobile`, version 0.1.0/code1, last update 2026-10-20 07:47:10.
- Original public signer SHA256 `7bad25f35469d13430874b394659aec8fbbeb8fbdd03b5eeae75db6274ca9cb5` differs from generated local debug signer `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. No in-place update attempted, no uninstall or data clear. Owner has no signing certificate; separate test package planned to preserve existing apps.

Build/install result, artifact hash and device smoke evidence: pending. Real Google sign-in, account linking, persistence/cancel and actual browser callback delivery remain unverified. No live sign-in/account creation or other hosted writes performed by the agent. No commit/push/deployment.

## Separate test identity assessment

Owner has no original signing key. Architect explained separate `Journey Google Test` app to preserve installed apps/data. Only ignored local Android build identity/label will change, not canonical app identity or auth implementation. Independent reviewer considers this acceptable for bounded owner-led testing after inspecting Android callback resolution. The shared `journeycreator` scheme may present an app chooser or retain an old default; select the test app and stop if callbacks go to the original app. No claim of automatic callback routing or release verification. No defaults changed by the agent. A unique scheme would require additional auth configuration and a separately approved hosted redirect entry, so is outside this packaging pass.

Pre-install resolver inspection returns only existing `com.sree8100.journeycreatormobile/.MainActivity`. Post-install resolver must be checked before claiming readiness for owner-led sign-in. Signing mismatch is handled with coexistence, never uninstall/data clear.

## Final build and installation evidence

- Main canonical development debug ARM64 build: BUILD SUCCESSFUL in 15m36s, 517 tasks (485 executed, 32 up-to-date). This original-package artifact was preserved in ignored build scratch and was not installed.
- Separate identity uses ignored `.local-tests/google-dev-build/test-identity.gradle`: debug-only `applicationIdSuffix=.googletest` and app-name resource override. One packaging command failed due Windows JVM-option argument parsing before task execution; corrected command succeeded in 1m45s, 517 tasks (37 executed, 480 up-to-date). No canonical app.json identity/auth changes or dependency upgrades.
- Final APK `android/app/build/outputs/apk/debug/app-debug.apk`, 115488445 bytes, SHA256 `CBD53790240611982F97049483272194DECA1B032B2A7621EADD69640AD2ABEE`.
- Verified package `com.sree8100.journeycreatormobile.googletest`, label Journey Google Test, version0.1.0/code1, ARM64-only, debuggable. Signature verified with local debug public certificate above. Independent QA confirmed hash, signature, manifest callback scheme and native WebBrowserModule/DevLauncherController/DevMenuModule in DEX.
- `adb install -r` returned Success; installed lastUpdateTime 2026-10-31 13:52:24. On-device base.apk SHA256 exactly matches final APK. Original development app lastUpdateTime remains 2026-10-20 07:47:10; no update/uninstall/data clear of originals.
- Post-install resolver returns Android ResolverActivity with two matching apps (original and Google Test), rather than silently routing to the original. Owner instructed to select Journey Google Test in the callback chooser. Defaults not changed. This remains a bounded manual-test limitation.
- Codex session, local laptop, CPH2813/Android16, Metro8081 serving `D:/Travel_Mvp_Mobile`; launch explicitly targeted the test package. First screenshot shows bundle loading, then Home and first-run prompts; dismissed only local onboarding/dev-menu prompts. Home initially showed map fallback, subsequently rendered the globe; no map fix required/performed.
- Navigated Account -> Sign in or register. Final inspected screenshot shows sign-in form, email button and enabled Google button. Left app there for owner-led sign-in. Empty credentials; no login attempted by the agent. Evidence in temporary directory: test-launch.png, test-loaded.png, test-ready.png, test-account-settled.png, test-login.png.
- Build/native packaging and launch smoke verified; actual Google consent, callback selection/exchange, existing-account linking, cancellation and persistence still pending owner test. No hosted writes, account creation, publication, cloud build or deployment performed. Existing feature tests and source review reused, no unrelated suite rerun.
