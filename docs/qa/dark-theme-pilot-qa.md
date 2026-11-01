# Dark-theme pilot independent QA

2026-10-31 19:30 IST. QA Tester; local/unpublished Mobile snapshot based on `87b127aabb78ebf126db3afad645448c81a7d179`, branch `feature/backlog-phase1`. Baseline was clean. Architect owns physical phone operation; QA did not operate the device or any hosted service.

Scope: Home (`/`, `/discover`) and individual public Journey Story (`/journey/:id`) presentation. Inspect route selection, cached styles without mutation, light-route fallback, actual modal text contrast, and exported artwork preservation. No backend/data/auth/persistence/native/dependency changes were required. This QA is separate from independent code review.

## Findings and disposition

- P2 fixed: Home Help/Buddy intro retained a cream card while its title, secondary action and note became light text. Implementer added explicit dark card/body mappings. The regression uses the actual declared BuddyIntro stylesheet and verifies title/body/secondary/note at 4.5:1 or better in both palettes.
- P2 fixed: Share sheet explanatory text and feedback had no explicit foreground, leaving default black text on its newly dark parent. Implementer themed only surrounding copy. The regression renders the actual Share component, checks every non-canvas text child in light/dark routes, and verifies the export canvas keeps its original light background.
- No remaining actionable issue found in this bounded QA after those fixes. This does not certify every possible content/permission/error/device state.

## Checks

`node --test tests/dark-theme-pilot-qa.test.mjs tests/dark-pilot.test.mjs`: **8/8 passed**, 0 failed/skipped. Includes route boundaries, route changes restoring original stylesheet identity, cache reuse/nonmutation, navigation foreground mapping, preserved photo whites/gradients/art colours, text/muted/link/accent contrast on pilot surfaces, and the two actual-component regressions above. Initial QA run reproduced the Help contrast failure; the final run passed after correction.

Typecheck/scoped lint were reported passing by implementer before QA; final broader regression/static results belong to the implementer/Architect report and were not duplicated here. Application writes remain exclusively with implementer; QA added only `tests/dark-theme-pilot-qa.test.mjs` and this report.

Architect reports a successful first physical Home/Story visual pass on the connected Android phone. QA has not independently inspected those screenshots. Final Help/About/light-route device observations remain for Architect to append to the main pilot report. No full physical matrix, iOS, large-text pass, OS preference switching, or persistent appearance setting is claimed; the latter two are outside this pilot.

## Tested source identification (SHA256)

- `src/theme/dark-pilot.ts`: `DDC68AC218378861D1F70D698332EB3C7325996B964A697666237029273677E7`
- `src/components/buddy/buddy-intro.tsx`: `589EFAC07DB9687EDE24DDC2A2BC5B5B222BF5B2E71FE50F0C70111796FA6680`
- `src/components/journey/journey-share-sheet.tsx`: `78E9682628D529EBDFC459BF1FAC14922023CCC0047530F736322140C3403FCD`
- `tests/dark-theme-pilot-qa.test.mjs`: `76A8220BB021455E018BABF13EB44101654225A9562CD896F72F98BD1A7692FB`

No commit, push, PR update, deployment, build/install, secret access or hosted write performed by QA.
