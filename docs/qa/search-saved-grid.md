# Independent compact Search / Saved UI review

2026-10-24. Reviewer/QA specialist inspected the stable Mobile frontend handoff. Scope is UI authored by Mobile Developer: Search, Home PlacePicker extraction, new CompactSearchInput and related three test files. Backend helper was authored by this specialist and **is not independently reviewed here**; Architect separately owns its independent review and six helper tests. Preflight: docs/search-saved-grid-preflight.md.

## Findings and disposition

No remaining actionable findings in this UI scope. Initial Search snapshot contained two literal Unicode replacement characters in clear-button text and account-loading title. Architect independently identified and assigned that same issue to the writer. Writer replaced them with ASCII x / Checking your account...; reviewer verified zero U+FFFD code points and reran all seven Search tests against final Search hash below. No application file edited by reviewer.

- Shared CompactSearchInput preserves Home's surface minimum34, touch target44, corner24 and font12 geometry; ref focus, controlled text callbacks, Home disabled/editable, focus epoch, suggestion debounce/cancellation and submit callback remain in the owning PlacePicker. Presentation introduces no new Mapbox request path.
- Search retains three-column square ExploreTile data rendering and incomplete-row width behavior, source-marker navigation and previous fallback semantics. Bookmark toggle has selected accessibility state and active visual treatment. Query filters the selected public or Saved collection without inheriting Story query. Story remains the independent single-column mode.
- Saved request eligibility requires Search saved-mode, restored/error-free auth and user identity. Callback key includes eligibility, user ID and access token. Existing useLoad derives data null immediately on a changed loader and aborts obsolete effects; prior identity cards are not preserved across a changed auth key. Guest mode makes no saved-helper request and offers sign-in. Account-loading/error states hide personal results.
- Focus and foreground refresh the personal collection so an unsave on Story is reflected on return. Refresh preserves same-identity data while requesting authoritative state; public mode/Story uses the original public loader. No new save mutation or extra authentication subscription in UI.
- Existing prior feature files, backend preflight reports, QA report and unrelated untracked baseline entries remained present in Git status. No Web/Git/hosted mutation or dependency changes executed by reviewer.

## Independent checks

node --test tests/search-explore.test.mjs tests/home-polish.test.mjs tests/create-flow.test.mjs: **73/73 passed**. Includes real useLoad hook harness for identity switches, loading/sign-out, aborted late results, guest no request, focus/foreground refresh and Story separation; shared input geometry/focus tests; Home search debounce/stale responses/errors/keyboard dismissal and selection regressions. git diff --check passed (existing PROJECT_STATUS/ROADMAP line-ending notices only).

After the two-string fix: node --test tests/search-explore.test.mjs **7/7 passed**, whitespace passed and literal U+FFFD count zero. These are mocks/source contract checks; they do not establish native screen-reader, pixel rendering or real network outcomes. Writer owns full-suite/typecheck/lint/Expo export outputs; those were not rerun by this reviewer to avoid generated-output overlap.

## Final reviewed SHA256

| File | SHA256 |
| --- | --- |
| src/app/search.tsx | A6372DB3BD17DE67866AF68991E2DF9F27E1A83C40BEC8FE8BF88A46A2B95EC6 |
| src/components/create/place-picker.tsx | A572D1999B8A3A69FF63C85A9C348C2606C60470D64811718C1A46775A03A08B |
| src/components/discovery/compact-search-input.tsx | CB91C5059F3BF232ACFA191513F47974E17AF76E49958FDE252974176AEE9625 |
| tests/search-explore.test.mjs | E57D5601303B9FAD79BF2274CBA53093391CAF35FB0541E7616F1410C7002797 |
| tests/home-polish.test.mjs | 46E468AE7F04C091EE4809A97080E61B5EDB5C7FF73610403597F7252CDAC600 |
| tests/create-flow.test.mjs | 911879034E400A03A32E95C48E8A307E07B78242BAC6E37EDC55481CE2699A46 |

All hashes recaptured after initial73 tests; only Search changed for the reviewed two-string fix. Any further app changes require affected re-review.

## Pending evidence

Architect owns native visual checks of matching Home/Search pill shape, keyboard/clear/toggle fit, partial grid rows and bookmark location. Physical iOS, TalkBack/VoiceOver, large text and real signed-in Saved refresh/account transitions remain pending unless separately verified. Do not create or toggle live saves as a test without applicable human authorization. No live read of personal save rows was performed here. Reviewer changed only this local/unpublished report; no publication/deployment/database approval sought or implied.

## Architect helper review and native verification — 2026-10-24 Asia/Kolkata

Architect independently reviewed saved-queries.ts and its tests (Backend authored these), inspected identity subscription/before-after verification, abort/deadline cleanup, paginated caller-specific public-only guards, stable-ID dedup and existing photo signing; no actionable findings. Independently reran6/6 saved helper tests. Helper/model contract comment snapshot SHA256:
- D:\Travel_Mvp_Mobile\src\lib\social\saved-queries.ts: 3EB1CDABCF464F88E214A55412FF7656746CA9247C9A8D2EE57FA8E68CA246FB
- D:\Travel_Mvp_Mobile\src\lib\discovery\model.ts: 53920D1B418F3DE445E20A072B95047172700CF911A8D9B90095609BC3A0D9D7
- D:\Travel_Mvp_Mobile\tests\saved-queries.test.mjs: 345C0FF6CD067FDC2D128B09AB1A69BE19DDA880C66E619FE6D8D87395227AF2

Native CPH2813 Android16, existing Journey Creator0.1.0 Expo SDK57 client on Metro8081. No server restart, native rebuild, dependencies or permission changes. Existing account/Wi-Fi connection retained; GPS/Travel not exercised. Navigation captures settled10seconds; initial updated screen settled12seconds.

- dist/search-compact.png: actual shared Home-style small pill, search glyph and right bookmark visible, three-column grid preserved.
- dist/search-saved.png: tapped only filter (not mutation); selected purple bookmark and five existing saved public journeys in grid; incomplete row retains tile widths.
- dist/search-saved-filter.png: typed Kovalam in Saved; one matching tile, active bookmark and corrected clear x visible; submit dismissed keyboard.
- Cleared query and switched bookmark off before navigating Home. dist/search-shared-home.png verifies shared compact input still renders on Home with existing globe/cards/navigation.

No live save/unsave/like/copy/upload/seed/DDL write performed. Native guest sign-in/account switch/unsave-return/foreground refresh, iOS/TalkBack/large-font/extreme-inset remain pending; deterministic local tests cover those state transitions separately. Earlier Journey-to-Search status-icon transition limitation remains outside this change.

Writer full582/582 passed before final text/dependency-destructuring corrections; final affected79/79 plus final Search7/7 passed after. Final TypeScript, full zero-warning lint and whitespace passed; Android export1623modules4.4MB succeeded. Reviewer UI73/73 plus final Search7/7 passed with no remaining findings. No source changes after final review/validation. Local/unpublished; no GitHub/deploy/live writes. Preserved all prior dirty feature work and untracked .github/, cd, eas.
