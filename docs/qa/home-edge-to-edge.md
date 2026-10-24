# Home edge-to-edge QA and independent review

QA Tester / Code Reviewer, independent of application writer. 2026-10-23 21:21 IST (15:51 UTC). Local/unpublished. Required backend preflight: docs/home-photo-fit-preflight.md Home-edge addendum; no backend changes required.

## Stable snapshot

D:/Travel_Mvp_Mobile, codex/home-photo-fit, HEAD aba76832ce967503caf5d8692faf019ed3f583ca plus prior dirty Home/Journey work and this delta. Architect released stable Home files before checks; prior user work/untracked baseline retained. SHA256:

| Path | SHA256 |
| --- | --- |
| src/app/discover.tsx | E4E6E0D0F708D34CF184EC60A2C83A2E48618306A6FADA1A2C7743635C661CD5 |
| src/components/discovery/discovery-panel.tsx | 660622BF75BB3D0DF780CC983A2B4BD7C3BBE8E2716AA3A4F3C0DC31D7F2B31C |
| src/components/discovery/globe/discovery-globe.native.tsx | E60BBED98E69C61FD7E1E155B76A55DE22071C5208B64A1AD6D4163CC7D56626 |
| src/components/discovery/globe/discovery-globe.tsx | 9CED28CBB01A673ADA3B7415373CA9F39B3460AFE1E9DD096532702DE8070CAC |
| src/components/discovery/globe/native-globe.tsx | 0F5EA04089CCD21A4D72D9BB953B19F5C2EB7433D29838E299EB8D990798C013 |
| tests/home-polish.test.mjs | 36EB98314EDB2288F01EDAC0F4C893B44442D986DB248B07DD3B643553AB2159 |
| tests/discovery-panel.test.mjs | 48BC08FED0819A856DA2B46678FE15A315D713C9E3D41F312A7E189CE56D1B8F |
| tests/create-flow.test.mjs | 0CF6BC918244B2EACA2AE6719A966F65B76361148A5CA28DC065B023A8DD1FB9 |

## Checks actually run

- Full npm test: **567/567 passed**, zero failed/skipped/cancelled.
- Focused Home/create-flow/discovery-panel: **77/77 passed**.
- npm run typecheck: passed.
- Full npm run lint: passed, max-warnings=0.
- git diff --check: passed; existing status/roadmap LF-to-CRLF warnings only.
- Offline Android export to ignored dist/home-edge-qa/export: passed,1618 modules,4.4MB Hermes bundle.
- No dependency/config change: previous same-task offline compatibility result retained (up to date with CLI offline reliability caveat); no upgrade/install/native app build.

## Independent findings

**No actionable findings**. Inspected Home diff, panel budgeting, native/web globe prop forwarding and camera-fit integration, existing PlacePicker keyboard/suggestion path and relevant tests.

Home header becomes absolute below safe top; globe uses full page. Existing search result dropdown stays absolute with own z/elevation, keyboardShouldPersistTaps and nested scroll; no new search query, location permission or lifecycle write. Notification remains a static coming-soon image. Header onLayout measures its painted row rather than its absolute dropdown. Fixed noninteractive status shade protects light icons; existing focus-scoped native push/pop cleanup retained. Other routes can regain their status entries on blur; no global config change.

Panel reserves clamped top clearance in addition to existing bottom navigation/banner clearance and preserves at least handle budget where viewport permits. Existing compact/expanded measurement and scrolling behavior retained. Native globe receives optional headerInset through props; preview/default callers retain0 and preview4px camera padding. Home Fit target computes zoom on reduced usable height, then uses clamped full-viewport padding so points avoid header/panel; padding never intentionally consumes all map height. Logo/attribution/compass/World positions move beneath measured header instead of disappearing behind it. No map renderer/projection/route semantics changed.

Tests verify measured header/prop wiring, panel top reserves at0/96/500 and varied viewport/bottom budgets, status cleanup, and existing search stale/cancelled responses, selection, map gestures and navigation. Mock/style assertions do not prove real Android z-order/keyboard/cutout behavior or Mapbox camera appearance. Phone/native evidence belongs to Architect, who is independently operating connected Android. This specialist did not control phone or infer a physical pass from export.

## Native acceptance / limits

Pending Architect evidence: settled globe behind clock/battery, header below cutout, visible World/Mapbox legal controls, suggestions open/scroll/select and keyboard dismiss, panel expand/collapse/last actions above bottom overlays, Locate camera visibility, focus to Journey/Account and back with status contrast restored. Include actual model/OS/build, screenshot timestamp and exact observed transitions. Large text, landscape/extremely short viewport, TalkBack, iOS and fallback error appearance remain explicit device acceptance. No new GPS or navigation verification claimed.

QA writes only this report plus assigned ignored export output. Existing dev server untouched. No phone actions, API/database writes, package updates, commits/pushes/merges, deployment or publication performed. No secrets or user records placed in this report.

## Native loading-contrast finding and final correction

2026-10-23 21:32 IST (16:02 UTC). Architect's physical-device screenshot home-edge-handoff.png revealed initial pale BrandedLoading overlay covering the shade while focused Home still requested light icons. Result: unreadable light clock/battery on pale loading background. This was a real native finding missed by the earlier automated/static assessment; the earlier no-findings result is historical, not a claim that this state worked.

Writer corrected src/app/discover.tsx to use the same initialLoading = state.loading && !state.data boolean for both actual loading overlay and focus-scoped dark/loading versus light/globe status selection. useCallback depends on initialLoading, so changing loading state pops the previous entry and pushes the correct replacement; blur cleanup still pops the current entry. Stale-data refresh retains globe/light behavior. Independent review of final correction: **no remaining actionable findings**.

Final verified hashes supersede initial table rows:

| Path | SHA256 |
| --- | --- |
| src/app/discover.tsx | CFFB6D02C1A2166BECDF5AE4423932A29648FB62E6A3597EFCAF6B779041CB53 |
| tests/home-polish.test.mjs | 84D8B083E19B9D943C2B7701FE1ADB48FE1A0F7B9C2F536006B3F8C1B10A734B |

Final checks actually rerun: full suite **568/568 passed**, focused Home **14/14 passed**, TypeScript passed, full zero-warning lint passed, whitespace passed. New actual-hook lifecycle regression checks dark loading -> cleanup/pop -> light globe, same-state no new owner, and blur pop. Final offline Android export to ignored dist/home-edge-qa/final-export passed,1618 modules,4.4MB Hermes. All other delta paths retain earlier hashes.

Code/test correction verified; physical loading and settled contrast recheck remains Architect-owned and must be recorded separately. No device success inferred from mocked lifecycle/export. No source/test changes by QA; report and final ignored export only. No phone/server/live-write/publication actions.

## Reopened native status ownership failure

Architect's later actual screenshots home-edge-loader-fixed.png and home-edge-expo-loader.png both still showed white icons on the pale loader. Therefore the conditional RN-stack correction and subsequent Expo-component attempt did **not** resolve native acceptance, despite prior automation. Final QA is reopened and full checks paused until native confirmation of the next stable revision.

Read-only installed-code investigation: expo-status-bar/src/NativeStatusBarWrapper.tsx renders React Native NativeStatusBar, so switching wrappers alone does not create a separate authoritative native owner. react-native-screens Android ScreenWindowTraits.kt setStyle resolves missing screen status trait to light and writes WindowInsetsControllerCompat.isAppearanceLightStatusBars from style==dark; Screen.kt statusBarStyle setter invokes that native path. Root Stack had no explicit statusBarStyle option. This is evidence for testing the native-stack route statusBarStyle rather than another competing imperative/component write. It does not itself prove the next fix. Findings sent to writer and Architect; no source edits or native device actions by reviewer.

## Final native-stack correction and verified handoff

2026-10-23 21:50 IST (16:20 UTC). Supersedes earlier Home status-owner implementation/hashes. Current Home uses one Stack.Screen route option statusBarStyle initialLoading dark / settled light, with no Home RN imperative entry or Expo StatusBar component competing for ownership. Route screen native trait is the mechanism identified in installed native code. Independent review: **no remaining actionable findings** for this final snapshot.

| Path | Final SHA256 |
| --- | --- |
| src/app/discover.tsx | F6A78C0F36EF974218C87A8F0D5E95EE249E72065513DF64B85E76BD07BB84DE |
| tests/home-polish.test.mjs | 084F3DEEAC5F412DBDC7F979D3E71BB6C357D918A25BB227B81BB5589DAC3E15 |
| tests/discovery-panel.test.mjs | 095DE660373AD16D160CD7B350F04E38232EAFFE4B20FCAF4163EFA6AA55420C |

Checks on final source: TypeScript and full zero-warning lint passed. First full suite exposed a stale discovery-panel test assertion requiring removed RN Platform guard/popStackEntry; writer corrected test-only to current Stack.Screen contract. Full suite then **568/568 passed**, whitespace passed. Writer independently passed focused panel/Home27/27; QA's final full run includes these. Final offline Android export dist/home-edge-qa/route-status-export passed,1618 modules,4.4MB Hermes. Hashes reconfirmed afterward. Prior exports/test results remain historical for prior attempted fixes.

Native evidence: Architect performed full development-menu Reload (not server restart) to apply the final native-screen status option before retesting. Connected CPH2813 Android16, existing development client served8081 over wireless ADB. Architect reports home-edge-final-loader.png dark time/battery on pale Home loader; home-edge-final-ready.png light icons over edge-to-edge globe with floating header. QA specialist independently viewed both actual screenshots under dist/journey-deck-qa and confirms those contrasting states, with World/Mapbox legal controls visible in settled image. Thus the original loader-contrast issue is resolved for the exercised device/build path after full reload. Earlier failed captures are retained as failed evidence, not reclassified as successes.

Architect additionally reports query Kochi suggestions/selection exercised (home-edge-search/place), expanded settled panel retaining header/legal controls (home-edge-expanded-settled), Account dark status restoration (home-edge-account), then Home dark loader. These interaction results are root-observed, not specialist-operated. No live records written. Actual large fonts/TalkBack/iOS/landscape/extreme viewport and GPS/navigation remain outside verified coverage. Root may add precise further native timestamps/build metadata; screenshots remain local/ignored and can contain user journey/location details.

Only this report and assigned ignored export outputs changed by QA. No source/test edits, phone actions, server restart, live mutation, commit/push/merge, deployment or external publication by specialist. Final native acceptance is bounded to evidence above; original photo/Journey test/report snapshots remain separately documented.

## Publication snapshot review — 2026-10-24
Independent publication reviewer found no actionable application issue. All17 application-source hashes match the latest reviewed QA snapshots. Two prior test hashes were stale due to scoped harness/layout assertion changes; the current exact hashes are:
- tests/create-flow.test.mjs: 1D9ABF9968093DF8C627CEFEBBCE4476831CBB6CDD21E895D7594929EA57B207
- tests/map.test.mjs: D609B893A885F7970695DB7BCDB74D21BF7321C21D9321E6FE84E3E72830A510
Fresh full suite568/568 and TypeScript passed on this current snapshot; test log remains ignored at dist/publication-tests.log. Historical test hashes are not asserted to match current test files. No application code changed for publication. Native coverage limitations above remain, and screenshots stay local/ignored. User authorized GitHub publication and main merge; no deployment or hosted database change is included.

Publication final check: full zero-warning npm run lint and staged whitespace check passed on 2026-10-24. Fresh568/568 tests and TypeScript passed. Independent reviewer found no actionable application issues. Screenshots excluded.
