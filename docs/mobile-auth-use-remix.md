# Prompt 30 — Mobile authentication, Use and Remix

Implemented in D:\Travel_Mvp_Mobile on 2026-10-09. D:\Travel_Mvp was inspected read-only. No database, RLS, production redirect, dependency, native build configuration, commit, push or deployment changes.

## Files

Created:
- src/app/auth.tsx — sign-in and registration form.
- src/app/account.tsx — current account, sign-out and private draft access.
- src/app/draft/[id].tsx — owner-only read-only draft with cover, story, Mapbox map, stops and source attribution.
- src/components/account-link.tsx — Discovery account entry.
- src/components/journey/journey-options.tsx — Use and Remix controls.
- src/hooks/action-intent.tsx — root in-memory pending-action context.
- src/lib/auth/model.ts — validation, friendly errors and synchronous submit guard.
- src/lib/auth/queries.ts — existing Supabase sign-in, signup and local sign-out.
- src/lib/auth/intent.ts — trusted, cancellable, single-consumption action intents.
- src/lib/auth/session.ts — testable session observation/restoration race handling.
- src/lib/remix/model.ts — strict owner/draft projection and per-source/account copy guard.
- src/lib/remix/queries.ts — existing copy RPC and authenticated private draft reads/media signing.
- tests/auth-remix.test.mjs — 16 new fixture-only tests.
- docs/mobile-auth-use-remix.md — this report.

Modified:
- src/app/_layout.tsx — auth/account/private-draft routes and intent provider.
- src/app/discover.tsx — Account entry.
- src/app/journey/[id].tsx — read-only map scroll target and functional journey options.
- src/components/discovery/ui.tsx — optional header action and disabled Action state.
- src/components/journey/social-actions.tsx — sign-in entry and focused one-time Like/Save continuation.
- src/hooks/use-session.ts — shared, tested session observer; existing native foreground refresh retained.
- src/lib/social/model.ts — resumed Like/Save enable the requested state rather than reversing an existing preference.
- src/lib/supabase/client.ts — bounded fetches on the existing authenticated client.
- src/lib/journey/snapshot.ts — only Start Journey remains a future action.
- tests/social-profile.test.mjs — updated implemented/future action expectation.
- README.md — current milestone and historical-section clarification.

## Authentication

Email/password sign-in uses auth.signInWithPassword. Registration uses auth.signUp with the web's display_name metadata; name, email and minimum-eight-character registration password validation precede network calls. Password whitespace is preserved. Passwords remain transient form input and are cleared after submissions/mode changes; the SDK persists sessions using the existing native AsyncStorage setup. No new client or credential storage was introduced. The existing anonymous read client remains isolated for public browsing.

Confirmation-required signup explicitly says to check email and then return to sign in; it does not claim authentication. The existing Supabase project's email confirmation/redirect configuration is used unchanged. No mobile email callback, OAuth or new provider was added. Account sign-out uses scope local for this app/device.

SessionProvider still mounts one subscription. Restore subscribes before reading stored session; a delayed successful or failed restore cannot overwrite a newer sign-in/sign-out event. Native AppState token refresh is retained.

Like, Save and Remix create an in-memory intent from the actual selected public Story, then open authentication. Successful authentication returns to the previous screen. A focused, authenticated Story consumes the matching intent once. Like/Save use desired=true, so a preexisting preference is not toggled off. Cancelling/backing out clears the intent. URL parameters cannot create a pending write, and intents are not persisted across process restarts. Authentication from Account or a private draft returns to that screen without creating an action.

## Use This Journey

The web's Use control targets #journey-route. Mobile therefore scrolls the existing Story ScrollView to its existing map and ordered stops. It does not authenticate, copy, publish, record usage or modify anything. Journey identity, creator, planned coordinates and content are unchanged. The browser preview retains the existing honest native-map fallback; Android/iOS use the existing Mapbox component.

## Remix and private access

An authenticated request verifies the current user and public source, calls copy_journey({source_id}), then verifies the returned ID through get_journey_detail({target_id}). Verification requires a different valid journey ID, the expected creator_id, status draft, is_demo false and copied_from_journey_id equal to the source.

The inspected existing SQL copy_journey is SECURITY INVOKER and uses existing RLS. It inserts a new journey and stops with backend-generated IDs; copies title, description, destination fields, traveler type, duration, supported durable cover/photo paths, stop sequence/name/descriptions, coordinates, Mapbox place IDs, ratings and day numbers; and sets source lineage. The default journey status is draft. It does not update the original or copy likes, saves, comments or travel data. Mobile sends only the source ID; it does not assemble a client-side cloning payload.

Confirmed copies open /draft/[id], which uses the authenticated client, verifies ownership/private status, and signs existing journey-media paths with that client. It never sends a private ID to the public-only Story loader. Account lists get_account_journeys({owner_id,collection:'drafts'}) and rejects unexpected owners/statuses/demo rows. Drafts remain reachable after restarting and signing in. A draft view offers real content/map/stops, a link to a still-public source with creator attribution, and Account access. Source loading is separate: a deleted/unavailable source does not prevent the private draft from opening. No editor, save/edit/publish/delete draft controls, sharing private links or Travel Mode were added.

Synchronous guards prevent repeated submissions. Copy state is keyed by source and account; a known successful copy is reopened rather than remixed again during the current process. Focus/account changes suppress delayed navigation. If copy POST response is lost, its result may be committed: automatic retries are blocked during the process and the user is directed to Account drafts. Only confirmed SQL transaction errors allow retry. A known returned copy ID remains available to open if detail verification failed, accompanied by an explicit warning, without a success claim. The existing RPC has no idempotency key; these guards are in memory and cannot establish exactly-once behavior across app restarts. Check Account before retrying an uncertain copy after restarting.

## Existing contracts reused

- auth.signInWithPassword, auth.signUp, auth.getSession/onAuthStateChange, auth.getUser, auth.signOut.
- get_public_journeys and anonymous get_journey_detail for public source checks.
- copy_journey(source_id).
- Authenticated get_journey_detail(target_id), creator_id, status and copied_from_journey_id.
- get_account_journeys(owner_id,collection='drafts').
- Existing journey-media storage signing/RLS.
- Existing Like/Save tables, public profile RPC, public routes and native Share behavior remain in place.

## Verification

- TypeScript: passed.
- ESLint with zero warnings: passed.
- Full Node test suite: 62/62 passed (46 prior regressions plus 16 new tests).
- Expo Doctor: 21/21 passed.
- Expo package compatibility: dependencies up to date.
- Android Hermes, iOS Hermes and web export: passed. These are JavaScript bundle checks, not installable/signed native builds.
- Fixture-only tests cover validation, SDK auth/confirmation/sign-out, persisted session observation and races, single-use/cancellable intents, desired Like/Save continuation, owner/private/lineage projection, preserved stop order/coordinates/ratings/descriptions/days, duplicate copy locking, uncertain response handling, safe retry, authenticated private list/detail/media contracts, original fixture preservation and intended navigation. Real backend copying/new-ID generation was inspected in SQL, not executed by tests.
- Browser preview on localhost:8086 checked Discovery → Account → sign-in/register, empty form validation, cancellation/back navigation, live public Story → Use → same map target, signed-out Remix/Like/Save → sign-in → cancellation → same Story, creator profile/public cards, and signed-out protection for a fixture private-draft route.
- Auth form at 390×844 and 412×915 has no horizontal document overflow; creator profile at 412×915 also passed. Browser console error check returned no errors.
- Native Mapbox component and map-data file SHA-256 hashes match the Prompt 29 baseline. Existing sharing/profile/map regressions pass.
- No production authentication, registration, social writes or copy RPC writes were executed during verification. Browser reads used real public data; signed-in/private behavior tests used synthetic mocked transports.
- Web Git status remains its preexisting modified README.md and untracked docs/mobile-architecture.md. Mobile's existing intent-to-add eas.json is preserved. No staging or Git history changes.

## Manual field test still required

On the existing Android development client (and later iOS):
1. Register a designated test user; confirm email if required; sign in and verify friendly invalid-credential/unconfirmed-email states.
2. Restart/background/foreground the app and verify restored sessions and token refresh; sign out and ensure account data disappears.
3. From signed out, sign in through Like, Save and Remix. Confirm each intended action runs once and cancelling never executes it.
4. Use a designated public source: verify one independent draft/new journey and stop IDs, source lineage and copied fields, no social data copied, original unchanged and no publication.
5. Open the draft immediately, through Account after restart, and verify a different account cannot access it; check media and source-unavailable fallback.
6. Rapid-tap Remix; test connection loss while copying and Account recovery before retrying.
7. Confirm native keyboard/secure input, safe areas, Mapbox rendering/selection, scrolling to map/stops and native sharing.

No live-auth credentials or connected native test surface were available to this run. No backend-contract blocker was found. Editing/publishing remains deliberately deferred. Prompt 31 has not been started.

References checked: https://supabase.com/docs/reference/javascript/auth-signup, https://supabase.com/docs/reference/javascript/auth-signinwithpassword, https://supabase.com/docs/guides/auth/quickstarts/react-native, https://docs.expo.dev/versions/v57.0.0/sdk/router/.
