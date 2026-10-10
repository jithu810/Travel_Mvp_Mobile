# Prompt 31 — Native Create Journey

Completed in D:\Travel_Mvp_Mobile on 2026-10-09. Web code, migrations, RLS and backend behavior were inspected read-only. No commit, push, deployment or native build was performed.

## Files

Created:
- src/app/create.tsx — authenticated native creation form and save/publish feedback/navigation.
- src/components/create/place-picker.tsx — labelled Mapbox destination and stop search/selection.
- src/lib/create/model.ts — form validation, explicit payload construction, stop management, preview projection and submit guard.
- src/lib/create/places.ts — permanent Geocoding v6 transport and strict coordinate projection.
- src/lib/create/queries.ts — authenticated atomic save_journey RPC.
- src/lib/create/id.ts — secure browser UUID generation with getRandomValues fallback.
- src/lib/create/id.native.ts — optional Expo Crypto native module guard and UUID generation.
- tests/create.test.mjs — 17 creation tests using fixtures/mocked transports.
- docs/mobile-create-journey.md — this report.

Modified:
- src/app/_layout.tsx — create route.
- src/app/discover.tsx — Create Journey entry.
- src/app/account.tsx — signed-in Create Journey entry.
- src/app/auth.tsx — contextual creation sign-in copy; existing return/cancellation semantics retained.
- src/components/discovery/ui.tsx — optional accessible Action label for stop controls.
- src/components/journey/map/native-map.tsx — fit updated geometry after readiness; bounds memo avoids camera resets from name/description typing.
- package.json and package-lock.json — compatible expo-crypto ~57.0.3 installed with npx expo install.
- README.md — current milestone and development-client rebuild note.

## Opening creation and authentication

Tap Create Journey in Discovery, or in signed-in Account. Signed-out entry opens the existing authentication screen above Create. Successful sign-in returns to Create and mounts the form for that account. Cancellation returns to a signed-out Create screen with a retry button; it does not automatically reopen authentication or create a database record. Back then returns to Discovery. Authentication alone never saves anything.

The existing Supabase client and SessionProvider are reused. The editor is keyed by user ID and is removed on sign-out/account change, so another account cannot inherit the previous account's form. Pending save preflight is cancelled when the editor unmounts; a started network mutation is treated as uncertain when appropriate.

## Working fields and stops

- Title: required, 1–200 trimmed characters.
- Destination: select a real Mapbox place; name, slug and actual coordinates are retained.
- Traveler type: explicit Solo/Couple/Friends/Family choice.
- Duration: integer 1–365 days.
- Journey description: optional, up to 5,000 characters.
- Stops: maximum 50; names up to 200 characters; descriptions up to 1,000; actual coordinates and available mapbox_place_id from search; optional day and 0–5 rating including zero/fractions.
- Multiple stops can have the same day. Assigned days must fit within journey duration.
- Add/remove stops; expand one stop's fields; change location through search; reorder with accessible up/down buttons. Stop IDs/content survive reordering, while save sequence is rebuilt as exactly 1,2,3…
- Duplicate selected locations/place IDs are rejected, matching the web builder.
- A manually named stop with paired null coordinates is explicitly draft-only. The inspected web validator/RPC permits such incomplete draft stops. Publishing requires every stop to have valid coordinates.
- Empty-stop guidance, selected coordinates, no-location state, field labels/placeholders, loading and errors.
- KeyboardAvoidingView on iOS, scrollable safe-area layout, handled keyboard taps and drag dismissal.
- No cover/stop photo upload in this milestone. Photos are optional in the existing save/publish validation; forms remain complete without them.

Search reuses the web's https://api.mapbox.com/search/geocode/v6/forward endpoint, permanent=true, existing public token, geographic destination types, five-result limit, English labels and selected destination proximity for stops. Explicit Search limits requests while typing. In-flight results are aborted/invalidated when query changes, selection changes, saving disables the form, or the picker unmounts. Malformed results, missing tokens and invalid coordinates fail visibly instead of using fabricated locations.

Geocoding v6 searches towns/regions/streets/addresses; it is not a POI Search Box integration. This matches the inspected web transport. See [Mapbox API documentation](https://docs.mapbox.com/api/search/geocoding/).

## Map preview

Creation reuses the existing JourneyMap with a stable projection of ID/order/name/coordinates. Description, day and rating edits do not rebuild preview geometry. Valid numbered markers and planned segments use the same existing map-data rules; missing coordinates break lines. Adding/removing/changing locations updates the map and fits bounds when ready. Reordering updates marker numbers and planned segments. No road directions, location permission, live GPS or Travel Mode.

The existing native import guard, map fallback, marker selection, fit control and styling remain. Only native-map.tsx needed a small compatible camera update. journey-map.native.tsx, journey-map.tsx, map-frame.tsx and map-data.ts hashes match the previous milestone baseline.

## Save Draft and Publish

The form generates UUIDs before submission, as the web builder does, and retains them for retries. Native IDs use Expo Crypto's randomUUID; browser IDs use secure Web Crypto. No server-generated-ID substitute or new RPC was invented.

Save calls the existing authenticated save_journey({payload}). The inspected latest function in 20261004000000_field_test_destinations.sql is SECURITY INVOKER and atomic: it validates ownership/version/destination/stops/media, inserts/updates the owned journey and replaces its ordered stop collection within the same transaction. auth.uid assigns ownership; mobile does not send user_id. Existing RLS and updated_at concurrency checks remain in force. Mobile never mutates an original Remix source or sends lineage/social/travel data.

Save Draft sends status=draft and allows zero stops or paired-null stop coordinates. Publish sends status=published only after the web-aligned required fields and at least one fully located stop validate. The RPC persists details and all stops before its transaction makes the journey public. It returns id/status/updated_at; the app confirms that ID and requested status and validates the version timestamp before showing success.

Confirmed drafts open /draft/[id] and remain available through Account after restart/sign-in. Confirmed publication opens /journey/[id]. After publication the creation form becomes a success/view state, preventing Back from accidentally unpublishing it. Back from a draft view can continue the same still-mounted new-journey form using its confirmed updated_at; this is not an editor for arbitrary existing journeys. Reopening saved drafts through Account remains read-only, as does reopening Remix copies.

Rapid taps are synchronously locked. Fields/actions are disabled while saving. Validation or confirmed rollback failures preserve all input and allow safe retry using the same IDs. Unknown transport/incomplete response failures disable further writes and direct the user to Account, plus the public route for an uncertain publication. Version conflicts also stop writes. No blind retry or false success is shown. A retry after a process restart requires checking Account/public results first; unsaved form data is memory-only, with offline persistence intentionally deferred.

## Native client requirement

Expo Crypto is a native dependency. Rebuild the existing development client before testing Create Journey on the Android phone; use the existing project development-build workflow or npx expo run:android on a machine with the Android SDK. No app.json, EAS project, package identity or Mapbox version/configuration changes were made.

The native UUID adapter uses requireOptionalNativeModule so an older client cannot crash the whole application at module import. If ExpoCrypto is missing, authenticated Create displays an update message; browsing/auth/social/private views remain available. Expo Go has SDK-compatible Crypto but retains the established Mapbox fallback. Web needs secure Web Crypto (localhost/HTTPS, with a getRandomValues fallback where available). See [Expo SDK 57 Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/).

## Verification

- TypeScript: passed.
- ESLint with zero warnings: passed.
- Full unit suite: 79/79 passed, including 62 prior auth/session/social/profile/Remix/private/map/story/discovery regressions and 17 new creation tests.
- New tests cover required-field/range validation, private/public differences, optional rating/day values, repeated days, stop limits/IDs, duplicate location rejection, immutable reordering/removal projections, exact sequence/payload fields, actual coordinate ordering, missing-coordinate line gaps, permanent v6 request parameters, malformed/error search responses, synchronous save locks, safe/uncertain failures, auth enforcement, returned status/version checks, route expectations, secure v4 UUIDs and cancelled saves.
- Expo Doctor: 21/21 passed.
- Expo dependency compatibility: packages up to date.
- Android/iOS Hermes and web exports: passed. Bundle checks are not signed installable native builds or physical-device tests.
- One real read-only Mapbox request for Kochi returned coordinates and available Mapbox IDs, using permanent=true and the configured token. No Supabase writes were made.
- Browser preview at localhost:8086 verified Discovery's Create entry, automatic signed-out authentication, contextual sign-in copy, cancellation back to Create without a loop, and back to Discovery. Authentication pages at 390×844 and 412×915 had no horizontal document overflow. Public Story still showed Like, Save, Share, Use, Remix, map fallback and ordered stops. Browser console error check returned no errors.
- The authenticated creation form, native keyboard/map interactions, live save and live publication were not exercised through a real signed-in session. Form/save/publication logic used synthetic test fixtures and mocked Supabase transports.
- Web Git status remains its preexisting modified README.md and untracked docs/mobile-architecture.md. Mobile's preexisting intent-to-add eas.json remains unchanged. No staging/commit/push/deployment.
- Existing 30 npm audit advisories (11 moderate, 19 high) remain; no forced upgrade or SDK override was introduced.

## Manual field test

1. Rebuild/install the development client with Expo Crypto and sign in. Verify old-client update guard if using the earlier build.
2. Create from Discovery/Account, fill required fields, search/select destination and stops, inspect true coordinates and place IDs.
3. Add multiple stops on one day; edit names/descriptions/day/rating; reorder/remove; inspect native marker numbers, fit and line gaps.
4. Trigger validation errors and verify values remain; save a designated test draft, check exact order/fields/private ownership and Account access after restart.
5. Confirm incomplete/unlocated stops cannot publish. Publish a valid designated test journey; verify public Story/discovery and that Back cannot turn it private.
6. Rapid-tap saves; simulate connection loss and version conflict; check Account/public result before retrying an uncertain save.
7. Verify auth cancellation/return, sign-out/account change, secure keyboard/safe areas, existing social/sharing/profile/Remix/source attribution and Mapbox behavior.

No essential backend contract blocker was found in the inspected web implementation. Live backend/device confirmation remains pending. Photos, a full editor for previously saved journeys, offline drafts and Travel Mode remain deferred. Prompt 32 has not been started.
