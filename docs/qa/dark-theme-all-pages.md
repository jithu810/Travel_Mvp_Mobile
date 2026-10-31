# App-wide dark theme implementation - 2026-10-31

Local/unpublished. Owner extended the approved Home/Journey pilot to every Mobile page. Major shared-presentation verification. Baseline: feature/backlog-phase1 at87b127a plus the existing authorized dirty pilot and its QA/status records. No existing work reverted. Architect owns status/roadmap/physical checks; Mobile Developer owns src presentation and affected tests; separate QA/review records remain independent.

## Backend-impact assessment

Architect inspected all15 routes, root layout, existing palette/adapter and prior pilot. This extension changes presentation only: existing data contracts, authentication/authorization/session logic, persistence, RPC/API/Storage access, route targets, lifecycle/GPS behavior and package/native configuration remain unchanged. No live preflight, hosted writes, dependencies or rebuild required/performed for this JS change.

## Approach

The immutable default theme is dark app-wide. Original lightTheme is retained solely for fixed export artwork, original map layers, and deliberately light map controls. Shared stylesheet adaptation occurs once at module evaluation with cached explicit foreground/background/border/gradient roles; original objects are not mutated and no pathname subscription is needed. Compatibility helper names retain the pilot import path. No Light/Dark/System setting, stored preference or system-theme behavior was added.

Inputs have readable text/placeholders/selection and dark keyboard appearance; otherwise-default text/spinners/switches receive explicit UI colors. Root/Create/profile/modal status-icon owners now use light icons without changing their focus/cleanup logic. Inverse selected badges/tabs use dark fills with readable text. Photos, generated art, map styles/routes, inline map credit/light backing, exported share artwork and branded Google white control remain intentional exceptions. Warm email-button text is dark for contrast.

## Route inventory

| Route file | Covered surface |
| --- | --- |
| src/app/index.tsx | Reuses fully themed Home |
| src/app/discover.tsx | Home/globe/panel/cards/help/navigation |
| src/app/search.tsx | Search + public Story list, inputs/filter/empty/error/loading |
| src/app/create.tsx | Quick Start/draft editor, memory/photo/settings/recovery sheets |
| src/app/account.tsx | Account, collections/settings/preferences/sign-in/loading |
| src/app/auth.tsx | Existing dark scenic login/registration, inputs/actions/feedback |
| src/app/auth/callback.tsx | Google completion/loading/error |
| src/app/journey/[id].tsx | Public Journey Story including loading/error/About/map/stop/share |
| src/app/customize/[id].tsx | Shared Customize components/base UI inherit default dark; route logic untouched |
| src/app/customized/[id].tsx | Shared temporary Story preview inherits dark; route logic untouched |
| src/app/draft/[id].tsx | Shared private draft UI/timeline/base tokens inherit dark; route logic untouched |
| src/app/profile/[username].tsx | Shared public profile identity/cards/base UI inherit dark; route logic untouched |
| src/app/profile/edit.tsx | Profile editor fields/photo/feedback/status |
| src/app/travel/[id].tsx | Travel preview/session panels/arrival/confirmation/guidance/loading; no GPS behavior change |
| src/app/_layout.tsx | Root stack/startup surfaces/status default |

## Changed presentation files

| File | Surface/exception |
| --- | --- |
| `src/app/_layout.tsx` | Root/stack surfaces and light status icons |
| `src/app/account.tsx` | Account, settings, Buddy switch and loading |
| `src/app/auth.tsx` | Sign-in/registration input presentation; auth flow unchanged |
| `src/app/auth/callback.tsx` | OAuth completion/error/loading surface |
| `src/app/create.tsx` | Create/draft editor, settings, cover/recovery sheets and status icons |
| `src/app/discover.tsx` | Home preview retained under app-wide default |
| `src/app/journey/[id].tsx` | Journey/Travel screen surfaces and controls |
| `src/app/profile/edit.tsx` | Profile editor inputs/error/status icons |
| `src/app/search.tsx` | Search/Story list, filters, query field and loading |
| `src/app/travel/[id].tsx` | Journey/Travel screen surfaces and controls |
| `src/components/auth/legacy-ui.ts` | Auth base surfaces and inverse action role |
| `src/components/auth/signup-styles.ts` | Existing dark scenic sign-in; readable warm CTA text; branded Google control retained |
| `src/components/branded-loading.tsx` | Startup/page/photo loading surface |
| `src/components/buddy/buddy-help-sheet.tsx` | Floating/dialog Help text/actions |
| `src/components/buddy/buddy-intro.tsx` | First-outcome/intro modal |
| `src/components/buddy/buddy-sprite.tsx` | Sleep caption; sprite artwork untouched |
| `src/components/buddy/journey-buddy-host.tsx` | Buddy presentation shell |
| `src/components/buddy/travel-preferences-settings.tsx` | Local preference editor choices/feedback |
| `src/components/create/create-journey-header.tsx` | Create header/map search controls |
| `src/components/create/editor-action-icon.tsx` | Editor icon foregrounds |
| `src/components/create/memory-deck.tsx` | Private draft memory deck surfaces |
| `src/components/create/memory-editor-sheet.tsx` | Memory modal inputs, location controls, photo section and footer |
| `src/components/create/memory-row.tsx` | Memory captions/reorder/remove controls |
| `src/components/create/photo-field.tsx` | Gallery/camera/local photo preview controls and feedback |
| `src/components/create/place-picker.tsx` | Home/Create place inputs, suggestions and result sheets |
| `src/components/create/quick-journey-setup.tsx` | Quick Start/edit form, all traveler chips, duration and destination controls |
| `src/components/delete-draft-action.tsx` | Delete confirmation/error/cancel surfaces |
| `src/components/discovery/compact-search-input.tsx` | Search input/placeholder presentation |
| `src/components/discovery/discovery-panel.tsx` | Home discovery sheet/cards/loading |
| `src/components/discovery/explore-tile.tsx` | Search Story tiles and preserved image overlays |
| `src/components/discovery/globe/fallback.tsx` | Globe unavailable/loading text with light-control exception |
| `src/components/discovery/globe/journey-overlays.tsx` | Preserved original map photo-ring/plane foregrounds |
| `src/components/discovery/globe/native-globe.tsx` | Preserved original map pins/labels/light reset face |
| `src/components/discovery/home-control-icon.tsx` | Dark-card Locate/Explore and original dark World glyph |
| `src/components/discovery/home-journey-card.tsx` | Home cards/actions and selected state |
| `src/components/discovery/journey-card.tsx` | Public search cards |
| `src/components/discovery/journey-photo.tsx` | Photo loading/fallback UI; original image unchanged |
| `src/components/discovery/ui.tsx` | Shared headers/actions/messages/skeletons |
| `src/components/first-outcome-hint.tsx` | Contextual guidance panels |
| `src/components/floating-navigation.tsx` | App-wide navigation surfaces/icons/selected state |
| `src/components/journey/arrival-prompt.tsx` | Arrival confirmation/dismiss UI; GPS logic untouched |
| `src/components/journey/customize-stops.tsx` | Customize deck/review/ready states and status/warning copy |
| `src/components/journey/itinerary-sheet.tsx` | Story/Travel itinerary sheet |
| `src/components/journey/journey-action-icon.tsx` | Social/map/editor action glyph presentation |
| `src/components/journey/journey-options.tsx` | Use/Customize/Remix/options/feedback UI |
| `src/components/journey/journey-share-sheet.tsx` | Dark share explanation/feedback; fixed light export canvas preserved |
| `src/components/journey/maneuver-panel.tsx` | Readable blue driving-instruction panel |
| `src/components/journey/map-itinerary.tsx` | Selected/current itinerary chips and inverse badges |
| `src/components/journey/map/native-map.tsx` | Preserved original native map markers/light controls with dark labels; dark page captions |
| `src/components/journey/nearby-locations.tsx` | Nearby chooser text/control backgrounds |
| `src/components/journey/social-actions.tsx` | Like/Save/Share controls and feedback |
| `src/components/journey/stop-card-deck.tsx` | Public memory cards/captions |
| `src/components/journey/stop-story-viewer.tsx` | Full-screen stop modal/notes/navigation |
| `src/components/journey/stop-timeline.tsx` | Private/public stop timelines |
| `src/components/journey/story-extras.tsx` | About snapshots/future-action presentation |
| `src/components/journey/story-header.tsx` | Creator/header surfaces; image overlay labels preserved |
| `src/components/journey/story-sheet.tsx` | Shared full-screen modal and status icons |
| `src/components/journey/swipe-journey-start.tsx` | Travel/publish swipe surface; gesture behavior untouched |
| `src/components/journey/trip-confirmation.tsx` | Pause/finish/discard confirmation presentation |
| `src/components/profile/profile-styles.ts` | Account/public profile identity/cards/tabs/settings and inverse fills |
| `src/components/profile/profile-ui.tsx` | Profile status icons; profile routing/data untouched |
| `src/components/remix/deck-buddy.tsx` | Customize companion bubble |
| `src/components/remix/source-attribution.tsx` | Remix attribution presentation |
| `src/components/remix/stop-deck.tsx` | Customize card/badges/labels |
| `src/theme/dark-pilot.ts` | Explicit cached legacy UI role/gradient adapter, app-wide compatibility helpers |
| `src/theme/mobile-theme.ts` | Immutable shared dark tokens + reserved original lightTheme |

## Verification

- One broadened run:992 tests,904 pass,88 fail.86 failures were standalone harness dependency additions or expected palette/status assertions;2 isolated PostgreSQL starts failed under the sandbox (restricted-token error87). No application behavior fix was required for these harness failures.
- Final affected rerun:337/337 pass, including all formerly failing presentation suites,6 palette/cache checks and9 independent contrast/render QA checks (7 all-pages +2 retained Help/Share). Covers authentication/registration/callback, creation/photo/recovery, shared navigation, profile, Customize, native map interaction fixtures, Travel/lifecycle, share/thumbnail/original-image contracts.
- Passing unaffected full-run tests are reused; no claim of one final monolithic full-suite pass. Earlier isolated email backend5/5 and thumbnail policy1/1 passes from this conversation can be reused because their source/test files are unchanged by this presentation extension.
- Final TypeScript, scoped ESLint all changed implementation/test files plus new adapter/helper/tests, and git diff --check pass. QA separately linted its owned9-test files.
- Physical map label regression from global text token reuse and Friends traveler-chip contrast regression were corrected; final phone evidence belongs to Architect. No phone operations by Mobile Developer.

## Snapshot and limitations

Final implementation source snapshot SHA256: 0639d489a214369ebb10c7bff4cc4127b5fae25f8334d9fc64583b7ed62fef2f. Reproducible sorted path/content-hash manifest: ignored .local-tests/dark-pilot/all-pages-source-hashes.json. Baseline87b127a plus changed source paths above and new adapter identifies the local reviewed implementation; documentation/tests do not alter this source digest.

Architect reports final physical Android browsing checks; see the Architect/QA reports for exact device/screen evidence and limits. New dark QA tests are mocked/style/render evidence, not actual account writes, photo upload, GPS travel or persistence proof. No iOS/complete large-text matrix. Android permission/keyboard/share/native Alert appearance is controlled partly by OS settings; installed native splash remains outside this JS-only change. No commit/push/merge/deployment/live write performed. Local changes remain unpublished.
