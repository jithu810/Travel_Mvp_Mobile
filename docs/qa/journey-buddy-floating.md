# Journey Buddy floating-layout correction

## Scope and baseline

- Authorized local implementation of the accepted floating-overlay plan. No Git publication, native build, deployment or live-service writes authorized.
- Mobile branch `codex/remove-3d-companion`, base `7c113f07a595af7977a54a961752dfb4e0598ea7`, already contains the unpublished Buddy feature and native drag correction. Starting application/test/asset snapshot: `def2bc45d0e35212e06761b48cbec1422a5c3a0c121cc86b78bc93bcb110c8ac` (31 files). Existing changes and documentation are preserved.
- Web main and its three untracked Supabase CLI cache directories remain untouched.
- User screenshot shows Journey content constrained above an unnecessary Buddy strip. Source inspection confirms `BuddyDock` consumes 72dp plus bottom-safe-area margin in the main navigation frame.

## Accepted behavior

- Buddy occupies no page-layout space. Enabled and disabled layouts have identical content height, card/footer geometry, navigation position and scroll range.
- The existing absolute overlay supports free dragging across clear viewport areas. Protected control rectangles have an 8dp gap; unsafe drops project to the nearest valid position.
- Automatic short walks stay near clear edges and avoid controls along the entire path. Preserve the existing 15-30-second schedule and parking until route change.
- Protect navigation, fixed headers/footers, interactive cards/editor groups and native map controls using measurements without adding layout wrappers or padding.
- Refresh measurements during actual scroll/layout/sheet/rotation changes; ordinary taps only pause walking. Hide conservatively when no safe position fits or geometry is not yet reliable.
- Preserve the single accessible native gesture owner, scalar native animation capture, contextual editor action guards, lifecycle cleanup, reduced motion and Travel semantics. No additional GPS watcher, route request or backend write.

## Verification state

Backend preflight completed with fresh read-only metadata and no backend change required; Architect released implementation after reading `../journey-buddy-floating-preflight.md`.

Initial native observation during implementation: on the same public Journey, removal of the strip made Read story, creator and the card option controls fully visible, with the start slider below rather than truncating the card. Buddy appeared over the map. Evidence: `floating-journey-before-ready.png` and `floating-journey-initial-after.png` in the external screenshot directory. These are intermediate observations; final frozen-snapshot off/on equivalence and drag checks are still pending.

Early independent review of an immutable five-file core snapshot found two P2 lifecycle issues: old scroll events could affect a new focused route, and a single finger lifting during a pinch could start the interaction cooldown while another finger remained down. Both were assigned for correction and regression tests. Review found obstacle-union decomposition and conservative swept-path checks sound by inspection. Final source review and tests remain pending.

## Device and runtime

Previous same-conversation native evidence identified CPH2813 / Android 16, 1080x2344, installed Journey Creator development client. Connection and current runtime are being rechecked for this task. The owner has explicitly approved normal Metro loading of existing environment files without displaying their contents; that approval is retained. No direct environment-file inspection or edits are authorized.

Metro was restarted as a hidden background process (PID 15088) after the first connection check found no responsive server. Status subsequently confirmed `packager-status:running`, and wireless adb connected to the same phone. The configured app loaded the globe and public Journey map. No environment values were displayed or files inspected. Device tests remain browsing/local-preference/gesture-only; do not save, upload, publish, delete, edit hosted records or start GPS without separate applicable authorization.

## Publication and limits

Local/unpublished. Native battery measurements, TalkBack, broad rotation/large-font acceptance and live GPS travel acceptance require specific evidence before being marked complete.

## Final result - 2026-10-25 14:21 UTC

Implemented locally with no dependency, permission, backend or environment-file edits. `BuddyDock`/`BuddySpace` and their reserved strip are removed. The overlay uses the inset viewport and measured protected control rectangles with an 8dp gap, nearest-safe placement, collision-tested walks, focus-scoped scrolling and bounded camera-idle pin projection. Native map controllers, original event callbacks, editor guards and the single accessible drag owner are preserved. Layout changes add no wrappers or enabled-dependent page dimensions.

### Verification

- Mobile Developer: 258 focused cases, including 40 Buddy/floating cases, passed. Final layer correction also passed all 40 Buddy tests, TypeScript and current-source lint with zero warnings. Full lint was run and retains 40 existing unresolved imports in preserved ignored historical publication snapshots; those artifacts and lint configuration were not changed.
- Independent QA's final run: **668/668 non-PostgreSQL tests passed**, zero failures/skips. The unchanged disposable PostgreSQL policy test was explicitly excluded; its earlier isolated pass remains historical evidence, not a new full-suite invocation. Earlier broad-run failures were strict fixture adapters for new hook imports and one exact-string camera-handler assertion; adapters were corrected without changing application behavior or weakening prior assertions. The camera test now executes the actual handler and verifies both pin invalidation and original event forwarding.
- Final reviewed/tested 61-file application/test/asset snapshot: **`240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8`**. Digest uses lexicographically sorted relative paths, UTF-8 path + NUL + raw bytes + NUL, SHA256. Independent review completed at **14:16:16 UTC**, with **no actionable findings**. Host SHA256 `bbdde6f015a670c4e8db80c34e6e7b47c582e8f186d2174b9daffa3517ddfedb`.
- Final Android export passed: **1,714 modules, 56 assets**, Hermes `entry-5a00358fa0f57970e0797b9330bc7b2a.hbc`, **4,078,348 bytes**. Source-map contents for the host, geometry, bounds hook and pin hook exactly match final source after newline normalization. Export is local/gitignored `.expo/buddy-floating-export`, not an installed native build.
- Offline Expo compatibility passed with Expo's warning that offline validation is unreliable. No packages were changed. Final whitespace checks passed; existing status/roadmap line-ending notices remain informational. Web worktree is unchanged.

### Native acceptance and visibility correction

Architect verified the existing CPH2813 / Android 16 development client, 1080x2344, with the configured persistent Metro server on port 8081. No new build or app-data deletion occurred. Saved authentication and public browsing remained available; device interactions were browsing, camera fitting, stop selection, gestures and the local Buddy switch only. No GPS trip, hosted save/edit/upload/delete or publication action was performed.

- Off/on screenshots of the same first Journey stop (`floating-journey-off.png`, `floating-journey-on-settled.png`) have **zero changed pixels** in the card/footer region `(200,740)-(1010,2050)` (1,061,100 pixels), slider `(40,1870)-(1040,2050)` and card text/actions `(180,1455)-(1010,1775)`. Map and status-bar animation regions are excluded. This directly confirms the enabled preference no longer changes that native page's layout.
- Native testing found a visibility defect after the map became ready. An initial cold-reload interpretation was insufficient; repeated testing and bounded temporary diagnostics proved host eligibility true and native actor coordinates valid while the map visually covered Buddy. The cause was native draw stacking: only the nested actor had zIndex, while the global host had no elevation. The minimal correction gives the host zIndex 30/elevation 20, below startup loading's 100/30 and native Modal windows, preserving `pointerEvents="box-none"`. Geometry and pin behavior did not change. All temporary diagnostics were removed; final store and pin-hook hashes match their previously tested versions.
- The final clean-launched ready Journey map displays Buddy clear of stop markers and fixed controls (`floating-layer-journey-ready.png`). This resolves the earlier visibility hold; diagnostic/HMR captures are historical checkpoints, not final acceptance.
- A fresh image located Buddy's visible pixels at `(898,356)-(1034,488)`. A 1.2-second drag from `(966,422)` to `(165,420)` moved him to the clear left map area (`floating-drag-before.png`, `floating-drag-after.png`) without opening help. The card/footer crop `(190,750)-(1020,2050)` is pixel-identical before and after the drag, proving the drag did not change the selected stop or layout in that case.
- Tapping Previous memory changed the preview from stop 3 to stop 2 and updated the camera while Buddy remained visible/parked (`floating-controls-verified.png`). Native marker/control targets, the card, slider and navigation remain visually clear in that capture. Buddy is left enabled on the Journey screen; Metro remains running.
- All screenshots are local, outside repositories, under `<local-temp>/journey-buddy-device/`. They are not published links. Expo's movable developer-tools bubble was moved away from Settings during testing to avoid intercepting test taps.

See [independent QA](journey-buddy-floating-independent.md) for exact run logs, tested paths, earlier failed checkpoints and final evidence attribution. Broad physical TalkBack, large-font/rotation coverage, active GPS guidance and measured battery/frame-pacing acceptance remain pending. No commit, push, merge, deployment, live-service write or new native build was performed.
