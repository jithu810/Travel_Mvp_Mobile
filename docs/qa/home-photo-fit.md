# Home photo fitting QA and independent review

QA Tester / independent Code Reviewer: reassigned specialist, separate from application writer. Timestamp: 2026-10-23 08:24 IST (02:54 UTC). Local/unpublished.

## Tested snapshot

Repository D:/Travel_Mvp_Mobile, branch codex/home-photo-fit, HEAD aba76832ce967503caf5d8692faf019ed3f583ca. Stable application/test snapshot released by Architect before checks; hashes reconfirmed after checks:

| Path | SHA256 |
| --- | --- |
| src/components/discovery/home-journey-card.tsx | AF7B8DA6BA9F2853B43B8C7ED377F8DE26E297A1A285DE2C253390AD880CAD2A |
| tests/home-polish.test.mjs | B05D36B555E1270E517B390E14CDB6D3691D1995C8B62C6CEF8D5D330574B6FF |

Architect subsequently changed PROJECT_STATUS.md and ROADMAP.md only. Preflight report present; baseline untracked .github/, cd and eas preserved. This assignment writes only this report and does not modify application/test files.

## Checks actually run

- npm test: 560/560 passed, zero failed/skipped/cancelled.
- npm run typecheck: passed.
- npm run lint: passed, max-warnings=0.
- node --test tests/home-polish.test.mjs: independently passed 12/12.
- git diff --check: passed; Git reports existing LF-to-CRLF conversion warnings for Architect's status/roadmap files, no whitespace errors.
- Independent source/diff review: HomeJourneyCard, changed Home tests, surrounding DiscoveryPanel layout/measurement/scroll integration, backend preflight evidence.

Simulated component checks establish one cover image with no blur, resizeMode cover, expanded 16:9 sizing, retained 96x84 compact frame, labels, selected state, navigation callbacks, missing/failed photo fallback, changed-URI recovery and measurement callback. Existing panel clearance tests cover multiple viewport/clearance combinations. Inspection confirms expanded cards use vertical FlatList scrolling and trailing clearance; only compact cards feed the compact snap measurement. Taller expanded photos therefore do not enlarge the compact snap or introduce a new gesture responder.

## Independent review findings

**No actionable findings** in the reviewed application/test snapshot. Change is narrowly scoped to local rendering and does not alter read queries, signed-photo resolution, RLS, auth, upload/save/copy paths, map state or dependencies. Existing originals remain unchanged. Cover cropping intentionally clips portrait/landscape edges and cannot restore detail absent from a low-resolution source. Explicit expanded height has the same pre-existing rounding/border convention; no new layout regression found by inspection.

## Limits and device acceptance

No native device was reached in this assignment. Architect's adb inventory attempt failed because sandbox Android home creation was unavailable; no device/OS/build, permissions, connectivity or GPS state was established. No screenshots, browser/device walkthrough, native scroll, actual raster crop, TalkBack, large text or safe-area success is claimed from mocks. Running development server was left untouched. No native dependency/runtime change: offline Expo compatibility and native bundle export were not rerun; existing dependency/native-build evidence is not refreshed by this task.

Product-owner/device check: reload current local bundle; open Home discovery sheet; compare existing portrait, landscape and square cover examples. Expected: expanded covers fill equal 16:9 frames, no blurred sidebars/distortion; portraits may crop at center. Scroll through the final card/actions above bottom overlays, collapse/re-expand and locate/open a journey; compact thumbnails remain fixed size and selected-map behavior intact. Verify slow/failed image fallback where practical without changing live data. Missing native checks remain pending.

No live mutations, uploads, saves, seeds, migrations, package updates, server restart, commit/push/merge, build or deployment performed. Publication and merge approval remain with product owner. Backend preflight applies only to Home fitting; Journey layout/deck and upload crop are excluded.

## Branded fallback delta: QA and independent review

2026-10-23 08:35 IST (03:05 UTC). Same HEAD/branch, stable snapshot released by Architect before testing. This section supersedes source/test hashes and test totals above for the current fallback extension:

| Path | SHA256 |
| --- | --- |
| src/components/discovery/home-journey-card.tsx | 26253550F1E9040938B0721096EDBE4AE8962CC288EC7F4C74ED2780E239DC74 |
| tests/home-polish.test.mjs | 5C6AA51BE246FFE9C734017B6F0D62A4EB9385395848A278131FBEEAC6F4C3DC |

Hashes reconfirmed after checks. npm test **561/561 passed**, focused Home tests **13/13 passed**, npm run typecheck passed, npm run lint passed with max-warnings=0, git diff --check passed (same status/roadmap line-ending warnings). No source/test edits by QA/reviewer.

Verified through component tests and inspection: missing and failed photos render no Image and use static native Views; art is noninteractive and hidden from accessibility; fallback description includes missing photo/destination/story; expanded-only caption has one-line destination truncation and Journey story label. Changed URI recovers the actual photo. Compact frame remains 96x84, expanded 16:9; frame, fallback and decorative art clip overflow. Art contours intentionally extend beyond their own bounds but are clipped within the photo frame. Caption stays inside normal fallback layout; long-destination horizontal behavior is bounded by numberOfLines=1 and the frame width. Tests use a short synthetic destination; actual long-label/large-font layout is inspection-only and remains native acceptance.

Android dotted-border concern investigated against installed React Native 0.86.3 source: ReactAndroid/src/main/java/com/facebook/react/uimanager/drawable/BorderDrawable.kt drawRectangularBorders handles top border independently, calls updatePathEffect(width), and getPathEffect(DOTTED) creates DashPathEffect. Current route uses uniform borderColor and no border radius, consistent with the rectangular path. No evidence-backed unsupported-border finding; this is source compatibility evidence, not an observed physical rendering result. No replacement dependency or broader art change is needed from this review.

Independent review: **no actionable findings**. No additional network calls, backend paths, dependencies, animation, auth or write behavior introduced. Native illustration appearance, dots/pins at real device density, long text, TalkBack and scroll remain pending because no device was reached. Architect reports owner physically confirmed the preceding real-photo fit; fallback itself has not been device-confirmed by this specialist. Existing server untouched; no live mutations/publication/build/deployment. Backend scope-delta preflight records no backend changes needed.
