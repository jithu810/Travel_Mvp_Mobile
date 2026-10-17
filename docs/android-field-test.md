# Journey Creator Android field-test release preparation

Prepared 16 October 2026 for `D:\Travel_Mvp_Mobile`.

Configuration is prepared for a standalone APK. **Before building, configure the four missing EAS preview service variables.** No EAS build or native compilation was started, and no physical-device validation is claimed.

## Files changed in this task

- `eas.json`: explicit standalone preview APK and preview environment.
- `app.json`: branded launcher/adaptive icons and existing logo on the splash screen.
- `assets/launcher-icon.png`: new opaque 1024 × 1024 launcher asset.
- `assets/adaptive-icon.png`: new transparent 1024 × 1024 padded foreground.
- `docs/android-field-test.md`: this handoff.
- `PROJECT_STATUS.md`, `ROADMAP.md`: current implementation, checks and pending device/build work.

Existing tracked and untracked work was preserved using a startup content-hash baseline. Application source, tests, dependencies, lockfile, `.env.local`, `.gitignore`, in-app logo, backend and web repository were not changed. There were no commits, pushes, deployments or remote configuration writes.

## Preview profile and runtime

```json
"preview": {
  "distribution": "internal",
  "developmentClient": false,
  "environment": "preview",
  "android": { "buildType": "apk" }
}
```

Development and production profiles remain unchanged. With no custom Gradle command, APK output selects the normal release build with embedded JavaScript/assets. The installed dev-launcher package disables its launcher in release unless explicitly overridden; no such override was found. Keeping `expo-dev-client` supports the existing development profile and does not require Metro in this preview.

Expo Router uses `expo-router/entry`. Native Mapbox guards reject Expo Go (`StoreClient`), not standalone apps. Supabase uses native AsyncStorage for persistent authentication. Location, camera, image manipulation, filesystem and Crypto are installed native dependencies; their source paths have no development-server requirement. Only photo diagnostics are gated behind `__DEV__`. Companion GLB/texture and branding were included in the production Android export; its optional default flag and saved preference behavior were not changed.

The APK must still be built and tested: an export and mocked tests cannot establish Gradle success, startup, real permissions, credentials, native rendering, GPS accuracy or live upload/RLS behavior.

## Environment configuration — required before the build

All four variables below exist in ignored `.env.local`, with nonempty values and appropriate public-key/token prefixes or HTTPS URL formats. The Supabase URL identifies a hosted Supabase project. Values were not printed, replaced or copied into this report. Credential validity was not tested against live services.

Read-only EAS preview inventories succeeded for both project and account scope: **none of these variables is available remotely**. `.env.local` is ignored and will not be uploaded by EAS. Local export success therefore does not establish remote-build configuration.

In the Expo dashboard, open the linked Journey Creator project, project ID `1a763548-ee3f-4da9-a20a-71f74fdbccac`, then **Environment variables → preview**. Create project-scoped string variables using the existing values from `.env.local`:

| Variable | Value to use | EAS visibility |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Existing hosted project URL | Plain text |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing `sb_publishable_` client key | Sensitive |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Existing public `pk.` token | Sensitive |
| `EXPO_PUBLIC_SITE_URL` | Existing public web origin for native sharing | Plain text |

The current Supabase integration specifically accepts publishable keys; do not substitute a legacy anon JWT without changing and validating the integration. Never use a service-role key or private Mapbox token. All `EXPO_PUBLIC_*` values are readable from the installed client even when marked Sensitive in EAS; visibility only controls console/display handling.

Optional `EXPO_PUBLIC_TRAVEL_COMPANION` is absent locally and remotely. Leaving it unset preserves the existing default off; saved device preferences still apply. Do not introduce a new value for this milestone. The installed RNMapbox plugin makes Android Maven authentication optional, so no private downloads token is required by the inspected configuration. If credentials are later required for a different native artifact, keep a downloads-only token server-side as `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, never under `EXPO_PUBLIC_*`.

Alternatively, the installed EAS CLI supports interactive setup without putting values into shell history:

```powershell
Set-Location D:\Travel_Mvp_Mobile
eas env:set --environment preview --scope project --name EXPO_PUBLIC_SUPABASE_URL --type string --visibility plaintext
eas env:set --environment preview --scope project --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --type string --visibility sensitive
eas env:set --environment preview --scope project --name EXPO_PUBLIC_MAPBOX_TOKEN --type string --visibility sensitive
eas env:set --environment preview --scope project --name EXPO_PUBLIC_SITE_URL --type string --visibility plaintext
```

Enter the corresponding existing local value at each prompt. These commands are instructions only; they were not run. Rebuild after changing public runtime configuration because these values are embedded at bundle time. Expo documents [EAS environments](https://docs.expo.dev/eas/environment-variables/) and [profile configuration](https://docs.expo.dev/eas/json/).

## Local endpoint audit

No localhost, loopback, emulator address, private-LAN address or hardcoded development server was found in application network requests. Supabase requests use the configured hosted URL; search and Directions use HTTPS Mapbox APIs. Local references occur in historical browser/Metro documentation, sharing-validation rejection cases/tests, and the web Crypto secure-context error message. These are not Android service endpoints. Remote content/media URLs still depend on real backend data and permissions.

## Branding and generated native resources

The existing logo is a 500 × 500 RGBA PNG containing a rounded navy tile, globe and gold location/orbit artwork. It was deterministically resized and composited without inventing artwork or adding dependencies.

- Resolved `expo.icon`: `./assets/launcher-icon.png`, opaque navy canvas with the original logo centered at 900 × 900.
- Resolved Android adaptive foreground: `./assets/adaptive-icon.png`, original logo centered at 560 × 560 with transparent padding; background `#06275B`.
- All visible foreground pixels fit within the 66/108 Android safe circle: maximum radius 306.29px versus safe radius 312.89px, with zero pixels outside at alpha >8/255. Native launcher appearance still needs device confirmation.
- Splash uses `./assets/journey-creator-logo.png`, existing 100dp width and cream background.
- Original in-app logo is unchanged. App name remains Journey Creator; package remains `com.sree8100.journeycreatormobile`; scheme remains `journeycreator`. Explicit web favicon configuration is unchanged.

There is no checked-in or local Android/iOS native directory. Both are ignored; EAS prebuild generates launcher/splash/native resources from Expo config. No generated native files were edited. A **new EAS preview build is required**; Metro reload cannot replace an installed launcher or make a development client standalone.

## Validation and remaining blockers

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint, zero warnings | Passed |
| Focused auth/map/GPS/photo/navigation/Travel/companion tests | 174/174 passed |
| Full suite, concurrency 2 | 455/455 passed |
| Expo introspected configuration | Passed; correct package/icons/splash, foreground location, microphone and broad-storage removals retained |
| Camera permission review | Image Picker library manifest declares CAMERA; Expo config no longer removes it; final APK manifest still needs build verification |
| Android production export | Passed; 6.8MB Hermes bundle and static assets including companion GLB/texture/logo |
| Preview/config preservation assertions | Passed; unrelated app configuration and other profiles unchanged |
| Adaptive safe-area measurement | Passed after padding refinement |
| Diff/whitespace and preservation audit | Passed; existing Git LF/CRLF notices only |
| Expo compatibility and Doctor | Compatibility exits 1; Doctor 20/21, same five existing patch mismatches |
| Remote preview service variables | Missing at project and account scope; configure before building |
| Native APK build/install and physical field tests | Not performed |

Existing mismatches: Expo 57.0.28 → ~57.0.30; Asset 57.0.19 → ~57.0.20; Constants 57.0.21 → ~57.0.22; Linking 57.0.12 → ~57.0.13; Router 57.0.26 → ~57.0.28. No upgrades were applied. This compatibility limitation remains for review before building. Installed EAS CLI 24.13.0 satisfies the repository minimum >=24.12.1.

## Build and install — after report review and environment setup

Run from PowerShell:

```powershell
Set-Location D:\Travel_Mvp_Mobile
eas build --platform android --profile preview
```

Use the existing Android signing credential for this package when prompted. The finished EAS build page provides the APK download/install link. Open it on the phone, download the APK, allow installation from that browser if Android requests it, and install. Launch Journey Creator from the launcher.

Optional USB installation after downloading the APK to the computer:

```powershell
Set-Location D:\Travel_Mvp_Mobile
adb devices
$apk = Read-Host 'Full path to the downloaded preview APK'
adb install -r "$apk"
adb shell am force-stop com.sree8100.journeycreatormobile
adb shell monkey -p com.sree8100.journeycreatormobile -c android.intent.category.LAUNCHER 1
```

`adb` was not found on this machine's PATH. For USB installation, install Android SDK Platform Tools and enable/authorize USB debugging first, or use the direct phone download method. Keep the same signing key for an in-place install over the existing development app. If Android reports a signature mismatch, inspect credentials rather than uninstalling and losing app data. No Metro/start command is needed for the preview APK.

## Physical Android field-test checklist

Record phone model, Android version, APK build ID/date and actual results. Use authorized test data and test navigation while stationary, walking where safe or as a passenger.

1. Stop Metro, unplug USB, turn off the laptop and disable phone Wi-Fi while keeping cellular internet. Force-stop and launch from the icon. Confirm branded icon/splash, Home startup and no development launcher or server prompt. Repeat after reboot.
2. Browse Home globe, search, Story/maps, stop selection and Router navigation/back. Confirm maps load over cellular and errors recover after network loss.
3. Sign in, force-stop/reopen and verify session restoration. Check owner/private gating, expiry/network recovery and sign out. Use existing approved accounts.
4. Request location only as needed. Test precise/approximate permission, denial, permanent denial/Settings, services off/on and weak GPS feedback. Record observed accuracy; do not assume an export proves outdoor accuracy.
5. Test camera/gallery, cancellation/replacement, orientation and JPEG/HEIF on the actual phone. Confirm local Not saved state, explicit upload/save, reopen persistence and network failure recovery for approved test journeys/avatar edits.
6. Enter Travel ready state without automatic tracking. Begin explicitly; verify GPS, blue road route and guidance. Test Pause/Resume, gestures/Recenter, ordered manual completion, arrival confirm/dismiss, next stop, early Finish and final completion. Test reroute/Retry where safe.
7. Background/lock and leave/reenter Travel: GPS/route work must stop while inactive, stale results must not apply and fresh evidence must be required after return. Trip state is in memory; process death does not preserve travel progress.
8. Check small-screen/large-text layouts, keyboard, safe areas, TalkBack and Reduce Motion. Confirm the companion retains its existing preference and behavior when enabled.
9. Enable airplane mode and cold-launch: distinguish bundled startup from unavailable remote data/maps/auth/uploads/Directions. Restore connectivity and test recovery. No offline-map download or durable offline-travel capability was established; incidental cached tiles are not an offline guarantee.

The milestone ends at configuration preparation and this report. Native build and field observations remain pending.
