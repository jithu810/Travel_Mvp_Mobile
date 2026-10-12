# Prompt 33 — Journey Story UI polish

Implemented in D:\Travel_Mvp_Mobile on 2026-10-11.

The existing Journey Story route and components were improved in place. The cream, forest-green and olive design direction remains consistent. The header has a taller cover, clear title/destination hierarchy, compact metadata chips and a single creator profile card. The snapshot and journey actions have distinct surfaces. Social controls have consistent sizing and wrap on narrow screens. Stops use numbered connected cards, larger day labels, fixed-ratio photos and selected styling; missing optional content is omitted and an empty itinerary has explicit copy. The route now has a Story-specific loading skeleton; refresh and error handling remain intact.

The native Mapbox viewport is 310 points tall, with a larger rounded frame and readable caption. Fit Journey is positioned away from the compass. Existing Outdoors tiles, geometry, stop numbering, missing-coordinate line breaks, attribution, gesture settings, fit behavior, guarded loading and retry fallbacks remain intact.

Selection is shared between Story and the existing map. A marker tap highlights its stop and scrolls to the measured timeline row. Show on map selects the same marker, centers the camera and returns to the map. Coordinate-less stops remain readable without a map link. Selection updates do not remount the native map.

Use This Journey still scrolls to the public map without authentication or mutation. Remix retains existing sign-in, pending-intent, private-copy and draft navigation behavior. Like/Save/Share and creator profile navigation retain their existing hooks and handlers. No backend, schema, RPC, storage, auth, dependency, native configuration, Home/globe or separate web-project changes were made. Pre-existing discovery changes in this checkout were left intact. Nothing was committed, pushed or deployed.

## Files changed for this task

- src/app/journey/[id].tsx
- src/components/journey/story-header.tsx
- src/components/journey/stop-timeline.tsx
- src/components/journey/story-extras.tsx
- src/components/journey/social-actions.tsx
- src/components/journey/journey-options.tsx
- src/components/journey/map/map-frame.tsx
- src/components/journey/map/journey-map.tsx
- src/components/journey/map/journey-map.native.tsx
- src/components/journey/map/native-map.tsx
- tests/story-interaction.test.mjs (new)
- docs/journey-story-polish.md (new)

## Validation

- npm run typecheck: passed.
- npm run lint: passed. An intermediate run scanned the temporary dist-story-polish export; that task-generated output was removed and lint passed again. Final exports are under ignored dist/story-polish.
- npm test: 142/142 passed, including two new component event-handler tests covering measured map/story scrolling, unchanged Use behavior, highlighting and rejection of unknown marker events. The harness stubs native elements and hooks; it does not prove native rendering or gestures.
- npx expo install --check: dependencies up to date.
- npx expo-doctor: 21/21 passed.
- npx expo export --platform all --output-dir dist/story-polish: Android and iOS Hermes bundles plus web bundle exported successfully.
- Reviewed React hooks, selection props, touch targets, wrapping and preservation of guarded native loading against the React best-practices skill.

No native rebuild is required by these JavaScript/style changes. Interactive Mapbox still needs the existing Mapbox-enabled development client; Expo Go and browser retain the existing fallback. Exports are JavaScript bundle checks, not native compilation.

Browser inspection could not start because the browser automation kernel exited unexpectedly; shell sandbox initialization also failed, so scoped shell operations used approved escalation. No visual browser or physical-device verification is claimed. On the existing iOS/Android client, field-test marker-to-stop scrolling, stop-to-map camera centering, Fit Journey, pan/pinch/rotation inside the ScrollView, long titles/text scaling, image loading/failure, refresh, signed-out Like/Save/Remix returns, native Share and creator-profile/back navigation. No production writes were performed for validation.
