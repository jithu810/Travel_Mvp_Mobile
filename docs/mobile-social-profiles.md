# Prompt 29 — Mobile Likes, Saves, Sharing & Creator Profiles

Implemented on 2026-10-09 in D:\Travel_Mvp_Mobile. D:\Travel_Mvp was inspected only as a reference.

## Features and locations

Journey Story now has compact cream-and-green Like/Unlike, Save/Saved and Share controls immediately below journey information and above the unchanged Journey Map. Like count is displayed when the existing backend returns a valid count. Selected, pressed, disabled and pending states are visible and accessible. Save remains a bookmark separate from Like.

Tapping the Story creator section opens /profile/[username]. The profile shows the real public avatar when available, real display name (otherwise the real username), handle, optional public bio, and public journey cards with covers/title/metadata. Cards open the existing /journey/[id] Story. Missing optional profile fields stay missing. The count reflects the public non-demo journeys actually returned and shown, rather than inventing a count from private data. Loading, empty, unavailable, refresh and recoverable error states use the existing mobile UI.

No Saved screen existed, so no new Saved collection screen was added. Use This Journey, Remix and Start Journey remain disabled future actions; Like/Save/Share have been removed from that disabled list.

## Verified existing contracts reused

The web reference was inspected before choosing APIs, including its journey actions route, profile queries, core/social migrations, media signing and public URL helper.

- journey_likes and saved_journeys: composite primary key (user_id, journey_id), existing authenticated user-owned select/insert/delete policies and published-only insert checks.
- get_journey_detail({ target_id }): authoritative liked, saved and aggregate likes_count, along with journey identity/status/is_demo used for a strict public gate.
- get_public_profile({ handle }): public id, username, display_name, bio and avatar_path.
- get_account_journeys({ owner_id, collection: 'published' }): creator's published rows. Mobile additionally requires status === 'published', matching creator_id, and is_demo === false before normalizing known card fields.
- get_public_journeys remains the unchanged public Discovery/Search/Story membership gate.
- Existing journey-media and profile-avatars Storage read/signing rules are reused for temporary image URLs.

Signed-in actions use the existing persistent native Supabase client directly with its user bearer token and existing RLS. The web cookie/API route is not used as a new mobile endpoint. There are no new tables, RPCs, schema changes or privileged credentials.

Before a write, getUser verifies the expected session user and detail is checked for published visibility. Enable uses conflict-safe upsert with ignoreDuplicates and the existing composite conflict key; remove uses a delete scoped by both user_id and journey_id. A second detail read confirms the resulting state and aggregate count. Server RLS remains authoritative.

## State and authentication

SessionProvider exposes the existing useSession lifecycle to screens while preserving a single root restoration/subscription, AsyncStorage persistence, and foreground token refresh. There is no new authentication system.

No native sign-in screen currently exists. Anonymous Like/Save taps show a clear sign-in-required message explaining that mobile sign-in is not available yet and website sign-in does not authenticate this app. No fake login link or fake action success is shown. Restored valid native sessions can use the implemented action path. Session restoration errors keep account actions unavailable while public browsing and sharing remain usable.

Action state is re-read when Story gains focus or the app resumes. A synchronous controller lock prevents duplicate submissions and locks both toggles during loads/writes. State updates are confirmed, not optimistic. A failed or timed-out mutation may have committed, so state becomes unknown and toggles remain unavailable until Retry action state performs an authoritative read. Retry never blindly reverses a potentially committed write. Network operations have a 15-second deadline. Account/route changes replace the subscribed state store so previous-account completions cannot update current UI.

Social state changes live inside the social component. They do not remount the map. The social component uses a distinct React key from the existing map.

## Native sharing

React Native Share.share opens the supported platform share sheet. Android receives a message containing title and URL; iOS receives title and URL and uses the button's native anchor for iPad. Cover/description are not required.

The public origin is configured through EXPO_PUBLIC_SITE_URL, using the existing deployment https://www.journeycreator.site documented in the web project's docs/travel-navigation.md. The existing web helper's /journey/{UUID} route and HTTPS-origin validation are reused conceptually; localhost, IP, credentials, query, fragments, path prefixes and malformed IDs are rejected. No domain or endpoint was invented. The local web NEXT_PUBLIC_SITE_URL was unset, so it was not copied; the documented deployed origin was used explicitly.

.env.example includes this nonsecret public origin and ignored .env.local configures it. No tokens or secret keys were added.

iOS dismissedAction and AbortError are handled quietly. Android sharedAction cannot prove delivery or distinguish cancellation, so the app makes no success/delivery claim. Unsupported sharing shows a selectable canonical public link; missing/invalid origin shows an honest configuration message.

Reference: [React Native sharing behavior](https://reactnative.dev/docs/share), [Expo SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/).

## Created files

- src/hooks/session-context.tsx — existing session lifecycle exposed through context.
- src/hooks/use-journey-social.ts — focus/resume reads and external-store subscription.
- src/lib/social/model.ts — strict state normalization and request/state controller.
- src/lib/social/queries.ts — authenticated existing RLS-protected reads/writes/reconciliation.
- src/lib/social/sharing.ts — validated URL construction and platform sharing result handling.
- src/components/journey/social-actions.tsx — compact Story controls and feedback.
- src/lib/profile/model.ts — public field whitelist, safe avatar and published-owner filtering.
- src/lib/profile/queries.ts — anonymous existing profile/journey RPCs and signed media.
- src/app/profile/[username].tsx — creator profile with existing JourneyCard navigation.
- tests/social-profile.test.mjs — 19 focused tests with mocked transports.
- docs/mobile-social-profiles.md — this report.

## Modified files

- src/app/_layout.tsx — SessionProvider and profile route.
- src/app/journey/[id].tsx — social controls with a distinct key; existing map identity retained.
- src/components/journey/story-header.tsx — tappable verified creator handle; like count now lives in the authoritative social controls.
- src/lib/discovery/queries.ts — export existing read-only media resolver for reuse.
- src/lib/journey/snapshot.ts — remove implemented social actions from the future-action list.
- .env.example and ignored .env.local — existing public website origin.
- README.md — current features and report link.

Package manifests/lockfile, Expo/RN/React/Mapbox versions, native Mapbox files, Android/iOS build settings and existing EAS configuration were not changed.

## Validation

- TypeScript and lint passed.
- **46 tests passed**: 27 existing tests plus 19 social/profile tests covering strict public action state, authenticated gating, Like/unlike and Save/unsave semantics, duplicate submissions, failed reads, uncertain committed writes and re-read recovery, post-write mismatch, account-store isolation, safe share URLs, optional content, cancellation/unsupported sharing, public-only profile fields, safe avatars, explicit owner/status/demo journey filters, exact existing RPC/table operations, scoped delete, conflict-safe upsert, expired/different sessions, mutation/reconciliation failure, empty profile journeys and profile-to-Story navigation.
- Tests used synthetic fixtures and mocked transports; no production likes/saves or other records were created or modified.
- Expo Doctor **21/21** passed, and expo install --check passed.
- Android and iOS Hermes bundles and web export passed. These are bundle validations, not APK/IPA compilation.
- Real-data browser preview at port 8085 verified Discover → Search → Story, both anonymous action gates, Story creator → real profile with signed avatar/bio/public cards, profile card → Story, Back to profile/previous Story, and Story → retained Search → Discover.
- Native sharing was invoked in the browser preview and dismissed; the preview displayed the selectable existing public URL without a delivery success claim.
- Manually inspected Discover, Search, Story and creator profile at **390×844** and **412×915**; no horizontal document overflow. Loaded Story/profile and sharing fallback also had no overflowing elements.
- A duplicate React sibling key caught during inspection was fixed by prefixing the social key. The existing native map key stayed unchanged.
- All five native Mapbox component/geometry source hashes match their task-start values. Existing map tests pass and both native bundles still include Mapbox.
- Web Git status remains exactly its preexisting modified README.md and untracked docs/mobile-architecture.md.
- Mobile Git has no HEAD commit or remote; all task changes are uncommitted and unpushed. Existing user EAS configuration/intent-to-add state was preserved.

## Remaining device checks

The user reports the native Mapbox development build works on their Android phone. That working code and versions were preserved. No adb executable/connected native test surface is available here; iOS cannot be run on this Windows machine. No physical-device test is claimed in this task and no native/EAS build was started.

On the installed development client, verify native Like/Save controls with an existing valid mobile session, repeated taps, offline failures/recovery, session expiry/account changes, foreground refresh, native share sheet/cancellation and iPad anchoring, creator navigation/Back/refresh, safe areas, and the existing map's marker selection/planned line/Fit Journey/gestures. Since no native sign-in UI exists, end-to-end login and live signed-in mutation field tests remain pending. The authenticated mutation path is covered with mocks, not production writes.

Web application code, Supabase schema/migrations/RLS/backend behavior and privileged configuration were untouched. No Remix, Use This Journey implementation, creation, GPS, Travel Mode, notifications or offline feature was added. Nothing was committed or pushed.
