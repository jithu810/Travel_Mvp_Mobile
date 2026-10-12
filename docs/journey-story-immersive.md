# Prompt 34 — Immersive, single-screen Journey Story

Implemented in D:\Travel_Mvp_Mobile on 2026-10-11. This supersedes the vertically scrolling Story composition described in journey-story-polish.md.

## Result

The existing Journey Story route now fits a phone-height composition without a main vertical ScrollView: scenic cover with back/About controls and title/destination; compact creator and Like/Save/Share row; shallow native map preview; connected circular photo stops; snapping horizontal photo cards with neighbouring-card peek; and fixed Use/Remix actions. Cream, forest green and olive styling remains consistent. Smaller screens shrink the cover/map and simplify the card caption; full notes and creator ratings stay accessible in the stop sheet. Narrow phones or larger font scales stack the two actions.

SafeAreaView supplies usable bounds. Layout measures the main content, controls and footer before allocating decorative height, with the stop area consuming the remainder. Long titles/excerpts have bounded previews and their full content remains available in sheets. About contains full journey description, existing snapshot, metadata, action explanations and the retained refresh control. Loading/unavailable states and recoverable refresh errors remain supported. Long action feedback is contained in sheets.

Thumbnail taps, snapping/swiping and marker selection share one selected stop ID. Selection recovers to the first remaining stop when refreshed data removes a selection, and empty itineraries have no invented selection. Native momentum handlers and a debounced idle-scroll fallback support drags without momentum events and browser/trackpad scrolling. Repeated selection events are ignored. Vertical scroll-offset synchronization was removed.

The expanded map opens from the preview or Use This Journey. It reuses existing Mapbox Outdoors rendering, planned geometry, numbered markers, Fit Journey, loading deadlines, retry handling and attribution. Initial display fits the full route; later selections can center the selected marker. Map selection updates the stop information below the map and the underlying carousel. Closing preserves the selected stop. Preview is unmounted while the expanded map is mounted, avoiding simultaneous native maps. Missing-coordinate stops remain browsable and explicitly identify their missing coordinates in map details. Web/Expo Go retain the honest native-map fallback.

Use remains public and read-only, opening the original route/stops. Remix retains existing authentication intents, copy guards and private-draft navigation. Like/Save authentication and Share behavior reuse their original handlers. Creator navigation uses the existing validated profile route. The private draft screen continues using the vertical timeline presentation in the shared stop component; no draft route was edited.

No dependency, package/lockfile, native configuration, backend/schema/RPC/storage/authentication, Home/globe or separate web-project changes were made. Existing unrelated discovery changes were left intact. No production records were created or modified. Nothing was committed, pushed or deployed.

## Files changed for this task

| File | Purpose |
| --- | --- |
| src/app/journey/[id].tsx | Bounded composition, shared selection, map/About/stop panels, retained refresh |
| src/components/journey/story-header.tsx | Scenic bounded cover, readable title overlay, back/About controls and compact creator link |
| src/components/journey/stop-timeline.tsx | Horizontal circular thumbnails and snapping carousel; retains default draft timeline presentation |
| src/components/journey/social-actions.tsx | Compact presentation and contained feedback using existing social/auth/share handlers |
| src/components/journey/journey-options.tsx | Fixed responsive Use/Remix controls and contained error details; original action handlers retained |
| src/components/journey/story-sheet.tsx (new) | Reusable modal with safe area, Close/hardware-back handling and optional contained scrolling |
| src/components/journey/map/map-frame.tsx | Preview/expanded sizing and compact fallback presentation |
| src/components/journey/map/journey-map.native.tsx | Passes display/selection props through guarded native loader and boundary |
| src/components/journey/map/native-map.tsx | Preview/expanded native viewport sizing, fitting/selection and preview expansion |
| src/components/journey/map/journey-map.tsx | Keeps browser fallback isolated from native imports while matching display props |
| src/components/discovery/journey-photo.tsx | Optional fill/thumbnail rendering; existing default photo handling retained |
| src/lib/journey/story-layout.ts (new) | Pure layout budgeting, valid selection recovery and scroll-index helpers |
| tests/story-interaction.test.mjs | Runtime handler tests for shared selection, modal close, carousel snapping/idle scrolling, duplicate guards, native props and sparse stops |
| tests/map.test.mjs | Updated Story composition expectations for bounded carousel and expanded map |
| tests/auth-remix.test.mjs | Updated Use navigation expectation from map scrolling to map popup; existing auth/private-copy checks retained |
| docs/journey-story-immersive.md (new) | This implementation and validation report |

StorySnapshot/story-extras, map geometry, loaders, service functions, Supabase contracts, auth/session/intent hooks and profile routes were reused. story-extras.tsx already had uncommitted changes from the preceding polish task; this task did not edit it.

## Validation

- npm run typecheck: passed.
- npm run lint: passed.
- npm test: 145/145 passed. Interaction tests exercise component handlers with native elements/hooks stubbed; they are not a native rendering test.
- npx expo install --check: dependencies up to date.
- npx expo-doctor: 21/21 passed.
- npx expo export --platform all --output-dir dist/story-immersive: final Android and iOS Hermes bundles plus web bundle exported successfully.
- Scoped git diff --check: passed.
- Reviewed hooks, controlled selection, effect cleanup, image fallbacks, touch targets and native lazy loading against the React best-practices skill.

Real public journeys were verified anonymously using existing data. Browser automation initially failed to initialize; the already-bundled Playwright and installed headless Chrome provided the successful browser checks without adding dependencies.

At 320x568, 360x640, 390x844 and 412x915, document dimensions match the viewport with no page overflow. Both actions stay within the viewport and are at least 50 points high. At 320x568, stacked actions finish at y=562; at 390x844, both finish at y=838. Checks passed for thumbnail-to-carousel selection, horizontal trackpad scrolling updating selection, map opening/closing with selection retained, full stop details, refresh preserving selection, signed-out Like/Save/Remix opening the existing auth screen and returning, creator profile navigation, a second sparse real journey, and image request failures falling back to usable cards. No browser runtime errors were observed in the final flow. Browser snapshots show the native-map fallback, not simulated Mapbox tiles.

Local preview: http://localhost:8088/journey/6e7ff26d-ca68-46d0-8fdc-fa4cd5f55419

Ignored verification artifacts are under .expo/: story-320-final.png, story-360-final.png, story-390-final.png, story-412-final.png, story-sparse-final.png, story-photo-failure.png, story-immersive-tests.log, story-immersive-export.log and story-immersive-browser.log. Final exports are under ignored dist/story-immersive.

## Native rebuild and remaining device checks

No native rebuild is required by these JavaScript/UI changes. Interactive Mapbox still requires the existing Mapbox-enabled development client; Expo Go cannot render that native module. Exports validate JavaScript bundles, not native compilation.

Physical-device tests were not performed. Verify iOS/Android native tile rendering and modal camera sizing, marker hit testing, Fit Journey, pan/pinch/rotation, touch-carousel snapping, safe areas, larger system text, screen-reader modal focus, native Share, and authenticated Like/Save/Remix return behavior. Signed-in production mutations were deliberately not performed during verification. Native device behavior is not proven by browser checks or stubbed handler tests.
