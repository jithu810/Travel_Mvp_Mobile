# R5 development-build performance sample — 2026-10-31

Follow-up: approved updated local standalone Outdoor build/install comparison completed; see outdoor-local-build-2026-10-31.md. Metro-off Home visible by5.8s first cold/by3.1s repeat; prolonged dev blank not reproduced in those two samples. Earlier build/install-pending statements below are historical. Broad R5 remains open.

## Scope and baseline
- Owner authorized proceeding with performance/startup checks. Architect conducted focused read-only diagnostics plus one loading-copy correction; no architectural performance changes.
- Branch feature/backlog-phase1, base d2c3f0d, preserving prior Home/keyboard uncommitted edits, backlog/status/roadmap and QA notes. Device CPH2813 / Android 16, 1080×2344, font scale 1.0, Codex Metro 8081.
- Backend assessment: inspected app/_layout.tsx, app/index.tsx, hooks/session-context.tsx, hooks/use-load.ts, components/startup-loading.tsx and components/branded-loading.tsx. Diagnostics and default loading text only; no data/auth/session/persistence/API/RPC/Storage behavior change. No live preflight or hosted writes.

## Measurements (development client, not release benchmarks)
| Sample | Observed result |
| --- | --- |
| Cold launch 1 | Android activity TotalTime 631 ms, WaitTime 647 ms. Screenshot completed at 2677 ms shows blank dev client; 5390 ms shows app branded loader; 10821 ms shows populated Home/globe, still present at 20818 ms. These are sampled bounds, not exact time-to-interactive. |
| Cold launch 2 | Android TotalTime 625 ms, WaitTime 628 ms. First scheduled screenshot stalled, completed at 20657 ms showing dev-client “Loading from 127.0.0.1:8081”; subsequent captures at 22009 and 22522 ms show blank dev client. Original 2/5/10-second target filenames do not represent actual capture times. Later untimed screenshot confirms Home recovered. |
| Warm foreground return | Android WaitTime 32 ms; command reported task brought to front, not a new Activity launch. Home visible in screenshot after a one-second wait. |
| Navigation render sample | Reset this app's gfxinfo only, then navigated Search → Account → Home with swipes and short waits. 380 rendered frames, 28 deadline-missed/janky frames (7.37%); frame percentiles 50th 11 ms, 90th 20 ms, 95th 28 ms, 99th 61 ms. Separate legacy metric 31.32%; do not interchange definitions. GPU percentiles 3/7/7/9 ms. |
| Memory snapshot | Total PSS 795053 KiB (~776.4 MiB), RSS 997260 KiB (~973.9 MiB), swap PSS 83 KiB. One post-navigation snapshot includes Expo/React Native/Mapbox; no leak inference or component attribution. |

Filtered ReactNativeJS/AndroidRuntime error logs returned no errors in the requested recent window. Metro and reverse mapping were healthy. This does not exclude unlogged errors, network delays, JS stalls or native work. Visual navigation completed, but these samples are insufficient for release responsiveness acceptance. Android gfxinfo does not establish complete JS/Mapbox rendering performance.

## Finding and change
The intermittent blank period precedes the application's branded loader. Source inspection finds the startup session overlay bounded at 15 seconds with public navigation mounted beneath it; public loading also has a 15-second deadline. These bounds begin only after the relevant React effects run. They do not cover pre-React dev-client loading, and source inspection alone does not prove the delay's cause. No session/auth or loading-deadline changes made.

Cold-launch screenshot exposed garbled default loading text. Changed only that string to ASCII `Preparing your journey...`. Five branded-loading/use-load tests, scoped ESLint, diff whitespace check and Architect self-review pass. No separate independent review for the copy-only fix; previous TypeScript check reused because no contracts changed. New label not separately captured on the phone; source/test verification only.

## Follow-up startup trace — 2026-10-31
- Owner requested “do the next” after startup tracing was proposed. Temporary probes recorded bundle/entry/root timestamps only; no secret values or backend behavior changes.
- Trace A: host launch1793412609142; bundle request1793412610322; finish1793412612079 (1757ms,200); root module1793412615843; root render1793412616218. About7076ms launch-to-render,3764ms bundle-finish-to-root-module.
- Trace B (cached Metro): host launch1793412680602; request1793412681923; finish1793412682030 (107ms,200); root module1793412686559; root render1793412686931. About6329ms launch-to-render,4529ms bundle-finish-to-root-module. Host/phone timestamp comparison assumes clocks sufficiently aligned; exact transport/runtime decomposition not established.
- Trace C (temporary entry before expo-router require): host launch1793412785931; bundle finish1793412789216 (2185ms,200); entry1793412793000; root module1793412793686; render1793412794076. Entry-to-root686ms, root-to-render390ms; bundle-finish-to-entry3784ms. Optional Metro Systrace hook emitted no import samples, so no module attribution. Entry changed bundle shape,1633 modules vs1702 in Trace A; not a controlled speed comparison.
- Inference: several seconds elapse before application entry/root evaluation; main bundle compilation alone does not explain the blank period. No particular dev-client/Hermes/transfer/native/app-import cause proven. No evidence justifies changing authentication or journey-loading contracts; no performance fix claimed.
- Removed temporary entry file and restored package.json main, metro.config.js and app/_layout.tsx exactly (no Git diff). Confirmed probes absent and restarted original Metro. Prior local fixes preserved. No tests repeated for removed diagnostics; restoration/diff/whitespace checks performed.
- Read existing eas.json preview profile: internal,developmentClient:false,Android APK,environment:preview. No APK/AAB found among scanned nonignored repository files. Next: approve EAS Android preview-profile build and installation/testing on CPH2813. Build quota may apply; app.json uses the same package as the dev client, so installation would replace it. Preserve a reinstall path; never uninstall/clear app data without approval. No build/install performed; R5 stays open.

## Evidence and remaining work
Local temporary images: C:/Users/sreej/AppData/Local/Temp/journey-perf-1031/cold-2.png, cold-5.png, cold-10.png, cold-20.png, repeat-2.png, repeat-5.png, repeat-10.png, after-repeat.png, warm-resume.png. Shell measurements recorded above. These are not remotely published links.

No new build/install/dependency change, commit, push or deployment. Device left on Home at normal text size. R5 stays unchecked, total 16/24 complete. Remaining: investigate development startup with tracing, compare an approved release/profile build without Metro, repeat controlled representative interaction runs, sustained memory/resource sampling, broader device coverage and remaining accessibility matrix. Building/installing a new native client requires separate approval; none requested or performed in this slice.
