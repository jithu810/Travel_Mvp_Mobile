# Thumbnail coverage integration — 2026-10-24

Architect recorded source/test baseline in ignored .expo/thumbnail-coverage-baseline.json before coding. Preserved all prior Search/Saved/cache/upload work and unrelated untracked .github/, cd, eas. Read-only backend preflight completed; current approved read policy supports cover/stop companion reads, no live change needed. No Storage/env/data changes, uploads, backfill, commits or push in this step.

## Result

Story-list JourneyCard, ProfileJourneyCard(Account/public), existing map photo pins(Homeglobe/Journeymaps), and Create/edit saved memoryrow previews use thumbnail then original then bundled default. Coordinate-only map markers retain existing circles/identity and do not gain extra image annotations. Unsaved local candidate has priority and preserves Not saved semantics. Original photo fields remain unchanged; full stop-story viewer, share artwork/export and large stop cards use originals.

Optional stop.photoThumbnail and map photoThumbnail carry companion URLs; authenticated editor map adds companion raw-path keys preserving originals and rejecting account switches. Public signer still bounded/cached and probes only enabled markedpaths. Shared fallback hook ignores stale image events using committed sourcepair/URI checks; Mapbox annotation refreshes on source/selected changes and image load.

## Review evidence

Architect independently reviewed backend type/query/map/editor changes and ran28/28 map/editor/cache checks, plus11/11 consumer/editor verification. Source-pair review finding fixed: coincident markers select original/thumbnail from one stop, not independently from different stops. Regression covers legacy/new overlap and thumbnail-only first pair.

Backend independently reviewed Mobile-authored UI/hook; reproduced stale callback retry, then verified guard fix. Final consumer8/8 and earlier132/132 focused checks passed, no remaining findings (thumbnail-coverage-backend-review.md). Mobile independently reviewed Backend-authored query/map/cache/editor changes;45/45 focused checks passed (thumbnail-coverage-mobile-review.md). Cross-review authorship is separated.

Protected source hashes match the task baseline: stop-story-viewer.tsx, stop-card-deck.tsx, stop-timeline.tsx, social/share-artwork.ts, journey-share-sheet.tsx and journey-photo.tsx unchanged. Runtime tests also prove original URI selection when optional thumbnails exist. App/source-test list is in ../thumbnail-coverage-changed-files.md.

No new physical-device image error/Mapbox annotation test was performed in this step; those behaviors are verified with executable mocked components. Existing Free-plan legacy images still fall back to originals because no backfill ran. No new dependency/native build is required. Final full-suite/type/lint/export results appended after completion.

## Application/test SHA256 snapshot
- src/app/create.tsx: 4FD2CCE18D2F13926D6901B1979B006E31EB16FE4AF21E8E98A78255D6843E12
- src/components/create/memory-row.tsx: 6B4F4832E2EF72CB91F5968265F372EBEFBA2A05ACAD5A5C3347CCD987478A71
- src/components/discovery/globe/journey-overlays.tsx: C78940D449634A6D110A581E7DC71B35E34161A8DF7BC439E3C3464F94A79FF8
- src/components/discovery/journey-card.tsx: A1D79EDC46879A1B211709DE712778322BBB05A8775FC12AB54A8B0B6042AA00
- src/components/discovery/thumbnail-photo.tsx: 68FB8445F8438B043D87218A6C3BE1BC12298D3DAB8030F4EEE3519239C7FB58
- src/components/journey/map/native-map.tsx: DF5A7D9C13BB8F3CC710A06AC38A8F05DE8D7286E757820646A0CAD0DB9B29F3
- src/components/profile/profile-ui.tsx: 06E97B1DC4F4F2B7CA20448AFF6E4C256480B464A35EBDF0F8F428D93F56038D
- src/hooks/use-thumbnail-source.ts: D40E098354F552AB0E65CE2035E8C4AFD506ED4D7C58DA94BFD375172167006C
- src/lib/create/queries.ts: 61EAAADC3553965594D9F0D0A516C7F4D9129611D5BFDEC7411EBB8CEC9E0460
- src/lib/discovery/map.ts: BA8DE3492285059617442A9C081A98E7918C66FDD233661BA66D1BC824528C97
- src/lib/discovery/queries.ts: 41D7A094036C5212980A69531150095713DB2F877B91D5FBC44F381C4C286A72
- src/types/journey.ts: A113ADDD415DF65897B1F6D928BC37F7C72D140AB1459FFE2A22A2C04D020ADF
- tests/create-flow.test.mjs: 044C6149D89C4C309730FACEDA12640AA9B73BB5634AEB3DDDC9CC212015F918
- tests/discovery-globe.test.mjs: F5ABA59EDE3391FFA8AB9B44400838728CEA51B37B0DF9B8B063689C49376BEE
- tests/editor-photo-thumbnails.test.mjs: D70E681C6ED13F7E58229E15A95C9F710C7F74EFAD19411B09024909A1F16189
- tests/image-loading-cache.test.mjs: 9B1645ECB35B5FB24926CEF89255E4EECA79846499149FE0392E48FF2704E1D3
- tests/profile-ui.test.mjs: C82034A07B03C7A5FC82D05DBC8576CF9EE7B53CAA0499A546559E103453EA84
- tests/thumbnail-consumers.test.mjs: 2F1AF78334B5D21BF49AC91B8F2EFAB8A97CC78ED9B974235BE9832BA122E821

Final authoritative application/test SHA256 after all fixes (supersedes earlier snapshot test hashes if different):
- src/app/create.tsx: 4FD2CCE18D2F13926D6901B1979B006E31EB16FE4AF21E8E98A78255D6843E12
- src/components/create/memory-row.tsx: 6B4F4832E2EF72CB91F5968265F372EBEFBA2A05ACAD5A5C3347CCD987478A71
- src/components/discovery/globe/journey-overlays.tsx: C78940D449634A6D110A581E7DC71B35E34161A8DF7BC439E3C3464F94A79FF8
- src/components/discovery/journey-card.tsx: A1D79EDC46879A1B211709DE712778322BBB05A8775FC12AB54A8B0B6042AA00
- src/components/discovery/thumbnail-photo.tsx: 68FB8445F8438B043D87218A6C3BE1BC12298D3DAB8030F4EEE3519239C7FB58
- src/components/journey/map/native-map.tsx: DF5A7D9C13BB8F3CC710A06AC38A8F05DE8D7286E757820646A0CAD0DB9B29F3
- src/components/profile/profile-ui.tsx: 06E97B1DC4F4F2B7CA20448AFF6E4C256480B464A35EBDF0F8F428D93F56038D
- src/hooks/use-thumbnail-source.ts: D40E098354F552AB0E65CE2035E8C4AFD506ED4D7C58DA94BFD375172167006C
- src/lib/create/queries.ts: 61EAAADC3553965594D9F0D0A516C7F4D9129611D5BFDEC7411EBB8CEC9E0460
- src/lib/discovery/map.ts: BA8DE3492285059617442A9C081A98E7918C66FDD233661BA66D1BC824528C97
- src/lib/discovery/queries.ts: 41D7A094036C5212980A69531150095713DB2F877B91D5FBC44F381C4C286A72
- src/types/journey.ts: A113ADDD415DF65897B1F6D928BC37F7C72D140AB1459FFE2A22A2C04D020ADF
- tests/create-flow.test.mjs: 044C6149D89C4C309730FACEDA12640AA9B73BB5634AEB3DDDC9CC212015F918
- tests/discovery-globe.test.mjs: F5ABA59EDE3391FFA8AB9B44400838728CEA51B37B0DF9B8B063689C49376BEE
- tests/editor-photo-thumbnails.test.mjs: D70E681C6ED13F7E58229E15A95C9F710C7F74EFAD19411B09024909A1F16189
- tests/image-loading-cache.test.mjs: 9B1645ECB35B5FB24926CEF89255E4EECA79846499149FE0392E48FF2704E1D3
- tests/profile-ui.test.mjs: C82034A07B03C7A5FC82D05DBC8576CF9EE7B53CAA0499A546559E103453EA84
- tests/thumbnail-consumers.test.mjs: 2F1AF78334B5D21BF49AC91B8F2EFAB8A97CC78ED9B974235BE9832BA122E821

Final integrated full suite624/624 zero skips passed, including isolated local PG policy regression only (no hosted writes). Final TypeScript passed. Lint/export final results pending append.

Final lint passed with zero warnings; Android export passed (1629 modules, output .expo/thumbnail-coverage-export). No source changes after final checks. Physical-device verification of this extension remains pending.
