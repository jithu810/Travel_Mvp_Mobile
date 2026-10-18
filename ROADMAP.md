# Journey Creator Mobile — roadmap

## Account/Profile travel design and compact Create drafts — 2026-10-18

- IMPLEMENTED: Shared Account/public Profile presentation now uses the existing paper/green palette, app logo, JourneyPhoto avatars/covers, native icon treatments, rounded raised surfaces and gradient buttons. A static atlas/globe motif uses decorative native Views only, with no additional renderer, map/location request or animation. Compact toolbar retains back/settings; the nonfunctional notification placeholder is removed.
- IDENTITY/ACTIONS: Real profile and existing metadata fallbacks retained. Names occupy up to two lines with their full accessibility label. Long bios have explicit More/Less controls. Edit profile and New journey reuse existing navigation. Published/Drafts count tiles form the single accessible Account tab selector using loaded list lengths; unavailable counts show a dash, not a false zero. Existing queries and authentication are unchanged.
- DRAFTS: Account keeps deletion inside each card, with a styled destructive confirmation, cancellation, pending lock, error feedback, exact returned-ID success check and list/count refresh. Only presentation changed; owner/status filters and shared-media preservation remain intact. This supersedes the prior entry's Create deletion placement: Create now has only its original horizontal Continue editing cards and View all. Removed Create's delete import, wrapper, feedback state and callback; original dimensions and horizontal behavior retained.
- VALIDATION: Focused interaction/component coverage includes collections, routing, account deletion refresh, long bio expansion and the absence of delete/modal rows in Create. Final full suite 531/531; TypeScript, Android/iOS/web exports and scoped git diff --check passed. Final zero-warning lint passed. Offline Expo compatibility reports dependencies up to date with its reliability caveat.
- VISUAL: Isolated exported web app inspected at 320x568, 360x640, 390x844 and 412x915 with fixture account data and intercepted backend/image requests. No real backend mutation. Cancellation, failed deletion retaining the card, successful deletion/count refresh and Create history verified. History measured 76px high with scrollHeight=clientHeight. Final compact header, consolidated collection tabs, long-bio More/Less behavior and public Profile inspected. No horizontal overflow at the four tested sizes; browser run reported no errors. At 360x640 the first complete draft card including Delete is visible above navigation. Long lists retain their existing safe scrolling. Work files are ignored under dist/profile-redesign-work and dist/profile-redesign-export.
- PENDING DEVICE: Android/iOS visual parity, safe areas/status bar, gradients/shadows, large-font wrapping, TalkBack/VoiceOver and confirmation interactions. Browser fixtures/exports are not device verification. Existing bottom-navigation layout retained. No dependency, backend, schema, RLS, RPC or web-repository changes; no commit, push, deployment or APK/native build.
- FILES: src/app/account.tsx, src/app/create.tsx, src/app/profile/[username].tsx, src/components/profile/profile-ui.tsx, new src/components/profile/profile-styles.ts, src/components/delete-draft-action.tsx, tests/profile-ui.test.mjs, tests/create-flow.test.mjs, tests/delete-draft.test.mjs, PROJECT_STATUS.md and ROADMAP.md. Existing unrelated changes preserved.


## Delete private drafts — 2026-10-18

- AUDIT: Account/Create draft cards previously only continued editing. get_account_journeys(owner_id, 'drafts') returns UUID journeys filtered by creator_id, status=draft, is_demo=false; table ownership is user_id. Existing journeys_delete_own RLS and owner SELECT permit direct authenticated deletion; no deletion RPC required. Web DELETE checks same-origin, cookie getUser, UUID and id/user_id; returns 404 on no row and 503 on failure, retaining immutable media. Mobile uses persisted Supabase authentication directly.
- RELATED DATA: Checked-in migrations cascade stops, likes, saves and travel_tracks; copied_from_journey_id uses ON DELETE SET NULL. Copies retain independent rows and durable media paths. Storage read policies recognize surviving journey references. No Storage deletion/cleanup trigger found. Deployed policy/grant parity has not been verified.
- IMPLEMENTED: Delete draft actions in Account and Create history; permanent-delete/cancel modal; duplicate-request lock; getUser check; atomic id/user_id/status=draft/is_demo=false filters; exact returned-ID confirmation; success feedback and refresh. Failed/unconfirmed requests retain card and confirmation with error feedback. Other drafts/published rows cannot match filters. No Storage objects removed.
- VALIDATION: Six focused query/component tests pass (success, cancellation, failure, wrong account, no authentication, zero-row denial, duplicate confirmation). TypeScript passed; offline Expo compatibility reports up to date with its reliability caveat. Final full suite passes 527/527; zero-warning lint, Android/iOS/web Expo exports and scoped git diff --check passed.
- PENDING: Physical Android/iOS confirmation, accessibility and network-failure checks. No live deletion, backend/schema/migration/RPC/RLS/web/dependency change, APK/native build, commit, push or deployment.
- FILES: src/lib/remix/delete-draft.ts, src/components/delete-draft-action.tsx, src/components/profile/profile-ui.tsx, src/app/account.tsx, src/app/create.tsx, tests/delete-draft.test.mjs, tests/create-flow.test.mjs and tests/profile-ui.test.mjs (fixture integration), PROJECT_STATUS.md, ROADMAP.md. Existing unrelated changes preserved.


## Shared mobile sign-in design — 2026-10-18

- [x] Reuse registration scenery/styles and viewport/keyboard behavior for sign-in; preserve contextual text, auth handlers and both navigation links.
- [x] Pass 26 auth tests, TypeScript, lint, Android/iOS/web exports and offline dependency compatibility (offline reliability caveat).
- [x] Inspect both modes at inset-aware 320x568 through 412x915; sign-in also fits 320x480, with reachable scrolling fallback at 320x360.
- [x] Record user-reported physical Android verification of the preceding sign-up design.
- [ ] Verify the new sign-in on physical Android: keyboard, focus/action access, safe areas, large fonts and TalkBack. No APK build requested or performed.

## Mobile registration viewport fit — 2026-10-18

- [x] Replace fixed hero height/cumulative spacing with measured viewport fit, compact grouping and surplus-only scenic space; retain native touch targets and readable inputs.
- [x] Permit scroll only for actual overflow and add keyboard focus reveal/avoidance without changing authentication or navigation.
- [x] Pass 23 auth tests, TypeScript, zero-warning lint, Android/iOS/web exports and offline compatibility check (offline reliability caveat).
- [x] Inspect exported UI with simulated system insets: zero-scroll controls at 320x568 through 412x915; verify reachable short-screen fallback at 320x480.
- [ ] Verify physical Android keyboard, insets, large fonts and TalkBack on the installed development client. No new APK requested or built.

## Mobile registration reference UI — 2026-10-18

- [x] Adapt the confirmed sunset-road reference to native registration only; retain email registration, sign-in switching and return navigation.
- [x] Add official Google logo and disabled Continue with Google placeholder; no OAuth/provider wiring or false success.
- [x] Pass 21 focused auth tests, TypeScript, zero-warning lint, Android/iOS/web Expo exports and scoped whitespace checks; offline compatibility check reports dependencies up to date with its reliability caveat.
- [ ] On the existing development client, check small screens, keyboard scrolling, large fonts, TalkBack, safe areas, backdrop/gradient appearance, back navigation and email confirmation UI. No physical run or APK build performed.
- [ ] Google authentication remains explicitly deferred.

## Travel Mode GPS reliability and direction — 2026-10-18

- IMPLEMENTED: Foreground watcher errors/no-fix timeouts automatically reconnect at 2/4/8/16/30-second delays, capped at 30 seconds while active, focused and foregrounded. Rechecks existing permission/services without automatic permission prompts; denial stops retries, disabled services remain distinguishable and are rechecked. Generation guards, a pending-watch lock, late-subscription removal, session-itinerary identity and retry/watchdog cleanup prevent overlapping watchers and obsolete callbacks. Synchronous Pause during publication cannot leave a watchdog behind.
- GUIDANCE: Sustained precise, plausible held-progress readings (at least three, spaced >=2 seconds, spanning >=8 seconds, gaps <=5 seconds) can request a replacement driving route to the same stop. Existing cancellation, 30-second reroute cooldown and 15-second request timeout apply. Never snaps to a nearest later maneuver. Whole-route proximity cannot cancel a progress-recovery request or automatically retry its failure. Ordinary off-route recovery retains its existing behavior. GPS-quality holds retain accepted route/progress internally; existing UI eligibility hides the route for >50 m accuracy or >15-second age, and instructions require <=25 m accuracy. Failed/outdated references remain separate and are discarded on GPS ineligibility; failed requests require explicit Retry.
- ARRIVAL PRESERVED: Haversine device-to-active-stop distance + reported accuracy <=50 m; <=25 m accuracy, <=15-second age, at least three readings across six seconds and existing plausibility/continuity safeguards. GPS offers a prompt only. Manual completion remains explicit, ordered and independent of GPS distance. No arrival/controller/store production rules changed.
- MAP: Follow zoom 16 (existing maximum); location dot radius 5/stroke 2, halo radius 9/opacity 0.18, location source above road/planned routes and stop layers. Expo heading and speed retained. A map-aligned compact pointer uses provider course after two eligible samples >=2 and <=5 seconds apart, accuracy <=25 m, age <=15 seconds, speed 1.5–55 m/s and course change <=60 degrees. Subsequent rotation uses 50% shortest-angle smoothing, including 359/1 wraparound. Missing/invalid course, slow/stationary movement, poor accuracy, long gaps or abrupt direction changes restore the dot; existing >50 m/>15-second position hiding remains. Manual exploration/recenter preserved. No GPS history/trail exists; driving and dashed planned connections remain.
- VALIDATED: Final focused suite 102/102; full suite 511/511; TypeScript and zero-warning lint; final Android Hermes export (4.3 MB); git diff --check. Added timeout/error recovery, capped backoff, synchronous errors, cancellation races, unresolved watch startup, exact missed-turn, no retry loop, accuracy transitions, backward/parallel/multi-turn, arrival boundary/co-located stop and rendered marker tests. Updated old UI expectations for new status wording/zoom and retained-route semantics. React component review found no new subscriptions, hooks or dependencies in the renderer.
- COMPATIBILITY LIMIT: Offline Expo install --check reported dependencies up to date with its explicit offline-reliability warning. This does not establish current online compatibility or resolve historical patch-mismatch notes. No packages changed.
- PENDING PHYSICAL ANDROID: On the installed development client, confirm latest JS revision; test GPS interruptions of 6/16/>30 seconds, services off/on, revoked/approximate permissions, recovery without tapping Retry, missed turns/multiple turns, offline Directions failure and explicit Retry, stop approach at 100/75/50/25 m, nearby/co-located stops, stale/double confirmation, direction at walk/stop/turn and north wraparound, rotated map, zoom/gesture/recenter, Pause/Resume/Finish/background/blur and final-stop cleanup. Export/mocks are not native device validation; no physical run or native build was performed.
- SCOPE: Eight application files (foreground-location, location-port.native, use-trip-location, navigation, turn-guidance, travel-camera, map-frame, native-map), five test files (new travel-recovery plus foreground-location/navigation/turn-guidance/story-interaction), PROJECT_STATUS.md and ROADMAP.md. Backend, schemas, contracts, access rules, dependencies and existing arrival thresholds unchanged. No EAS build, commit, push or deployment. Await review before additional changes.

## Published Journey final refinements — 2026-10-17

- IMPLEMENTED: Compact tappable title/About header, full-width map, smaller 230dp swipe deck with uncropped photo area, synchronized existing map/card selection, and authoritative Like count. Save count omitted because the existing contract exposes only the viewer's saved state.
- REUSE: Existing JourneyMap, Home photo/route overlays, StorySheet, StopTimeline and social/navigation handlers. Shared nearbyFocus and NearbyLocations chooser handle overlapping points on Home, editor and public maps without changing stored coordinates; zoom capped at 16. Home overlapping marker tap zooms first, subsequent tap opens journey.
- SHARING: User approved expo-sharing ~57.0.23 and react-native-view-shot 5.1.0. Share freezes the selected memory and previews bundled-logo/title/location/public-URL artwork; local 1080x1920 PNG capture opens the native file chooser. Separate link action and selectable URL remain. Missing/failed photos and unavailable native modules fall back to link sharing. No media upload, QR/shortener, or clickable-image guarantee.
- VALIDATION: Focused map/story checks 131/131, navigation 15/15, sharing 5/5; final full suite 493/493. TypeScript, zero-warning lint, Android Hermes export and git diff --check passed. Expo compatibility still reports five existing patch mismatches (expo, expo-asset, expo-constants, expo-linking, expo-router); no automatic upgrades applied.
- PENDING DEVICE: Refreshed native development client required for the two libraries. Verify capture/layout, WhatsApp/Instagram chooser handoff and cancellation, nearby zoom/chooser, map/card gestures, reduced motion, backgrounding, small screens/large fonts and TalkBack. Projected overlap is an estimate at globe pitch/rotation. No physical-device result claimed.
- No backend/schema/persistence/auth changes, commit, push, deployment or EAS build. Existing uncommitted work preserved.

## Published Journey map-first redesign — 2026-10-17

- IMPLEMENTED: Removed public cover header; bounded interactive map leads a scrollable story and single-card deck. Title, creator, destination, duration, traveler type and description retained. Fixed bottom SocialActions/StoryCreator and Start Journey preserve sharing, Like/Save, profile and existing Travel Mode eligibility/navigation. Options, About, refresh, Remix and full story viewer retained.
- REUSE: JourneyMap/NativeJourneyMap, editor memoryPhotos path, Home JourneyOverlays/PhotoPin/TravelingPlane and playback/camera cleanup. Public-only opt-in permits initial playback with the first card selected; user selection stops idle travel and focuses its marker. Other screens retain defaults. Numbered markers remain for missing/failed photos; gaps and insufficient routes are handled by existing map data.
- CARDS: StopTimeline opt-in stacked appearance, native full-width paging/directional lock, shared selection, 44dp Previous/Next controls, reduced-motion-aware external scrolling. Original order, details and JourneyPhoto fallback preserved.
- VALIDATION: Focused map/story tests58/58 and full suite486/486 passed. TypeScript, zero-warning lint, Android Hermes export and whitespace checks passed. Expo compatibility reports the same five pre-existing patch mismatches; no dependency changes.
- LIMITS: Data supplies planned stop connections, not road geometry/recorded GPS. Deck uses lightweight native paging rather than physics-based throwaway cards. Physical Android gesture arbitration, photos, map/card synchronization, reduced motion/backgrounding, small screens/large fonts, TalkBack and action handoff remain pending.
- FILES: public journey screen, stop-timeline, map-frame, journey-map.native, native-map, story-interaction/map tests and project notes. No backend/schema/persistence/auth changes, commit, push, deployment or EAS build.

## Edit Journey settings popup — 2026-10-17

- IMPLEMENTED: Expanded settings replaced with a transparent keyboard-aware bottom sheet. Reuses QuickJourneySetup destination/title/companions/duration controls, PlacePicker and Action, with an edit-only description field and pale-blue styling. Creation defaults preserved.
- BEHAVIOR: Close/Android Back retain live unsaved form edits. Save Changes uses existing full private draft/photo save and closes on success only; validation/errors remain visible. Save/photo locks prevent dismissal. Memory page stays mounted; decorative map playback pauses while settings are open.
- VALIDATION: Focused editor tests51/51 and full suite485/485 passed; TypeScript, zero-warning lint and Android Hermes export passed. No backend/schema/data/dependency changes or commit/push/deploy/EAS build.
- PENDING: Physical Android keyboard/small-screen/large-text scrolling, suggestions, TalkBack focus and dismissal checks.

## Add Memory popup visual refinement — 2026-10-17

- IMPLEMENTED: Popup-only pale blue/cream gradient surface, navy heading, separate raised location shortcuts, inset inputs, blue Search, raised photo tools and purple-to-blue Save. Compact spacing, safe-area keyboard avoidance, scrollable fields and fixed Save footer retained. Shared control styles opt in only through memorySheet; cover/Create/Home defaults unchanged.
- PRESERVED: Existing name/location, notes, day, rating, gallery/camera/upload/previews/removal, save/edit validation, loading/errors, persistence and dismissal handlers. No dependencies, backend, schema or API changes.
- VALIDATED: 135/135 focused create, memory location and photo tests; TypeScript, zero-warning lint and Android Hermes export passed. No commit, push, deployment or EAS build.
- PENDING: Physical Android appearance, keyboard, small-screen and large-font checks. Automated tests/export do not establish device visual fidelity.
- FILES: memory-editor-sheet.tsx, photo-field.tsx, place-picker.tsx, discovery/ui.tsx, create.tsx (memory photo styling opt-in), and these project notes.

## Memory map photo markers and calm playback — 2026-10-17

- [x] Compact 44dp Save Draft/Publish controls with original actions and validation.
- [x] Reuse Home photo annotations and travel playback only for the editor; separate photo updates from map geometry and connect memory selection/card browsing to existing camera transitions.
- [x] Calm 8400ms-leg planned route indicator, gesture/selection/sheet/save/focus/background/reduced-motion guards; missing/failed photo circles and coordinate-gap handling preserved.
- [x] Retain lightweight airplane after inspecting available assets; optional future 2D Mapbox sprite, no 3D work.
- [x] Focused map/editor/Home tests113/113 and navigation tests15/15 passed; final full suite483/483 passed. TypeScript, zero-warning repository lint, Android Hermes export (4.3 MB), and scoped staging/whitespace checks passed. Expo compatibility reports the same five pre-existing patch mismatches (expo, expo-asset, expo-constants, expo-linking, expo-router); no dependencies were changed.
- [ ] Physical Android annotation/image performance, gesture arbitration, selection flights, inactive cleanup and small-screen button field checks.

## Branded initial loading experience — 2026-10-16

- [x] Bundled-logo navy loader, conservative reduced-motion handling, native pulse cleanup, compact globe variant and bounded non-remounting startup overlay.
- [x] Integrate genuine first-data loads across main/detail/profile/editor screens; retain refresh/retry content, existing routes, Mapbox readiness/fallbacks and optional image placeholders.
- [x] Fix first-focus empty-content flash and timeout settlement for transports ignoring abort; test late completion, ownership changes and retained data.
- [x] Full regression suite: 480/480 passed. Home/Search readiness suite: 16/16 passed. Final animation/readiness retest: 5/5 passed. Final TypeScript and Android Hermes export (4.3 MB) passed. Repository lint identified only loader ref-access errors; these were corrected and the changed loader passed a zero-warning lint recheck. Scoped staging and whitespace checks passed.
- [ ] Physical Android cold-start, slow/offline data/map, tab revisit, TalkBack/reduced-motion and cached-image field checks.

## Existing journey editor visual redesign — 2026-10-16

- [x] Cream/pastel editor, actual-cover hero, compact cover tools and horizontal memory cards with real metadata; retain edit/settings/back and every memory operation.
- [x] Keep private Save Draft, validated Publish Journey and Add memory visible in the existing fixed footer; retain all storage/data/navigation semantics.
- [x] Full 475/475 tests (including two new horizontal-card regressions), TypeScript, zero-warning lint, Android Hermes export (4.3 MB), and scoped whitespace/staging checks passed. Phone-width layout contracts cover 320/360/393/412 px; real device gestures and visuals remain pending.
- [ ] Physical Android horizontal scrolling, expanded text, keyboard/sheet interactions and complete live draft/memory/photo/publish field testing.

## Create Journey reference styling — 2026-10-16

- [x] Apply raised off-white form, pastel controls, gradient Create action and compact draft surface styling, retaining the live native globe and existing navigation.
- [x] Preserve search, keyboard-safe CTA, title/duration, private creation/drafts, memory/photo flows and all shared styling defaults with opt-in variants.
- [x] Full 473/473 tests, TypeScript, zero-warning lint, production Android Hermes export (4.3 MB), and scoped whitespace checks passed. Existing flow tests cover destination search/camera, title/duration, draft entry/save, memory/photo behavior and keyboard-safe layout contracts.
- [ ] Confirm native gradients/shadows, small-screen keyboard layout and full creation/draft/memory flow on physical Android. Draft photo thumbnails remain unavailable from the current ID/title-only shortcut loader.

## Home drag interrupted by late layout measurements — 2026-10-16

- [x] Reproduce card/header measurements resetting an active drag/opening spring to collapsed; earlier release tests did not cover this timing.
- [x] Keep gesture handlers and active drag frame stable; queue new geometry for settling, retarget the requested mode smoothly, cancel only for explicit interruption/unmount.
- [x] Focused24/24, full473/473, TypeScript, lint, Android export and preservation/whitespace checks passed.
- [ ] Confirm first-attempt card drag and expanded scrolling on physical Android after reloading the updated app. No positional World-button collision was found in code; native dispatch remains unverified.

## Home upward-swipe release and list handoff — 2026-10-16

- [x] Reproduce slow upward release snapping back and equal-height short-screen failure to enter vertical journeys.
- [x] Make deliberate upward release open the expanded list; preserve small-movement, downward/peek, horizontal card and open-list scrolling behavior.
- [x] Focused22/22, full471/471, TypeScript, lint, Android Hermes export and preservation/whitespace checks passed.
- [ ] Confirm release-to-expand and subsequent list scrolling on the physical Android app. No new APK/EAS build performed.

## Home polish and bottom-sheet stability — 2026-10-16

- [x] Reproduce expanded-chrome feedback and rapid-toggle defects using a stateful panel/hook harness; stabilize compact measurements, animated graph identity and pending toggle intent without new dependencies or changed gesture ownership.
- [x] Remove hero heading/subtitle, compact banner~23%, compact Home World visual~18% with44dp touch area; retain globe/search/navigation/data behavior.
- [x] Verify X history; show original Clear located journey control, disabled without selection. No invented sheet/Home dismissal.
- [x] Full468/468 tests, stability6/6, TypeScript, zero-warning lint, Android Hermes export4.3MB, scoped whitespace and startup preservation audit pass.
- [ ] Physical Android field test: repeated handle taps/drags/snaps, horizontal cards, actual flicker/smoothness, narrow/large text/keyboard/safe areas and existing globe/search/journey/navigation controls. No APK/EAS/native build performed. See PROJECT_STATUS.md for evidence and limits.

## Reference-inspired premium Home redesign — 2026-10-16

- [x] Simplify header, preserve functional inline place search/live globe, add cyan title, refined real-photo cards and compact Create banner.
- [x] Add five-item floating navigation with real Account avatar and Story reusing the existing public Search screen. Route entry params distinguish selection; Search/Story filters remain independent without duplicate lists/routes.
- [x] Measure sheet chrome/cards and banner/navigation clearance; preserve existing peek/expanded gesture behavior, errors/loading/empty states and native map padding.
- [x] Full462/462 tests; final focused69/69, TypeScript, zero-warning lint, Android Hermes export and preservation/whitespace audit passed. Five existing Expo patch mismatches remain; no dependency updates.
- [ ] Physical Android visual/interaction QA: short/narrow/large text, keyboard/suggestions, camera flights/globe controls, all five tabs/Back, CTA/journey actions, profile avatars and failure states. No APK/native/EAS build or deployment performed. See PROJECT_STATUS.md for visual limitations.

## Home inline place search and temporary companion removal — 2026-10-16

- [x] Remove only the Home companion mount and switch; preserve all companion implementation, flag/assets and saved preference.
- [x] Reuse existing Geocoding v6 picker and destination flight/marker for inline Home place/address suggestions, debounce/cancellation/loading/errors, permission-free proximity fallback and repeat selections. Preserve journey Locate, markers, rail, account and navigation.
- [x] Full459/459 tests, TypeScript and zero-warning lint passed; one live existing-adapter search returned five coordinate-bearing Kochi results; Android Hermes export passed. Existing five Expo patch mismatches remain without upgrades. See PROJECT_STATUS.md for details and preservation evidence.
- [ ] Physical Android search/keyboard/overlay/camera/marker/lifecycle and Home regression QA. General POI/landmark search is unsupported by the current Geocoding v6 API; no new search endpoint/service added. No native/EAS build, commits, deployment or backend changes.


## Standalone Android field-test APK preparation — 2026-10-16

- [x] Configure explicit internal standalone preview APK using EAS preview environment; retain development/production profiles and installed app identity.
- [x] Derive launcher/adaptive icons from existing branding, retain in-app logo, update splash branding and verify full adaptive foreground fits Android safe circle. EAS prebuild generates native resources.
- [x] Inspect runtime/env/network: no application local endpoints or dev-only functionality requirement. Four existing local service variables are MISSING remotely at both EAS preview project/account scopes. Optional companion flag/default unchanged; no remote configuration writes.
- [x] Typecheck/lint, focused174/174, full455/455, production Android export6.8MB, Expo introspection, config/preservation assertions and whitespace checks pass. Doctor20/21 retains five pre-existing patch mismatches; dependencies unchanged.
- [ ] Before build: review docs/android-field-test.md and configure the four public service values in EAS preview. Review existing compatibility warnings; no automated upgrade. Start EAS only after owner review; no build was started here.
- [ ] Build/install NEW preview APK; validate laptop/Metro-off cold start over cellular, branded launcher/splash, maps/navigation/auth/photo/upload/foreground GPS/Travel/lifecycle/accessibility and network loss. No offline-map/GPS-accuracy/native-build/device success claim. adb absent from PATH; direct APK download is supported. See exact commands/checklist in docs/android-field-test.md.


## Create destination globe and search layout — 2026-10-16

- [x] Enlarge responsive Create globe using existing Mapbox; enable native gestures and selected-point flyTo/marker with repeat-selection and layout/lifecycle guards. Default Home globe unchanged.
- [x] Move Create suggestions below search input with bounded scrolling, outside/Close cancellation and existing search icon; compact44dp CTA, keyboard72dp map and temporary draft hiding. Preserve horizontal history and all existing creation/data/photo behavior.
- [x] Focused109/109, full455/455, typecheck, zero-warning lint, Android export and preservation/whitespace checks passed. Nearby context uses only existing Satellite Streets/Outdoors labels; point-only selections cannot fit country bounds. Existing five Expo patch mismatches retained.
- [ ] Physical Android verification of actual flights/markers/rapid selection/gestures/keyboard/results/safe-area/large text on small and large screens, including supplied viewport; Home regression. Export and mocked tests do not establish native visual correctness. No native build/EAS/commit/push/deploy.


## Functional Edit Profile — 2026-10-16

- [x] Verify existing authenticated profiles update and profile-avatars owner insert/signing contracts; enable owner Edit Profile and implement real display name/username/bio/avatar prefill/preview/explicit persistence.
- [x] Reuse unchanged photo conversion/validation, immutable owner uploads, strict returned-row confirmation, repeated-save/timeout/uncertain-write/discard guards and authoritative Profile refresh by ID. No backend/schema/policy/dependency/photo-flow changes; no unsupported location field.
- [x] Focused49/49, full452/452, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed; see PROJECT_STATUS.md for exact tests/contracts.
- [ ] Physical Android and deployed permission/storage/network/save-reopen verification remains required. Existing storage has no avatar delete policy; unreferenced uploads may remain. Existing Expo patch mismatches retained. No live writes/build/commit/push/deploy.


## Reference-inspired Profile and Account redesign — 2026-10-16

- [x] Follow owner reference: navy toolbar, real circular avatar/identity/count, divider, personal heading, Published/Drafts pills and compact horizontal-content journey cards on cream. Preserve owner/private gates, real data/navigation/refresh/auth/sign-out and existing bottom navigation.
- [x] Reuse existing published RPC/normalization/media signing in a read-only wrapper; no backend/config/dependency/photo-processing changes. Account defaults Drafts for existing Create navigation. Edit profile/notifications remain visibly unavailable; no fake fields/private draft photos/stats.
- [x] Focused41/41, full444/444, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Tests are mocked/structural; see PROJECT_STATUS.md for source limitations and exact cases.
- [ ] Physical Android reference/large text/safe area/avatar/cards/tabs/settings/auth/sign-out/refresh/create/resume verification required. Account needs known session handle to resolve public profile identity beyond auth metadata; existing Expo patch mismatches remain. No build/commit/push/deploy/live writes.


## Create static horizontal drafts — 2026-10-16

- [x] Follow owner's confirmed left-to-right scrolling choice. Remove Create draggable sheet entirely; center heading across balanced View all/spacer slots and retain static horizontal draft resume cards.
- [x] Focused59/59, full438/438, typecheck, zero-warning lint, Android export, diff/whitespace and four-file preservation audit passed. Home sheet/globe/form/save/photo/backend/dependencies untouched; see PROJECT_STATUS.md for exact evidence and cases.
- [ ] Physical Android visual/native horizontal gesture, long-title/large-text/keyboard/short-screen/Create/navbar verification remains required. Existing five Expo patch mismatches retained. No commit/push/deploy/EAS/native build/live writes.


## Saved editor action layout polish — 2026-10-15

- [x] Balance Save/Publish into equal-width secondary controls; retain full-width Add memory primary action, fixed footer, existing handlers/guards and navigation clearance.
- [x] Focused88/88, full438/438, typecheck, zero-warning lint, Android export, diff/whitespace and preservation audit passed.320/360/393/412dp structural layout coverage; photo processing and unrelated work untouched.
- [ ] Physical Android visual/large-text/keyboard/action-state verification remains required. No commit/push/deploy/build/live writes; see PROJECT_STATUS.md.


## Create drafts gap correction — 2026-10-15

- [x] Remove automatic top margin that pushed collapsed history down. Keep a fixed small gap below the form; show one collapsed draft at136dp when available area >=496dp, otherwise use56dp header. Preserve shared sheet gestures, View all, expanded scrolling and Create/navigation access.
- [x] Focused59/59, full438/438, typecheck, zero-warning lint, Android export, whitespace and four-file preservation audit passed. Photo processing/Home/globe/backend/dependencies untouched; see PROJECT_STATUS.md.
- [ ] Physical Android visual/native-touch, long text/keyboard/orientation and collapse-after-scrolling checks remain required. No commit/push/deploy/build/live writes.


## Create globe clearance and shared drafts sheet — 2026-10-15

- [x] Remove initial Create back/title/subtitle obstruction; keep full shared-margin measured globe viewport and unchanged renderer/configuration.
- [x] Reuse actual Home sheet hook with optional Create snap sizes,56dp collapsed header, accessible View all, bounded expanded scrolling list, original draft actions and protected Create/navbar space.
- [x] Final focused59/59, full438/438, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Home defaults/photo processing/UI/backend/dependencies retained; see PROJECT_STATUS.md for responsive cases and exact behavior.
- [ ] Physical Android visual/native-touch, safe-area/keyboard/large-text/orientation, creation/resume and Home regression verification remains required. Extremely short areas use View all when expansion is constrained; existing five Expo patch mismatches remain unchanged. No build/commit/push/deployment/live writes.


## Shared photo conversion/header regression correction — 2026-10-15

- [x] Trace camera/gallery -> shared local preparation -> explicit save -> prepared-buffer read/Storage/RPC. Historical hashes and baseline reproductions show camera fix retained, gallery pre-conversion rejection/dropped dimensions and camera-only64KiB reader coverage.
- [x] Byte-identified library HEIF uses existing bounded native JPEG encoding; strict actual output validation retained. Stale HEIF metadata with actual JPEG is verified/re-encoded. Original large-JPEG/EXIF reader extended to both sources, output inspection and exact upload buffer.
- [x] Focused113/113, full436/436, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Six new regressions cover both HEIF sources, metadata, native adapter/output bytes, unsupported/bounds/failure retention and large headers; latest UI/backend/dependencies unchanged.
- [ ] Physical cover/memory camera/library HEIF/JPEG/orientation/large-header/preview/explicit Save-reopen and failure recovery required. Native HEIF decoder/picker dimensions remain platform requirements; no new native binary expected for compatible clients.
- [ ] Expo compatibility reports existing patch mismatches (current expected Expo~57.0.30 and Router~57.0.28 plus Asset/Constants/Linking); packages retained. No live writes/build/commit/push/deployment. See PROJECT_STATUS.md.


## Editor/memory screenshot layout correction — 2026-10-15

- [x] Compare owner's current Android screenshots with reference; fix duplicate header, expanded cover tools and wrapping location row.
- [x] Integrated cover/back/status/settings header, compact expandable cover summary, equal-width icon shortcuts, correct memory address placeholder and staged photo/note/details reveal. Existing actions, save guards, loading/error back routes and data semantics preserved.
- [x] Focused117/117, full430/430, final focused117/117, typecheck, full/targeted zero-warning lint, Android export and whitespace/preservation audit passed. Width cases320/360/393/412dp are structural checks, not native screenshots.
- [ ] Phone reload/reference comparison, narrow/large-text/keyboard/TalkBack and actual expand/photo/location/name/save/discard/reopen regression required. Existing five Expo patch mismatches remain unchanged.
- [ ] No backend/dependency/native/companion changes, live writes, EAS build, commit, push or deployment. See PROJECT_STATUS.md.


## Journey editor and Add/Edit Memory reference styling — 2026-10-15

- [x] Inspect actual saved editor, memory sheet, photo/location/save/discard behavior and tests. Reference-style real cover header, sage memories/settings cards, rounded photo/memory cards and fixed Save Draft/Publish/Add Memory footer.
- [x] Rounded keyboard-aware Add/Edit sheet, grouped existing location/name/GPS actions, selected-location card, photo section, truthful1000-character note counter and existing Day/Rating details; fixed Save memory and inline search results without nested modal.
- [x] Focused114/114, full427/427 and final focused114/114 after scrolling refinement; typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Existing backend/models/photo/GPS/conflict/navigation semantics retained.
- [ ] Physical Android layout/large text/keyboard/TalkBack, cover/settings/memories/actions and real search/GPS/camera/gallery/explicit save/reopen/discard/error checks required. Existing Expo patch mismatches remain unchanged.
- [ ] Reference-only recent/nearby/date/time/multiple-photo features were not added. No dependencies/native config/live writes/EAS build/commit/push/deployment.


## Create Journey reference-inspired globe header — 2026-10-15

- [x] Adapt owner reference using existing rounded cream/sage/green identity, white form panel, pastel traveler chips and compact truthful draft rows; preserve all existing creation actions and separate scrolling.
- [x] Reuse Home DiscoveryGlobe in measured96–144dp Create header with opt-in static preview, retained attribution/lifecycle/fallback and unchanged Home defaults. No additional journey data/GPS/backend/dependency/native configuration changes.
- [x] Focused112/112, full424/424, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed; see PROJECT_STATUS.md for coverage.
- [ ] Physical Android reference appearance/globe framing/large text/keyboard/CTA/create/resume/Home-return/performance checks required. Expo compatibility retains five existing patch mismatches.
- [ ] No EAS build, live write, commit, push or deployment. Stop at this UI change.


## Create Journey single-screen compact refinement — 2026-10-15

- [x] Inspect latest redesign/title logic/tests and preserve existing work. Compact initial header, destination/title/traveler/duration controls, nonshrinking Create footer and independently scrolling history; retain existing safe-area/navigation reservation.
- [x] Bounded real-result destination modal with independent scrolling/attribution, selection, keyboard dismissal, Close and Android back; default inline place pickers unchanged. No backend/dependency/native/companion changes.
- [x] Focused55/55, full422/422, typecheck, zero-warning lint, Android export and diff/whitespace/preservation audit passed. Style-based normal-text budgets cover320x568,360x640,393x851,412x915; structural overflow and modal tests are not phone-rendering evidence.
- [ ] Physical Android sizes/insets/large text/keyboard/TalkBack/CTA/search/create/resume/error regression required. Online Expo compatibility still reports the five existing patch mismatches; dependencies retained.
- [ ] No native build, live write, commit, push or deployment. See PROJECT_STATUS.md for exact checks and limitations.


## Create Journey setup UI refinement — 2026-10-15

- [x] Inspect existing setup/editor, Mapbox search, validation/save guards, measured bottom-navigation clearance and owner-only private-draft history; preserve unrelated work.
- [x] Sage destination card, selected-place summary, white compact details card, accessible traveler/day controls, Create my journey CTA and compact real draft resume cards; no new assets/data or backend changes.
- [x] Focused51/51, full418/418, typecheck, full zero-warning lint, Android Hermes export and diff/explicit whitespace/preservation checks passed. Final focused checks cover the presentation refinements.
- [ ] Expo online compatibility check reports five existing patch mismatches; dependencies retained. See PROJECT_STATUS.md for exact versions.
- [ ] Physical Android layout/large-text/TalkBack/keyboard/CTA clearance and actual creation/resume regression remain required. No native build, live writes, commit, push or deployment.


## 3D Travel Companion — Milestone 4: Home ON/OFF preference — 2026-10-14

- [x] Inspect existing flag, Home controls and AsyncStorage use/tests. Add one compact normal-flow Travel Companion switch row below the existing Home header; no separate settings route or covering map/navigation controls.
- [x] Persist device-local ON/OFF in isolated AsyncStorage key; startup hidden until loaded, 2-second failure timeout, serialized writes and stale-result/unmount safety with truthful error states.
- [x] Saved preference overrides the old environment flag. Flag is only fresh-install default; Android/native ExpoGL capability checks remain with disabled Unavailable switch on unsupported clients.
- [x] OFF synchronously stops frames then unmounts companion/bubble/Restore and clears guide; ON starts fresh existing behavior. Preserve temporary Hide/Restore, greeting Close, animation/lifecycle/Reduce Motion and all Home interactions.
- [x] Final focused 42/42, full 416/416, typecheck, zero-warning lint, Expo compatibility and Android export with flag=false (1,945 modules; unchanged GLB/PNG) passed. Generated Expo route-type cache regenerated without route/config changes. See PROJECT_STATUS.md/report for preservation checks.
- [ ] Physical Android: switch placement/accessibility, OFF in each interaction stage, ON restoration, restart persistence/no saved-OFF flash, map/navigation gestures, short screen/large text, background/blur and repeated resource cleanup cycles.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 3B: point toward Create Journey — 2026-10-14

- [x] Inspect actual GLB and Home navigation. Preserve 2.6-second wave; append a safe downward arm cue/hold/idle return using existing rig and controller. Mitten hand has no index-finger rig.
- [x] Keep explorer globe-side; pause floating for the complete sequence; preserve idle/breathing, repeated-tap guard, Hide/Restore, lifecycle cleanup and static Reduce Motion.
- [x] Temporary friendly point-phase bubble names Create Journey. Optional non-interactive border/tint is anchored inside the actual existing third navigation button; no coordinate guessing, layout/route/tap changes, arrow across the map or automatic navigation.
- [x] Guide clears on Close, completion, Hide/blur/background/unmount/failure and Reduce Motion; other screens default to no guide.
- [x] Focused 34/34, full 408/408 and typecheck passed; real-GLB stance/framing/transition and guide/button tests included. Zero-warning lint, Expo compatibility, enabled Android export (1,942 modules), diff/explicit whitespace and preservation audit also passed. See PROJECT_STATUS.md.
- [ ] Physical Android: gesture readability and target clarity, repeated taps/Close/Hide/Restore, globe and Create Journey taps, sheet/layout/accessibility/lifecycle interruptions and performance. Desktop/CPU checks do not verify phone behavior.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 3A: greeting wave — 2026-10-14

- [x] Owner confirms physical Android M2 explorer/floating/breathing/head motion and tap greeting. Wave is separately pending physical verification.
- [x] Inspect actual Idle-only GLB and validated right-arm Bone chain; add one short smoothly blended procedural wave without replacing asset or modifying joint translations/scales/IK.
- [x] Ignore overlapping tap requests; pause floating during wave, reduce competing upper-body sway, restore authored arm on finish/interruption. Greeting/Close, fixed Restore, gesture layering and default-off flag retained.
- [x] Existing driver only; synchronous Hide/background/blur cancellation, unmount/resource cleanup, static Reduce Motion and safe effect replay.
- [x] Focused 31/31, full 405/405, typecheck, zero-warning lint and Expo compatibility passed. Real-GLB CPU pose/stance/framing tests and desktop pose preview are automated/desktop evidence only. Enabled Android export (1,942 modules), diff/explicit whitespace and baseline preservation audit passed. See PROJECT_STATUS.md.
- [ ] Physical Android wave: natural raised-hand motion/idle return, repeated taps, greeting Close during playback, Hide/Restore, globe gestures, sheet/background/blur interruptions, Reduce Motion before/during wave and sustained performance.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 2 — 2026-10-14

- [x] Owner confirms M1.1 Android explorer rendering, closable greeting and globe zoom after resolver fix. This does not validate the new Milestone 2 motion.
- [x] Restrained deterministic floating within measured safe clearance; at most 18 dp left/12 dp down, slow cycles and speed limit. Greeting follows/freeze-on-open, press pause, resize clamp and measured larger-text height. Existing fixed Restore anchor and gesture layering preserved.
- [x] Inspect actual Idle/skeleton; retain GLB and slow Idle to 0.4 speed, adding non-accumulating chest/head motion. Feet remain authored; no facial-animation claim. Shared 30 Hz driver, no new dependencies/loops; lifecycle pause/resume and reduced-motion static pose.
- [x] Final focused 26/26, full 400/400, typecheck, zero-warning lint, Expo compatibility, Android export and whitespace checks passed; real-model CPU motion/framing checks and desktop pose inspection. See PROJECT_STATUS.md.
- [ ] Physical Android: comfort/visibility/taps/greeting/Hide/Restore, globe and journey controls, sheet/short-screen/large-text clearance, Reduce Motion, background/blur/resume, interruption cleanup and sustained performance. New motion is not device-verified.
- [ ] Milestone 3 remains out of scope and unstarted. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 1.1: shared Android Three runtime — 2026-10-14

- [x] Narrow Android bare-three resolver canonicalizes to Fiber-patched three.cjs; Expo delegation, addon paths, assets and other platforms preserved. Dependencies/model/Home/Restore/flag unchanged.
- [x] Restart Metro with cleared cache, retaining existing enabled flag; live graph proves companion, Fiber native/core and GLTFLoader share one module ID with no ESM Three build.
- [x] Focused 19/19; full 393/393; typecheck; zero-warning lint; Expo compatibility; Android export with GLB/PNG; diff and task-file whitespace checks passed. Native adapter/addon CPU regression included. See PROJECT_STATUS.md.
- [ ] Owner Android retest: visible textured idle explorer, no multiple-Three warning, transparent background, greeting/Hide/Restore, unchanged Home/Mapbox controls and lifecycle behavior. Physical rendering remains unverified.
- [ ] Milestone 2 remains separately approval-gated and unstarted. No EAS build, commits, pushes or deployment.


## 3D Travel Companion — Milestone 1 — 2026-10-14

- [x] Default-OFF isolated Android Home fixed companion overlay, verified CC0 KayKit-derived local idle GLB, original backpack, transparent renderer, tap greeting and minimize/restore.
- [x] Pinned Fiber9.8.1/Three0.184.0/ExpoGL57.0.2/Asset57.0.19/types0.184.0 without Expo/RN upgrade or peer overrides; additive Expo Metro GLB configuration.
- [x] Safe layout/touch gates, missing-native/import/load/render fallback, synchronous frame cancellation on blur/background/minimize, Reduce Motion single pose, late-load/resource cleanup.
- [x] Focused15/15; full389/389; typecheck; zero-warning lint; Expo dependency check; diff and task-file whitespace checks; enabled Android Metro/Hermes export with bundled GLB+PNG. Browser asset preview only; no native/device verification. See PROJECT_STATUS.md.
- [ ] Build/install new ExpoGL-enabled Android development client, enable flag explicitly, and complete physical rendering/Mapbox gesture/lifecycle/accessibility/memory/battery checklist. No EAS build started.
- [ ] Milestone2 floating movement requires separate owner approval; not begun.


Updated 2026-10-13. See PROJECT_STATUS.md for evidence and AGENTS.md for boundaries.

## Persistent Android camera failure: evidence-driven follow-up - 2026-10-14
- [x] Fresh owner device logs identify readable2,913,299-byte JPEG3072x4096 rejected at source-validate before native manipulation. HEIC/zero dimensions are not the cause of that capture. Reproduced64KiB prefix/large-metadata rejection and added bounded camera-only JPEG structural reading with preserved EXIF orientation and actual native encoding/output validation. Post-fix device logs now confirm dimensionOffset458,560 and ready; see the physical result below.
- [x] Separately fixed SDK contract mismatch: picker dimensions may be0; valid actual file-header dimensions now take precedence. No weakened image limits.
- [x] Safe development-only stage/fact/exception diagnostics and recoverable failed-at-stage message added; previous candidates/gallery/explicit-save/raw Storage behavior preserved. No dependency/config/native/permission/backend changes or rebuild.
- [x] Final structural-reader focused103/103, full380/380, targeted28/28, typecheck, full lint, git diff --check and seven-task-file whitespace checks passed. Source/mocks only.
- [x] Physical Android post-fix logs confirm structuralRead:true, dimensionOffset458,560 beyond the old64KiB peek, native JPEG encode and output validation -> ready. Source3072x4096/2,777,786bytes becomes validated1536x2048 JPEG/262,810bytes. No rebuild. This confirms the real header-boundary root cause and conversion for this capture.
- [ ] Confirm preview/orientation/Not saved, explicit Save memory and reopen persistence, cover capture/reopen, cancel preservation and gallery regression. The ready log alone does not verify these UI/backend behaviors; see PROJECT_STATUS.md.

## Camera compatibility and permission recovery - 2026-10-14
- [x] Traced/reproduced pre-conversion HEIC metadata rejection. Camera-only preparation now performs real bounded native JPEG encoding and validates actual output bytes before preview; gallery rules, previous selections, Not saved and explicit upload-on-save remain intact.
- [x] On-demand supported camera permission API retained; denied/permanent denial has Cancel/Open Settings plus gallery fallback and Settings-failure guidance. No microphone/background/dependency/configuration/backend/GPS change.
- [x] Focused96/96 passed; final full373/373 and camera/gallery21/21 after import-error recovery adjustment passed. Final typecheck, full lint, git diff --check and five-task-file whitespace checks passed. Mocks only; native conversion is not device-verified.
- [ ] Physical failing-device retest of native conversion/orientation/permissions/Settings/gallery/cancellation/cover-memory save-reopen. No new build needed solely for this JS fix on a camera-enabled client; the older gallery-only client still requires the prior camera-enabled rebuild. Exact checklist and remaining live Storage limitations are in PROJECT_STATUS.md.

## Create Journey: Take Photo - 2026-10-14
- [x] Explicit Take Photo + Choose from Gallery for cover/memory fields, on-demand camera-only permission, denied/permanent/cancel/failure recovery and shared local preparation/Not saved/replacement flow. Existing explicit upload-on-save and metadata/conflict safeguards preserved; no dependency or GPS/Travel/backend change.
- [x] Explained and resolved existing native camera block: Image Picker cameraPermission now has a purpose description; microphone remains false. Read-only config introspection verifies camera is no longer removed and microphone remains blocked. Installed Image Picker57.0.20 matches SDK range.
- [x] Focused90/90, full367/367, typecheck, full lint, git diff --check and explicit task-file whitespace checks passed. No real camera, build or live upload verification.
- [ ] Build/install a NEW development client, then complete camera/cover/memory/cancel/denial/gallery/replacement/save-reopen/no-premature-upload/metadata Android checks in PROJECT_STATUS.md. A JS reload alone cannot enable native camera permission. Retain current live Storage-policy verification limitations.

## Create Journey M1: one-time memory location - 2026-10-14
- [x] Add/Edit Memory current-location action, foreground-only one-shot Expo API,15-second application deadline, web-equivalent50m/freshness validation, clear retry/search messages and reviewed buffered coordinates. Existing explicit Save memory retains all metadata/photos/version checks; no automatic save/upload or Travel Mode changes.
- [x] Duplicate capture/save guards and invalidation on close/blur/background/account-keyed unmount/editor disable/location replacement; independent of Mapbox search. Installed expo-location57.0.21 matches Expo's bundled ~57.0.21 range; no dependencies/configuration changed.
- [x] Final focused83/83 and full360/360 tests passed; typecheck, full lint, git diff --check and explicit task-file whitespace checks passed. Mocks only; see PROJECT_STATUS.md.
- [ ] Physical Android GPS/permissions/services/accuracy/deadline/lifecycle and explicit save/reopen verification. No native build/device/live backend test performed. Native one-shot requests cannot be aborted; late callbacks are invalidated. Follow the exact checklist in PROJECT_STATUS.md before further location milestones.

## Create Journey photos - Milestone 4B2 follow-up implementation - 2026-10-14
- [x] Latest owner-approved scope implemented: upload cover AND memory candidates on explicit save only, using existing authenticated Storage, owner/private/version checks, immutable object names, raw media paths and full-snapshot save_journey. New memories/private journeys checkpoint before upload; selection stays local until Save.
- [x] Known upload/RPC failure recovery reuses exact confirmed upload paths; ambiguity/conflicts block blind writes. Duplicate/navigation guards, truthful Not saved/saving states, saved-reference removal without remote deletion, and owner-scoped signed-preview renewal added. No dependencies/backend/web/authentication changes.
- [x] Focused70/70 and full347/347 tests passed, plus typecheck, full lint and git diff --check. Android Metro bundle HTTP200; offline Expo dependency check passes with reliability warning. Mocks only, no live uploads, RPC writes or dashboard changes.
- [ ] VERIFY DEPLOYMENT + ANDROID END-TO-END: bucket/policy behavior, real uploads/full snapshots/privacy, checkpoints/reopen/restart, denied/uncertain outcomes, stale web/mobile versions and preview expiry. Exact checklist and limits in PROJECT_STATUS.md. Earlier deployed-policy access limitation remains unresolved; implementation is not proof of live persistence.
- [ ] Durable upload recovery and reference-aware remote cleanup remain out of scope. Existing client15-second timeout and lack of upload AbortSignal support can produce uncertain outcomes; never automatically retry or delete objects.

## Historical cover-only Milestone 4B2 preflight - 2026-10-14
This records the earlier stopped request; the latest follow-up above supersedes its implementation scope/status.
- [x] Read-only inspection of existing local photo flow, authenticated client, raw-path snapshot saving and repository storage/RPC migrations; existing work preserved. Baseline focused49/49, full326/326, typecheck, full lint and diff check passed; no upload integration tests or application changes. Connected dashboard redirects to sign-in.
- [ ] BLOCKED before implementation/upload: verify effective deployed private journey-media INSERT/SELECT policies, bucket limits/MIME settings, RLS/grants and save_journey ownership/media/version behavior through trusted read-only project inspection. Repository migration source and anonymous app credentials do not prove deployment.
- [ ] After verification only: authenticated immutable cover upload, raw-path snapshot save, preserved previous cover, signed display URL, ambiguity/conflict/navigation safeguards and focused integration tests. Memory-photo uploads remain outside4B2.
- [ ] Android persistent-cover QA deferred: no cover upload integration was implemented or exercised. See PROJECT_STATUS.md for the exact access limitation and required verification evidence.

## Create Journey native photos - Milestone 4B1 - 2026-10-14
- [x] Local-only cover and memory gallery selection, bounded binary validation, native resize/encoding, Not saved previews, replace/cancel/remove behavior, separate candidate state and preserved raw saved paths. No uploads/new Supabase writes, remote deletion or backend changes.
- [x] Approved SDK57 ImagePicker/ImageManipulator packages plus direct FileSystem dependency; gallery-only configuration blocks camera/audio and broad Android storage permissions. Config introspection and Android Metro bundle checks passed; existing application work preserved.
- [x] Focused49/49 and full326/326 tests passed; typecheck, full lint and git diff --check passed. Offline Expo dependency validation reports up to date with an offline-reliability warning.
- [ ] Build/install a NEW Android development client and complete physical QA in PROJECT_STATUS.md (picker/provider behavior, orientation/mirroring, transparency, size/memory limits, cancellation, existing photos, keyboard/back/navigation). No native build or physical-device validation was performed here.
- [ ] Photo upload/save integration, signed-URL refresh, durable recovery and remote cleanup remain unimplemented and require a later milestone after owner testing. No selected photo is persisted in4B1.

## Create Journey redesign - 2026-10-14
- [x] Milestones 1 and 2: private Quick Start, actual owner-draft hydration/continuation, raw metadata/version preservation and safe conflict recovery. Owner now reports physical Android testing; original handoff evidence remains in PROJECT_STATUS.md.
- [x] Milestone 3: compact memory hub, existing-photo thumbnails, conditional compact map, focused safe-area/keyboard-aware Add/Edit Memory sheet, place selection or named private unlocated memory, optional notes/day/rating, reorder and confirmed removal, full-snapshot saving, discard guards and existing publication-readiness validation. No uploads/autosave/offline/backend changes.
- [x] Focused creation tests 38/38 and full suite 315/315 passed; typecheck, full lint and git diff --check passed. Offline Expo dependency check reported up to date with an offline-reliability warning. Android Metro bundle HTTP200 contains the new memory flow; this is not native visual/device evidence. See PROJECT_STATUS.md for complete validation and limitations.
- [ ] Physical Android Milestone 3 QA: keyboard/small-screen/large-text/safe areas, Android back/discard, actual draft reload/save/conflict recovery and inherited-photo display permissions. Follow exact steps in PROJECT_STATUS.md; wait for owner results before further milestones.
- [ ] Later photo integration and durable unsaved/offline recovery remain separate, unimplemented scope requiring approval.

## Home header refinement — 2026-10-14
- [x] Diagnosed unchanged appearance: Search stayed44 dp in the prior update; no alternate Home header/override found. Now a32 dp painted Search surface sits inside a44 dp touch target, with52 dp minimum header and2 dp gaps. Correct Expo Android bundle HTTP200 confirms new source is served; owner confirms previous prompt reached phone. 20 focused tests and294/294 full tests passed; typecheck, full lint and diff check passed. See PROJECT_STATUS.md.
- [ ] Full Android reload/visual confirmation of new surface geometry and accessibility sizes; no native rebuild required. Server bundle evidence does not establish newest phone bundle/rendering.
- [x] Compact travel-focused header: 34 dp supplied logo, 44 dp flexible search with Destinations & journeys, 22 dp bell/profile visuals with 44 dp controls, restrained translucent dark styling. 20 focused tests and 294/294 full-suite tests passed; typecheck, full lint and diff check passed. See PROJECT_STATUS.md.
- [ ] Physical Android appearance/accessibility checks at narrow widths and larger text; Search/Account/placeholder and Home regression observations.

## Home UI polish — 2026-10-13
- [x] Screenshot-driven follow-up: smaller warm-white shared navigation on standard browsing routes, reserved content space, and Story three-dot popup for existing Use/Remix/About actions. Travel/auth/private drafts excluded. 294/294 tests, typecheck, full lint and diff check passed; see PROJECT_STATUS.md.
- [ ] Android visual/runtime checks for compact white pill across routes, creation keyboard/save controls, Story popup/back handling and Remix sign-in return. Preserve existing Story/map/Travel behavior.
- [x] Milestone 2: floating dark translucent three-destination navigation, blue Explore highlight, measured safe-area clearance and expanded content scrolling behind the pill. 292/292 tests, typecheck, full lint and diff check passed; see PROJECT_STATUS.md.
- [ ] Milestone 2 Android appearance/gesture/accessibility verification: translucency over globe and sheet, all snap states, last-card actions, larger text, bottom insets and route return.
- [x] Replaced the temporary header JPG with the owner's corrected PNG; code/test references now use assets/journey-creator-logo.png. Layout unchanged.
- [x] Supplied-logo follow-up: actual attached JPG bundled at top-left of Home, contain sizing, flexible Search and existing bell/Account controls in one safe-area row; 18 focused regressions, typecheck, full lint and diff check passed. Physical Android appearance remains pending.
- [x] Milestone 1: search-first Home header, inactive notification bell, existing Account navigation, and full-frame Home cover photos over a blurred same-image backdrop without increasing card size. Focused component regressions added; 291/291 tests, typecheck, lint and diff check passed.
- [ ] Physical Android visual/accessibility checks for the new header and portrait/landscape covers, plus globe/sheet/Locate/Story/bottom-navigation regression. See PROJECT_STATUS.md. Journey Story cover redesign remains separate future work; bottom navigation is implemented in Milestone 2 above.

## Completed foundation
- [x] Physical Android QA preparation: current working tree preserved; development-client command and local environment-variable names verified without exposing values. Fresh automated baseline: 287 tests, typecheck, full lint and diff check passed. The seven prioritized device cases and per-case Actual/Failure fields are in PROJECT_STATUS.md. This completes preparation only, not device validation.
- [x] Travel Mode automated reliability/integration audit: fixed future GPS acceptance, rejected-watch callbacks, stale manual confirmations, delayed initial-route acceptance, precise-marker eligibility, preview-camera blur cleanup and dynamic Reduce Motion. Regression coverage preserves failed-reroute instruction progress, arrival/manual completion, timer and lifecycle behavior. See PROJECT_STATUS.md for final checks and network-limited Expo Doctor evidence; physical Android validation remains pending.
- [x] Turn-by-turn driving panel and conservative ordered instruction progress on the existing Directions request. Missing steps/poor matching remain honest; arrival/completion stays manual. Verified: 249 tests, typecheck, full lint and diff check passed. Real-device guidance validation remains pending.
- [x] Travel map My Location/recenter and foreground GPS following with manual exploration, navigation zoom and lifecycle cleanup. Verified: 236 tests, typecheck, full lint and diff check passed. Physical Android camera/gesture/placement checks remain pending.
- [x] Expo/React Native + Router foundation and existing Supabase integration.
- [x] Home globe/Discovery, Journey Story and native planned-stop maps implemented.
- [x] Auth/Account, profiles/social, Create and Remix implemented; full end-to-end review remains pending.
- [x] In-memory Travel Mode states/timer and foreground GPS implemented.
- [x] Pause/Resume successfully tested on the physical Android phone (owner confirmation). Prior automated baseline: 198 tests, typecheck and lint passed; not a claim of full device QA.

## Next priorities, in order
1. [x] Read-only inspection of existing web Travel Mode in D:\Travel_Mvp: source thresholds, Directions, arrival/progression, rerouting and lifecycle reviewed; web unchanged.
2. [x] Mobile Navigation Milestone 1: driving route calculation to the first stop, dedicated blue geometry, compact distance/duration status, strict GPS eligibility and lifecycle cancellation implemented. Owner confirms blue road-route rendering on physical Android. Use now opens the existing immersive Travel road map directly; cinematic map browsing remains a separate Story entry point. The initially collapsed sheet has destination/route summary, expandable details and fixed session controls. Opening prepares permission without starting tracking/timing; Begin Trip stays explicit and denied permission needs user-directed recovery. Automated baseline: 221 tests, typecheck and lint passed. Immersive layout/permission/Streets device regression remains pending. Turn-by-turn instructions are covered by the subsequent guidance milestone.
3. [x] Milestone 2: ordered manual stop completion, confirmed current-stop action, progress styling, next-destination routing and distinct completed/early-finished states. Progress stays in process memory. Verified: 228 tests, typecheck, full lint and diff check passed; physical Android validation pending.
4. [x] Automatic stop-arrival detection with accuracy-aware proximity, distinct timed readings and an explicit confirm/dismiss prompt. Confirmation reuses ordered manual completion; GPS alone never completes stops. Verified: 263 tests, typecheck, full lint and diff check passed. Physical Android arrival reliability/threshold tuning remains pending.
5. [x] Off-route detection and guarded rerouting implemented against the blue driving geometry. Accuracy-adjusted 40 m margin, at least three readings over eight seconds, 30-second cooldown, existing Directions request, lifecycle/session cancellation and instruction reset. Errors require explicit Retry and label/expire old reference routes; arrival/manual completion remain independent. Automated results are in PROJECT_STATUS.md; real-device reliability and threshold tuning remain pending.
6. [ ] Physical Android testing and regression checks: new guidance/progression/rerouting plus Home globe/Locate/sheet, Story/maps, permissions, GPS loss/retry, Pause/Resume/Finish, navigation and foreground/background lifecycle. Reconfirm existing behavior after changes; resolve Expo patch mismatches only with approved dependency work.
7. [ ] Profile, authentication and journey-creation review, followed by end-to-end QA: session restoration/expiry, sign-in/registration/sign-out, public/private gating, likes/saves/share, Remix, draft save/publication and uncertain-write recovery. Use authorized test data; do not create production records without approval.

## Pending/unverified boundaries
Current physical run: **not completed**. Owner reports the native Mapbox Android development client is installed; exact phone model/Android version/build and observations are pending. H1 (Home), S1 (Story/Use), T1 (GPS/camera), T2 (guidance), T3 (arrival/progression), T4 (rerouting), T5 (lifecycle/accessibility) are all unverified for this run. Wait for the owner's results before changing application code. No source defect was reported or fixed during preparation; earlier owner confirmations do not mark these current-run items passed.

The owner confirms the immersive Use-to-Travel flow and Streets map on Android. The compact bottom-panel refinement still needs device visual validation; permission recovery, larger text and broader lifecycle regression remain pending.

Automatic arrival detection only offers a suggestion; automatic stop completion, voice guidance, verified visits, persisted travel history and background GPS are not implemented. Route geometry is replaced only after sustained deviation or explicit error retry; instruction progress updates locally from eligible GPS. Arrival, guidance and rerouting reliability still need real-device validation. Polyline distance cannot distinguish close parallel roads, wrong-way movement on the route or sustained GPS bias. Photos/full editing of saved journeys, offline travel and notifications are outside the current implemented foundation. Physical iOS and comprehensive native/backend QA are not established by the prior Android Pause/Resume result or mocked tests.
