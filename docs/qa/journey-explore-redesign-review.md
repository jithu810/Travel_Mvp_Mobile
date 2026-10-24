# Journey explore redesign — independent QA and code review

Reviewer: Backend Developer acting as independently assigned QA/Code Reviewer after preflight. 2026-10-24 13:17 IST / 07:47 UTC. Local/unpublished. Application ownership stayed with Mobile Developer; reviewer edited this report only and ran no shared builds.

## Result

No remaining actionable findings in the final bounded source snapshot. The review covered route layout, social rail/icons, options, native map controls/fallback, author slot, stop deck, swipe entry and focused regression tests. Pre-existing Search `source`/`saveFirst` behavior is retained. No src/lib or src/hooks changes were introduced, and existing social/auth/share/mutation handlers remain intact.

Final requested layout: icon-only rail; red outline/filled heart states; icon map fit/fullscreen controls; author inside card below Read story on the left, options on the right; previous/next above card; shortened caption; swipe footer below card and above navigation. Outer scrolling remains available for shorter screens/larger content rather than clipping it.

Finding P2, resolved: liked/unliked hearts originally had identical filled red appearance after rail backgrounds were removed. Final icon uses native red outline versus filled geometry, with selected accessibility state retained. Regression test executes both icon states. Native final screenshot shows an unclipped red heart. An intermediate font/emoji rendering attempt is absent from final source.

Failure-state observation, resolved in source: intermediate map fallback text overlapped status icons. Final fallback accepts controlTopInset in native loader/error-boundary/no-data/configuration paths and offsets content below the status inset; focused regression passes. Native map recovered after reload/retry; final screenshot confirms actual map and icon controls. Review does not claim the async import/configuration failure was definitively attributed to a source defect.

## Verification actually performed by reviewer

- Read final application diff and new untracked swipe component, relevant existing Travel route/hooks/store, tests and supplied native evidence.
- Ran `node --test tests/swipe-journey-start.test.mjs tests/stop-card-deck.test.mjs tests/story-interaction.test.mjs`: **65/65 passed**, zero skipped/failures. These execute component logic through mocks; they are not native-device validation.
- Independently recomputed all 15 hashes in `dist/journey-explore-redesign/source-sha256.txt`: **15/15 matched** frozen source. Manifest SHA256 `8fc7df73342641ff3f885d4dfb8d073f72918e718ea43a979d4e0109a7881bdf`.
- Applied the installed React review checklist to callbacks/refs/effect cleanup, rendering, accessibility and scope. No new dependencies, network fetch patterns or persistent state added.
- Writer/Architect reported focused **71/71**, TypeScript pass, and isolated local PostgreSQL **1/1**. Final broad output `final-test-results.txt` confirms **630/630**, zero skipped/failures, excluding the separately passed PostgreSQL test. These checks were not rerun by this reviewer. Architect reported Android export success (4.4 MB) before the final author-slot adjustment; targeted tests/TypeScript cover latest source, but export is not exact-final-snapshot evidence. Architect owns final lint/result aggregation.

Swipe checks: rightward horizontal threshold, partial/backward/vertical cancellation, single-flight animation/timer completion, accessible activation, reduced-motion behavior, background/blur/unmount/callback-change cancellation. Completion calls the existing route callback only. Existing Travel route may prepare permission on entry but retains explicit Begin Trip for timer/GPS; no automatic tripStore transition, persistence or Supabase writes added. Stop deck retains independent controls and selected-stop synchronization; author link is outside the story Pressable/swipe surface, and social/options controls remain outside reading/swipe surfaces.

Native evidence inspected: `dist/journey-explore-redesign/final-next.png` shows recovered map, selected stop marker/card 4 of 4, above-card controls, author below Read story, compact no-box icon rail, red unclipped heart, footer and bottom navigation fitting the sampled phone. Architect additionally observed partial swipe reset and full swipe reaching Travel Mode Ready to start with Begin Trip untouched (`completed-swipe.png`); reviewer did not operate the device. A recorded Next interaction changed 1 to 4 while the owner may also have interacted, so this is not deterministic single-step Next evidence. Bounded Next/Previous behavior is covered by component tests.

Pending limits: physical TalkBack activation, native reduced-motion toggle, large-font/small-screen layouts, iOS, deterministic isolated Next/Previous device interaction, and actual liked/unliked live toggle were not exercised by this reviewer. No hosted like/save/Remix/upload/GPS test mutation performed. No commit/push/merge/deploy/live database approval is implied.

## Reviewed snapshot

Base Mobile `c668bb2e70c46e85c48c6dfeb4bad448579df2b7` plus preserved initial dirty work recorded in preflight. SHA256:

```text
ce6fd17a8c4eff4c6a3223d1cc35704e069e1608336550e2f621c1b0cb8e28af src/app/journey/[id].tsx
a60839ef3deb0d5107d5596527d7e9cb8b9258d22db2c9cf82e998506baaba69 src/components/journey/journey-action-icon.tsx
fcdaa1b304690c2a49b6df0648345fd136ab6c9064a41abccc598599a2c4902b src/components/journey/journey-options.tsx
3e6418150992f1f05999b5a6e59f2abdbeea14982aa680251e391adf28efbdc5 src/components/journey/map/journey-map.native.tsx
0295a472bdb8171718de39d31be1b30e5f999060cdcd32c27f8f63bc0cc5974b src/components/journey/map/map-frame.tsx
9b3c719e211e9ad50a2fc262f6a8631c421ba9e0b9f1a450cc78e2a89ce624f4 src/components/journey/map/native-map.tsx
521287d81c5e1b4d36a4f378251377d9b5e2488cc72d3c4bf329388677fe5c5f src/components/journey/social-actions.tsx
56ec42ed1f890b38d4005b5ba6fd52aa0307467cbed5d4d0c2d370ab6b18b5e5 src/components/journey/stop-card-deck.tsx
b6a598f31bbca4bc6834a0aa581978bb41bc94eccb1018657c7674fc137b1995 src/components/journey/stop-timeline.tsx
8fe4602c5fe24d57d7fcbf5f0ce7e8e0b9051fd32e8de0db2b8c23e096f84d4b src/components/journey/swipe-journey-start.tsx
8c5a6a008d9872e351b83d766a4f2d8dbb003974a3b590aca260bf82ad6b1e5e tests/map-navigation-marker.test.mjs
ebbd48a25f3a1edcea03e9161fcf312c5e2b4b10330c7eb50fde2f8e206bad6f tests/navigation.test.mjs
8db48556c5c5c61fbbec4b1390ebb40383057da3a72439b4d480a501b3085204 tests/stop-card-deck.test.mjs
02896375e7bb2b5c2ba973740b11b2bdef550fd5f8adb8cd0fabfb27db3f8a5e tests/story-interaction.test.mjs
19277ec61f984ceef4c078d3dac81867565808c4250658caeef2bc5922a35fe7 tests/swipe-journey-start.test.mjs
```

Preserved unrelated baseline: `.env.example` (never read), previous Search test changes and `.github/`, `cd`, `eas`. No staging, Git writes, cleanup or changes to protected Web integrity-hardening work.
