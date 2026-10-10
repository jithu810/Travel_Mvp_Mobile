# Journey Creator mobile

Independent native React Native / Expo / TypeScript application at `D:\Travel_Mvp_Mobile`, intended for `jithu810/Travel_Mvp_Mobile`. The working web app at `D:\Travel_Mvp` is separate and unchanged.

## Native Create Journey — Prompt 31

Create Journey is available from Discovery and signed-in Account. Authentication returns to the form; cancelling creates nothing. The form supports selected Mapbox destinations, title, description, traveler type, duration, multiple stops with locations/notes/day/rating, removal/reordering and the existing native map preview.

Save Draft and Publish reuse the atomic save_journey RPC, existing ownership/RLS/version checks and web validation. Confirmed drafts open the owner-only draft view and stay accessible through Account. Valid publication opens public Story. Repeated taps are locked and ambiguous results direct users to check Account/public results before retrying.

**Rebuild the development client for the new compatible Expo Crypto module before native Create testing.** Older clients show an update message for Create while preserving browsing. Photos and a full editor for saved journeys remain later work.

All 79 tests, TypeScript/lint, Doctor 21/21, dependency compatibility and Android/iOS/web exports passed. Real Mapbox search and signed-out browser navigation were checked; authenticated UI, actual saves/publication and physical-device behavior remain manual tests. See [complete files, contracts, limits and field-test report](docs/mobile-create-journey.md). Preview: port 8086. Web/backend unchanged; no commit, push or deploy. The earlier milestone sections below are historical.



## Authentication, Use and Remix — Prompt 30

Email/password sign-in and registration now reuse the existing persistent Supabase client. Email-confirmation-required signup stays signed out; authenticated actions return to the selected journey once. Discovery → Account provides sign-out and owner-only private drafts.

Use scrolls to the original journey's map and stops without making a copy. Remix uses the existing copy_journey RPC, verifies ownership/draft status/source lineage, and opens a private read-only draft. Account keeps copies accessible without adding the editor. Repeated taps are guarded; uncertain copy responses direct the user to Account before retrying.

All 62 tests, TypeScript/lint, Doctor 21/21, compatibility, and Android/iOS/web exports passed. Browser checks verified signed-out forms, action entry/cancellation, read-only Use and public profile regressions. Live authentication, database writes and native device behavior remain manual checks. See [full implementation, files, contracts and testing report](docs/mobile-auth-use-remix.md). Local preview: port 8086. No dependencies, native build configuration, web files or backend contracts were changed; nothing was committed, pushed or deployed.

The sections below record earlier milestones; their statements about deferred authentication/Use/Remix describe the app at those dates.



## Likes, Saves, Sharing and Creator Profiles — Prompt 29

Journey Story now has compact Like/Unlike, Save/Saved and native Share controls. Tapping a creator opens a real public profile with avatar, bio and public journey cards that reuse Story navigation. Likes and bookmarks reuse the existing authenticated Supabase tables/RLS; all public browsing stays anonymous. A clear sign-in-required state is shown because native sign-in UI does not exist yet. Sharing uses the existing public deployment origin in EXPO_PUBLIC_SITE_URL.

All 46 tests, TypeScript/lint, Doctor 21/21, compatibility and Android/iOS/web exports passed. Real-data browser navigation and both requested phone widths were verified. Native Mapbox source and versions are unchanged. Signed-in actions and native share/device behavior still need a field test. See [full social/profile implementation and validation report](docs/mobile-social-profiles.md). Current browser preview: port 8085. No dependencies or native build configuration were changed.


## Native Journey Map — Prompt 28

Journey Story now integrates native Mapbox on iOS/Android, with numbered selectable planned stops, a segmented planned line, camera fitting, and friendly configuration/loading/error fallbacks. Pinned @rnmapbox/maps 10.3.7 and SDK-matched expo-dev-client 57.0.19; Expo/RN versions unchanged. The map requires a native development build. Web and Expo Go retain the full Story with an honest map fallback. Use `npx expo start --go` for an Expo Go preview or `npx expo start --dev-client` after compiling the native client with `npx expo run:android` / `npx expo run:ios` on an appropriate machine. The latest browser preview runs on port 8084.

All 27 tests, TypeScript/lint, Doctor 21/21, compatibility, plugin introspection, and three-platform exports passed. Native rendering/gestures still need device verification. See [full native map report and setup](docs/native-journey-map.md) for all files, security boundaries, verification, and limitations. Earlier prompt sections below are historical records.


## Journey Story refinement — Prompt 27

Public detail now has a cover-first Story header, compact numbered timeline, photos, descriptions, creator ratings, web-compatible deterministic snapshot signals, and explicitly disabled future actions. Empty sections are omitted. No dependencies or backend/auth changes were added. All 20 tests, type/lint checks, Expo Doctor, and Android/iOS/web bundle checks passed. Real public data was verified at both requested phone sizes; physical Expo Go field testing remains pending. See [Journey Story implementation and verification](docs/journey-story.md) for the complete file-change list and limits. The current preview runs with `npm start -- --port 8083`.

## Discovery foundation — Prompt 26

Welcome → Discover → Search / Public Journey Detail, using a small Expo Router stack.

- Welcome keeps the Journey Creator identity and now offers **Start exploring**.
- Discover shows recently published public journeys with real cover photos, destination, title, traveler type, days/stops, creator display name, and available aggregate likes. Native pull-to-refresh and an accessible manual refresh action reload the feed without clearing existing cards.
- Search matches titles, destinations/place names, stop names, creator display names, and usernames. It follows the web's trimmed, NFKC-normalized, case-insensitive substring matching and 120-character input bound. Search covers at most the existing RPC's latest 100 public journeys; no network query is issued for each keystroke. Destination shortcuts come only from loaded real data.
- Detail shows the public journey's cover, title, destination, creator/username, metadata, description, ordered stops, day labels, and available stop photos. Stops follow stored `sequence`, not geography or day regrouping. The map area is an explicit future-update placeholder.
- Screens include loading skeletons, useful empty states, retryable errors, safe-area handling, and comfortably sized controls. Search uses keyboard avoidance on iOS, drag dismissal, and a return key that dismisses the keyboard.

No fake/demo journeys are supplied by the mobile app. A published user-created journey whose title happens to be “Demo” is still real public data when `is_demo` is false. Like counts are display-only: there are no Like/Save/Remix/Travel Mode mutation actions.

## Data and privacy boundary

The existing backend and user system are reused. There are no new tables, migrations, RLS changes, production redirects, or writes.

`src/lib/discovery/queries.ts` uses existing `get_public_journeys` and `get_journey_detail` RPCs. Discovery uses one bounded RPC and batches signing of real cover paths in the existing `journey-media` bucket. Detail first checks membership using the public discovery ID filter, then reads detail. It rejects nonpublished status, demos, mismatched IDs and withdrawn journeys. The deployed detail RPC omits `destination_name`; the public discovery projection supplies the correct destination display name instead.

`src/lib/supabase/public.ts` is a small anonymous read client with the same public URL/publishable key, no persistence or refresh, and a distinct memory-only storage key. It never attaches the persistent user's bearer token. This prevents the owner-visible detail RPC from returning the owner's drafts while preserving the Prompt 25 session foundation unchanged in `client.ts` and `use-session.ts`.

The mobile model explicitly projects display fields. It never queries private profiles, travel sessions, saved journeys, or travelled/GPS tracks, and does not retain detail fields such as `liked`, `saved`, owner identifiers, or geographic coordinates. Photo paths are signed only after public gating; signing creates temporary read URLs and does not upload/change media. HTTPS photos render natively; unavailable/rejected photos use a neutral placeholder, not a fake destination image. Public reads have timeouts and superseded requests cannot overwrite a newer screen's state.

## Files changed in Prompt 26

Created:

```text
src/app/discover.tsx
src/app/search.tsx
src/app/journey/[id].tsx
src/components/welcome-action.tsx
src/components/discovery/ui.tsx
src/components/discovery/journey-card.tsx
src/components/discovery/journey-photo.tsx
src/hooks/use-load.ts
src/lib/discovery/model.ts
src/lib/discovery/queries.ts
src/lib/supabase/public.ts
src/types/journey.ts
tests/discovery.test.mjs
```

Modified: `src/app/index.tsx`, `src/app/_layout.tsx`, `package.json` (test command), `AGENTS.md` (current scope), and this README. Removed the superseded `src/components/foundation-button.tsx`. No dependencies were added or upgraded in Prompt 26.

## Runtime

Expo **57.0.27**, Expo Router **57.0.25**, React Native **0.86.3**, React **19.2.3**, TypeScript **6.0.3**, Supabase JS **2.117.3**, AsyncStorage **2.2.0**, URL polyfill **4.0.0**. Use Node **22.14.0+** and npm. The existing Expo-compatible versions are locked in `package-lock.json`.

## Public environment and sessions

An ignored `.env.local` is already configured with only the same backend's public settings. For a fresh checkout:

```powershell
Set-Location D:\Travel_Mvp_Mobile
Copy-Item .env.example .env.local
```

Populate `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the **existing** Supabase project. These values are included in the app bundle by design. Never put service-role keys, secret keys, or server credentials here. All `.env*` files except `.env.example` are Git-ignored.

The original persistent client restores existing Supabase sessions using native AsyncStorage, PKCE preparation, and foreground/background token refresh. No authentication UI, OAuth flows, anonymous account creation, or session sign-out is performed. The local `journeycreator` deep-link scheme is retained; production callback configuration is deferred.

## Run locally

Dependencies are installed. Fresh checkouts should run `npm ci`.

```powershell
Set-Location D:\Travel_Mvp_Mobile
npm start -- --port 8082
```

Scan the terminal QR code with Expo Go compatible with SDK 57 on a device connected to the same network. Press `a` for an available Android emulator or `w` for the browser preview. Alternative commands are `npm run android` and `npm run web`. iOS simulator launch requires macOS; Expo Go on an iPhone can connect to the Windows development server.

The verification preview runs at `http://localhost:8082`.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo install --check
npx expo export --platform all
npm run check:supabase
```

If typed routes are missing immediately after adding route files, start Expo once to regenerate its ignored `.expo/types/router.d.ts`, then rerun TypeScript. Tests compile the small data modules to a temporary directory using the existing TypeScript dependency and run with Node's test runner. Synthetic fixtures exist only in tests; they are never displayed in the app or written to Supabase.

Verified 2026-10-08:

- TypeScript and lint passed.
- All 12 data tests passed: public-only gates, field projection, draft/demo exclusion, all search dimensions, Unicode/length bounds, sequence ordering, safe photos, missing metadata, bounded RPC loading, no detail read without public membership, retryable errors, and media fallback.
- Expo Doctor passed all 21 checks; Expo dependency compatibility passed.
- Android and iOS Hermes bundles and web bundle exported successfully. These are JS bundle validations, not signed installable APK/AAB/IPA builds.
- Anonymous live RPC reads returned six real public journeys. No database writes, production test records, or changes were made.
- Browser preview verified Welcome → Discover, card photos/metadata, Search → Detail, and ordered stops with real data.
- Live searches matched `Real drive` (title), `Thenkasi` (destination), `Palode` (stop), `Jithu1043` (creator), and `sree8100` (username); a nonmatching term displayed the empty search state.
- Manual refresh preserves existing cards while loading.
- Welcome, Discover, Search and Detail were checked at 390 × 844 and 412 × 915 with no horizontal document overflow.
- No files in the web project were changed; its preexisting uncommitted README and mobile-architecture documentation remain as they were.

## Limits and device field test

An Expo Go / physical iPhone run could not be performed here: no connected test device or Android SDK/emulator was available. Browser phone dimensions verify responsive rendering, not native hardware behavior. Native keyboard avoidance/dismissal, safe-area insets, scroll performance, pull-to-refresh gesture, and persisted signed-in sessions still need a physical-device field test. Unavailable media may show a neutral fallback. Network failure and missing-data behavior are covered by loader tests; live production data was not removed/changed to simulate an empty feed.

Before field-test approval: launch Expo Go, tap Start exploring, open Search, test a stop and username, open a journey, inspect stop order/photos, pull down to refresh, and verify keyboard dismissal. The next prompts can add maps, creation, remix, native travel, media capture, memories and offline support deliberately. None of those features, permissions, Mapbox dependencies, or tokens were added here.

Existing Prompt 25 dependency advisories remain: npm reported 29 advisories (11 moderate, 18 high), including Expo/Metro tooling and Router transitives. Compatible fixes were applied in that phase; no force fix, SDK downgrade, or unverified overrides were introduced. Existing ESLint 9 / transitive uuid maintenance warnings remain. Expo compatibility checks pass. Review upstream compatible fixes before release.

The separate mobile Git repository remains on `main` with no commits, remotes or pushes. Nothing was committed or pushed in Prompt 26. The future GitHub repository has not been created.

References: [Expo SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/), [React Native FlatList](https://reactnative.dev/docs/flatlist), [Supabase React Native sessions](https://supabase.com/docs/guides/auth/quickstarts/react-native).
