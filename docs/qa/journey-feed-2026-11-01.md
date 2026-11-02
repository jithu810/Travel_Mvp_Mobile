# Search journey feed — local implementation record

Architect / 2026-11-01 Asia/Kolkata. User approved implementing the proposed first version locally after the plan. No GitHub publication, build/install, deployment or live backend writes authorized.

## Baseline and ownership

- Mobile: `codex/published-journey-edit-buddy`, HEAD `76370ebdbd0ec83b3f7deb07aeb5be1d942ee50e`.
- Preserve pre-existing changes to PROJECT_STATUS.md, ROADMAP.md, src/lib/auth/google-model.ts, src/lib/auth/google.native.ts, tests/google-native.test.mjs and docs/qa/outdoor-google-callback-2026-11-01.md.
- Preserve the earlier transparent-control edits in src/app/journey/[id].tsx and src/components/journey/social-actions.tsx.
- Web: read-only instructions; preserve untracked Supabase temp folders and integrity-hardening work.
- Architect owns this record, final status documentation and physical phone checks. Mobile Developer owns assigned feed application paths and focused tests after gate release. Backend Developer owns the separate preflight report. No overlapping writers; at most two specialists; no child delegation.
- Runtime exposes all required specialist roles. Managed session uses workspace-write with both repos writable and automatic approval review, overriding project-local human-review preference. No settings were changed; effective CLI configuration loader/trust discovery was not independently verified.

## Assessment and gate

- Tier: major, because gesture ownership, shared Story lifecycle/navigation and request caching change.
- Inspected: src/app/search.tsx, src/app/journey/[id].tsx, src/components/discovery/explore-tile.tsx, src/components/journey/stop-card-deck.tsx, src/lib/discovery/queries.ts, src/lib/discovery/request-cache.ts, src/hooks/use-load.ts, src/app/_layout.tsx and package.json.
- Existing anonymous discovery and detail RPCs are intended to stay unchanged; proposed bounded public-detail cache changes read timing/deduplication, so use full read-only live-schema preflight rather than assume no backend impact.
- Backend Developer assigned current definitions, migration comparison, grants/RLS/Storage review and safe synthetic test plan in journey-feed-preflight-2026-11-01.md.
- Architect implementation gate: **released at 2026-11-01 19:46 IST**, after review of [completed preflight](journey-feed-preflight-2026-11-01.md), SHA256 `CEE831A0880D41EF73CA7AEC50C3648DB2F75CE1E6AD17A6C9CBF60FAF70E0E3`. Fresh live metadata/history and six canonical function-source matches establish no backend changes needed. Known unrelated registration-email migration reconciliation gap is documented there. Accept required raw-metadata cache (maximum six entries, TTL <=45 seconds), fresh public membership check on activation/refocus, per-activation photo resolution, invalidation generations, anonymous-only cache and first-image-only adjacent prefetch. Synthetic test plan accepted. Existing signed URLs/native cached bytes cannot be instantly revoked; do not claim instantaneous privacy revocation.
- Live database, RPC, RLS, Storage and data changes: **not authorized**.

## Acceptance and verification plan

Search hands off a bounded snapshot of its exact filtered/Saved result order and opens the selected journey. Vertical gestures outside the map browse that set, with clear boundaries and accessible alternatives. Back preserves Search state. Horizontal stop browsing, map gestures, sheets, Start Journey and existing short-screen scroll fallback retain ownership. Edit/customized/standalone routes retain their behavior and approved composition.

Bounded in-memory public details and stable signed URLs reduce repeat reads. Current journey loads first; adjacent prefetch is limited to next detail/first visible image and cancelled on reversal, exit or background. Private account actions are not shared in the public cache. Only one interactive map/Buddy runs; no GPS starts during browsing. Test expiry, invalidation, unavailability, cancellation and account transitions explicitly.

Use affected unit/integration regressions, TypeScript and scoped ESLint, independent QA and code review on a stable snapshot. Architect verifies real CPH2813 Android phone via Metro 8081: Search entry, up/down, map pan, stop cards, boundaries, sheets, Back and lifecycle. No live write buttons, saves, likes, uploads, Begin Trip or republish. Measure request/cache behavior with controlled fixtures and report device performance only when actually measured. No claim of universal phone compatibility or Instagram-equivalent speed.

## Progress

Preflight and read-only Mobile architecture review completed. Mobile Developer released to implement the assigned paths and focused tests. Architect retains documentation and phone ownership. No schema, RPC or Storage changes required or authorized.

### Preliminary physical checks, 19:54–19:59 IST

Architect operated CPH2813 / Android 16 / Google Test dev client on MSI, Metro 8081 serving D:/Travel_Mvp_Mobile. Phone remained connected by wireless ADB; online map tiles/photos rendered. No Begin Trip, location permissions, saves, likes, uploads or republish actions were used.

Search entry and strong vertical card-area swipes opened different journeys. Horizontal swipe changed Stop 1 to Stop 2 without changing journey. After paging forward then backward, the Ponmudi journey restored Stop 2 (Ooty). A vertical drag within the map visibly panned it while preserving that journey/stop. About opened with the Ponmudi title; scrolling its native sheet and closing preserved Stop 2. Map/card/footer/navigation composition remained fitted and all controls visible on this viewport.

Screenshots retained privately outside the repository at C:/Users/sreej/AppData/Local/Temp/journey-feed-horizontal.png, journey-feed-next.png, journey-feed-return.png, journey-feed-map.png, journey-feed-about.png and journey-feed-sheet-return.png. These are device evidence, not published links; some early observations span Fast Refresh during the subsequent bounded lifecycle hardening. Final-snapshot checks and independent findings follow below. Native latency, frame rate, packet bytes and memory retention have not been quantified.

### Final-route physical checks, 20:00–20:04 IST

At route SHA256 `5C2387D539320B26AC7A7EFAE47C200E2A914A8D9797277751B3407F36BF9C57`, backgrounding to Android Home and restoring the existing activity returned to the same Ponmudi Stop 2 with its map/card/footer/navigation fitted. Android Back returned to Search. Typed `Goa` narrowed the grid to exactly one Goa journey; opening it displayed its two-stop story, and upward card swipe stayed on it and announced `End of these results.` Back returned to the retained `Goa` query and one-result grid. Private screenshots: journey-feed-resume.png, journey-feed-search-return.png, journey-feed-filter.png, journey-feed-single.png, journey-feed-boundary.png and journey-feed-query-return.png in the same scratch directory.

Real-device Saved/account transitions, screen-reader actions, larger fonts/short-screen fallback, Travel entry/GPS, map pinch, native low-network shaping and sustained memory/frame/latency profiling were not exercised. Relevant account/fallback/gesture/lifecycle behavior is covered by synthetic tests; that is not physical evidence for those cases. No claim of full phone compatibility, production performance or live-write verification.

Final Architect `npm.cmd run typecheck` passed after remembered-stop prefetch change. Plain PowerShell `npm` was blocked by execution policy; invoking the existing npm.cmd succeeded without changing system settings. Independent QA 7/7 passed on this snapshot; full hash manifest in journey-feed-qa-2026-11-01.md. Reviewer inspection in progress.

### Independent review and targeted fixes

Code Reviewer inspected all 12 application paths, both new feed test files and six affected regression-test diffs on manifest `8af9bf0e93106ac94b78b3133ce6a833b61202b89ed1949510106aeb90a7e3e3`. Initial findings: P2 stale overlay-availability flag can block enabled fallback Previous/Next after About refresh/resume returns an unavailable journey; P3 photo-less stops display generated art but speculative prefetch falls back to an unused journey cover. Reviewer independently reproduced P2 with the real route harness. Both fixes assigned together only to the feed route and focused tests, followed by TypeScript/route lint and targeted QA/re-review; other app files remain frozen. No live records are changed to reproduce unpublication.

## Completion — 2026-11-01 20:08 IST

Both reviewer findings fixed. The fallback now derives paging eligibility from the actually mounted Story, retaining immediate modal fences but releasing obsolete locks for unavailable/error recovery. Speculative metadata still loads, but no image is signed/downloaded when the displayed stop uses art or the deck is empty. Valid remembered-stop photos remain prioritized. Reviewer independently reran the original P2 reproduction and **14/14 final feed tests**, with no remaining actionable findings. Independent QA **7/7** passes on the final delta; all eleven other application hashes unchanged. Final route SHA256 `1e83c85df76f12a562c21c2f65c5a18d2c5f92fa3dfff19ba1979db773497106`; test SHA256 `6bb97223a8888492e281c789e187c766907254cd2575a27adf6f2fd9ee623943`; twelve-file app manifest `42f7796436b60a3e12197b7458e0ae9eed4b86f73c7ac1ff2fbed7b6cf503d98` (full path hashes in QA report).

Validation reused: 157 affected regressions passed before the final bounded route fixes; earlier 90-check selection overlaps those checks and is not an additive test total. Final feed regressions, final TypeScript and scoped app/route ESLint pass; QA test lint and scoped whitespace pass. Full unrelated application/SQL suites, native build/install and deployment were not run because no dependencies/native config/backend objects changed. React condensed checklist completed by implementer. Earlier physical evidence remains applicable to unchanged normal layout/gestures; unavailable/private lifecycle races and prefetch delta were verified with synthetic fixtures, not live data mutations.

Local changes comprise the twelve application paths, new feed/independent QA tests, six affected regression-test adaptations, this record, preflight/QA reports and prepended status/roadmap notes. Prior auth work and transparency fixes preserved; no code publication, Git commits/pushes, deployment, backend writes or dependencies. Status/roadmap contain pre-existing non-UTF8 bytes, so completion entries were prepended as UTF-8 bytes while preserving every original byte rather than transcoding their contents.

All required local implementation, proportional static/behavioral checks, independent QA and independent review are complete. Wider-device/accessibility and quantitative native performance limitations above remain explicit; no Instagram-equivalent speed or production release claim.

## Owner-reported regressions — 2026-11-01

Owner confirms feed works and requests three focused corrections: restore Buddy in Search-opened journey views, keep loading feedback centered during downward paging, and restore heart as the top card action rather than the middle action. Preserve all other composition/gesture/cache behavior. Baseline is the completed local snapshot above plus its documents/tests; Git branch/HEAD unchanged and all prior dirty work retained.

Assessment owner Architect; focused tier with scoped behavioral regressions, TypeScript/scoped lint, phone checks and independent review. Inspected journey-feed.tsx, journey/[id].tsx, social-actions.tsx, journey-action-icon.tsx, native-map/journey-map and buddy model/store/host. Impact is route allowlisting, animation/presentation and action order only. Existing data contracts, authorization/session/persistence, RPC/API/Storage behavior and cache implementation remain unchanged. UI-only repository assessment: no new live Supabase check required; previous completed preflight remains applicable. Local corrections authorized; no publication/deployment/live writes. Specialist writer receives exclusive bounded paths; Architect owns phone and this record.

### Corrections completed — 2026-11-01 20:22 IST

- Buddy model explicitly allows `/journey-feed`; existing foreground/modal/preference and map/floating policies stay in force.
- New feed and legacy Search-opened Story no longer request Save-first order. Heart is top, bookmark second, share third; icon geometry and transparent container unchanged.
- Loading/error feedback is outside the translated Story wrapper, so downward/upward entry offsets cannot move it. Only the Story slides. The one incoming map mounts during entrance while paging/Start remain disabled, removing an avoidable extra wait; native Mapbox initialization can still display its own map-area loader.

Writer changed only src/app/journey-feed.tsx, src/app/journey/[id].tsx, src/lib/buddy/model.ts and four focused tests (journey-feed, journey-buddy, search-explore, story-interaction). **168 affected tests pass**, final TypeScript/scoped app ESLint/whitespace pass. Independent Code Reviewer finds no actionable issues; **9/9 targeted checks** independently pass, covering stationary loaders with held requests at both positive/negative offsets, actual Buddy host policies, heart order and incoming-map/disabled-control behavior. Cache/public visibility/session/request behavior unchanged; no new backend inspection, native build, dependency or live writes needed.

Reviewed SHA256: feed route `1177eab4cb566618f9a23a271eddca2c0e699c55b033eb42d9a45bd02981355f`; Story `3c595856e088abd7ac2a043f06545d854623c9f10c6a8cd7225d8ff3b110ea56`; Buddy model `917040dc50951be1cced162db4c25f049908fba4b7a3f059344b9cfbfb33709e`.

Physical CPH2813/Android16/Google Test/Metro8081 remained connected. Fast Refresh reloaded to Home; Architect reopened Search and its viewer. Screenshot `C:/Users/sreej/AppData/Local/Temp/journey-feed-regressions-fixed.png` visibly confirms Buddy on the route and heart above bookmark/share. Up/down transitions were checked with five screenshot frames each; Buddy and top heart remain visible on incoming journeys, normal map/card/guide/slider/navigation composition preserved. Contact sheets `journey-feed-down-contact.png` and `journey-feed-up-contact.png` in that private scratch directory document native observations. Native map preparation briefly shows its own map-area loader; no claim that every loading phase is eliminated. The network detail-loading dwell was too brief in these frames for a prolonged native hold; stationary full-page loading under held network requests is established by the behavioral regression tests. Android rejected video recording with permission denied; screenshots were used successfully instead. No data-write buttons, Start/Begin Trip, uploads or auth actions used. Wider devices and quantitative performance remain unverified. All corrections local/unpublished.

## Review and device acceptance checklist

- Search opens the chosen item at the correct index; typed filtering, default viewer exclusions and Saved order remain unchanged. Returning retains query, Saved toggle and scroll offset.
- Strong up/down gestures change one journey; first/last boundaries do not wrap. Horizontal gestures change stops only. Diagonal/multitouch/cancelled gestures do not accidentally navigate.
- Dragging/pinching the map does not page; expanded map/Read story/About/share/action sheets prevent paging. Footer slider does not become a vertical paging region. No live actions are exercised for QA.
- Exactly one active map/Buddy; blur/background immediately disable input/preload, suppress stale results and revalidate availability on return. Standalone public/remixed and selected-preview routes retain old behavior; editor does not gain feed paging.
- Accessible previous/next actions are available; existing short-screen/large-font scroll fallback is preserved without competing vertical navigation.
- Details use validated anonymous-only data, raw media paths, short TTL and bounded entries. Signed URLs are resolved at activation without extending cache lifetime. Explicit refresh/collection invalidation cannot be undone by late inflight completions.
- Cached/prefetched details cannot display after denied/null public-membership checks. Refresh/refocus handles unpublish, errors and expired sessions without exposing saved-account context to another account.
- Prefetch begins only after current success, requests only next metadata and one visible image, cancels obsolete work, has bounded outstanding transports and never starts location or writes.
- Performance evidence distinguishes fixture request counts/cache hits from actual physical memory/frame/loading measurements. Dev-client observations are not release-build performance guarantees.
