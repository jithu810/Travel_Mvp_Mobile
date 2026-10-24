# Independent thumbnail-consumer UI review

2026-10-24. Scope: Mobile-authored shared thumbnail hook/component, Story-list JourneyCard, ProfileJourneyCard, Create memory previews, Home/Story map photo pins and original-photo preservation. Backend Developer authored query/type/map-data changes and **does not independently review those here**; Architect owns their independent review. No live Storage changes, writes, backfill, flag edits or publication performed for this follow-up.

## Finding and final disposition

**P2 resolved:** stale native image-error callbacks could overwrite current failed-URL state in use-thumbnail-source.ts. Reproduced using the real transpiled hook: thumbnailA callback retained, thumbnailB rendered/failed to original, then stale A callback made failed B eligible again. Same issue affected original URL failures. Mobile fixed this with a committed current source-pair/URI ref updated in layout effect; callbacks only mutate state when still current. Independently reran the exact ordering: failed B stays on original after stale A; failed original B remains fallback after stale original A. Persisted regression and all final consumer tests pass. No remaining actionable UI findings.

Shared ThumbnailPhoto tries the optional small URL then original then bundled fallback; changed URLs recover, equal thumbnail/original only attempted once, original-failure callback preserves editor renewal. JourneyCard/ProfileJourneyCard retain navigation, accessibility and original cover; profile avatars remain original. Create memory row and map select saved companions only without a local candidate, so unsaved local preview and Not saved status retain priority. Raw form/save paths are untouched by UI.

Map photo pins refresh annotation snapshots on selected/URI changes and load, keep coordinates/selection callbacks, and fall back to bundled default only for existing photo pins. Coordinate-only markers remain plain. Native Story/editor map receives optional stop companion while retaining original memoryPhotos. Large Story photo deck/timeline/viewer and share artwork remain on original photo fields; thumbnails are used for list/pin/compact previews.

## Independent verification

- Consumer/Create/Story-interaction/social-profile suite: **132/132 passed** against initial guarded-hook snapshot.
- Final tests/thumbnail-consumers.test.mjs: **8/8 passed**, including newly persisted obsolete-error regression and runtime full-screen/deck/share-original assertions.
- Independently executed real-hook stale-A/new-failed-B ordering for thumbnail and original paths; both retained expected current failure state after fix.
- git diff --check passed. Full-suite/typecheck/lint/export are coordinated writer/Architect checks, not independently rerun here.

Mocks/source execution do not establish native rendering/performance or actual live thumbnail requests. No physical Android/iOS capture, source-image download or extra upload was performed by this reviewer.

## Reviewed final SHA256

| File | SHA256 |
| --- | --- |
| src/hooks/use-thumbnail-source.ts | D40E098354F552AB0E65CE2035E8C4AFD506ED4D7C58DA94BFD375172167006C |
| src/components/discovery/thumbnail-photo.tsx | 68FB8445F8438B043D87218A6C3BE1BC12298D3DAB8030F4EEE3519239C7FB58 |
| src/components/discovery/journey-card.tsx | A1D79EDC46879A1B211709DE712778322BBB05A8775FC12AB54A8B0B6042AA00 |
| src/components/profile/profile-ui.tsx | 06E97B1DC4F4F2B7CA20448AFF6E4C256480B464A35EBDF0F8F428D93F56038D |
| src/components/create/memory-row.tsx | 6B4F4832E2EF72CB91F5968265F372EBEFBA2A05ACAD5A5C3347CCD987478A71 |
| src/app/create.tsx | 4FD2CCE18D2F13926D6901B1979B006E31EB16FE4AF21E8E98A78255D6843E12 |
| src/components/discovery/globe/journey-overlays.tsx | C78940D449634A6D110A581E7DC71B35E34161A8DF7BC439E3C3464F94A79FF8 |
| src/components/journey/map/native-map.tsx | DF5A7D9C13BB8F3CC710A06AC38A8F05DE8D7286E757820646A0CAD0DB9B29F3 |
| tests/thumbnail-consumers.test.mjs | 2F1AF78334B5D21BF49AC91B8F2EFAB8A97CC78ED9B974235BE9832BA122E821 |

## Separate backend-author checks

Architect independently found duplicate-coordinate original/thumbnail could come from different stops. Backend author fixed map-data selection to one source pair per coordinate, retaining marker identity/coordinates. Regression covers legacy original A plus new pair B at same coordinates and thumbnail-only A plus full B. Map/editor/cache focused **28/28 passed** after correction; this is implementation verification, not independent self-review. Architect must accept the final query/map/type diff. Earlier combined backend47 tests passed before that focused correction.

Current preflight: docs/thumbnail-coverage-preflight.md. All work remains local/unpublished; prior dirty work preserved. User requires file list before any future push; no push authorized. Changed reviewer file: this report only. No new hosted approvals needed because this follow-up changes local read/render behavior only; existing uploaded companions are reused under current policy, and legacy originals remain fallback.
