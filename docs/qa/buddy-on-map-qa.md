# Buddy on map — local prototype record

Date: 2026-10-26. Status: implementation in progress; not published.

## Authorization and baseline

Owner authorized starting the bounded local prototype after reviewing `docs/buddy-on-map-feasibility.md`. Scope: published Story preview comparison and quiet live companion. No commits, pushes, deployment, new dependencies/native build or backend/live-data changes authorized.

Mobile base `955ecac21ae554ae428c9efb36d2f8ab6406e935`, branch `codex/buddy-bubbles-outdoor`. Preserve all preceding unpublished Jump/Run assets, success hooks, touch-delay/duration fixes, tests and documentation. Web remains unchanged, with its three pre-existing nested Supabase metadata directories preserved.

Backend preflight completed against fresh live metadata and matching migration history; Architect recorded release in `buddy-on-map-preflight.md`. No backend changes needed. No hosted rows, Storage objects or secrets queried for this feature.

## Accepted implementation boundaries

- Published Story only for explicit Journey preview controls and Plane/Buddy comparison; discovery/Home and editor defaults preserved.
- Same illustrative spherical path, stop order, timing and camera ownership; actual retained progress for Pause, deliberate Replay reset, yield to manual selection/gestures/lifecycle.
- Quiet upright live Buddy uses the same accepted location coordinate as the existing dot/heading arrow, with a visual offset. No snapping, extrapolation, transport detection or new GPS observer.
- Decorative companion hides when position invalid/stale/paused, map moving/unready or collision checks cannot establish clear space. Essential location/route/control layers remain.
- One coordinated Buddy presentation, existing preference and reduced motion respected. Map yields to existing Jump/Run feedback and accessible help/tour/actions, with cleanup on navigation/map failure/unmount.

## Required verification

Actual component/controller tests for retained pause/replay progress, coordinate gaps/date line/coincident stops, equal plane/Buddy traversal, unchanged Home/editor defaults, selection and camera ownership, map/floating ownership cleanup, off/reduced/background/error fallbacks, help/tour and success feedback. Live tests preserve accepted coordinates, dot/arrow/heading/route ordering, location validity and lifecycle cleanup with zero new observers. No preview coordinate may update actual trip progress or arrival.

Use explicit isolated snapshots with existing installed dependencies; no environment files copied. Run relevant Buddy/map/Story/Travel/GPS suites, TypeScript and source/test lint. Independent QA and Code Reviewer inspect stable source snapshot. Physical-device screenshot evidence establishes only observed visuals, not usability, sustained performance or battery benefits. Use local in-memory Travel and public reads; no automated live saves.

## Results

Local implementation written: scoped Story controls/controller and plane/Buddy renderer, quiet live companion, conservative projection/obstacle gating, presentation ownership and accessible map Help. Existing GPS/controller and authoritative marker retained. No new assets/dependencies.

Mobile focused214/214 passed and final TypeScript/targeted lint passed. Broad source tests747/748 verified across broad run and fixture retry; the remaining unrelated disposable PostgreSQL test could not start pg_ctl under sandbox restrictions. No claim of a fully passing broad database test run.

Initial independent QA305 unique checks, TypeScript and source/test lint passed. QA reproduced P2 stale Help close callback and independently verified its identity-guard correction. Snapshot at this checkpoint `78bccc7541feb6e2d63655c9417c262344b7c10c525c2b4958829603d48c6633`.

Independent reviewer156/156 checks passed but found P2 declared-image failure: Android Mapbox does not send onImageMissing for a known image whose decode/download fails, allowing a blank placeholder while floating Buddy is suppressed. Fix assigned before runtime demonstration. Initial reviewed snapshot `d155687893b3d07a5a63860e258fdb5654b5a02a6f6e4d2d4c21f1af6eab2d3a`. Explicit decoded-image readiness/timeout/fallback correction and final re-verification pending. These initial snapshot results do not establish final readiness.

Native rendering/performance evidence pending; no map prototype device outcome claimed yet.

## Resumed session and native loader correction — 2026-10-26

Recovered interrupted session `01a178e2-e4b2-7253-a338-f55d1287ee1e`. Its final report recorded 310 independent QA checks and completed review after the earlier image-readiness correction. Those results preceded the native failure below; they do not establish device readiness.

At 23:43–23:47 IST, CPH2813 / Android 16, existing development client with Metro on D:/JBuild: public Vettukadu Story reproducibly displayed Retry Buddy image and the plane fallback, including after Retry. Installed Mapbox Android code explains the defect: replacing a keyed Mapbox.Image child does not attach it to the existing offscreen image container, preventing decode/layout completion.

Correction: ordinary invisible, inaccessible, touch-transparent RN image probe outside Mapbox; register a stable images object only after decode and nonempty layout. RN and Mapbox receive an identical embedded data URI, byte-for-byte the existing 128×128 reference PNG, with scale 1. No network image fetch, artwork transformation, dependency or native build. Timeout, errors, retry and stale callbacks remain guarded; retry remounts the registry.

Mobile verification: 191 focused tests across six suites passed, TypeScript and targeted source/test ESLint passed. Independent reviewer reran 150 checks across seven suites and found no actionable findings. Final seven-file snapshot `c91b750d9cd2b22abfc0d4c474b7f454cd1b3c3a5757a6ac4709081aa43d1b48` uses SHA256 of ordered path + NUL + raw bytes + NUL: native-map.tsx, use-buddy-map-image.ts, map-image.ts, buddy-map.test.mjs, map-navigation-marker.test.mjs, story-interaction.test.mjs, navigation.test.mjs. Source frozen after the final wrapper/type correction.

Architect copied the three runtime files to D:/JBuild with backup `<local-temp>/buddy-map-loader-20261026-235153`; all three hashes match final Mobile sources. Fourteen unchanged integration paths also matched the runtime. Metro running. No environment files read or copied.

Native at 23:52–23:53 IST: reopened public Story; Buddy rendered upright over the map, Retry Buddy image disappeared, no second floating Buddy visible. Play then Pause moved the character and showed Preview paused / Play continues from here. Evidence `<local-temp>/buddy-map-final-story.png` and `buddy-map-final-paused.png`. Initial two taps used resized screenshot coordinates and missed the controls; final taps used physical 1080×2344 dimensions. Preview left paused. No trip started or live records written during this resumed check.

Remaining: native Replay/comparison/help/accessibility and lifecycle matrix, live GPS companion placement and guidance/arrival collision checks, sustained performance/battery and broader usability. Mapbox provides no positive style-image upload acknowledgement; RN decode is not proof against native allocation failure. Observed rendering establishes this device run only. No commit, push, publication, backend change or deployment.
