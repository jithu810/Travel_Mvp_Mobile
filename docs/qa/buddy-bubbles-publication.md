# Buddy and Home attribution publication QA — 2026-10-25

QA Tester, 22:39 IST. Base `e527e105b7d1b0a45e04d85fa83d771c6cee8380`, Mobile `main`. Product owner authorized publishing all latest Mobile work together in one new PR and requested a local Android build. Architect owns publication; Mobile Developer owns build feasibility/evidence. This report is a local pre-publication checkpoint, not confirmation of a commit, push, PR, build or installation.

## Checks and readiness

Architect final handoff: independent publication reviewer found no actionable findings on app/test snapshot `8f418ea86075dcca9d08dfa6a34987c9a63ba5caef4f9b25e75044d3b802edad`, independently passed169/169 focused cases. Product owner changed build scope to preparation and manual PowerShell instructions only: latest source/assets copied to existing isolated D:/JBuild, installed Outdoor signing certificate matches existing local release setup, no build or install started. Preserve identity/configuration and reuse D:/GHome cache. Source hashes below remain the tested baseline; PROJECT_STATUS/ROADMAP receive this final documentation-only checkpoint before commit.

- Fresh broad run: `node --test --test-concurrency=2 tests/*.test.mjs` executes **722 cases: 721 pass**, with only the existing disposable PostgreSQL policy test failing to start `pg_ctl` under the sandbox Windows token (error 87).
- Isolated outside-sandbox retry `node --test tests/thumbnail-policy.test.mjs`: **1/1 pass** on a new synthetic local cluster, shut down by the test. All 722 cases therefore pass across the broad run plus this one environment-specific retry; no hosted writes.
- `npm.cmd run typecheck`: pass.
- `node node_modules/eslint/bin/eslint.js src tests --max-warnings=0`: pass, zero warnings.
- `git diff --check`: pass; Git prints existing LF/CRLF notices.
- Known full `npm run lint` failure remains 40 unresolved imports in preserved `.local-tests/publication/claude-code-setup` and `part-a` historical snapshots, as verified in the earlier same-session QA run. Those snapshots are outside the intended publication; current source/tests lint passes. This broad lint was not repeated because those files/config/dependencies did not change.
- No changed package/lockfile, app/EAS native configuration, Supabase client or migrations were present in this publication baseline. No environment file was read and no hosted data was written. Tests and type/lint checks do not prove Android APK compilation.

QA inspected the complete previously dirty Home attribution change: `globeAttributionPosition` moves from right 56 to left 116; actual native map and Buddy control protection consume the same exported anchors and header offset. Logo remains at left 12; compass and Journey/Travel controls remain unchanged. Test updates resolve the new pure module import and assert the released upper-right space, retained-control rejection, header offsets, compass cases and actual native props. **No actionable concern found.** Existing preflight and native attribution evidence remain in `home-attribution-preflight.md` and `home-attribution-qa.md`.

Buddy's final cosmetic bubble file differs from the earlier 114-case QA snapshot; the fresh 722-case run includes the latest ivory/teal/pill style. Its app callback/host geometry contracts remain unchanged. Prior same-height tour and no-fit gesture findings are resolved with regressions. Independent publication review remains a separate Architect handoff. Remaining native limits from the feature record persist: active GPS/capture, authenticated own-story reaction, large text/TalkBack, rotation and full tour route traversal were not proven on-device. Known default-size native Home/tour and attribution evidence is in the earlier QA records.

**QA readiness: ready for the intended GitHub publication subject to independent reviewer handoff and the documented native/full-lint limits. Local Android build availability is a separate Mobile Developer result; QA makes no build-success claim.**

## Frozen content inventory

Hashes captured at 22:39 IST for the 18 tracked changes and four existing QA reports in the intended publication baseline. Status documentation may receive a subsequent Architect publication/build checkpoint; refresh those hashes or identify the resulting commit before claiming this exact whole-document snapshot. This report itself is excluded to avoid a self-referential hash. No app/test file was edited by QA.

| Path | SHA-256 |
| --- | --- |
| `PROJECT_STATUS.md` | `25edf2fc362b2457a382f2ed4add575a71cb3e397204d29b85cbd06c48092954` |
| `ROADMAP.md` | `277866798e08cfe8f807aa1ee393303a7f81c16e50e8ae31f31a565176ebd926` |
| `src/app/journey/[id].tsx` | `6029294778686acd76dc276b797deb84910688b08c3f9e5281b7c14d21e83113` |
| `src/components/buddy/buddy-help-sheet.tsx` | `922fefd0d54893c77e37f2721ac78647bb27619544793edbfee6e9c9a7fa684f` |
| `src/components/buddy/journey-buddy-host.tsx` | `03b676189ebf15017a4df5c6676e72a2273e09f8f01839efaaa3f4f4c41e802f` |
| `src/lib/buddy/geometry.ts` | `625d34b7f48cb083718b8fee78741ef63d6df0b11794f5ccadae1b1c4ac66555` |
| `src/lib/buddy/map-controls.ts` | `4451b875d83723f4c98f6adfd259de75715747e6595ebb32d1a88077b2199cc8` |
| `src/lib/buddy/model.ts` | `ac98687c05561d611f2d1d5e482ff689c7d8fdcba7c2d62df30dd05b4879d92d` |
| `src/lib/buddy/store.ts` | `2f17f4fb02e51d42f81da643685c958e529d05449a55e75bb99120dc22c19ab0` |
| `src/lib/discovery/globe-style.ts` | `00844168140125a716efa00583627fa780f28ac511838a161f8945d530be1a57` |
| `src/lib/discovery/queries.ts` | `de82a8b5b8239c1eb2380cc8c555b53874ed0921e0adcfebfa956aa43476eee3` |
| `src/types/journey.ts` | `f574821bbe362afacf1094b6056448a519322aa5a7889123e238932766afbf48` |
| `tests/create-flow.test.mjs` | `d046763313cb93fa4b47a8402cf3a20f9c53fe192bccfd5894545d9934c22f4b` |
| `tests/discovery-panel.test.mjs` | `0f72c9741db63f7dce304bbc4b463e9e058ce2c5194e4b15fe8a1058c2306832` |
| `tests/home-polish.test.mjs` | `bfaf15b3b9114bd22f17affdb321354907ffb7377bc78ba404a5019c452c6397` |
| `tests/journey-buddy-floating.test.mjs` | `79758a97c71ae24b13a3c91d274b744400703f61b45e4c897fa57dcfb2916699` |
| `tests/journey-buddy.test.mjs` | `7e8ec2771be9565afbb9cf3bd3f1730ebb5a7af96d4c7af753bc490b03821d28` |
| `tests/story-interaction.test.mjs` | `f31e17610631829f59f3b689f9db2741cf8f7757b7f3d8e1fbb558884841dbdf` |
| `docs/qa/buddy-bubbles-preflight.md` | `d0d4c27707e8d7d24a71d51fde743b19da36ecd52db48ba0aec29a7bc294918e` |
| `docs/qa/buddy-bubbles-qa.md` | `fb11c430fa46cdb901c12c63d6fb6cb0d5d8a0de8bf6275096e8b0f01b255b48` |
| `docs/qa/home-attribution-preflight.md` | `338f14e31b821a6cab21fda05c1c3bd131214dd8997d67051a2cc07a3e212086` |
| `docs/qa/home-attribution-qa.md` | `aaed6ba31dcd462dad0c77ad9b8868e0fc0b5f3f6963a635c3e4558f0d0388b5` |
