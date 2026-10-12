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

## Prompt 32.6 draggable sheet and living Earth (2026-10-11)

### Reference comparison and supported native capabilities

Compared both supplied screenshots. Polarsteps uses photographic land/ocean imagery, dark space, blue atmospheric edging and small visible stars; Journey Creator currently shows Outdoors vector land/ocean fills and a pale halo. The panel/card/header/navigation content and style in our screenshot are retained. No reference branding or proprietary imagery was copied.

Installed @rnmapbox/maps is 10.3.7, declaring native SDK 11.23.1. Inspected Mapbox.native.ts, MapView.tsx and Android RNMBXMapView style/projection, feature reattachment and ornament implementation. The wrapper exposes Satellite and SatelliteStreet enums, atmosphere, globe and logo/attribution positioning, but no logo sizing/scaling prop. Official Mapbox examples demonstrate satellite styles with globe/atmosphere. Standard Satellite is supported by the native SDK, but Satellite Streets is already exposed by this wrapper, includes geographic labels and avoids introducing Standard import/slot/3D configuration. Chosen SatelliteStreet (satellite-streets-v11), retaining existing CircleLayer/SymbolLayer overlays and no terrain/buildings.

References:
- https://docs.mapbox.com/android/maps/examples/animate-map-camera/ (Satellite Streets, globe and atmosphere)
- https://docs.mapbox.com/android/maps/examples/android-view/display-a-globe/ (Standard Satellite comparison)
- https://docs.mapbox.com/android/maps/examples/create-a-rotating-globe/ (native camera interpolation and gesture priority)
- https://reactnative.dev/docs/panresponder and https://reactnative.dev/docs/animations (built-in responder and animation APIs)

### Sheet interaction and camera coordination

Added a hook using existing React Native PanResponder and Animated.spring, without a new dependency. The handle follows vertical movement, clamps to the existing height limits, and snaps using release velocity or the nearest midpoint. The original tap toggle remains accessible. Content-edge capture claims an upward vertical gesture in the collapsed carousel, or a downward vertical gesture that starts and remains at the expanded list's top. Horizontal swipes, upward expanded scrolling, multi-touch and gestures starting deeper in the list are left to content. Android native gesture arbitration still needs device testing.

All panel style declarations, card styles/photos/buttons/metadata, heading/Refresh and bottom actions are unchanged. Both existing list orientations now stay mounted with stable identities and only the active list is displayed. This retains list state/offsets during Locate and avoids the previous toggle remount. It costs a second retained virtualized list; no new journey query, automatic list scrolling or data contract was added.

Animated height uses the JS driver because layout height is unsupported by the native animation driver. It does not set React state each frame. Only settled height (or an actual viewport/orientation change) reaches Home's camera padding; mode changes only on snap completion. Existing measured map bounds and bottom safe areas are retained. Sheet touch/drag/settle activity blocks idle motion, without canceling a selected Locate. A refit during the world exit updates its pending target; during the journey flight it is queued until the current approach completes, then applies the latest fit without replaying the world sequence. Existing 800/200/1350 ms world-to-journey transitions and latest-request/cancellation guards remain in use. User globe gestures/World/background/blur/unmount still cancel pending camera work.

The React checklist was applied to stable listeners, cleanup, transient refs, accessible controls and bounded effects. A narrowly scoped react-hooks/refs suppression documents a false positive around PanResponder.create: it registers callbacks containing event-time ref reads; none of those callbacks executes during render. Other lint checks remain enabled.

### Earth appearance, branding and idle motion

Home starts with Satellite Streets. A style/load error or a 20-second load timeout switches once to Outdoors on the same MapView, keeping native camera/selection/source definitions; failure there uses the existing graceful journey/search fallback. Retry recreates the native loader. Style failure cancels pending Locate and automatic motion; a new explicit Locate can resume once a style loads. No production diagnostics were added.

Atmosphere retains #080F1E space, with blue #669CC4 lower atmosphere, #17364F upper atmosphere, horizon blend 0.015 and star intensity 0.06. These settings and satellite tile/marker readability require hardware evaluation, not just compilation. Satellite imagery adds raster tile/network work compared with Outdoors; no terrain or extra 3D rendering was added.

Required native logo and attribution stay enabled and unscaled. Moved them into the exposed map's top band (logo top/left 12; attribution top 12/right 56, beside the existing compass at right 12). This keeps them above the sheet throughout dragging without continuous ornament/padding updates or cropping. The existing World button remains in its established position above the settled sheet. Native logo size cannot be reduced through the installed wrapper's supported API.

Idle reuses the existing controller: ten-second delay, two-degree longitude steps over four seconds with native linearTo. Reduced the inter-step guard from 230 ms total to 50 ms and eliminated the extra scheduled gap, for near-continuous slow movement. One bounded timer is pending at a time; no per-frame React camera state updates. Sheet interactions join existing selected/local-zoom/touch/gesture/focus/background/reduced-motion/map-ready gates. Cancellation invalidates timers before competing commands.

### Actual validation and remaining Android checks

- TypeScript passed.
- ESLint passed with zero warnings after resolving callback-registration lint findings.
- 117 automated tests passed, zero failures. New coverage includes actual sheet-hook callbacks with deterministic Animated/PanResponder doubles (drag, release, tap, settle-only padding, scroll-edge arbitration, listener/animation cleanup), pure geometry/snap/layout thresholds, style fallback progression, visible branding positions, sheet idle gating and deferred refits during Locate. These doubles do not verify Android's native touch dispatcher.
- Expo Doctor: 21/21 passed.
- Android, iOS and web exports passed (`npx expo export --platform all`).
- git diff --check passed; four Journey Story map hashes match the recorded baseline. No backend/auth/routes/query contracts, web application, package/configuration or native dependencies changed.
- No Android hardware/emulator test was performed; adb was unavailable on PATH. No claim of verified device visuals, animation smoothness, satellite rendering or native scroll arbitration.

On the existing matching development client: drag the handle slowly/quickly both ways, release at different heights, tap toggle and rotate the phone; test horizontal carousel versus expanded-list scrolling, including downward drags from its top and drags reaching the top from deeper content. Locate without list scrolling, preserve selection and list offsets, change panel size during each transition stage, rapidly switch journeys and interrupt with a globe gesture/World/background/navigation. Clear selection, wait ten seconds and observe gentle motion, then interrupt it; verify local zoom, Reduce Motion and offscreen cleanup. Inspect satellite imagery, labels/markers/halo/stars and unoccluded branding at 360x640 and 412x915 or equivalent sizes. Exercise satellite-to-Outdoors and final fallback/retry under network/style failure and evaluate lower-end hardware performance. These JavaScript-only changes require no new native build.

Changed files:
- src/app/discover.tsx
- src/components/discovery/discovery-panel.tsx
- src/components/discovery/globe/discovery-globe.native.tsx
- src/components/discovery/globe/discovery-globe.tsx
- src/components/discovery/globe/native-globe.tsx
- src/hooks/use-discovery-sheet.ts (new)
- src/lib/discovery/sheet.ts (new)
- src/lib/discovery/globe-style.ts (new)
- src/lib/discovery/presentation.ts
- src/lib/discovery/idle-motion.ts
- src/lib/discovery/locate-transition.ts
- tests/discovery-panel.test.mjs
- tests/discovery-camera-motion.test.mjs
- docs/mobile-map-first-home.md

No commit, push, deployment or Prompt 33 work.


## Prompt 32.7 motion, country labels, stars and sheet range (2026-10-11)

Compared the supplied current satellite globe screenshot with the earlier Polarsteps reference. The photographic Earth is retained; this change does not redesign the header, cards, panel content or bottom actions. Inspected Home's measured exploration layout, panel, sheet hook/helpers, native camera integration, idle controller, Locate controller, tests and installed @rnmapbox/maps 10.3.7 JS/Android/iOS implementation.

### Exact changes and diagnosis

- Rotation: 2 degrees per 4000 ms becomes 5 degrees per 4000 ms using the existing native linearTo controller: 1.25 degrees/sec during animation, approximately 1.235 degrees/sec including its existing 50 ms bridge margin. Ten-second idle delay, one bounded timer, longitude wrapping, pose preservation and all interaction/lifecycle/camera-ownership gates remain. No per-frame React updates or additional camera controller.
- Country labels: fetched the actual SatelliteStreet enum's satellite-streets-v11 style definition using the existing public token (no token included in diagnostics). Its country-label symbol exists on composite/place_label, country filter, default visible, minzoom 1/maxzoom 10, English/native-name fallback, DIN Offc Pro Medium/Arial Unicode MS Regular fonts, configured glyph URL, rank-based sizes 11/9/8 at low zoom and white text/dark halo. Home worldCamera.zoomLevel is 0.8: the original layer is excluded at that zoom, independently of collision. The hosted style definition confirms this cause; it does not prove the phone's current loaded style or glyph requests. There is no verified evidence of an unexpected Outdoors fallback, projection failure or missing fonts on hardware.
- The installed Android RNMBXLayer.addToMap attaches an existing layer without applying initial zoom bounds (applyZoomBounds occurs on insertion). Avoid relying on an existing-layer minZoom override. Added one supported SymbolLayer, discovery-world-countries, on the same composite/place_label source for zoom [0,1), filtered to class=country; no country names/data/source requests/geocoding hard-coded. It uses the original font/name fallback, restrained rank-based 11/10/9-point sizes, white text/dark halo, and retains collision/placement constraints. At zoom 1 the supplement stops and the unmodified style's original country labels take over, avoiding duplication and retaining intermediate zoom behavior. It mounts only after map readiness and only on Satellite Streets; existing Outdoors/failure/retry behavior and journey markers remain.
- Stars: installed RNMBXStyleFactory directly forwards starIntensity to native atmosphere; native SDK 11.23.1 supports it with globe, including satellite styles. Increased 0.06 to 0.18; navy #080F1E, atmospheric blue colors and horizonBlend 0.015 are unchanged. API support is verified; actual star rendering/visibility on the user's phone is NOT verified. No custom star assets, terrain or rendering dependencies.
- Sheet: let H be the measured exploration height after actual header/search, bottom action bar, top/side safe areas and bottom safe-area layout. Previously C=min(260,0.62H), E=max(C,H-96), drag range [C,E], midpoint/velocity collapsed-or-expanded snap. New bottom snap P=min(44,C), drag range [P,E], with unchanged collapsed C and expanded E. Example H=484: previous range 260–388; new range 44–388, retaining 260. The complete existing 44-point handle remains exposed on normal screens; tiny measured areas clamp within H. A 160 ms release-velocity projection chooses the nearest of peek/collapsed/expanded; the existing clamped spring is retained. Tap from peek restores collapsed content; collapsed/expanded tap behavior remains. Cards/content are clipped while peeked and become fully available again by handle drag/tap, without restyling. Orientation changes cancel pending springs and recalculate the established snap using the updated measured area.
- Collapsed content can now claim downward vertical drags to reach peek. Horizontal carousel movement and expanded-list normal/deeper scrolling keep the previous arbitration; downward expanded drags require starting and remaining at the top. Both lists stay mounted to preserve offsets. Settled height alone updates camera padding; selected journey and the existing 800/200/1350 ms Locate sequence and deferred refits are preserved. Sheet movement does not cancel Locate.

Official supporting references:
- https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/ — place_label available from zoom 0, country points and symbolrank.
- https://rnmapbox.github.io/docs/components/SymbolLayer — supported source/layer/zoom/style props; installed implementation was checked separately.
- https://docs.mapbox.com/android/maps/api/11.7.3/mapbox-maps-android/com.mapbox.maps.extension.style.atmosphere.generated/-atmosphere-dsl-receiver/star-intensity.html — native star intensity range/behavior.
- https://docs.mapbox.com/android/maps/examples/animate-map-camera/ — satellite globe/atmosphere/camera support.

### Validation and device boundary

TypeScript passed; ESLint passed with zero warnings; complete automated suite passed 121/121 (36 focused camera/sheet/style tests). Added rotation-rate/dateline/repeated-step/stale-callback interruption tests, world-label scope/fallback guards, handle-only peek/tap recovery, measured safe-viewport bounds and peek camera-fit coverage. Pure helpers and deterministic RN doubles do not verify native rendering or Android's touch dispatcher.

Expo Doctor passed 21/21. Android, iOS and web exports passed via npx expo export --platform all --output-dir .expo/prompt32-7-export. Export emitted only NO_COLOR/FORCE_COLOR environment warnings. git diff --check passed; all four recorded Journey Story map hashes still match. No package/native configuration, routes, authentication, query contracts, backend/database or web-project changes.

No physical Android or emulator test was performed (adb unavailable on PATH). On the existing matching development client, reload and check: world labels at 0.8 and handoff through zoom 1/intermediate zooms without overlaps/duplicates; glyph availability and actual Satellite Streets load versus Outdoors fallback; visible subtle stars and restrained edge on different screen brightnesses; rotation after ten idle seconds over several steps/dateline, with immediate gesture/Locate/World/selection/reduced-motion/background/blur interruption and no stale takeover. Drag to 44-point peek, collapsed and expanded at slow/fast velocities; tap to recover, rotate device and test small screen/system navigation, horizontal carousel and vertical list/top-edge arbitration. Preserve offsets/selection and Locate fitting through every snap and transition stage; verify markers, logo, attribution, style failure/retry and performance. These remain hardware requirements, not automated successes. JavaScript-only changes require no native dependency rebuild.

Files changed in this prompt (prior Prompt 32.6 work remains uncommitted):
- src/lib/discovery/idle-motion.ts
- src/lib/discovery/presentation.ts
- src/lib/discovery/globe-style.ts
- src/lib/discovery/sheet.ts
- src/hooks/use-discovery-sheet.ts
- src/components/discovery/globe/native-globe.tsx
- tests/discovery-camera-motion.test.mjs
- tests/discovery-panel.test.mjs
- docs/mobile-map-first-home.md

No commit, push, deployment or Prompt 33 work.


## Prompt 32.8 immediate startup and persistent world-country labels (2026-10-11)

### Confirmed causes, inspection and focused changes

Traced Home mounting, the native loader/token setup, native style/map readiness callbacks, measured camera/padding effect, native camera observations, reduced-motion resolution and the idle controller. In 32.7, eligible observations/configuration called schedule() with a 10000 ms default. Initial framing also called pause(locateDuration), requesting 10000+900 ms when already eligible. If the first pose arrived afterward, the old pause could be discarded and observe would schedule another 10000 ms delay. Readiness/focus/valid-pose/reduced-motion gates are necessary startup prerequisites, but the deliberate ten-second scheduling policy explains the post-ready stillness. This is a code-path diagnosis, not an on-device startup performance measurement; no evidence was found to attribute it to React performance.

The controller now defaults its first eligible schedule to zero delay. Initial framing still reserves its existing 900 ms camera animation; a bounded camera-transition hold remains valid across readiness/pose updates, including when no pose exists at pause time. After that hold, rotation begins without an added ten-second wait once all safety gates are satisfied. First startup still requires a valid native pose, ready map, focused/active Home, resolved reduced-motion preference and no selection/interaction/local zoom. Selection or manual gestures before the first step revoke the immediate-start privilege. Later user-interaction recovery retains the ten-second delay. Existing five-degree eastward steps/4000 ms linearTo, 50 ms bridge margin, longitude wrapping, pose preservation, single timer/generation guards and cancellation remain; no per-frame React state, extra controller or startup-readiness bypass. World/Locate remain intentional camera owners; superseded holds/timers cannot issue stale commands.

Inspected actual Satellite Streets v11 style, composite source metadata, glyph response and compressed vector tiles (read-only diagnostics, existing public token not printed or saved). Confirmed:
- composite is mapbox.mapbox-streets-v8, source zoom 0–16. place_label metadata reports minzoom 0, which alone did not establish actual tile content.
- Actual 0/0/0 tile contains admin/natural_label/water, with NO place_label layer.
- Actual zoom-1 tiles contain country points: inspected northern tiles each had 192 place features, including 106 class=country entries with ranks 2/3. Repeated/worldview/buffer entries are not a count of distinct visible countries. Zoom-2 data also contains country points.
- Original country-label remains visible by default, country filter, minzoom 1/maxzoom 10, name_en/name fallback, DIN/Arial Unicode fonts, white text/dark halo. Configured Latin glyph endpoint returned successfully (72149 bytes); this checks hosted font availability, not the phone's glyph requests.
- 32.7 supplement had min 0/max 1, point-placement/default-visible styling, class=country, sizes 9–11 and collisions enabled. Its narrow layer range excluded zoom-1+ symbol layout, even though actual country points are found in those tiles rather than zoom zero. This is why merely lowering the layer minimum was insufficient. Exact native loaded-layer/bucket state cannot be inspected on a physical phone here; the data/range mismatch is confirmed and native rendering remains a device check.

Kept the same composite/place_label source and existing layer ID. Changed the supplement's parsing range to [0,10), allowing the globe's higher-zoom tile buckets to carry country symbols. Visible text range remains [0,1): textOpacity=['step',['zoom'],1,1,0] shows the supplement at initial 0.8 and hides it at 1, where the original style labels take over. It is inserted below country-label so original country labels retain collision priority. No new source, runtime API calls, data cache, geocoder, bundled country list or fabricated coordinates. Existing globe tile loading supplies the points.

Explicit visibility=visible and symbolPlacement=point, country filter plus symbolrank<=3, symbolrank sort priority, 13-point text, restrained white/dark 1.5-point halo, map pitch/rotation alignment and alternative center/top/bottom/left/right anchors with small radial offset improve readability and placement. textAllowOverlap=false/textIgnorePlacement=false retain collision-aware layout. The rank/size/placement choices aim for roughly 10–12 recognizable geographically distributed names where the visible hemisphere, data and space allow; this is not a guaranteed count or a verified Android result. Labels are real source points anchored through the native globe projection. Satellite imagery, navy space/stars/atmosphere, required branding, journey markers and style fallback are unchanged. The layer remains gated on ready Satellite Streets; no inference of unexpected Outdoors fallback was made.

References checked (native implementation was inspected separately):
- https://docs.mapbox.com/style-spec/reference/layers/ — symbol layout, zoom bounds, text opacity and collision/anchor properties.
- https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/ — place_label fields, country class, rank and source data.
- https://github.com/mapbox/mapbox-gl-js/blob/main/src/source/worker_tile.ts — primary Mapbox implementation excludes tile buckets at/above layer maxzoom (native rendering still requires Android verification).
- https://rnmapbox.github.io/docs/components/SymbolLayer — supported wrapper props.

### Actual validation and delivery boundary

TypeScript and ESLint passed. Full automated suite: 124 passed, zero failures (39 focused camera/sheet/style checks). Added immediate valid-pose startup, map/readiness/reduced-motion gates, pre-first-step gesture recovery, initial camera hold before a pose and through pose/readiness updates, and later recovery timing. Existing interruption, stale callbacks, latest Locate, lifecycle, dateline, panel and fit checks pass. Updated label range/opacity/filter/visibility/placement/priority assertions; these do not emulate native glyph rasterization or count visible labels.

Expo Doctor passed 21/21. Android/iOS/web exports passed using npx expo export --platform all --output-dir .expo/prompt32-8-export. Only environment NO_COLOR/FORCE_COLOR warnings were emitted. git diff --check passed; all four protected Journey Story map hashes match the recorded baseline. No sheet behavior/snap/card changes, data/queries/auth/routes, dependencies/native config, backend or web-project changes. Previous uncommitted work is preserved.

Physical Android verification has NOT been performed. Reload the existing matching development client and check immediate motion after actual map/initial-camera readiness (including slow tile/font loading), no snap or repeated restarts, continuous eastward motion, gesture/World/Locate/selection/background/blur/reduced-motion interruption and safe recovery. At zoom 0.8, verify real country names appear, remain geographically anchored during rotation, and roughly 10–12 fit the visible hemisphere with readable contrast. Zoom through 1 both ways to check handoff/no duplicates/no invisible-label collision suppression, and inspect intermediate labels and journey markers. Test collapsed/peek/expanded views without changing selection or list offset, rapid Locate and fallback under style/network failure. Automated exports do not establish these native results. No native rebuild is required by these JavaScript-only edits.

Files changed in Prompt 32.8:
- src/lib/discovery/idle-motion.ts
- src/lib/discovery/globe-style.ts
- src/components/discovery/globe/native-globe.tsx
- tests/discovery-camera-motion.test.mjs
- tests/discovery-panel.test.mjs
- docs/mobile-map-first-home.md

No commit, push, deployment, dependency changes, unrelated refactor or Prompt 33 work.


## Home photo markers and decorative journey playback (2026-10-11)

Country-label work is deferred at the user's request; the existing label block/style is unchanged in this enhancement. Implemented the requested Home-only stop photos, connector and simple moving plane. No Prompt 33 work.

Inspected public JourneyStop.photo, existing normalization/media signing and selected-detail loading. Those already resolve authorized public stop-photo URLs. Home point properties now carry an existing resolved HTTPS stop photo, with no new queries, storage writes or media endpoints. Unresolved storage paths, missing/unsafe photos use the original green CircleLayer. Coordinate-deduplicated markers can use an available uploaded photo from a coincident stop, without adding duplicate location markers or substituting the journey cover.

Added 42-point round PointAnnotation thumbnails, white border and green background, refreshing Android's bitmap on Image.onLoad with fadeDuration=0 as required by the installed SDK. On image failure the annotation disappears, exposing the original green marker. Photo annotation taps retain the existing Journey Story navigation. Photo and plain marker labels use separate fixed offsets supported by the SDK. Photo components stay mounted through plane cancellation and repeated Locate, avoiding tap-time remounts or needless image reloads.

The connector is decorative saved-stop geometry, not road routing or evidence that the traveler flew. Uses the existing ordered coordinate validator/segment builder, preserves returns to earlier stops, skips zero-length consecutive moves and breaks at missing/invalid coordinates. Dateline crossings split at matching +/-180 edges; plane targets use the short longitude arc. No invented stop coordinates or country/place discovery. A restrained green dashed line with light halo renders beneath the stop markers.

The existing Locate controller now exposes an optional settled callback, invoked only for the latest active request after its final fit (including a queued panel refit) finishes. The existing 800/200/1350 ms world/hold/flight and camera fitting are unchanged. That callback enables one decorative plane pass through the valid legs, 2800 ms per leg with 650 ms stop dwell. Repeated explicit Locate replays; a panel-only refit does not restart playback for the same request. The plane does not drive or follow the camera.

Uses the installed SDK's AnimatedPoint/Animated.ShapeSource and React Native Animated.parallel to update one point, with React state changed only at leg boundaries. Coordinate updates require the JS animation driver/bridge; there is no per-frame React setState or custom frame timer. A generation-guarded playback helper owns at most one dwell timer and invalidates callbacks before stopping animation. Selection changes, manual globe gestures, World reset, map failure, Home blur/background and unmount stop playback; reduced motion disables it. Single-stop/unmapped journeys show markers without a connector/plane. Panel interaction/snap behavior and scroll positions are unchanged. The plane uses the native font's U+2708 glyph; a read-only hosted glyph check confirmed it exists in Arial Unicode MS Regular. Actual Android glyph appearance and animation are still unverified.

Reviewed the edited components with the React checklist: stable photo keys, pure memoized geometry, lazy AnimatedPoint setup, effect cleanup, bounded callbacks, subscription cleanup, and no frame-driven React rendering. Native modules remain confined to the existing lazy native-globe import. No dependencies/native config, Supabase contracts, backend/database, web project, authentication, card styles or Story map changes.

Supporting SDK references inspected:
- https://rnmapbox.github.io/docs/components/PointAnnotation
- https://rnmapbox.github.io/docs/examples/Annotations/ShowPointAnnotation
- Installed classes/AnimatedPoint.js and utils/animated/Animated.ts (current RN-compatible animation and cleanup); experimental native animator was not adopted because it lacks a public cancellation/disposal API.

Validation: TypeScript passed; ESLint passed with zero warnings; 131 automated tests passed, zero failures; Expo Doctor 21/21 passed; Android/iOS/web exports passed via npx expo export --platform all --output-dir .expo/photo-travel-export. git diff --check passed; four protected Journey Story map hashes match baseline. Added photo fallback/coincident-photo tests, ordered and missing-coordinate routes, dateline splitting/short-arc movement, finite one-pass completion/dwell/stale-callback cancellation, latest Locate settled callbacks and deferred refit checks. These tests do not emulate native bitmap rendering or Android touch dispatch.

Physical Android verification remains required: Locate journeys with mixed photos/no photos, slow/broken/expired URLs, singleton/duplicate/missing/dateline/wide stops; check round clipping, readable labels, correct photo-to-stop association and taps opening Story. Verify the small plane glyph, orientation, smooth motion/dwell, stop ordering and no long dateline jump, replay on repeated Locate, and no camera takeover. Interrupt during Locate and during playback with gestures/World/switching journeys/background/navigation/reduced motion, and check all panel snaps/scroll offsets. Evaluate many-photo journeys and lower-end hardware for annotation/bridge cost. No hardware verification or device-smoothness claim is made. JavaScript-only changes require no new native build.

Files changed in this enhancement:
- src/app/discover.tsx
- src/components/discovery/globe/discovery-globe.native.tsx
- src/components/discovery/globe/discovery-globe.tsx (mobile web-fallback prop type only)
- src/components/discovery/globe/native-globe.tsx
- src/components/discovery/globe/journey-overlays.tsx (new)
- src/lib/discovery/map.ts
- src/lib/discovery/travel.ts (new)
- src/lib/discovery/locate-transition.ts
- tests/discovery-globe.test.mjs
- tests/discovery-camera-motion.test.mjs
- docs/mobile-map-first-home.md

No commit, push, deployment, dependencies/config changes or Prompt 33 work.


## Home rotation lifecycle recovery (2026-10-11)

Traced native-globe.tsx, the lazy discovery-globe.native.tsx loader, Home selection/X wiring, the sheet interaction hook and Locate controller. The loader has no rotation timer. The confirmed code-level delay came from idle-motion's firstRotation flag: selecting a journey set it false, and subsequent programmatic pause completion and sheet interaction completion scheduled the full 10,000 ms recovery delay. Clearing selection could schedule that delay before the return camera hold, whose completion scheduled it again. Panel X touches participated in the same interacting flag. Camera readiness also accepted style-loaded before map-loaded, and stale native gesture flags could halt automatic motion. No evidence establishes a startup performance problem; actual device callback ordering remains unmeasured.

Replaced the overloaded firstRotation flag with a manual-interaction deadline. A map touch release or genuine gesture settling establishes the existing 10-second cooldown; panel interaction, readiness updates, selection clearing and programmatic camera events do not extend it. Panel interactions still pause rotation while active and preserve camera holds. A return-to-world or World reset holds rotation for the existing 900 ms camera animation plus 50 ms native bridge margin, then resumes from the latest valid observed pose without a new cooldown (any remaining genuine manual cooldown is respected). One timer and epoch guards remain; new selection, touch, blur, background, failure and disposal invalidate old work. Gesture inertia is tracked until native idle, but a stale gesture flag without a real map touch cannot initiate a manual cooldown or cancel Locate. Native touch evidence clears on blur/background/failure.

Startup now waits for map-loaded, measured viewport, valid camera pose and reduced-motion preference; style-loaded alone no longer authorizes rotation. The initial framing hold still prevents competing camera commands. Rotation direction, step/duration, max eligible zoom, cinematic Locate/replay, fitting, selection contracts, photo markers, route/plane, sheet behavior and map style are unchanged. No dependency or native configuration changes.

Validation: TypeScript passed; ESLint passed with zero warnings; full suite 136/136 tests passed; Expo Doctor 21/21 checks passed; Android/iOS/web exports passed to .expo/rotation-lifecycle-export. git diff --check passed. All four protected Journey Story map hashes match their baseline. Focused regressions cover initial readiness/hold, selection and X return with panel/camera events, preserved manual cooldown, stale gesture flags, and invalidated pending return callbacks. Existing Locate and lifecycle tests remain passing.

Files changed for this task: src/lib/discovery/idle-motion.ts; src/components/discovery/globe/native-globe.tsx; tests/discovery-camera-motion.test.mjs; docs/mobile-map-first-home.md. Other working-tree modifications predate this task and are preserved.

Physical Android verification remains required: repeated cold Home loads with no touch; select/Locate then X and observe smooth resumption after return; repeat X during Locate; drag/pinch/rotate and verify 10 seconds after gesture/inertia; interact with sheet during return without restarting the delay; World reset, navigation away/back, background/foreground, reduced motion and map failure; confirm photos, connector, plane and sheet scrolling remain intact. Automated tests and Expo exports do not verify native touch delivery, camera snapshot timing, visual smoothness or device performance. No commit, push, deployment or Prompt 33 work.


## Prompt 32.10 - Spherical Home journey curves (2026-10-11)

Inspected Home route construction, validated ordered stop segments, photo annotations, LineLayers, AnimatedPoint, playback controller, and installed @rnmapbox/maps TypeScript/native style adapters. The installed MapboxStyles.ts explicitly documents lineZOffset as unsupported for globe projection; the official Android API confirms the same limitation: https://docs.mapbox.com/android/maps/api/latest/mapbox-maps-android/com.mapbox.maps.extension.style.layers.generated/-line-layer/line-z-offset-as-expression.html . Native adapters expose the property but cannot make unsupported globe elevation reliable. Therefore this implementation uses the authorized globe-following surface alternative, not floating/elevated arcs, screen-space curves, terrain or a new custom renderer. Short local legs may appear almost straight because their spherical curvature is naturally small.

Home-only travel geometry now interpolates a great-circle arc between consecutive valid stops using unit sphere vectors and a normalized tangent. Samples are uniformly spaced in angle at approximately two degrees or less, with 8-96 intervals per leg. Exact endpoint coordinates are preserved modulo longitude wrapping. Coincident spherical endpoints (including dateline aliases/poles) do not animate; exactly antipodal pairs use a deterministic orthogonal tangent because there is no unique shortest route. Invalid coordinates break connectivity rather than connecting across a missing stop. Stored stop ordering and existing segmented route contracts remain unchanged.

Longitude samples are unwrapped continuously for the plane and split into matching +/-180 line edges for rendering, preventing across-world connector chords. Existing green dashed line and white halo styles remain unchanged beneath the original markers. Arc sampling and splitting happen once per memoized selected route, shared by line and plane. Plane progress uses one React Native Animated.Value and an O(1) sampled-path lookup/linear interpolation per update, with no per-frame trigonometry or React state updates. The original 2800 ms per leg, 650 ms dwell, finite playback, initial per-leg bearing, replay key and generation-based cancellation controller remain. Cleanup invalidates the active leg, stops animation and removes the progress listener. Camera/idle/Locate, sheet, reduced motion, photo marker and navigation wiring are untouched.

Changed files for this prompt: src/lib/discovery/travel.ts; src/components/discovery/globe/journey-overlays.tsx; tests/discovery-globe.test.mjs; docs/mobile-map-first-home.md. Prior uncommitted changes are preserved. No web, Story map, backend, schema, authentication, dependency or native configuration changes; no commit, push or deployment. No Android development-client rebuild is required for these JavaScript-only changes; reload the existing compatible development client.

Physical Android checks still required: visual curve smoothness and marker attachment during rotation/zoom; long and polar routes, dateline crossings, very short legs and antipodal pairs; plane remaining on the rendered line throughout playback and at dateline edges; Locate replay and interruption by gestures, World, selection changes, sheet interaction, navigation/background and reduced motion; performance with many stops. Automated geometry tests/export success do not verify native rendering, plane glyph orientation or hardware smoothness.

Validation: TypeScript passed; ESLint passed with zero warnings; full suite 140/140 tests passed (including 14 focused globe/route tests); Expo Doctor 21/21 checks passed; Android/iOS/web Expo exports passed to .expo/curved-routes-export. git diff --check passed; all four protected Journey Story map hashes match the baseline. New tests cover spherical curvature/plane-path agreement, sample bounds, exact endpoints, invalid-coordinate breaks, ordering/return stops, polar/long/antipodal routes and matching dateline edges. Existing playback cancellation and camera lifecycle regressions remain passing.
