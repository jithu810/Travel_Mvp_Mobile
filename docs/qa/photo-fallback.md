# Bundled photo fallback QA and independent review

2026-10-24, QA Tester / independent Code Reviewer. Mobile baseline main, 65ae609057af6e44649b7374c776b92a6114a2f0, plus preserved local compact-controls work. Read-only backend scope-delta preflight is recorded in ../photo-fallback-preflight.md. Only this report was written by this reviewer; no application edits, publication, deployment or hosted writes.

## Independent checks

- `node --test tests/home-polish.test.mjs tests/stop-card-deck.test.mjs`: 18 passed, zero failures/skips.
- `git diff --check`: passed.
- Inspected the bundled image visually: supplied camera/traveler photograph, 2000 x 1333, without baked-in caption. SHA256 matches the supplied original.
- Reviewed stable source including existing local compact-controls changes. No actionable findings. Existing valid remote photo branches take precedence; missing and failed URI branches use the bundled image, and a changed URI can recover. Existing card taps, deck/swipe lifecycle, icon callbacks and selected state are retained.
- Caption remains native Text over dark backing: Explore journey on Home, See this stop on stop cards. Compact Home uses smaller caption typography. Image and caption overlays do not intercept taps. Accessibility labels identify a default travel photo and unavailable actual photo; decorative image is hidden from accessibility.
- No data client, API/RPC, authentication, signed-image loading, upload or database code changed. No package/native configuration changes.

## Stable snapshot SHA256

| Path | SHA256 |
| --- | --- |
| src/components/discovery/travel-photo-placeholder.tsx | 4C46926F3FBD4C79F42FEB7224FB0F68579271B50DCF3BA8672A99DBBC51E022 |
| src/components/discovery/home-journey-card.tsx | DF28024F5B1AB3D1D01CB5915483CC3DF11B690C525673F97A073B9CDA4D65BF |
| src/components/journey/stop-card-deck.tsx | 002CE07C460FBD3A047574B171D0485510E6F907C8EE598A2CC44B6202B79488 |
| assets/images/journey-photo-fallback.png | 6DCE0FCE690E529BA8C1F810C73CBCC2A3895CD9AB15C7D7848766A7E5B4AF17 |
| tests/home-polish.test.mjs | BC6A282100EAA20DF7735621283B9FCB842A41392E965E6FE9ED4EA886D7C6E9 |

## Device evidence and limitations

Independently inspected `dist/photo-fallback-home.png`, `dist/photo-fallback-expanded.png` and `dist/photo-fallback-story.png`. Supplied photo renders in compact and expanded Home with readable Explore journey overlay. Stop deck shows the photo with readable See this stop overlay, adjacent action rail intact. Existing compact-controls presentation remains visible. No visible scoped regression.

Writer-operated native CPH2813 Android 16, existing Expo development client: Reload plus 12 seconds before first capture; subsequent interactions waited 10 seconds. This reviewer inspected screenshots and did not operate the phone. Exact app build ID, permission grants and GPS state were not independently collected. Writer reports full 569/569 tests, TypeScript and lint passing; these are attributed results, not independently repeated commands.

Offline native asset loading, TalkBack, large text, iOS and extreme layouts remain unverified. Automated tests cover missing/failed/valid Home photo precedence; Journey source branches were independently reviewed and deck regression tests passed, but native network-induced failed-photo recovery is not claimed.
