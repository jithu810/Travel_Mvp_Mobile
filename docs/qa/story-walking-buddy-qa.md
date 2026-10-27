# Story walking Buddy: independent QA and code review

## Current final checkpoint: corrected integration

**245 unique checks passed (255 executions with ten duplicated baseline checks)** after both integration corrections. Final eleven-file snapshot **54295e3a096c2c4a06c036d070f5ef6856f8b3dd6d70c369a27f393026c03b94** supersedes the historical snapshot below. Final ordered paths use the same path + NUL + bytes + NUL algorithm: Story screen, StorySheet, map-frame, journey-map.native, native-map, story-walking-buddy, story-buddy-playback, story-walking-buddy test, story-interaction test, map-navigation-marker test, navigation test.

Changed final hashes relative to the historical table: screen `45b31ee799c63954b0f86132cfc56c89deae4ea38b5058c85936c2690333a49c`; added StorySheet `f6b35a02096b5198c32c75fc6c85e9932f0a97e8f8bb5747cac1886813e0ec1a`; native-map `3446edcac2583412d6d6e58b5de805d8fa354270d834ab286ae992df5b75c1b1`; Story annotation `372e07e16ffec4ac7038c8c7e6156cf0503f9f7bfc9dd79f50888bdf5373ae93`; Story walking test `6db8c3d8d7a3f38b95ffcc7d3207a098729921064e61dd964fdae07bfbb4f4a6`; Story interaction test `d054869cdd94f1cda3606af5ade617fb5b1cc6a148a0f32546df4ed1922d0413`. Other hashes unchanged.

Reran all eleven suites below against corrected sources and refreshed regression mocks. Added final repository test as story-walking-buddy-final.test.mjs alongside prior ten+three QA checks: final log `.local-tests/story-walking-buddy-qa/final-corrected-results.log`. The additional repository check executes actual StorySheet with default suppression, explicit map opt-out and invisible sheet. Updated annotation test mounts during a partially walked leg with motion unknown, confirms exact position retained after decode/layout, then resolves known nonreduced motion and resumes. Existing three independent QA edge cases still pass.

Renewed independent review explicitly includes the **Story screen → StorySheet suppression → map readiness/accessibility query → annotation ownership → shared controller** boundary. Default suppression remains enabled for all existing callers; only the Story map passes false while the screen's floating Buddy flag is false. About/other dialogs retain suppression. Unknown Reduce Motion pauses the controller and cannot use conservative placeholdertrue to snap selection; resolved preference or newer accessibility event marks known, while rejection conservatively leaves walking paused. Real reduced motion still settles the selected location without animation. Parent/child ownership cleanup and all source/read contracts remain unchanged. **No remaining actionable findings** on the corrected snapshot. The earlier review's missed ancestor suppression is acknowledged below; these final results supersede it.

Architect continues native verification; expanded-view native success remains pending until separately recorded with device evidence. Passing component/integration tests do not establish that result. No app changes were authored by this specialist.

2026-10-27. Local/unpublished. App implementation belongs to the Mobile Developer. This specialist independently tested/reviewed it and authored only preflight/QA reports and ignored QA snapshot tests.

## Final snapshot

Base Mobile revision `955ecac21ae554ae428c9efb36d2f8ab6406e935`, preserving prior dirty Jump/Run, Story/live-map and completed Home work. Ten-file snapshot SHA256 **435374fd5851a57a69409d086887255a61e1c23cf9b9f95a675c056f91b2a734**, computed over each listed path + NUL + raw bytes + NUL in this order:

| Path | SHA256 |
| --- | --- |
| src/app/journey/[id].tsx | 82e65a8d062055217676d1ee4da5837371bf1ad9ba6c936b6ac3ba1c36d941ce |
| src/components/journey/map/map-frame.tsx | 264978af209c4ea069c5a2c9d69718b013c99781da52cabc8764b800f189389f |
| src/components/journey/map/journey-map.native.tsx | 77396dc7d3e41012748d92da8272df2ff701915b856d8565cbd69fedb94b4bb3 |
| src/components/journey/map/native-map.tsx | 4aff56d5652a8b449ac82e413dfdbdbeaee8623243c047aba9940a350b8a188c |
| src/components/journey/map/story-walking-buddy.tsx | 53eff55eab2bcca603649bea9d55dacd3247a32b143141910388fb410991c3ec |
| src/lib/journey/story-buddy-playback.ts | 3e7255fa2d455234e7e1bcdf50e75cc69782a379c5b749bdea566d9955acb239 |
| tests/story-walking-buddy.test.mjs | e73ae197b74ec92a07e03cf258960ec9b34b4304b6046da1b9c54bdeed017c7a |
| tests/story-interaction.test.mjs | d80380f6a8ddde901e257dfbab6fc295aef107941f259cbaab998de4d66b223c |
| tests/map-navigation-marker.test.mjs | be82d86fd35e44512a10924c85937a392528e9cd5f9125c1526afdfbd681b071 |
| tests/navigation.test.mjs | 8f10e6ccde1b61fde70aa3f08314b6e7bbbfc8a9f7a184b9a5d6e00520f5be2c |

## Automated verification

**244 unique checks passed, zero failures**, including 241 repository checks and three QA-only edge cases. Current source/tests were copied into `.local-tests/story-walking-buddy-qa/`, with existing D:/JBuild dependencies and read-only bundled assets linked. No dependencies installed or environment files read. Final log: `.local-tests/story-walking-buddy-qa/final-results.log`.

Command in snapshot: `node --test tests/story-walking-buddy.test.mjs tests/story-interaction.test.mjs tests/map-navigation-marker.test.mjs tests/navigation.test.mjs tests/home-walking-buddy.test.mjs tests/discovery-globe.test.mjs tests/discovery-camera-motion.test.mjs tests/home-polish.test.mjs tests/buddy-map.test.mjs tests/journey-buddy.test.mjs tests/journey-buddy-floating.test.mjs`.

Coverage includes actual controller/annotation sprite frame advancement; compact36dp/expanded64dp sizing; initial idle; next/previous and multi-stop forward/reverse traversal; rapid retarget from current coordinate with obsolete callback rejection; coincident intermediate stops; missing/invalid/date-line geometry; pause/resume/expansion continuity; reduced motion; image readiness/failure/timer cleanup; existing Story selection/Travel GPS/current-position marker/camera/editor/Home/floating Buddy regressions. Initial 26 regression failures were missing mocks for new Story imports; Mobile updated the three affected test harnesses, and final current-source regressions pass.

Additional independent QA-only cases:

- A card selected while the map is hidden resumes from the exact paused point; a saved stale timer cannot move it.
- Reduced motion enabled mid-leg settles at the selected stop; a later hidden-card selection and reenable do not revive the obsolete route.
- Forty deterministic sequences of nine rapid target changes across distinct coincident stop IDs always finish at the latest selected stop with no remaining jobs.

`git diff --check` passes (existing CRLF conversion notices only). Architect owns TypeScript/scoped lint and phone checks; these are not claimed independently run by this specialist.

## Independent code review

Applied the repository Code Reviewer role instructions sequentially after QA, reviewing another specialist's frozen application implementation. **No actionable findings.** Inspected controller generation guards, cursor/queued-coincident arrival semantics, shortest-arc normalization, immutable external-store snapshots/subscriptions, timer cleanup, shared controller across mutually exclusive map instances, readiness and reduced-motion behavior, stop identity, bundled decode/layout gating, sprite sizing/cropping, touch pass-through, preference/map presentation ownership and wrapper prop forwarding. Story disables its older plane/preview controls without altering Home opt-in or authoritative Travel position logic. No backend access, permission or secret changes introduced.

This is sequential independent review by the QA/preflight specialist, not a separate third reviewer thread; the specialist did not author app code.

## Native limits and handoff

Architect reports compact native marker rendering/moving poses and removal of old controls. This specialist has not independently operated the phone or inspected that evidence. Expanded-view marker visibility is still under Architect investigation; first full-view capture lacked Buddy and simultaneous owner interaction prevented a clean inference. Do not claim expanded native verification from passing harness tests. Remaining physical checks include expansion/collapse, forward/reverse/rapid card changes, larger-text/TalkBack, lifecycle, overlap/touch pass-through and performance/battery.

No live writes, saves, uploads, dependencies, commits, pushes or deployments were performed by this specialist. Parent Architect owns final phone evidence and readiness decision.

## Reopened integration findings

The preceding snapshot is **superseded for final readiness**. Architect native investigation found the existing StorySheet ancestor unconditionally suppresses Buddy while expanded; Mobile also found an unresolved default Reduce Motion value can snap persistent playback on expansion before the platform preference resolves. Corrections and renewed QA/review are pending. Earlier no-actionable-findings assessment was limited to the listed snapshot/files and missed the ancestor suppression integration boundary. Do not treat that assessment or244 checks as final validation of corrected code.

## Architect runtime/native checkpoint - 2026-10-27 08:30 IST
Final runtime TypeScript and scoped source/test lint pass in D:/JBuild. First lint attempt reported three missing test-helper imports in stale JBuild; copied the existing unchanged buddy-geometry-stub helper and reran successfully. Seven runtime source files and four tests match Mobile final sources; existing runtime files backed up in TEMP story-walking-buddy-20261027-082457 and story-buddy-expansion-20261027-082841. No environment files read/copied; no dependencies/native rebuild or live writes.

CPH2813 Android16, Metro8081, wireless ADB <phone-LAN-address>: before screenshot story-buddy-before.png shows old controls; after screenshot story-buddy-after.png shows controls/help absent and compact Buddy at first stop. story-buddy-forward-1..4.png show differing walking poses and positions between numbered stops and destination photo marker as cards change. Concurrent owner interaction changed panels/cards during capture, so these do not establish isolated one-tap selection behavior or backward timing. First expanded snapshot exposed inherited StorySheet suppression; corrected afterward, with actual integration regressions. Final expanded64dp rendering/backward isolated check remains pending idle-phone opportunity. Latest story-buddy-final.png shows phone on Create; no create/save/upload/start action was automated. Screenshots are under <local-temp>/. Full native accessibility, lifecycle and performance matrix remains pending.
