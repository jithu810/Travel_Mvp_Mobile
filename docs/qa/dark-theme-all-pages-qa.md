# App-wide dark theme independent QA

2026-10-31 19:52 IST. QA Tester; local/unpublished Mobile source on `feature/backlog-phase1`, base revision `87b127aabb78ebf126db3afad645448c81a7d179` plus the preserved, uncommitted two-screen pilot and this authorized extension. Architect owns baseline/backend assessment in `docs/qa/dark-theme-all-pages-architect.md`. No application edits, device operations, backend changes, hosted writes, builds or publication were performed by QA.

The extension uses immutable default dark tokens and explicit presentation-role adaptation. Existing light artwork/map controls are intentional exceptions; there is no user preference or system-theme switch in this scope. QA separately inventoried callback/legacy/scenic authentication, Create memory/photo/settings/recovery, Account/profile/settings, customization and Travel prompt families. Independent code review and broader implementation checks remain separate evidence.

## Results

`node --test tests/dark-theme-all-pages-qa.test.mjs tests/dark-theme-pilot-qa.test.mjs`: **9/9 passed**, zero failures/skips. Scoped ESLint for both QA test files passed with zero warnings. Tests evaluate actual stylesheet initializers and constant dependencies, plus actual QuickJourneySetup and Share renders, rather than only checking source text.

Coverage:

- Auth callback background/text, legacy auth heading and inverse action; scenic email CTA text at both gradient stops and branded Google label/hint on its intentionally white button.
- Memory editor panel/fields/shortcut/counter and photo-action text/glyphs, including pale-gradient replacement.
- Create settings and empty-memory backgrounds/gradients and copy.
- Account selected tab, selected itinerary badge and profile error contrast.
- Every traveler chip in selected and unselected states, including inline accent fills for Solo/Couple/Friends/Family.
- Customize included/skipped statuses and warning; Travel arrival and confirmation title/body/cancel/dismiss copy.
- Retained Home Help and Story Share regressions from the pilot; Share export canvas remains the fixed light artwork palette while surrounding instructions/feedback remain readable in global dark mode.

All checked normal-size text/surface combinations meet at least 4.5:1. This is analytical coverage of named combinations, not a claim that arbitrary photography or every native system surface meets the same threshold.

## Findings and disposition

- Architect's physical check found the Friends chip using a pale inline fill with light text. Implementer corrected the inline accent; the actual-render regression now verifies all four chip states and passes.
- Architect reported Home map marker labels becoming light text with a light halo after the global-token change. Implementer corrected map-marker colours to use the fixed light-map palette. This correction is reported by Architect/implementer; QA did not independently inspect its physical screenshot.
- QA flagged profile statusbar overrides, callback cream styling, unstyled NearbyLocations copy and inverse colour roles during implementation inventory. Final bounded source inspection found light-content statusbar overrides and explicit NearbyLocations foregrounds; actual-style tests verify callback and inverse-role contrast.
- The prior pilot's Help and Share contrast defects remain covered after global-theme migration. The historical pilot QA file was updated for global dark defaults and `lightTheme` artwork instead of claiming a user-selectable light-mode fallback.
- A provisional concern about StaticMapCredit was **withdrawn** after inspecting CircleMap's explicit translucent white credit backing. Keeping coordinated dark credit text on that light backing is correct; do not theme it independently of its backing.
- No remaining actionable finding in this bounded QA at handoff.

## Evidence limits and next owner

Architect is performing representative physical Android checks for Search, Create, Account/settings, Profile and Travel preview; final observations belong in the Architect/implementation record. QA has not independently inspected those screenshots and does not claim a complete physical matrix. No sign-out/login, form save, upload, draft creation or trip/GPS activation was performed by QA. Auth callback, failure/recovery, permission and destructive-confirmation states are supported here by source/computed-style tests, not device execution. Android system alerts, permission prompts, picker/camera and Google/browser UI follow their owning system/app appearance and are outside app-owned colour styling. No iOS or expanded large-text physical pass is claimed.

Broader suite/typecheck/lint evidence is owned by implementer and is not duplicated. Independent Code Reviewer is the next review owner; any source correction after this snapshot requires affected checks again.

## Snapshot anchors (SHA256)

- `src/theme/mobile-theme.ts`: `EDEC1CE5981053924F995DA79DB553CCE0EE719D5F2C4F02B5AF2FE01521E6C4`
- `src/theme/dark-pilot.ts`: `7470B137B0CB6EBF2E7475908253C195A11F5EED3D31DAB62052D19B0CAD762F`
- `src/components/create/quick-journey-setup.tsx`: `0698B91B0440E4DB3708FBCC2279A0F913C7898E9F2657277130A78175B05B1C`
- `tests/dark-theme-all-pages-qa.test.mjs`: `CEB388B8657BCEA648AABB545C7F599A5358ADADD53CF347F445EA4F4D1EAFB2`
- `tests/dark-theme-pilot-qa.test.mjs`: `0DA04E8A55DD60967C97F18242E44EA3A97EB32F82B230C5D799D23B3B4F8488`

QA-owned changed files: `tests/dark-theme-all-pages-qa.test.mjs`, `tests/dark-theme-pilot-qa.test.mjs`, `docs/qa/dark-theme-all-pages-qa.md`. Everything remains local/unpublished.
