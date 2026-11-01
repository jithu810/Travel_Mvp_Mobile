# Explore optimization independent QA

QA Tester, 2026-11-01. Local Mobile baseline `0ee9d92`; no application edits, hosted writes, environment-file reads, phone operations or publication by QA. Architect owns physical-device operation and will supply evidence separately. The task explicitly authorizes the two-column Explore layout; other approved screens remain outside the visual scope.

## Evidence and measured comparison

Independent `tests/explore-optimization-qa.test.mjs`: **2/2 passed**. The original one-time audit compared actual Git baseline `0ee9d92` and current query source against an isolated fake Supabase transport, real request-cache implementation, fake clock, and synthetic 14-journey/nine-cover data. The permanent regression now uses a self-contained legacy-invalidation adapter (refresh clears collection and signed caches) versus current behavior, so shallow checkouts/source archives need no Git history or Git executable. Both comparisons produced the same results below. No live image objects are fetched.

| Initial load plus three explicit refreshes | Baseline | Optimized |
| --- | ---: | ---: |
| Collection RPC calls | 4 | 4 |
| Signing transport calls | 4 | 1 |
| Paths submitted for signing | 36 | 9 |
| Original order preserved on each refresh | Yes | Yes |
| First cover URL identical after refresh | No | Yes |

This is a 75% reduction in signing calls for this fixture, not a measured reduction in Storage image bytes. URL identity supports reuse by the existing native pipeline. It does not prove a native cache hit. After 45 seconds the independent test observes metadata reload with no extra signing; after 55 minutes it observes renewed signatures for all nine deduplicated paths.

`node --test tests/image-variants.test.mjs tests/thumbnail-consumers.test.mjs`: **11/11 passed**. Coverage includes strict thumbnail path eligibility and opt-in flag, small-to-original-to-art fallback, changed URLs and stale callback handling, shared card/editor/map behavior, and original retention for large Story/share consumers.

## Source and contract inspection

- Installed React Native FlatList groups items into rows (`node_modules/react-native/Libraries/Lists/FlatList.js`, `_getItem`/`_getItemCount`). Three initial rows with two columns means six initial tiles; two-row batches add four tiles. Existing window size three and 50ms batch interval are retained. All results remain in the same FlatList data set; no pagination/backend cursor is added.
- Explore uses percentage-width tiles with responsive outer gutters and row spacing, rounded clipping, and larger readable captions. Search, Saved and Story route interactions remain in their existing screen.
- Explore's selected source is `coverThumbnail` unless unavailable/failed, then `cover`; JourneyPhoto renders one native Image for that selected URI. Resolving/signing an original URL does not fetch its image body.
- Collection invalidation no longer clears valid signed URLs. TTL, path identity, deduplication and cancellation behavior remain in the existing cache. Search's foreground listener now requires screen focus; focus still refreshes collection membership.
- Search term filtering remains local and preserves input ordering. Explicit image retries preserve FlatList identity and query state while recovering failed same-URL images; this passed the stable final Search regression.
- The shared-cache refresh recovery fix also covers Home and the Story list. Home forwards a retry generation into DiscoveryPanel, using `extraData` and inner HomeJourneyCard keys while retaining list/panel identity and More/expanded state. Story retries inner cards without resetting its query/list or changing valid image URLs. The fix preserves other approved screen geometry.

## Stable snapshot result

After Mobile Developer declared the application snapshot stable, QA independently ran Search/cache/comparison tests: **25/25 passed**, zero failed/skipped. After independent review prompted Home/Story refresh recovery and removal of the historical-Git dependency, QA ran `node --test tests/explore-optimization-qa.test.mjs tests/home-polish.test.mjs tests/search-explore.test.mjs tests/image-loading-cache.test.mjs`: **44/44 passed**, zero failed/skipped. This includes public and Saved explicit-refresh recovery, Home/Story inner-card recovery without panel/list/query resets, screen focus/foreground behavior, local search and independent Story list, saved identity isolation, tile navigation/source marker, thumbnail-to-original-to-art fallback, inflight coalescing/cancellation and signature expiry. Scoped ESLint on the QA test and `git diff --check` passed. Together with the separate unchanged thumbnail/path checks above, the final applicable evidence comprises **55 passing tests**; earlier repeated runs are not counted again.

No actionable automated QA finding remains on this snapshot. The test portability finding is resolved. Source and tests have no new caching dependency, backend API, pagination or production writes. Native visuals/performance/transfer measurements remain a distinct Architect-owned check.

## Architect-supplied runtime evidence

Architect reports the real CPH2813 Android 16 phone running Journey Google Test from the Mobile checkout through Metro 8081. The screenshot shows the two-column Explore layout. A boolean-only CDP evaluation of the loaded `storedThumbnailsEnabled()` returned **true**, verifying thumbnail generation capability is enabled in this development bundle without reading environment files or performing an upload. This does not verify a separate production build configuration.

Architect's native query-cache observation found 14 journeys, nine unique cover URLs and three entries reported in memory cache. Collection invalidation followed by reload preserved all signed URLs. These establish runtime URL identity and existing native cache presence, not a measured cache-hit rate or transferred-byte savings. QA did not operate the phone or independently execute the CDP probes.

## Limits and remaining verification

Implementation-owned TypeScript/lint and Architect-owned physical evidence should be read in the completion report; QA did not duplicate those commands or operate the phone. This report establishes JS/client contract verification, not device acceptance.

The three-viewport window intentionally admits nearby offscreen cells for smooth scrolling, and FlatList may retain its initial rows. Offscreen downloads are bounded by rendering; neither zero offscreen image requests nor Android frame-rate performance is established by JS mocks.

Backend's read-only inventory found all nine current Explore cover paths legacy, 6,029,211 stored bytes total, with no discoverable paired thumbnails. Current-content thumbnail savings therefore require the separately approved backfill/reference transition. The development capability flag is verified as above; production configuration and actual new-upload generation remain unverified, and no production upload is authorized. Native request counts, transferred bytes, cache hit rates, process-restart behavior and broad-device layout/performance remain unmeasured.
