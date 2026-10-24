# Home compact controls QA and independent review

2026-10-24, QA Tester / independent Code Reviewer. Mobile baseline main, 65ae609057af6e44649b7374c776b92a6114a2f0. Existing untracked .github/, cd and eas preserved. Backend preflight is recorded in ../home-compact-controls-preflight.md. No application edits, publication, deployment or hosted writes performed by this reviewer.

## Independent verification

- Ran `node --test tests/home-polish.test.mjs tests/create-flow.test.mjs`: 65 passed, zero failed/skipped (2026-10-24 approximately 08:00 IST).
- Checked stable scoped diff including untracked home-control-icon.tsx. World preserves reset callback and disabled state; card Locate/Story preserve callbacks, selected state and descriptive accessibility labels. Decorative icons are hidden from accessibility.
- Search is enclosed in a real 44dp Pressable that focuses the input; the thinner input surface does not remove that target. Notification remains a coming-soon image. Card actions and World retain 44dp targets with smaller visuals.
- World follows measured sheet clearance. Normal expanded geometry reserves 96dp above the sheet, with a 44dp target 16dp above it; header clearance remains 36dp. Mapbox logo and attribution positions are unchanged. Extremely short layouts and large fonts still require device coverage.
- Independent code review: no actionable findings in this scoped snapshot. No backend/auth/query contract or dependencies changed.

## Screenshot review

Reviewed `dist/home-controls-ready.png`. Writer reports capture after native reload and a 12-second loading delay. Settled globe is visible; compact search and bell align; globe icon sits at lower left above rail; crosshair/book card icons replace text; Mapbox logo/legal information remains visible. No visible overlap in this collapsed portrait capture.

Also reviewed `dist/home-controls-locate.png`, `dist/home-controls-story.png` and `dist/home-controls-world.png`: Locate capture shows selected crosshair styling and mapped stops; Story capture shows the journey screen; World capture shows globe view with selection retained, matching the existing reset behavior. These observations corroborate writer-provided interaction evidence, but screenshots alone cannot establish which tap caused each state.

Reviewed `dist/home-controls-expanded.png`: World icon is visibly clear below Mapbox logo/legal and above expanded sheet; search/bell are unobstructed. Expanded card actions require existing list scrolling. Independent `git diff --check` passed at approximately 08:02 IST (only existing LF/CRLF notices).

Reviewed `dist/home-controls-search.png`: Kochi input, visible keyboard and Mapbox suggestion results render with the compact search/bell surfaces. Search results intentionally overlay map controls while open. Writer reports native CPH2813 Android 16, existing Expo development client, full Reload followed by 12 seconds before initial capture and 10 seconds for interaction captures. Native app version/build identifier, permission grants and GPS state were not independently collected; displayed globe and search results indicate working connectivity but network transport is unrecorded.

This reviewer inspected supplied device media and did not operate the phone. Screenshot review alone is not an independent physical-device interaction pass. iOS, TalkBack, large text, landscape, extreme cutouts, offline behavior and GPS/travel remain unverified by this task.

## Stable snapshot SHA256

| Path | SHA256 |
| --- | --- |
| src/app/discover.tsx | AF8F05359242F99D20751E8FE61524CC11F77701612D3A429C736A572917D307 |
| src/components/create/place-picker.tsx | 2EF4658663E5A6B7551D25EFB55B2E2DA7E467EBBA72E281D89A84E57D5A90D0 |
| src/components/discovery/globe/native-globe.tsx | 6D93E915A92546F0205EBD3B5F9B725E76813B88E1DD431611F251A13BC092A8 |
| src/components/discovery/home-journey-card.tsx | 687921ECD7723FCCC5D1D153D56C724CD3E15ABA67442751C688EEA219C9A13F |
| src/components/discovery/home-control-icon.tsx | 87B154C97B6C4C89619271F205229C03B8F6F51C8355E55E96947DCF5506D4BE |
| tests/home-polish.test.mjs | 5769FB37E4F5B87B7F465183C1772EAAFB2E4A6E2937165673B5BEE49D1F3B05 |
| tests/create-flow.test.mjs | A10B5240A3A888269A3464AE9D16A27F515F72186F8F748F726F72F99E288BFD |

Hashes were read twice and matched. Any subsequent application edit requires affected re-verification. Writer separately reports full 568/568 tests, focused 92 tests, TypeScript, lint and diff checks; those are attributed results, not commands independently rerun here.
