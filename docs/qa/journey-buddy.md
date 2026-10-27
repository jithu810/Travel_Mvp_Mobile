# Journey Buddy verification

## Scope and baseline

- Authorized local implementation of the accepted 2D Journey Buddy plan; no publication, native build, deployment or live-service writes authorized.
- Starting Mobile revision: `7c113f07a595af7977a54a961752dfb4e0598ea7`, clean `codex/remove-3d-companion`.
- Existing Web `main` work, including three untracked Supabase CLI cache directories, is preserved.
- Backend gate released after fresh read-only catalog comparison: `../journey-buddy-preflight.md`. No backend change required.
- User-supplied Idle/Walk: transparent RGBA 1024x128, eight horizontal 128x128 frames each; reference: transparent RGBA 128x128. Retain original supplied PNGs.

## Acceptance checks

- Default off, hidden during preference restoration, device-local persistence, serialized rapid toggles and storage error recovery without reviving disabled Buddy.
- Fixed frame canvas and anchor, Idle/Walk playback, fallback image, bounded sprite updates, native-driven roaming and reduced-motion static pose.
- Touch-transparent host; tap/drag distinction; safe measured placement on main/editor/travel screens, layout changes and route transitions; other controls remain usable.
- Guarded contextual Create/drafts/memory help; opening help performs no save, upload, publication or GPS action. Reject stale actions after navigation/background.
- Travel reactions use existing authoritative progress; no extra location subscription, route request or automatic stop completion; measured dock avoids maneuver/arrival/footer controls.
- Disabled/hidden/background/keyboard/modal/interaction lifecycle cancels unnecessary motion; restore current state without replaying missed events.
- Existing Home globe, editor saving/photo guards, navigation and GPS cleanup regressions remain covered.

## Verification state

- IMPLEMENTED LOCALLY: opt-in Settings for guests and signed-in users; original Idle/Walk PNGs; isolated frame clocks; native-driven edge roaming; bounded drag/parking; measured enabled-only docks; contextual local help; existing guarded memory-editor callback; semantic foreground Travel reactions; reduced motion and lifecycle cleanup. No runtime dependencies, backend calls, permissions or native builds added.
- Mobile Developer: initial affected suite 185/185 passed, including 26 Buddy tests and actual guarded editor integration. After final cleanup/StrictMode fixes, Buddy 26/26, TypeScript, current-source lint (zero warnings) and whitespace checks passed.
- Independent QA: `npm.cmd test` on the final snapshot ran 655 tests: 654 passed, 1 failed, 0 skipped. The sole failure was the pre-existing disposable PostgreSQL policy test, blocked by sandbox restricted-token error 87/server-start error 3. Architect reran `node --test tests/thumbnail-policy.test.mjs` outside the sandbox: 1/1 passed in 46.54 seconds, covering public/owner/other/path/rollback boundaries on a new disposable local cluster. All 655 cases therefore passed across the full run and focused retry; this is not one entirely green full-suite invocation. No hosted writes occurred.
- Full lint was attempted and reports 40 existing unresolved imports in preserved ignored `.local-tests/publication` snapshots. Those historical artifacts and lint configuration were not changed. Scoped current-source lint `npm run lint -- --ignore-pattern .local-tests/**` passes with zero warnings.
- Architect Android export passed with `EXPO_NO_DOTENV=1`, `EXPO_OFFLINE=1`, installed Expo CLI `export --platform android --output-dir .expo/journey-buddy-export --source-maps --dump-assetmap --max-workers 2`: 1,711 modules, 56 assets; Hermes `entry-aec6bc6dfcd3c039966401a142eb3650.hbc` is 4,057,788 bytes. Final source-map host content matches the tested source, and all three Buddy PNGs are bundled. Export artifacts are local/gitignored, not remotely accessible evidence or an installed native build.
- Offline installed Expo CLI `install --check` passed (dependencies up to date); Expo warns offline dependency validation is unreliable. No package updates performed.
- All three bundled PNGs have identical SHA256 hashes to the product owner's attachments. Idle: `05547c437dc7278f3d7f3df260be9492c3155e0dc8f2bf3cd7f149d7138be86a`; Walk: `6120a207a90e280619ae76008d4ecbce1f7a591c9e9c35d94eb4d3380bd30d5b`; reference: `8426aaddcea42e3c6d2f95538b867093a34bf9e82540dc787749795ddde260b8`.

## Independent review and tested snapshot

Independent Code Reviewer completed the final targeted re-review at **2026-10-25 12:24:45 UTC (17:54:45 IST)**: **no remaining actionable findings**. Fixed findings cover parking lost during temporary hiding, bottom-safe-area navigation collision, Home/Travel fixed map-control overlap, and native-driver drag capture using stale ValueXY coordinates. Review also verified the final pure pose-owner initialization/commit cleanup and the bounded stationary Travel progress Walk reaction.

The final 31 application/test/asset paths have snapshot SHA256 `922333366bcaf2a33f2ad2f47a214af11797486a844ddff06494465f7eb9a6ae`, reproduced by independent QA before and after the full suite. Digest algorithm: sort repository-relative forward-slash paths lexicographically; append UTF-8 path, NUL, raw file bytes, NUL for each path; SHA256 the concatenation. Documentation is excluded. Final host SHA256 `0a28e8efa6f14b067d5fabc72115c87bed13ef91f320e831ad5d7d38e40cc548`; store SHA256 `ee15d2888d8e938ea27b70518429bea4260f47b164ba07467e6d06ae67e6986c`.

See [independent QA](journey-buddy-independent.md) for the independently executed full-suite results and complete snapshot path list. Animation extension instructions are in [the asset README](../../assets/journey-buddy/README.md).

## Physical-device limits

The initial phone-session check found no connected device and Metro down. The product owner subsequently supplied pairing details, and Architect connected the CPH2813 phone running Android 16 through wireless adb. The follow-up below supersedes that initial device-unavailable state.

Basic sprite rendering, tap, drag, Settings suppression/parking and off/on behavior have now been checked on the real phone. Map coexistence, TalkBack, large fonts, rotation, broad native background/foreground behavior, measured frame pacing and enabled/disabled CPU/battery comparison remain pending physical-device acceptance. Automated mocks and Android export do not establish these results. Native device checks must avoid hosted save/create/edit/delete/upload actions without explicit action/target approval.

## Native follow-up and drag correction

Architect, 2026-10-25, follow-up completed approximately 12:42 UTC (18:12 IST). Device: CPH2813, Android 16, physical screen 1080x2344, existing installed `com.sree8100.journeycreatormobile` development client. No native build/install or permission change was performed. The app was tested as a guest over wireless debugging with local Metro on port 8081. Installed build version and GPS permission/state were not separately inspected.

- The pairing endpoint had closed, but adb discovery exposed the already-authorized debugging connection. Connected successfully, established the Metro reverse tunnel, and opened the dev client. Metro was started with `EXPO_NO_DOTENV=1`; no environment file was read. This runtime has no configured map/backend values, so its map fallback and public browsing configuration message are expected. No GPS/travel or authenticated editor write acceptance is claimed from this session.
- Settings initially showed Buddy off. Enabling the local switch displayed the original sprite above the navigation bar. Tapping opened the local helper sheet.
- A precise native swipe exposed a defect not caught by the earlier mocked tests: the nested Pressable could take the gesture and open help instead of dragging. Mobile Developer replaced the competing owners with one bounded accessible View that owns responder capture, move and release. Accessible button role, activation action and accessibility tap remain supported; TalkBack itself has not been tested.
- After the fix hot-reloaded, a precise 1.2-second swipe moved visible sprite pixels from `(45,1903)-(182,2035)` to `(596,1899)-(720,2036)` without opening help. Opening and closing Settings retained that parked position. An ordinary tap still opened help. Turning Buddy off removed it; turning it back on restored it. Left Buddy enabled and visible on Account, with Metro reporting `packager-status:running`.
- Screenshots remain outside the repositories at `<local-temp>/journey-buddy-device/`: `enabled.png`, `helper.png`, `drag-precise.png` (pre-fix failure), `fixed-drag-before.png`, `fixed-drag-after.png`, `fixed-park-restored.png`, `disabled.png`, `final-enabled.png`, `fixed-helper.png`. These are local evidence, not remote links. Android UI hierarchy dumping failed to reach idle twice while the sprite animated; subsequent checks used actual screenshots and precisely observed pixel positions, not successful hierarchy-dump claims.
- Final correction changes only the Buddy host and Buddy test file. Mobile Developer reports **27/27 Buddy tests, TypeScript, scoped source lint with zero warnings and whitespace passed**. Independent QA ran **655/655 non-PostgreSQL tests, zero failures/skips**, including the new drag regression. The unchanged disposable PostgreSQL policy test was intentionally not rerun; its earlier isolated 1/1 pass is historical coverage, not a new full-suite invocation.
- Independent Code Reviewer re-reviewed the exact final 31-file snapshot at **12:40:40 UTC** and found **no actionable findings**: SHA256 `def2bc45d0e35212e06761b48cbec1422a5c3a0c121cc86b78bc93bcb110c8ac`; host `6e75b388f00db596760653ae7ab0ebf785e986cf643afdb62d4fe91142c5519e`; Buddy test `200b51baaf8b78c68ebe6fd8a555828e5efa8582c6ec2e001650f854d862729e`. This supersedes the earlier snapshot for current application/test contents.
- Final Android export passed: 1,711 modules, 56 assets; Hermes `entry-86e6aff052cfb9af4016eabb989d25dd.hbc`, **4,058,228 bytes**. Source-map host content matches the final source exactly after newline normalization. No app/backend writes or publication occurred; only the device-local Buddy preference changed during testing.

## Publication

### Environment restoration after product-owner approval

After the owner explicitly approved normal Metro environment loading, Architect restarted the development server on port 8081 without `EXPO_NO_DOTENV`, clearing the bundle cache. Expo reported loading the existing `.env.local` and exporting the expected Supabase/Mapbox variable names; no values were displayed and no environment file was inspected or edited. The phone reconnected to the refreshed bundle. Real-device screenshots confirmed the Mapbox globe and public journeys loaded, followed by the restored signed-in Account profile and private draft list. No credentials were entered and no account/content writes were performed. Buddy remains enabled. Local evidence: `environment-ready.png` and `account-ready.png` in the existing external screenshot directory. This supersedes the earlier session's missing-configuration limitation; GPS travel, TalkBack, rotation and battery acceptance remain pending.

Local/unpublished. No Git commit, push, merge, EAS build, deployment, backend write or new runtime dependency is part of this task.
