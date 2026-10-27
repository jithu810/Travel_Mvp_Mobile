# Journey Buddy jump and run — local verification

## Scope and baseline

User authorized local Mobile animation implementation, tests and phone demonstration; no commits, pushes or publication. Mobile baseline `955ecac21ae554ae428c9efb36d2f8ab6406e935`, branch `codex/buddy-bubbles-outdoor`, initially clean. Backend preflight completed without changes; see `buddy-jump-run-preflight.md`.

## Original asset inspection

- Jump: original PNG RGBA, 1440 × 189, eight horizontal 180 × 189 cells. Alpha range 0–255. Character rises through the middle frames and lands in the final frames.
- Run: original PNG RGBA, 1024 × 128, eight horizontal 128 × 128 cells. Alpha range 0–255.
- Preserve original files/pixels, frame padding and bottom-center alignment. Jump requires a centered non-square clipping viewport inside Buddy's existing 64dp touch canvas.
- Earlier JPEG previews are not used as runtime assets.

## Required checks

Confirmed final memory save triggers one jump; submission, failure, uncertain result, cancellation, photo checkpoint and stale focus do not. Accepted Begin/Resume triggers a bounded stationary run; rejected transitions, mount/status observations and repeated taps do not. Preserve idle, walk, drag/park, help/tour, preferences and existing travel-progress walk reactions.

Verify deduplication, overlap rejection, bounded completion deferral, expiry and cancellation on navigation/background/off/reduced motion, keyboard/dialog/geometry suppression and higher-priority navigation/arrival/help. Verify all timers clean up and normal animation resumes without changing the parked position.

## Results

Implemented locally with original packaged PNGs. Jump is an 800ms non-looping clip; Run is a 1000ms stationary burst. A route-scoped operation identity permits one pending/playing event, expires unclaimed events after six seconds and cancels on new interaction/navigation/background/off/suppression/priority changes. Existing idle/walk, parked pose, help/tour and preferences remain.

- Mobile focused tests: 184/184 passed; TypeScript and changed-file lint passed.
- Independent QA: 271/271 Buddy/save/photo/Travel/location/lifecycle/memory regressions passed, plus three additional snapshot-only edge cases (274 unique checks). TypeScript and `eslint src tests --max-warnings=0` passed. QA manifest `.local-tests/buddy-jump-run-qa/source-snapshot.json`, SHA256 `8ad9d1793152ec46f84653e4590881d5c5b9808b9a4add444ec528d569199d7f`.
- Independent Code Reviewer: no actionable findings; 156/156 independently run checks passed. Reviewed app/assets/tests snapshot SHA256 `1c29ff8e75f75826abf1a42fb852cfb1382bbce2b3c60fb888fc4c408afc9da0`.
- Original assets byte-identical: Jump SHA256 `8f6d8a469ae8f3fc78611ebd3c8b406f41307da9ad4d44a5981cb815894243ec`; Run SHA256 `0019e1a17097d4284eb86906f6fd545eb2bb16d829f1272662be5cfb0e13e615`.
- Full repository lint was not established; source/test lint passed. Historical ignored snapshots are outside that result.

## Phone evidence and remaining checks

2026-10-26, CPH2813 / Android 16, wireless ADB `192.168.1.3:42969`. Metro uses `D:/JBuild`, whose existing dependencies were reused; only the eleven reviewed runtime source/asset files were copied there. Original runtime files backed up under `C:/Users/sreej/AppData/Local/Temp/buddy-jump-run-runtime-20261026-215715`. Expo automatically loads existing configuration under the user's earlier explicit exception; no configuration files/values were inspected. No dependency change or native rebuild.

Observed refreshed Explore screen, Buddy, Mapbox and public journeys. Navigated public Story to Travel, accepted Begin, paused, resumed and paused again. Travel state remains in-memory and foreground GPS was stopped with Pause. Native screenshots `C:/Users/sreej/AppData/Local/Temp/buddy-run-1.png` through `buddy-run-4.png` and `buddy-resume-1.png` through `buddy-resume-5.png` show Buddy at a stable safe canvas position with active guidance/GPS messages. These captures contain the existing Idle frames, not proof of Run playback; sampled opaque-pixel comparison against the original sheets corroborates Idle at canvas origin (876,1222). Higher-priority guidance suppresses the event in this native route. Do not claim a native Run demonstration from these screenshots. Eligible Run and restoration are verified in the actual component harness; native eligible Run remains pending.

Native Jump after a real confirmed memory save remains pending an owner-operated save; a request was presented to the user. No automated live memory save is authorized or performed. No synthetic debug controls were added to the product. Existing drag/help/preference regressions passed automated tests; a complete new native regression pass is not claimed.

Local/unpublished. No commits, pushes, deployment, backend changes or live record writes.

## Jump delay correction — 2026-10-26

Owner physically confirmed Jump after successful save, but reported about two seconds of extra delay. Root cause: the existing three-second released-touch roaming cooldown continued after the save completed. The store now distinguishes a held touch from that cooldown; only confirmed Jump may bypass the released-touch cooldown. Editor/keyboard/dialog/geometry suppression, screen-owned interaction, held/new touches, reduced motion/off/background and higher-priority guidance remain guarded. Run and ambient roaming keep their existing timing.

Changed paths for this correction: Buddy store, provider/touch hook, host and Buddy tests. Combined actual touch-boundary/host regression verifies prompt Jump without advancing the cooldown timer, held touch/release, new-touch cancellation and unchanged Run deferral.

Mobile focused tests and independent review each passed 185/185; reviewer found no actionable issues on snapshot `ca42082679655fdd23cba8594fc34f1f116d43c3fe810e7c071b5b73d8dcc042`. Independent QA passed 272 regressions plus three snapshot-only held-touch/screen-interaction/background cases (275 unique checks), TypeScript and source/test lint. QA snapshot manifest `.local-tests/buddy-jump-delay-qa/source-snapshot.json`, SHA256 `9a0f8aa7c488522fcb32ec58061160380528b844c8e1a84fb6451a7e010be73d`.

Reviewed three runtime source files copied to the running `D:/JBuild` Metro app at 22:20 IST, backup `C:/Users/sreej/AppData/Local/Temp/buddy-jump-delay-runtime-20261026-222008`. Metro status running. Post-fix native save timing awaits owner retest; no automated live save, publication or backend changes performed.

## Longer Jump/Run and prompt Run — 2026-10-26

Owner requested longer animation and reported Run was not visible. Jump now plays one eight-frame cycle at4fps (two seconds), with duration derived from frame metadata; Run plays at12fps for three seconds. Both success animations may bypass only the released initiating-touch cooldown. Active/new touches, screen interactions and all existing suppression/priority guards remain. Active navigation guidance—including straight-route guidance—and arrival may still cancel Run; no priority mapping was weakened.

Changed since delay fix: animation metadata, Buddy host, Buddy tests and asset README. Mobile and independent review each185/185 checks passed; reviewer no actionable findings, snapshot `1682b91f584117f54bc066754b4e8e20cea6165e0a0c9c81975b8edafb38bf4b`. Independent QA272 regressions plus three snapshot-only duration/interaction/priority cases passed (275 unique checks), TypeScript and source/test lint passed. QA manifest `.local-tests/buddy-duration-qa/source-snapshot.json`, SHA256 `3280b3c8db63751012ad178c3a5981d1266b74b9147d352dd8e728df55b193a1`.

Runtime animation metadata and host loaded into running `D:/JBuild`, backup `C:/Users/sreej/AppData/Local/Temp/buddy-duration-runtime-20261026-223057`; Metro running. New native duration demonstration pending. No dependencies, backend changes, live record writes or publication.

Native follow-up at22:37 IST: public Story → Travel → successful Begin. Six immediate screenshots saved at `C:/Users/sreej/AppData/Local/Temp/buddy-long-run-1.png` through `buddy-long-run-6.png`, then Pause tapped to stop foreground GPS. Screenshot2 visibly shows new Run; independent sampled opaque-pixel comparison to original sprites yields Run frame6 mean RGB error0.20 at canvas(876,1276), versus other animation candidates above21.36, corroborating actual Run rendering. Screenshot5 shows normal Idle afterward. Travel geometry changed for the panel/camera, so do not claim exact unchanged canvas coordinates across that layout transition; the clip itself uses stationary position capture, verified by actual host tests. No three-second native timing precision is asserted from these sparse screenshots. Two-second native Jump awaits another owner save; automated full-cycle timing passes.
