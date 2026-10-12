# Journey Story cinematic map — Phase 2

The existing Story renderer now uses Home's Satellite Streets style and atmosphere constants, with the Phase 1 frameJourneyMap helper supplying its initial camera, globe/Mercator decision, and sampled spherical route geometry. Home's component, camera behavior and animation code are unchanged.

## Files changed in this phase

- src/components/journey/map/native-map.tsx: waits for a measured viewport before mounting Mapbox; frames valid stops and sampled curves; retains numbered/selected markers and expanded gestures/Fit Journey; adds white route halo and green planned-route line. Satellite loading errors/timeouts fall back to Outdoors, then the existing retry UI. Stale events from a replaced style are ignored. Reduce Motion removes camera animation. Limited Mercator overviews explain polar clipping or routes that cannot fit at minimum zoom.
- src/components/journey/map/journey-map.native.tsx: forwards the original stops to the renderer, preserves expand callbacks through fallback/boundary paths, and clears the loader timeout on rejection.
- src/app/journey/[id].tsx: mounts the preview only while no sheet/viewer is open. The expanded map replaces the preview; fullscreen stop stories and About mount no Story map. Closing restores the same selected stop.
- tests/story-interaction.test.mjs: tests measured camera setup, geometry/projection integration, marker order and highlighting, selection versus full-route fitting, resizing/padding, style errors and stale events, timeout cleanup, Reduce Motion, and sheet/viewer map mounting. The small hook harness now models memo dependencies and effect cleanup.
- docs/journey-story-cinematic-map.md: this report.

## Validation

- TypeScript: passed.
- Lint: passed with no warnings.
- Full tests: 165 passed, none failed. Includes the unchanged 14 Phase 1 camera tests and Home regression tests.
- Expo Doctor: 21/21 passed.
- Expo export --platform all --output-dir dist/story38: Android, iOS and web succeeded.
- Browser regression checks against existing public journeys: 320x568, 360x640, 390x844 and 412x915; no page errors or document overflow. Existing stop-viewer navigation/description reading, selection after close/refresh, Use, signed-out Like/Save/Remix routing, creator navigation, sparse data and floating action targets passed. Web intentionally retains its non-native map fallback; this does not verify native rendering.
- Protected-file hash comparison confirmed Home renderer/overlays/camera/geometry, Phase 1 helper, viewer, floating actions, dependencies and native configuration were unchanged.

## Limits and device checks

Native globe rendering has NOT been verified on a device. Android/iOS checks remain for satellite/atmosphere appearance, route and marker contrast/order, all-stop globe containment, antimeridian/polar overviews, ornament placement on short previews, native pan/pinch/rotation and selection, Fit Journey, style-loading recovery, Reduce Motion, and repeated preview/map/viewer/About transitions.

Phase 1 uses a Mercator fit model and a conservative globe-suitability policy. Polar coordinates outside Mercator's latitude range and routes too wide for minimum zoom remain explicitly reported limitations; every stop remains available in the story. Missing-coordinate gaps remain disconnected.

No new dependencies, native configuration, backend/data/auth changes, location permissions, photo annotations, idle rotation, plane playback or World reset were introduced. No native rebuild is required for this JS/TS update when using the existing Mapbox-enabled development build; Expo Go still uses a fallback.

Phase 3 focus/background lifecycle, cross-screen map resource ownership and physical-device memory/frame-rate profiling were not implemented. Home may remain resident in the navigation stack; gating Story's overlays does not prove global native resource release. Await approval before Phase 3.
