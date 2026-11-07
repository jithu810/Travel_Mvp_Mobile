# Profile Pan map and Buddy memory tour — 2026-11-07

## Scope and baseline

Implemented locally on `main`, base `0aed794191a7f528fd0b95df126bb3f4e7aca24d`. Earlier profile, Home, Search and privacy/deletion work is preserved. The profile Map uses the existing Pan map, filling the remaining profile area above navigation, with Buddy moving between memories and showing a photo bubble. No commit, push, deployment or live backend change was performed.

This is a native UI and local animation change. Existing published-only memory-map loaders, limits, signing, RLS/auth assumptions and query/API/Storage contracts remain unchanged. The source is published journey stops, not verified visits or live GPS. Existing loaded journey covers may supply the bubble fallback without new backend requests. No dependency or native build change is planned.

## Acceptance

- Default and only presentation is the existing pannable map. No regional arrows, Atlas/Pan map boxes, summary section or footer below it.
- Profile details, collection icons and other collections remain unchanged. Measure the actual remaining space below the header/tabs; retain the existing short-screen/large-text scrolling fallback. Do not cover bottom navigation or native map attribution.
- One local Buddy tours stops in the existing journey/stop order. On arrival, a compact photo/title bubble appears near its head, kept within the measured map bounds. Use the existing photo or loaded journey cover, then artwork if unavailable.
- A place tap interrupts the old animation and selects that place. Overlapping memories remain reachable through a chooser. The bubble explicitly opens the correct journey stop.
- Manual panning/zooming owns the camera and pauses automatic touring. Provide compact pause/resume and next-memory actions. No tour camera commands.
- Respect Buddy preference, reduced/unknown motion, focus, foreground, on-screen visibility and modal/chooser state. Cancel timers, frames and stale projection callbacks immediately when unavailable. Do not write preferences or travel state.
- Position animation subscribes only the Buddy rendering leaf. No per-frame parent/map/navigation renders or network projection requests.

## Verification record

- Implementer: 63 focused tests passed across tour, bubble/native map, profile, ownership and connection suites. After the final chooser guard, its 10 affected tests and scoped lint passed again. Full TypeScript and nine-source-file scoped lint passed before the final bounded callback-guard changes. Diff validation passed.
- Independent model audit: fake-clock checks passed run/hold timing, shortest-arc date-line interpolation, metadata/coordinate subscription separation, immediate manual interruption, conditional resume, reduced-motion/manual Next, pause and disposal. Invalid/duplicate input filtering was added after review.
- Independent integration review: 39 tour/profile-map/profile-UI tests passed; final 10 affected tests passed after review fixes. Same-stop photo projection now refreshes even without metadata changes. Strict permission checks block callbacks behind settings/other dialogs, block underlying controls during the memory chooser, and use chooser generations to reject callbacks from a closed/reopened chooser.
- Chooser regression coverage reaches all 5,000 synthetic entries through bounded virtualized pages. Additional checks cover measured map height, on-screen visibility, unsafe photo URLs, stop-photo/loaded-cover/art fallback and stale owner/membership/camera projections.
- Owner Android phone, development client via registered checkout/Metro 8081: Pan map fills the space below the unchanged profile tabs through the area above navigation, with attribution visible. Atlas controls, regional arrows, summary and footer are absent. One Buddy and a compact photo bubble render. Successive observations show the tour advancing between different stops. Tapping another mapped place immediately moves Buddy and updates the bubble. A photo bubble opens the correct non-first stop in Story. Manual vertical map panning changes the map and changes the tour control from Pause to Play; resuming restores the running tour and arrival photo. Final map/tour remains open for the owner.
- A blank development-client screen after reload was resolved by reopening the existing verified dev-client link. Metro remained on the registered checkout; no installation or Metro restart was needed. Filtered app error-category diagnostics found no known JavaScript error signature. A later capture showed Android Theme settings, so device taps paused until the owner confirmed the phone was available. Final native checks then completed on Map.

No live backend writes, preference changes, GPS actions, native build or publication were performed. Existing queries, signing and memory-map data preparation remain unchanged.

Not verified on hardware: landscape, wider devices, large text/screen readers, reduced-motion and Buddy-off toggles, real background/foreground cancellation, 5,000-pin native performance or every chooser page. These states have targeted automated coverage where noted; mocks do not establish physical-device lifecycle or performance results. Same-stop repeated-tap projection has automated evidence; the attempted phone repeat check opened the photo's Story instead and is not counted as a repeated-pin verification.

## Publication snapshot

The review branch excludes separate privacy/account-deletion work. Unused mosaic presentation imports and types are omitted; the final public map has a single native renderer. The active phone checkout is preserved separately.

The isolated publication snapshot passes 135 focused tests across Home, Search, vertical feed/QA, profile collections/connections/map, Buddy tour/bubble and sheet stability. Full TypeScript and scoped source lint pass. An independent publication review compared source/test files against the phone-tested snapshot: only the expected privacy exclusions and unused Atlas cleanup differ; all 44 independently rerun profile/map/tour/bubble tests pass. No query/auth/dependency changes or missing runtime files were found.
