# Stop stories and floating journey actions

Implemented 2026-10-12 for Prompt 35, preserving the existing main Journey Story layout.

## Changed files

- src/components/journey/stop-story-viewer.tsx: fullscreen manual viewer with shared stop selection, segmented progress, left/right tap areas, horizontal image-area gestures, accessible previous/next controls, photo fallbacks, rating, and a scrollable full-description reader. End controls are disabled; there is no auto-advance or wraparound. Destination uses the existing journey destination because the stop model has no separate location label.
- src/app/journey/[id].tsx: integrates the viewer with the existing map/carousel selection and replaces the normal footer with an absolutely positioned floating bar. Measured bottom clearance reserves content space within the existing safe-area container.
- src/components/journey/stop-timeline.tsx: thumbnail and card taps open the selected stop story through the existing parent handler. Carousel scrolling retains its selection behavior.
- src/components/journey/journey-options.tsx: compact Use and Remix pill, 44px minimum targets, full accessibility labels/hints, subtle elevation, and compact error-details entry. Existing authentication, private-copy safeguards, and routing remain unchanged.
- tests/story-interaction.test.mjs: covers viewer selection/close synchronization, endpoint navigation, progress, swipe guards, one/empty-stop states, existing photo component reuse, description reading and back behavior.
- docs/journey-stop-stories.md: implementation and validation record.

## Validation

- npm run typecheck: passed.
- npm run lint: passed, no warnings.
- npm test: 146 passed, none failed.
- npx expo install --check: dependencies match the local Expo version map. Network validation was unavailable; Expo warned that offline validation is less reliable.
- npx expo-doctor: 21/21 checks passed.
- npx expo export --platform all --output-dir dist/story35: Android, iOS and web succeeded.
- Browser verification against existing public journeys: 320x568, 360x640, 390x844 and 412x915; no document overflow, floating targets at least 44px and within viewport. Verified thumbnail/card opening, next/previous and tap navigation, progress, full-description opening/closing, selection after close/refresh, Use map, signed-out Like/Save/Remix authentication routing, creator link, and sparse journey loading. No page errors. Additional browser checks passed for touch swipes in both directions and map-to-story navigation. Local response fixtures verified a single stop without photos/coordinates, disabled endpoints, and a 3,162px description scrolling inside a 306px reader on a 320x568 viewport. No production records were created.

## Native validation

No native rebuild is needed for these JavaScript/TypeScript changes. No dependencies, native configuration, backend, Home/globe or separate web-app files changed in this task. Use the existing Mapbox-enabled development build; Expo Go still cannot provide native Mapbox.

Physical Android/iOS testing remains necessary for native swipe/tap cancellation, modal/back behavior, safe-area and large text layouts, VoiceOver/TalkBack focus, native image loading and Mapbox marker/camera interaction. Native Share and authenticated Remix completion retain their existing implementation and were not exercised against a live signed-in account.
