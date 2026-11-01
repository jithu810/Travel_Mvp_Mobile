# Explore layout and image optimization

## Authorization and baseline

Owner requested a two-column Explore redesign, thumbnail preference, valid signed URL reuse on refresh, existing FlatList virtualization, tests and a safe unexecuted backfill procedure. Local development only; no publication, deployment, live writes or backfill authorized.

Mobile baseline: `0ee9d92`, branch `codex/app-wide-dark-theme`, clean working tree. Web branch `codex/journey-buddy-public-pages` has three unrelated untracked `supabase/*/.temp/` directories; preserve them. No environment files may be read.

Tier: major/shared image behavior. Mobile specialist implementation, Backend read-only preflight, separate QA and independent review. Architect owns this report and material status notes; specialist write scopes are disjoint.

## Backend-impact assessment

Inspected `src/app/search.tsx`, `src/components/discovery/explore-tile.tsx`, `src/lib/discovery/queries.ts`, `src/lib/discovery/request-cache.ts`, `src/lib/media/image-variants.ts`, `src/lib/create/photo-model.ts`, `src/lib/create/photo-save.ts`, `src/lib/create/thumbnail-model.ts`, `src/lib/supabase/public.ts` and existing image/cache tests.

Two-column layout and FlatList batch sizing are UI-only; existing query contracts, auth, persistence, Storage access and RPC behavior are unchanged by that part. Owner explicitly authorizes the Explore layout change; preserve other approved screens.

Signed URL invalidation and thumbnail selection concern shared Storage access behavior: full read-only Backend preflight assigned; affected query implementation paused pending its report. No new APIs/schema/policies intended. Missing thumbnails must retain original fallback. Existing native caching is retained without dependencies. Backfill is preparation only.

Gate released after Architect review of `explore-image-backend-preflight-2026-11-01.md` (live inspection 02:55:16–02:56:11 UTC). Current RPC/RLS/Storage/migration definitions support bounded client changes; no backend changes required. Isolated mocked signing/clock/cancellation tests cover the proposed cache change; live writes remain unauthorized. All nine unique Explore cover paths are legacy, totaling 6,029,211 stored bytes, with no discoverable paired thumbnails. Production/runtime generation flag remains unverified; do not claim actual upload verification from source tests.

## Verification plan

Targeted cache/expiry/inflight/refresh regressions, thumbnail fallback and legacy coverage, search/order/navigation and FlatList initial/batch/window behavior; TypeScript and lint; specialist QA and independent stable-snapshot review. Compare controlled signing/image request counts and bytes where measurable, clearly distinguish synthetic fixtures from native network measurements.

Phone-session skill used for initial read-only status check: no connected device, Metro 8081 down. Device ownership/availability clarification pending; no phone operations performed. Emulator availability will be inspected. Native cache hits, Android scrolling and real transferred bytes require runtime evidence and must not be inferred from mocks.

## Completed implementation and verification

- Two-column rounded Explore tiles, responsive gutters, larger captions. Existing FlatList starts with three rows/six tiles, adds two rows/four tiles per batch, retains windowSize=3 and 50ms batching. No pagination, dependency or backend API added. All results/order/search/Saved/navigation remain in their existing flows.
- Public refresh invalidates collection metadata only; successful signatures remain in the existing process cache for 55 minutes. Path changes and TTL expiry still sign anew. Foreground reload is gated to focused Search.
- Explicit refresh retries inner image components with the same URLs, preserving list identity/scroll/search. Independent review found this recovery also needed in shared Home and Story callers; the bounded fix forwards retry generation without changing those layouts, panel expansion or loaded-item count. Reviewer rechecked and reported no remaining findings.
- Final TypeScript passed. Scoped ESLint passed with zero warnings across changed application and test files. Repository-wide `npm run lint` was attempted but did not return a result in the implementation session; do not count it as passed. Relevant final QA/Home/Search/cache 44/44 plus unchanged thumbnail/path 11/11 = 55 applicable independent QA checks passed. Offline backfill preparation 4/4 passed. Additional discovery/shared-consumer regressions passed in the implementation run. `git diff --check` passed.
- Permanent QA tests use a self-contained legacy invalidation adapter, not Git history. An earlier one-time comparison actually loaded baseline `0ee9d92`. Both observed synthetic initial load + three refreshes: signing transports 4→1, paths signed 36→9, collection RPCs 4→4, order retained. These are mocked signing counts, not image-body requests or bytes.

## Physical phone and runtime evidence

Owner supplied phone port35903 and required phone-only testing. Codex connected the advertised `192.168.1.2:35903` CPH2813 Android16 (1080×2344), Journey Google Test, this checkout through Metro8081. No live save/upload/like/bookmark/Begin Trip actions performed; GPS travel was not started. An emulator startup was attempted before the phone became available, but it stayed offline, supplied no test evidence, and its remaining helper was stopped. Do not use/restart an emulator for this task.

Physical captures outside the repository: `explore-grid.png` shows larger two-column tiles and artwork/photo fallback; `explore-scroll.png` shows later rows progressively appearing with loading indicators; `explore-detail.png` shows successful existing Journey Story navigation from the Goa tile. Search input/refresh/return checks were exercised; final settled search evidence is recorded below. Other screen geometry was not redesigned. Home displayed a Mapbox unavailable fallback once during this session; no map changes were made and map performance is outside this task.

Final settled phone accessibility tree verified input `Goa`, `1 journey found`, and the single matching Goa tile. Opening a tile reached the existing Story composition; returning via Search navigation reached the unfiltered grid (route remount), so this session does not claim filter persistence across that route transition. Automated tests establish input/list/scroll preservation for explicit refresh. Phone swipes were manually exercised, not frame-rate profiled. Synthetic tests cover thumbnail decode/signing failure; current live covers cannot exercise a real paired-thumbnail failure because none have usable pairs.

A boolean-only CDP call to the already-loaded `storedThumbnailsEnabled()` returned `{available:true,enabled:true}`. This verifies generation capability in this development bundle, not an actual upload or any separate production environment. No environment files or broad bundle contents were read. The temporary ignored diagnostic script returned only capability/cache summaries and was removed after use.

Read-only loaded-query/native `Image.queryCache` probe returned14journeys/9unique coverURLs. Initial observation found3inmemory; after scrolling it found9cached (8memory,1disk). Collection invalidation plus reload preserved every cover URL in both probes. This confirms native memory/disk cache presence and runtime stable URL identity; it does not establish request counts, hit rates, expiry/restart behavior or transferred bytes. No production traffic capture or numerical Android frame profiling was performed.

## Production requirements and expected impact

Ensure the nonsecret `EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=true` build flag is configured for each intended production JS bundle; production setting not inspected/changed. No API/schema/policy rollout is required. Actual new-upload creation is source/test verified but no live upload was performed. Existing thumbnails are preferred with original fallback only when missing/failing; signing an original does not download its body.

All nine current unique Explore covers are legacy, total6,029,211bytes, so current-content thumbnail savings require the separately approved procedure in `../explore-thumbnail-backfill-procedure.md`. It reuses the offline preparer and includes create-only object uploads, current hardened authorization checks, approved source manifest, optimistic reference transitions and separately gated recovery. Nothing was backfilled or changed live.

Expected benefits: fewer refresh signing requests and better opportunity for native image reuse; initial tile render count12→6. Both viewport fill and the retained three-viewport buffer may render more cells later, so neither a50% initial byte reduction nor zero offscreen downloads is promised. A complete uncached pass of current nine covers would be6.03MB before overhead; avoiding such passes could save that amount per pass, an estimate rather than measured daily savings. All work remains local/unpublished, with no commit/push/merge/deploy.

## Modified paths

Application: `src/app/{search,discover}.tsx`, `src/components/discovery/{explore-tile,discovery-panel}.tsx`, `src/lib/discovery/queries.ts`.

Tests: `tests/{search-explore,image-loading-cache,discovery,home-polish,explore-optimization-qa}.test.mjs`.

Documentation: this report, backend-preflight and independent-QA reports, backfill procedure, `PROJECT_STATUS.md`, `ROADMAP.md`. No Web files modified.
