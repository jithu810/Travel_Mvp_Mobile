# Independent Mobile image UI / generator review

2026-10-24. Reviewer scope: Mobile Developer's Search/Home list rendering, Home/Explore preferred image selection and native thumbnail adapter/model. **This specialist authored cache/upload/path/policy code, so those components are excluded from this independent review.** Architect owns their independent review. This report title follows assigned filename; its independence does not cover Backend Developer's own implementation.

No actionable findings in reviewed frontend/generator snapshot. Search FlatList renders four initial rows/twelve tiles with two-row batches/window3, without truncating the collection. Home renders image data only in the active compact/expanded list, avoiding simultaneous hidden-image lists. Existing More navigation and selected journey handlers remain.

Home/Explore prefer optional coverThumbnail, then original on thumbnail load error, then supplied bundled fallback on original error. Changed URL recovers; Story still receives original cover and existing story images. Source/search route marker, accessibility labels, square partial rows, save ownership, independent query and personal Saved identity protections remain.

Explicit Home/Search refresh invalidates shared public cache before useLoad refresh; focus/foreground calls the loader normally so TTL reuse remains available. Saved refresh stays caller-specific and is not routed through public membership cache. No new native dependency/image library/disk cache added by reviewed files.

Thumbnail model validates source dimensions/pixel bound, never upscales, targets max512 preserving aspect, validates actual output bytes <=1MiB, JPEG header and exact dimensions, rejects source URI alias, and cleans only distinct generated output on failure/cancellation. Native adapter uses existing lazy filesystem/manipulator modules, JPEG quality0.7, independently releases image/context, owns generated URI set for removal, and fails honestly on web. Source upload remains separately gated/default-off by Backend implementation; hosted activation is pending.

## Independent checks

node --test tests/thumbnail-device.test.mjs tests/home-polish.test.mjs tests/search-explore.test.mjs tests/create-flow.test.mjs tests/discovery-panel.test.mjs: **94/94 passed**. git diff --check passed (pre-existing documentation line-ending notices). Tests exercise fallback order/changed URLs, active-list-only data/More, bounded list props, Saved identity/query refresh behavior, adapter generation/header/byte/dimension checks, async cancellation and cleanup, native resource failures and web fallback. These are mocked/native-source tests, not physical-device generation/performance proof. Full suite/type/lint/Expo export remain writer/Architect-owned checks.

## Reviewed SHA256

| File | SHA256 |
| --- | --- |
| src/app/search.tsx | DB7145E6C713EB696209F7C8DE7907A1E6860A52F69A46B56E27E8A950E0A358 |
| src/app/discover.tsx | C3AC1218901C1A39ADE2F3EA6F73CE8E72830BF73FC64E4BBC03D1BF41991397 |
| src/components/discovery/discovery-panel.tsx | DE6205E2132056334969C354F5AFE129401CDF1DB1C125FD1D502A818492F157 |
| src/components/discovery/home-journey-card.tsx | 91001857C53364CC1C430E1CEEDE7DFEF9B227EB64EC7C00647B60218480A297 |
| src/components/discovery/explore-tile.tsx | 57622349C7B9C76213FFF1E4EF85C136ECAF16D3D5B3AE87FCE09164FE391DA4 |
| src/lib/create/thumbnail-model.ts | 8C361096370FDB9F89C9730137D6197E71C8ECBA1AC3E8F9F366E1DC804AD8D6 |
| src/lib/create/thumbnail-device.native.ts | 8BD291A4475D97E76AF9DA4A3A585FE6201CC7580FA1FBC9768F7770F51A2CF7 |
| src/lib/create/thumbnail-device.ts | 42986832DC257F1FE97D37EA8CDADD0CC33E2705A807C3E59A86DA9CFB022530 |
| tests/thumbnail-device.test.mjs | AA90B2F766603142F18D1A8311C7D1A59F7AB5B172909B6E58E2B0591DB97BEF |
| tests/home-polish.test.mjs | DDB2E4C51E579DC4810591BB57B732169CD3A44F81117F258AE1924BDDAA5852 |
| tests/search-explore.test.mjs | F0B5031F74B46757B3DF536BFD1C434633971217009193F68B03F61758103D88 |
| tests/create-flow.test.mjs | 25C757D746A5AE6FCE9D8BE672BFC11454D4CFCD0A9AE4824251A013A9822897 |
| tests/discovery-panel.test.mjs | 47CF3CEFEE1B12978E03F7D5CA058766B1C61B066C1A68C8B70A7EB4F4007119 |

## Separate implementation evidence (not independent review)

Backend author checks: cache/variant/photo focused29 passed at first checkpoint; after final source-alias boundary test, photo-persistence20/20 passed. Cache transport hang finding from independent Mobile review was fixed with12sec worker deadline and max4 underlying outstanding calls; hung-two-then-fresh-success regression passed. Architect must confirm final backend diff independently.

Review SQL policy was executed only on fresh disposable **local PG17** synthetic cluster D:/Travel_Mvp_Mobile/.local-tests/thumbnail-policy-8X7mSR, loopback port53453. Initial sandbox start attempt failed restricted-token87 before startup; allowed escalation run passed1/1, including anon published cover/stop, owner/other/draft, unrelated/traversal/bucket denial, original grants and rollback. Cluster log confirms shutdown 2026-10-24 09:33:26 IST. No existing Web test cluster modified; no files deleted; synthetic evidence retained ignored. This validates PostgreSQL policy behavior, not hosted Storage endpoint integration or product-owner approval to apply.

## Limits and approvals

Physical Android/iOS thumbnail generation, large-text/accessibility, scroll/decode/memory/network measurements and hosted transformed-size delivery remain unverified here. Current Free plan has no server transformations; legacy images retain original network bytes. Paired upload flag defaults off; future activation needs reviewed policy installation plus explicitly approved action/target. Backfill remains offline review preparation. No live policy/config/billing/object writes, uploads, deployments or Git publication performed by reviewer. Reviewer-phase changed file: this local/unpublished report only.
