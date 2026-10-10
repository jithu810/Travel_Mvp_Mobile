# Prompt 32: map-first Home

Home (both / and /discover) now uses a native globe as its main surface, with a compact search entry, measured floating recent-journey rail, and Explore / Search / Create actions. Account remains in the header. The app previously used a Stack, not a shared bottom-tab navigator; this Home action bar retains existing route names and adds no navigation package. Public browsing remains independent of session restoration.

## Native capabilities

Inspected installed Expo 57.0.27, React Native 0.86.3, @rnmapbox/maps 10.3.7. Its package declares Android Mapbox 11.23.1 and iOS ~> 11.23.1. MapView.tsx and the Fabric spec expose projection: globe; Android RNMBXMapView/Manager apply ProjectionName.GLOBE, and iOS RNMBXMapView applies StyleProjection.globe. Home explicitly requests projection="globe" with Outdoors, a world camera, native pan/pinch/rotation and a reset control. This is the genuine native projection API, not a globe image or web renderer.

Physical rendering and gesture performance have NOT been verified on Android/iOS here: no connected device, adb or Android SDK was available. Hardware can still cause Mercator fallback; Mapbox documents this for devices with no vertex texture support. At close zoom the globe naturally becomes a local map. Web deliberately shows an honest fallback and never imports the native SDK. Expo Go, missing token, native-module failure, map failure, and a 20-second load timeout also retain search and journeys, with retry where useful.

Terrain was investigated independently: the wrapper exposes RasterDemSource/Terrain and Mapbox supports terrain alongside globe. It is intentionally not enabled: a world-scale discovery view gains little from local elevation and would add terrain tiles/rendering work. No custom 3D buildings are added. No native dependency or configuration changes were made.

References:
- https://rnmapbox.github.io/docs/examples/V10/GlobeProjection
- https://docs.mapbox.com/android/maps/examples/android-view/display-a-globe/
- https://docs.mapbox.com/android/maps/api/11.14.4/mapbox-maps-android/com.mapbox.maps.extension.style.projection.generated/-projection/

## Real discovery data

Home reuses loadPublicJourneys and its existing maximum-100 public RPC contract, recent order, signed photo resolution, refresh behavior and 24-at-a-time client reveal. Search is the existing search route with its bounded title/destination/stop/creator matching. No new backend contract, destination geocoder or bulk detail fetch was added.

The discovery card RPC does not provide stop coordinates (the card normalizer deliberately omits them). Locate therefore resolves exactly one explicitly selected journey using existing loadPublicJourney, including its published-card membership gate and anonymous public detail. Changing/clearing selection cancels stale work through useLoad. No initial detail requests or N+1 list requests occur. This means there are no invented global destination pins, and only the selected journey is mapped.

Markers use stored finite in-range longitude/latitude from detail, preserve creator stop order, and collapse exact coordinate duplicates. Symbol placement reduces label overlap. Missing coordinates produce an explicit unmapped message while the story remains accessible. Pressing a marker validates its journey ID against current plotted features and opens /journey/[id]; the card also opens that existing route. Refresh failures preserve the previous useful discovery data. Map data and open callback are memoized; native ornaments/reset and camera padding account for the measured rail.

## Validation (2026-10-09)

- TypeScript: passed.
- ESLint, zero warnings: passed.
- Automated tests: 85 passed, 0 failed. Four globe tests cover coordinates, ordering, deduplication, invalid/absent data, current-marker selection, world camera and native/web separation. Existing creation-entry assertion updated for the new accessible Create button.
- Expo Doctor: 21/21 passed.
- Android, iOS and web Expo exports: passed.
- Browser checks: public root Home and real recent data loaded; Locate resolved a real public journey; Search and Back navigated successfully. Small (360x640) and larger (412x915) phone-sized web fallback inspected. This does not validate native globe rendering.
- All four src/components/journey/map files compared by SHA256 before/after: unchanged.
- Auth/session providers, route registration, native config, dependencies, query contracts and backend were not modified.

## Manual Android verification

1. Use an existing development client containing the current project's native dependencies, including @rnmapbox/maps. Keep EXPO_PUBLIC_MAPBOX_TOKEN set to the existing public pk token; do not use a secret token.
2. Start Metro with npx expo start --dev-client and open the app. Confirm / opens Home immediately for signed-in and signed-out users.
3. Check an actual globe at world zoom, pinch/pan/rotate, World reset, readable labels, Mapbox logo/attribution, and rail/navigation on small and tall screens. Test on lower-end hardware as well.
4. Locate a journey with valid stored stops; check camera movement, markers and marker-to-Story navigation. Select quickly, clear, try an unmapped journey, refresh and simulate unavailable network.
5. Check Search, Account sign-in/sign-out, Create, Story's existing map/social/share actions, profiles and Remix/private drafts without creating production test records.

No new EAS development build is required by Prompt 32 if the installed client already matches current dependencies. Expo Go cannot host this native map. An older client lacking Mapbox (or the previous milestone's native modules) must be rebuilt for the existing dependencies; this prompt adds none.

Changed files: src/app/discover.tsx; src/lib/discovery/map.ts; src/components/discovery/globe/{discovery-globe.tsx,discovery-globe.native.tsx,native-globe.tsx,fallback.tsx}; tests/discovery-globe.test.mjs; tests/create.test.mjs; docs/mobile-map-first-home.md.

No commits, pushes, publishing, schema changes or later milestones.

## Prompt 32.1 refinement (2026-10-09)

The user confirmed that Prompt 32's native globe renders correctly on their Android phone. This refinement preserves that globe, Outdoors style, public token configuration, world camera and real-coordinate selection path. The supplied visual reference informs the dark globe / rounded content-panel composition; no reference branding, assets, personal profile content or statistics are copied.

Home now has an edge-to-edge navy map area, compact dark search, smaller branding/header and a cream bottom action bar. Status-bar text switches to light only while native Home is focused and restores on blur; web bypasses this native-only API. Bottom safe-area padding belongs to the action bar so Android system navigation remains outside the sheet and map.

### Space styling

Inspected the installed @rnmapbox/maps Atmosphere component, typed atmosphere properties and both Android/iOS native implementations. Added Mapbox.Atmosphere with navy spaceColor (#080F1E), pale-blue color, blue highColor, horizonBlend 0.04 and restrained starIntensity 0.12. This configures the native renderer's space/atmosphere effect; it is more than a React Native surrounding background. The container/loading/fallback surfaces also use navy. Outdoors remains unchanged; this is not satellite imagery or a photorealistic Earth asset.

The new atmospheric edge/stars are implemented but have NOT been visually verified on a physical device here. The user's earlier Android confirmation applies to the previous globe. Verify these additional renderer settings on Android before claiming an exact match to the reference. No terrain or buildings were added. World reset moved left to avoid the compass; logo and information controls remain above the measured sheet.

API references:
- https://rnmapbox.github.io/docs/examples/V10/TerrainSkyAtmosphere
- https://docs.mapbox.com/ios/maps/api/latest/documentation/mapboxmaps/atmosphere/
- Installed source: node_modules/@rnmapbox/maps/src/components/Atmosphere.tsx and src/utils/MapboxStyles.ts; Android RNMBXAtmosphere/RNMBXStyleFactory and iOS RNMBXAtmosphere/RNMBXStyle apply these properties.

### Discovery panel and cards

- Tap the 44-point accessible handle to expand/collapse. The handle has an explicit label and accessibility expanded state. There is deliberately no drag-to-resize behavior or added gesture library.
- Collapsed: compact horizontal recent-journey carousel. Expanded: vertically scrolling photo cards, description, status, retry, and the same Locate/Read story actions.
- Heights use the measured available map area, excluding header/navigation/safe areas. Normal collapsed height is 260; expansion leaves a 96-point exposed map band. Very short areas clamp gracefully and expansion never shrinks below the collapsed height. Widths are bounded for 360/412-point phones and larger screens.
- Scroll gestures belong to FlatList; there is no pan responder on the sheet, so scrolling cannot accidentally collapse it. Changing orientation remounts only the list; selection, revealed count and fetched data are retained. Toggle does not refetch public data or remount the native map.
- Map camera padding, reset and native ornaments use the measured panel height in either state. The exposed globe remains interactive.
- Cards use the existing PublicJourney cover URL, including resolvePhotos signed private-bucket URLs, title/destination, creatorName and journeyFacts (duration/stop count). Missing or failed images show a neutral arrow surface, never fabricated photography.
- The initial public query limit/order, 24-at-a-time reveal, refresh/error handling, public detail membership gate, coordinate validation and on-demand-only Locate requests remain in place. No card-detail fan-out or backend change.

### Validation

Final code checks: TypeScript and zero-warning ESLint passed; 89 automated tests passed (four additional panel/style tests). Expo Doctor passed 21/21. Android, iOS and web exports passed.

Browser verification at 360x640 and 412x915: collapsed carousel, expanded vertical list, real signed images, scrolling to a later journey without collapse, Locate, selection persistence after collapse, clear selection, and Read story route navigation. Web honestly shows the native-map fallback; these checks do not prove the new native atmosphere's appearance.

All four Journey Story map hashes match the pre-refinement values. Auth/session providers, route registration, backend queries, schema/RLS/RPCs, app.json, package.json and native dependencies were not edited. Repository source is still largely untracked from the existing baseline; review used targeted source inspection and Story hashes rather than a misleading empty tracked diff. Existing staged eas.json was left alone.

Changed files:
- src/app/discover.tsx
- src/components/discovery/discovery-panel.tsx (new)
- src/components/discovery/home-journey-card.tsx (new)
- src/lib/discovery/presentation.ts (new)
- src/components/discovery/globe/native-globe.tsx
- src/components/discovery/globe/discovery-globe.native.tsx
- src/components/discovery/globe/discovery-globe.tsx
- src/components/discovery/globe/fallback.tsx
- tests/discovery-panel.test.mjs (new)
- tests/discovery-globe.test.mjs (pagination assertion follows the extracted panel)
- docs/mobile-map-first-home.md

### Manual Android checks

Use the existing matching development client with npx expo start --dev-client; no new EAS build is required for this refinement. Confirm the new navy space, blue atmospheric edge and restrained stars; Outdoors land styling is intentionally retained. Test pan/pinch/rotate and World reset with both sheet states, compass/logo/information placement, safe-area/system navigation and large-font settings at small/tall sizes. Scroll the expanded list without collapsing; verify covers/fallback, Locate, clear, Story and Back, Search, Account, Create, and signed-in/signed-out restoration. Test offline/map failures without creating production records.

No commit, push, deployment, dependency installation or Prompt 33 work.

## Prompt 32.2: natural atmosphere, idle motion and precise Locate

### Atmosphere and surface style

Exact changes:
| Property | Before (32.1) | After (32.2) |
| --- | --- | --- |
| spaceColor | #080F1E | #080F1E |
| color | #B9D8F0 | #AEB9C5 |
| highColor | #3E78C7 | #334359 |
| horizonBlend | 0.04 | 0.008 |
| starIntensity | 0.12 | 0.015 |

The horizon blend is one fifth of its previous width setting, with a much darker, less saturated upper atmosphere and barely noticeable star intensity. Opaque colors avoid adding transparent-fog tile/render work. These are deliberate native Atmosphere settings intended to reduce the shiny blue halo; appearance on a physical device has NOT been verified here.

Inspected installed @rnmapbox/maps 10.3.7 (Android 11.23.1, iOS ~>11.23.1), its Camera, MapView, Atmosphere types and Android/iOS camera implementations. Existing Outdoors is retained, including land/ocean styling, so atmosphere changes can be judged independently. Installed StyleURL exposes Outdoors (outdoors-v11), Light (light-v10), Satellite (satellite-v9), and SatelliteStreet (satellite-streets-v11) among other styles. No surface colors or underlying style URLs were changed.

Mapbox Satellite would supply real raster imagery but remove base labels; Satellite Streets retains geographic context with imagery. Both need device evaluation for legibility, bandwidth/texture use, and consistency with journey markers. Light is quieter cartography, not realistic Earth imagery. Current Mapbox documentation favors Standard styles for new projects, with different configuration/dynamic features; switching is outside this focused refinement. No unverified imagery/style migration, new provider, paid API or dependency was introduced. Outdoors plus globe/atmosphere is not photorealistic satellite imagery.

References:
- https://docs.mapbox.com/ios/maps/api/latest/documentation/mapboxmaps/atmosphere/
- https://docs.mapbox.com/map-styles/guides/classic-styles/
- https://github.com/rnmapbox/maps/blob/main/docs/Camera.md
- https://github.com/rnmapbox/maps/blob/main/docs/MapView.md

### Idle motion

A small imperative controller drives supported Camera.setCamera linearTo animations: 0.4 degrees of longitude over 4 seconds, after 10 seconds of idle. It preserves current latitude, zoom, pitch and bearing and wraps longitude smoothly. It only runs at globe-scale zoom <=3; detailed local map views stay still. There are no per-frame React state updates or JS animation loops.

Native onCameraChanged supplies the current pose and gesture flag; touch start stops automatic motion immediately, and gesture/touch completion begins a fresh idle delay. A zero-duration ease replaces the automatic animator at the latest observed camera pose when pausing. Manual navigation never resets to a saved world snapshot. Native onMapIdle confirms each step's completion before another begins; stale idle events are rejected by target proximity. A 6-second watchdog stops and backs off if completion is lost. Generation guards prevent stale timer callbacks from issuing new commands.

Home focus, AppState, map readiness, Reduce Motion and selected journey state gate rotation. Selection pauses motion immediately while details are loading and for as long as a journey remains selected, including Locate transitions. Reduced-motion preference defaults to disabled auto motion until resolved; failure to read it remains conservative. Local zoom, background, focus loss, map failure and unmount clear pending work. Listeners and asynchronous preference callbacks are cleaned up. Programmatic camera transitions have an additional quiet period. Actual gesture/animation performance must still be checked on Android.

### Locate and camera fitting

The previous implementation always centered the first mapped stop at zoom 5. This caused the excessive Kerala/Tamil Nadu regional view.

- Multiple distinct valid stops now use the installed wrapper's native bounds path: Camera.setCamera({bounds, padding, heading:0, pitch:0, animationMode:'easeTo', animationDuration:900}). Android calls cameraForCoordinateBounds; iOS uses its camera-for-coordinates fitting path. The SDK derives zoom from the real bounds and viewport, not a fixed regional zoom.
- Nearby stops get tight geographic bounds. Widely separated stops retain their full extent. Native Camera limits remain min zoom 0 and max zoom 16; the world minimum permits genuinely broad journeys.
- A singleton or several exact identical coordinates gets local zoom 14 centered on the stored point, avoiding zero-sized bounds.
- The helper reuses existing hasCoordinates validation; no unknown coordinate is coerced, invented or written back. Existing ordered/deduplicated discoveryPoints are unchanged.
- Padding uses measured map dimensions, panel height, space for World/compass, and the logo/information row. Header, search, bottom action bar and safe areas sit outside the measured map area. Margins reduce on tiny viewports so padding never consumes the full area.
- Android's wrapper runs bounds corners through Turf.bbox, so wrapped corners alone cannot describe a narrow dateline crossing. For that special case the helper derives the shortest longitude arc, projected latitude extent and zoom from actual usable pixel dimensions, then sends a supported center/zoom camera command. It does not modify stored coordinates. Very broad/globe-spanning or polar routes remain subject to the native globe's visible-hemisphere/projection limits and require device evaluation.
- Expansion/collapse with a selected journey refits its bounds for the new visible area, never returning to the world. With no selection, panel changes update padding only, preserving the manual center/zoom/bearing.
- Tapping Locate again increments a camera request version, refocusing the same journey without refetching its public detail. New selection waits for that journey's own detail; stale/empty previous points do not trigger a world jump. Unmapped journeys leave the current camera usable and retain the existing message.
- Clearing selection retains the established return-to-world behavior. World reset and marker-to-Story navigation remain available.

Expanded panels leave only a narrow map band on small screens; the fitter necessarily chooses a lower zoom than collapsed mode to keep the same stops above the panel. Collapse the panel for more detail. This is a real viewport constraint, not a fixed country-scale zoom.

### Controls and preservation

Home explicitly sets scaleBarEnabled={false}; the installed MapView and native props support it. Compass is positioned at top/right 12 with north-facing fade. World stays left above the sheet, separate from the compass; logo and information controls stay 10 points above the measured panel. No logo shrink/removal, attribution suppression or Story map change.

Home's panel, scrolling, public query/normalization path, signed covers, creator/facts, routes and session providers remain intact. No changes to Supabase queries/contracts, schema/RLS, web project, package files, Expo config or native dependencies. The four Journey Story map SHA256 values remain identical to the earlier recorded baseline.

### Validation and manual Android work

- TypeScript: passed.
- ESLint, zero warnings: passed (a declaration-order lint finding during implementation was fixed).
- Automated tests: 101 passed, 0 failed; 12 additional tests cover camera bounds, local/single/invalid points, panel padding, dateline fitting, idle delay/native completion, gesture precedence, selected/background/blur/reduced-motion gates, watchdog/disposal and Home-only controls.
- Expo Doctor: 21/21 passed.
- Android, iOS and web exports: passed.
- No physical-device rendering, native camera-fit or animation test was performed by this agent. Existing user confirmation of the globe is preserved; it does not verify these new settings.
- No new browser UI/layout change was required; native globe behavior is not simulated by the web fallback.

Use the current matching development client with npx expo start --dev-client. No new EAS build is required. On Android:
1. Check the reduced halo/stars with the unchanged Outdoors globe and verify the kilometer ruler is absent.
2. Leave Home idle for 10 seconds; verify gentle motion. Touch/pan/pinch/rotate mid-motion, verify immediate priority and no return to the old view. Resume should wait until idle; local zoom and Reduce Motion should stay still.
3. Background/foreground and open Search/Account/Story to confirm motion stops offscreen. Repeat after longer idle periods to catch delayed callbacks.
4. Locate a real nearby-stop journey (such as Nedumangad/Palode), check all valid markers above the panel in both states, and compare the tighter local zoom. Check a wide journey, singleton, unmapped journey, rapid different selections and same-journey re-Locate after manual panning.
5. Verify clear selection, World reset, marker-to-Story, compass, native logo/information row and Android navigation safe area at 360x640 and 412x915 or equivalent devices. Confirm existing panel photos/scrolling and application navigation still work without creating production test records.

Changed files:
- src/app/discover.tsx
- src/components/discovery/globe/native-globe.tsx
- src/components/discovery/globe/discovery-globe.native.tsx
- src/components/discovery/globe/discovery-globe.tsx
- src/lib/discovery/presentation.ts
- src/lib/discovery/camera.ts (new)
- src/lib/discovery/idle-motion.ts (new)
- tests/discovery-camera-motion.test.mjs (new)
- docs/mobile-map-first-home.md

No commit, push, deployment, publishing or Prompt 33 work.

## Prompt 32.3 regression correction (2026-10-09)

### Trace and findings

Re-read Home, native loader/globe, coordinate extraction, fitting/controller helpers and tests, and inspected installed @rnmapbox/maps 10.3.7 Camera.tsx, Android CameraStop.kt/CameraUpdateItem.kt/RNMBXMapView.kt. Home resolves one selected public detail, filters real coordinates through the existing validator and preserves ordered markers. Selection and panel measurements feed the framing effect; no controlled center/zoom props override its imperative command. Camera limits remain 0–16 and Locate uses easeTo over 900 ms.

The ordinary multi-stop path sent only bounds, never an explicit zoom. Android CameraStop delegates to cameraForCoordinateBounds and copies its camera fields, including padding, over the builder. The SDK method accounts for current padding in addition to requested bounds padding, so fitting with an already padded Home can compound the sheet reservation. The prior tests explicitly accepted an undefined zoom and could not detect the reported orientation-only behavior. The actual SDK return on the user's phone cannot be captured here; this identifies the failing dependency/command path rather than claiming a measured SDK defect. SDK documentation: https://docs.mapbox.com/android/maps/api/11.19.0/mapbox-maps-android/com.mapbox.maps.plugin.delegates/-map-camera-manager-delegate/camera-for-coordinate-bounds.html . The exact 11.23.1 documentation endpoint was unavailable. Older 10.x globe limitations are not treated as proof of 11.23.1 behavior.

Idle completion previously required observed longitude within 0.02 degrees of target; rejected/missing completion triggered a cancellation and another ten-second delay. Its 0.4-degree step was also barely visible. Idle payloads were passed through gesture cancellation before clearing the gesture state. Android payloads use wasGestureActive, populated when events are built; delayed gesture/idle events must not be treated as proof of a current touch.

### Changes

All multi-stop Locate commands now include explicit centerCoordinate and zoomLevel, with no bounds command. The fit uses the shortest longitude arc (including dateline), midpoint of projected latitude extrema, and log2 of usable pixel extent divided by the coordinate extent at 512 pixels/world at zoom zero. Padding is sent once as camera padding. Invalid coordinates are excluded, singleton/identical locations use zoom 14, and multi-stop zoom is clamped to 0–16. No stored coordinates/order change. Extremely broad or polar routes still face a globe's hemisphere/projection limits.

Synthetic nearby points [77,8.6], [77.05,8.75], [77.02,8.68] center at approximately [77.025,8.675]. For a 360x484 map, collapsed panel 260 produces zoom about 9.7; expanded panel leaving 96 pixels produces about 8.2. Both are explicitly much closer than world zoom 0.8. Tests independently project the nearby markers and verify they lie within both padded visible rectangles. These are synthetic geometry fixtures, not claimed coordinates of a production journey.

Idle motion starts after ten seconds, then sends supported linearTo four-second animations advancing longitude by two degrees. The controller waits the animation duration plus 150 ms bridge margin and an 80 ms interval before the next step. It commits the target for advancement, avoiding repeated use of stale observed longitude; it no longer requires precise native idle coordinates or a completion event. This is duration-based sequencing, not a hardware acknowledgment. Idle events clear the historical gesture flag instead of canceling the auto animator. Current touch/camera gesture events retain priority. Epoch invalidation cancels old timers before selection/Locate; tests verify no old stop command cancels the new zoom. Selected journeys, local zoom, blur, background, reduced motion and disposal continue to prevent auto movement. No per-frame React state updates or diagnostic logs.

### Verification

- TypeScript and zero-warning lint passed.
- 104 automated tests passed, zero failures, including explicit nearby/wide/single/invalid/dateline fits, both panel visibility projections, rounded/missing idle events, repeated longitude advancement, touch/lifecycle interruption and Locate ownership.
- Expo Doctor: 21/21 passed.
- Android, iOS and web exports passed (`npx expo export --platform all`).
- Four Journey Story map SHA256 values match the previously recorded baseline.
- No Android hardware/emulator testing was available. Passing exports does not establish visible native success.

On the existing matching Android development client: reload Metro, Locate a nearby journey from world view with each panel state, check all markers and repeat Locate after manual panning; check singleton and wide journeys. Clear selection, reset World, wait ten seconds and watch for another 15–20 seconds; verify successive slow movement, then interrupt by touch, local zoom, background, navigation and Reduce Motion. A new native build is not required by these JavaScript-only changes.

Changed files: src/lib/discovery/camera.ts; src/lib/discovery/idle-motion.ts; src/components/discovery/globe/native-globe.tsx; tests/discovery-camera-motion.test.mjs; docs/mobile-map-first-home.md. Visual design, atmosphere, panel, data/contracts, routes, dependencies/config and Story map are unchanged. No commit, push, deployment or Prompt 33 work.

## Prompt 32.4 cinematic Locate replay (2026-10-09)

Inspected the current Home selection/version flow, camera fitter, idle controller and installed Camera.tsx animation API. Repeated Locate already increments locateVersion, but the old command always sent the same fitted camera; from that position there was little or no visible movement. The fit calculation itself remains unchanged.

Native Home now uses a small cancellable Locate transition helper. First Locate sends a supported flyTo lasting 1250 ms to the exact fitted center/zoom/padding. A repeated request for the same journey, when already near its fitted zoom, eases back one zoom level over 350 ms, then flies to the unchanged fitted target over 900 ms. This doubles the visible span briefly without zooming closer than the final local fit. At minimum zoom a bounded 0.6-level inward pulse returns to the complete wide fit. If the user has manually zoomed out substantially, re-Locate uses the direct 1250 ms approach. Panel refits do not request the replay pullback.

The helper cancels superseded timers with a generation guard. Touch/native gestures, World reset, selection/layout changes, Home blur, background and unmount cancel pending approach commands. This does not disable pan/pinch or replace native gesture handling. Existing selection gating keeps idle motion paused throughout Locate and until selection is cleared; the motion-controller logic is unchanged. All-stop fitting, real-coordinate validation, dateline handling, native markers/Story navigation, atmosphere and panel are unchanged.

Validation: TypeScript passed; lint passed with zero warnings; 109 tests passed, zero failed; Android/iOS/web exports passed. New tests exercise first approach, repeated all-stop/single/dateline transitions, exact final destination/padding, 1250 ms combined duration, rapid request replacement, stale callback cancellation, approach from manual world zoom and minimum-zoom replay. Four Journey Story map hashes still match the recorded baseline. No dependencies, native config, backend, web project or Story map changes.

No Android device was available to verify animation feel. Reload the existing matching development client and check first Locate, repeated Locate (including rapid taps), both panel states, single/multiple/wide journeys, pan/pinch during the pullback, World reset, and navigation/background during replay. Verify no delayed approach steals the camera and idle rotation remains disabled with a selection. No new native build is required for these JavaScript-only changes.

Changed files: src/components/discovery/globe/native-globe.tsx; src/lib/discovery/locate-transition.ts (new); tests/discovery-camera-motion.test.mjs; docs/mobile-map-first-home.md. No commit, push, deployment or Prompt 33 work.

## Prompt 32.5 full-world Locate sequence (2026-10-09)

Inspected the existing Locate helper, native Home, selected-detail loading and useLoad cancellation. Replaced the local pullback replay with the existing worldCamera settings: easeTo world over 800 ms, wait 200 ms, then flyTo the exact existing journey fit over 1350 ms (2350 ms total). Every explicit Locate request, including a different journey and repeated same-journey taps, uses this sequence once valid selected-journey detail is available. No coordinates or fitting logic were replaced. Both world and final commands retain measured panel padding.

The helper now registers a selection/request-version key before detail finishes loading. Registering B immediately invalidates A's pending callbacks; run rejects a request other than the active key. Native Home additionally retains the selected journey-ID check against plotted data, and useLoad already aborts/ignores superseded detail loaders. Cancellation marks the current request inactive, so late detail, layout changes or returning to Home cannot revive it; a new Locate version can start again. Touch/gesture, World reset, background, blur and unmount retain cancellation hooks. A foreground guard prevents camera commands starting from data arriving while backgrounded. Idle rotation remains disabled while selected, and pause covers the full sequence.

Panel-only refits do not create another explicit Locate. During the world exit/hold they update the pending final fit without skipping the hold or restarting its timer. Afterward they use a direct fitted transition. Selection/markers, invalid-coordinate handling, dateline fitting, navigation, native styling and World reset remain intact.

Validation: TypeScript passed; lint passed with zero warnings; 109 automated tests passed, zero failures; Android/iOS/web Expo exports passed. Revised helper tests cover exact world settings and 800/200/1350 ms timing, repeated Locate, A-to-B ownership, stale callbacks and late detail, cancellation during loading/hold, panel target updates, and exact single/dateline/wide-route destinations. Existing camera/idle tests continue to pass. Four Journey Story map hashes match the recorded baseline. No dependencies, native configuration, backend/database, web project or Story map changes.

Physical Android testing was unavailable and remains necessary: reload the existing matching development client, Locate A then B, repeat B, rapidly alternate journeys during loading/exit/hold/flight, and check whole-globe visibility before the final approach with both panel states. Interrupt during loading and the hold with touch, World, background and navigation; verify no delayed approach takes over and only a new Locate restarts it. Confirm marker-to-Story and idle gating. No new native build is required by this JavaScript-only change.

Changed files: src/lib/discovery/locate-transition.ts; src/components/discovery/globe/native-globe.tsx; tests/discovery-camera-motion.test.mjs; docs/mobile-map-first-home.md. No commit, push, deployment or Prompt 33 work.
