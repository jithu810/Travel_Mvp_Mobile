# Journey feed independent QA

QA assignment accepted 2026-11-01, after backend preflight completion. Major-tier feature; local/unpublished. Read QA role, shared workflow, Mobile guidance, approved UI baseline, Architect implementation record and backend preflight. Application writer is active: implementation inspection, compilation and test execution are intentionally pending a stable snapshot from Architect.

## Scope and preservation

Baseline Mobile `76370ebdbd0ec83b3f7deb07aeb5be1d942ee50e`, `codex/published-journey-edit-buddy`. Preserve existing auth work, transparency fix, dirty status/roadmap and all feed writer changes. QA owns only this report and, if an uncovered behavioral case justifies it after inspection, `tests/journey-feed-qa.test.mjs`. No app edits, dependencies, secrets/environment-file reads, live writes, Git mutations or publication. Architect owns phone/ADB/Metro; QA performs no device operations.

## Planned independent checks

Use Architect's stable path list, snapshot hashes and implementer check evidence to select affected checks and avoid redundant compilation/full suites. Independently inspect behavior against acceptance criteria rather than mirror implementation. Add a synthetic behavioral test only where implementer coverage leaves a meaningful gap.

| Area | Independent scenarios and expected result | Evidence method |
| --- | --- | --- |
| Search handoff | Exact filtered/Saved order, chosen middle/end index, first/last boundaries, removed or invalid IDs; Back restores query/toggle/offset; standalone, remixed, selected-preview/editor isolated | Stable route/session logic and focused existing/new tests; native restoration observation requested from Architect |
| Raw public cache | At most six entries, TTL <=45 seconds, ID validation, mutation isolation, concurrent same-ID deduplication, errors not cached; invalidate during inflight prevents late repopulation | Fake clock/deferred mocked loaders; no live backend |
| Public activation gate | Prefetched/cached item denied/null/malformed/error at activation never displays cached detail; membership rechecked on refocus/resume; no owner/private/authenticated state enters cache | Mocked public card/detail/Storage boundary plus stable integration inspection |
| Photo lifetime | Activation resolves raw paths with existing signer; near-expiry signed URL is not extended by a detail-cache hit; missing photo fallback | Fake transports/time and affected photo-cache tests |
| Cancellation | Independent subscribers; last consumer abort, timeout, fast forward/reverse, background/blur/exit, stale success/error after navigation | Deferred promises and lifecycle inspection; device interruption evidence remains distinct |
| Prefetch budgets | Starts after current success; next-only metadata and first displayed photo; reversal/exit/background cancels obsolete work; no list/stop-image fanout; outstanding request bounds | Controlled request counters and integration inspection |
| Gesture ownership | Strong vertical pages once; horizontal stop swipes, diagonal/multitouch/cancel, map pan/pinch, footer slider do not page; sheets/expanded map block paging; fallback scroll retains control | Gesture predicate tests where exposed; actual native checks owned by Architect |
| One active map/Buddy | Active item alone mounts/operates map and Buddy; lifecycle disables animation/input/prefetch; no GPS or write calls on browse | Stable render/lifecycle source inspection and Architect native evidence |
| Approved UI/accessibility | Existing map shape/status bar, equal card height, guide/credit, slider/navigation composition preserved; accessible prev/next and nonwrapping boundaries; no unintended scroll expansion | Diff against baseline plus matching viewport/device evidence from Architect |

## Execution and limits

Pending stable snapshot. No application tests, compilation, lint, device checks or implementation review performed in this QA assignment yet. Backend preflight evidence is reused without rerunning live queries because this assignment proposes no backend change; reassess if scope expands. Request affected typecheck/scoped lint and meaningful regression evidence from implementer/Architect, then run only independent missing behavioral coverage. Do not broaden to unrelated suites without a concrete risk/failure.

Architect will supply native CPH2813/Android 16 evidence for entry, ordering, paging, map/stop gesture priority, sheets, Back and lifecycle, without live write actions. Device/build/connectivity/location state and timestamps must accompany that evidence. Mocked tests do not establish native gesture priority, real image-pipeline cancellation, physical memory/frame performance or broad phone compatibility. Independent Code Reviewer remains a separate acceptance requirement.

## Findings and result

Initial independent application inspection and seven additional behavioral tests completed against the refrozen lifecycle-hardened snapshot. No blocking functional/security finding observed. One low-priority finding is assigned for correction: adjacent prefetch chooses raw.stops[0] even when the next journey will restore a remembered later stop. Reproduction: visit journey 2, select Stop 2, page back to journey 1; next-image speculation warms journey 2/Stop 1. This stays within the one-image request budget but fails to warm the image shown on return. Architect assigned the bounded fix and focused regression to Mobile; final route hash/result pending that handoff.

Executed independently:

- `node --test --test-isolation=none --test-reporter=tap tests/journey-feed-qa.test.mjs`: **7/7 pass**, 2026-11-01 approximately 14:29 UTC. Tests execute real cache/prefetch helpers and the real route/useLoad with controlled synthetic public/native seams, transpiled in memory without shared compilation output.
- `node_modules/.bin/eslint.cmd tests/journey-feed-qa.test.mjs --max-warnings=0`: pass.
- `git diff --check`: pass; existing LF/CRLF notices on preserved baseline documentation/auth files only.

The extra tests cover six outstanding transports across repeated invalidation when abort is ignored; same-account reuse versus exact 45-second expiry/account switching; late native request-ID cancellation and budget recovery; cached data hidden on public-card error/null with denial eviction; immediate background speculative abort and ignored late completion; same-tick background/sheet paging fences; active photo completion after blur/account switch. All mocked transports contain synthetic content only. The first version of the helper tests waited for the existing 15-second deadline before completing intentionally ignored-abort transports; corrected the test scheduling to resolve deferred work explicitly after budget assertions. Final focused run completes in under one second; no application fix was needed for that test-harness delay.

Reused Architect/implementer evidence rather than rerunning unrelated checks: initial typecheck/scoped app lint passed; 157 affected regressions and 10 feed tests reported passing; final typecheck is pending Architect's confirmation. Search handoff/gesture harness tests are implementer-owned and were not duplicated. Independent code inspection confirmed unchanged public RPC names/arguments, anonymous client separation, fresh membership before cached activation, per-activation photo resolution, bounded next-only prefetch and no new browse-time GPS/write calls. One Story instance is rendered by the feed; main/expanded map conditions are mutually exclusive. Actual Mapbox/native input delivery still needs device evidence.

Architect supplied partial native observations on CPH2813/Android 16: vertical next/previous, horizontal Stop 1 to Stop 2, restoring Stop 2 after returning, and map pan retaining the same journey/stop. These are **Architect-reported native observations**, not device actions performed by QA. About-sheet, Back restoration, boundaries and remaining lifecycle results are pending its final evidence report. No measured physical frame/memory/bandwidth result is claimed.

## Final QA handoff

**7/7 independent QA tests pass again on the final delta snapshot at 2026-11-01 14:37:38 UTC / 20:07:38 IST.** No open blocking QA findings. The low-priority remembered-stop prefetch finding is **fixed**: inspected actual route selection of a valid remembered stop with first-stop fallback. Reviewer subsequently identified P2 stale modal availability fencing unavailable recovery controls and P3 speculative cover downloads for photo-less/empty decks. Architect assigned fixes; independently inspected mounted-Story-based paging availability (preserving synchronous modal fences) and early return before signing/image work when the displayed stop lacks a photo. Both are **fixed in the QA snapshot, pending final independent reviewer re-verification**. Implementer reports 14/14 feed tests, typecheck and route lint passing, including refresh/resume null/error recovery in both directions and photo-less/empty-deck no-image cases. Reused those targeted regression checks; independent QA7 rerun confirms unchanged cancellation/privacy/budget behavior. Native and final Code Reviewer evidence remain Architect-owned.

Exact application snapshot: base HEAD `76370ebdbd0ec83b3f7deb07aeb5be1d942ee50e` plus the following SHA256 hashes (includes preserved prior transparency edits in shared files). Manifest SHA256 is `42f7796436b60a3e12197b7458e0ae9eed4b86f73c7ac1ff2fbed7b6cf503d98`, calculated over the listed order as UTF-8 `path + space + lowercase SHA256 + LF` per entry:

| Application path | SHA256 |
| --- | --- |
| src/app/journey-feed.tsx | 1e83c85df76f12a562c21c2f65c5a18d2c5f92fa3dfff19ba1979db773497106 |
| src/app/journey/[id].tsx | c67b193d4c6b3ad06143b873ca9c577e8dca3a8f03f1f93e181930b6f6ea912c |
| src/app/search.tsx | c88e7c61d445b3db6bf2fbb7efa989caa6a046bfb8cf3276fe8eb69ed30eced8 |
| src/components/discovery/explore-tile.tsx | b4a154598a48ffcde0d96623e45c9fa5bc68a778d2d8cd8fac27025e07249275 |
| src/components/discovery/journey-card.tsx | 8e872286c719cd5c338a83bf4f71f160be45c3d48f0c1644b1b82eed75c1e803 |
| src/components/floating-navigation.tsx | 7730a962dedd75ee6b258ef2a337e3df84f7a537b76f3731c3f1bdd13aa2447f |
| src/components/journey/journey-options.tsx | f41f5b5dd729a40edd71755436654e0f857a5ffad82a461b1b2de4474a149767 |
| src/components/journey/social-actions.tsx | 648cd518afd34c4ee44bccc02cc42f638eab07ef27643de0d3a12cfcb3945f61 |
| src/lib/discovery/queries.ts | f2dbfa5170e4e45a35e852b2cc505af81bacd6cfe8d74f5d463f4cb3a5dc6644 |
| src/lib/discovery/journey-detail-cache.ts | dcb12e2e7a7c2b6dd078e8254f10b7624513492879a1f6bf045817f3873e3fd5 |
| src/lib/discovery/journey-feed-session.ts | 29ec4602d56c7599a8e593b48efc81e93046bdb82bfc3b7cf05c726443ac98b6 |
| src/lib/discovery/journey-feed-prefetch.ts | 2040a8849cd80e492e0d6ca9005d2a76f054bdea5089f63b6d25eedd2b42282f |

QA test file SHA256: `afc048a128f81d949c292c3e98215d74168bf4dff214b5e62633fc7c07387f7c`. QA changed only `tests/journey-feed-qa.test.mjs` and this report. No app edits, device operations, live writes, environment-file reads, dependencies, Git mutations or publication. Final check scope deliberately excludes unrelated suites/builds; broad/native/performance limitations above remain explicit. This is independent QA evidence, not independent Code Reviewer approval or permission to publish/deploy.

Delta evidence: writer test SHA256 `6bb97223a8888492e281c789e187c766907254cd2575a27adf6f2fd9ee623943`. All 11 other application file hashes are unchanged from the prior QA snapshot. Architect additionally reports successful query return and single-result end boundary on that prior snapshot; the final fallback/prefetch changes do not alter normal layout. These native observations are attributed to Architect, not independently repeated by QA.
