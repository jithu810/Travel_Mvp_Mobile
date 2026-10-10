# Prompt 28 — Native Mapbox Journey Map

Implemented in D:\Travel_Mvp_Mobile on 2026-10-08. The web application remains separate and unchanged.

## Dependency and compatibility

Pinned @rnmapbox/maps **10.3.7** and installed SDK-matched expo-dev-client **57.0.19** through npx expo install. Expo **57.0.27**, React Native **0.86.3**, and React **19.2.3** were not upgraded. The package defaults to native Mapbox SDK 11.23.1 (iOS ~>11.23.1, Android 11.23.1).

Before installation, verified published peer requirements: React Native >=0.79, React >=17, optional Expo >=47. The library includes Fabric/TurboModule codegen and an Expo config plugin. Installed versions satisfy those declared requirements; Expo compatibility and Doctor pass. Native compilation/device compatibility remains unverified.

Sources: [maintainer package](https://github.com/rnmapbox/maps/blob/main/package.json), [native requirements](https://github.com/rnmapbox/maps#dependencies), [Expo installation](https://github.com/rnmapbox/maps/blob/main/plugin/install.md), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## UI and behavior

Story order is cover/information → Map → useful Snapshot → story description → ordered timeline → existing disabled future actions.

Native map: rounded 280-point viewport, Mapbox Outdoors tiles, compact green numbered markers, green planned line, and a 44-point Fit Journey button. Tapping a marker darkens/enlarges it and identifies its stored number/name below the map. Pan, pinch zoom and rotation are enabled. Fit Journey restores bounds and north-up/top-down orientation. A singleton or co-located points use the actual stored coordinate at zoom 12. SDK logo/attribution remain enabled.

The reusable pure geometry helper matches the web: stable creator sequence ordering, original timeline numbering, finite numeric latitude [-90,90]/longitude [-180,180], longitude-first GeoJSON, and MultiLineString segments across consecutive valid stops. Missing coordinates break the line; they are never bridged. Missing-coordinate stops remain in the Story timeline. No coordinates are coerced/invented, and no optimization or Directions request occurs.

Fallbacks cover no coordinates, missing/invalid public token, Expo Go, missing native module, caught initialization/render failure, map loading error, and 20-second loading deadlines. Runtime failures offer an explicit retry. Story stays usable and no raw errors or tokens are rendered. Web deliberately shows a compact native-app fallback and never imports the native SDK.

Memoized component/geometry boundaries avoid map remounts on scrolling and unrelated Story changes. Camera defaults remain stable. Selection changes source properties. Android uses TextureView for rounded clipping and requestDisallowInterceptTouchEvent for gestures inside the Story ScrollView. Native gesture arbitration still needs field testing.

## Public configuration and development build

EXPO_PUBLIC_MAPBOX_TOKEN uses the existing web NEXT_PUBLIC_MAPBOX_TOKEN strategy. Only the existing pk.-prefixed public client token was copied into ignored .env.local; its value was never printed. .env.example contains an empty slot. No secret/download/server Mapbox token or Supabase service-role key was introduced. The selected Android plugin makes download authentication optional.

Only public planned stop latitude/longitude from the existing detail RPC are retained. Travel sessions and GPS tracks stay discarded. Public-only membership/status gates and isolated anonymous read transport are unchanged.

Expo Go cannot render the native package. Use the following for the rest of the app with the map fallback:

    npx expo start --go

For interactive maps, build/install a native client on a suitably equipped machine:

    npx expo run:android
    npx expo run:ios
    npx expo start --dev-client

iOS compilation needs macOS/Xcode; Android needs Android Studio/SDK. The run commands generate native projects and compile/install them locally. Supply the app's native identifiers when tooling requests them. Rebuild after native dependency/config changes. app.json includes the Mapbox config plugin. No native build, EAS build, signing operation, or cloud deployment was started here. Keep any future build-only credential outside app configuration and EXPO_PUBLIC variables.

## Created files

- src/lib/journey/map-data.ts — geometry, numbering and bounds.
- src/components/journey/map/map-frame.tsx — shared heading/copy/fallback.
- src/components/journey/map/journey-map.tsx — isolated web fallback.
- src/components/journey/map/journey-map.native.tsx — guarded initialization/error boundary.
- src/components/journey/map/native-map.tsx — native Mapbox layers, camera, selection, fitting/loading.
- tests/map.test.mjs — seven map/integration tests.
- docs/native-journey-map.md — this report.

## Modified files

- src/types/journey.ts and src/lib/discovery/model.ts — validated nullable public planned coordinates.
- src/app/journey/[id].tsx — map integration and section order.
- src/components/journey/story-extras.tsx — obsolete placeholder removed.
- tests/story.test.mjs — planned coordinates allowed; private sessions/tracks still discarded.
- package.json and package-lock.json — pinned Mapbox and SDK-matched development client.
- app.json — Mapbox plugin.
- .env.example and ignored .env.local — public token slot/configuration.
- README.md — current setup and report link.

## Checks and limitations

- TypeScript and lint passed.
- All **27 tests** passed: existing discovery/search/public-read/media/story regressions plus ordered points, stable ties, numbering, line breaks, numeric/range validity, real zero/boundary coordinates, empty/invalid/singleton geometry, separated singleton markers, public/private normalization, isolated web fallback and Story order.
- Expo Doctor **21/21** passed; expo install --check passed.
- Expo native plugin configuration introspection succeeded for both platforms. Introspection does not run CocoaPods or Gradle compilation.
- Android/iOS Hermes bundles and web bundle exported successfully. These are JavaScript validations, not APK/IPA builds.
- Real public data verified Discover → Search ("Trivandrum") → Story → Back with search retained → Back to Discover; a second real Story opened directly from Discover.
- Story photos, ratings, ordered timeline, conditional snapshot and honest web fallback were inspected. No horizontal document overflow at **390×844** or **412×915**; loaded Story also had no overflowing elements.
- No production data was created or modified.
- npm reports 30 dependency/transitive advisories (11 moderate, 19 high) after development-client installation. No force fix or SDK upgrade was applied.

No connected device, Android SDK/emulator or macOS/iOS simulator is available here. Native tile rendering, selection/hit testing, camera fitting, native errors, attribution, safe areas and scroll/gesture behavior require a rebuilt iOS/Android client field test. Browser screenshots show the web fallback, not a simulated native map.

Web Git remains at its preexisting README modification and untracked docs/mobile-architecture.md. Supabase schema, migrations, RLS, backend and auth/session architecture were untouched. No GPS/current location, Travel Mode, navigation, camera, offline maps, notifications, Like/Save/Share, remix or creation was implemented.

Mobile Git remains on main with all work unstaged, no HEAD commit and no remote. Nothing was committed or pushed.
