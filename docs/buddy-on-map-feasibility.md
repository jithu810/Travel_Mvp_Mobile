# Buddy on the journey map: feasibility and bounded prototype plan

Date: 2026-10-26

Status: source-based feasibility assessment and prototype plan. No map prototype implemented or released by this task.

Input: `D:/Journey_AI_Business/planning/2026-10-26-buddy-on-map-developer-brief.md`. This report answers that brief's developer-facing request for assessment and planning. It does not modify the business brief.

## Recommendation

Feasible as two separately evaluated prototypes:

1. Replace the plane in **published Story preview only**, initially using an upright static-pose Buddy moving over the same illustrative coordinates.
2. Add a **quiet live companion beside the existing location dot/heading arrow**, consuming exactly the accepted location input. Keep the current marker authoritative.

Do not replace the shared plane everywhere or reuse preview traversal for live position. Preserve the Home globe and editor behavior during the bounded prototype. No new backend capability, GPS watcher, transport detection or navigation intelligence is proposed.

## Inspection scope and baseline

Architect coordinated one read-only Mobile specialist assessment. Mobile base revision `955ecac21ae554ae428c9efb36d2f8ab6406e935`, branch `codex/buddy-bubbles-outdoor`, plus the existing unpublished Jump/Run work. Starting dirty paths included Buddy assets/README, provider/store/model/animations/host/sprite, create and Travel success hooks, three test suites, PROJECT_STATUS/ROADMAP and prior QA/preflight evidence. All preserved.

Read application sources and the already-installed Mapbox component sources in `D:/JBuild/node_modules`. No app execution, tests, phone interaction, dependency change, environment-file access, live data access or backend mutation was performed for this assessment. Earlier Jump/Run tests and device observations are separate work and do not verify these map proposals. Current release state and customer outcomes were not independently established.

## Verified implementation findings

| Area | Observed implementation | Implication |
| --- | --- | --- |
| Plane | `src/components/discovery/globe/journey-overlays.tsx:23` implements TravelingPlane with AnimatedPoint, an animated geographic source and a rotated text symbol. | It is simulated preview artwork, not the live traveler marker. |
| Preview path | `src/lib/discovery/travel.ts:20` builds spherical stop-to-stop arcs. Base leg duration is 2800ms, with a 650ms stop pause; missing-coordinate gaps/coincident points are handled. | The path is illustrative, not a verified road route or travel-time estimate. |
| Shared contexts | Discovery `native-globe.tsx:212` and journey `map/native-map.tsx:229` use the overlay. Story/editor memory previews use durationScale3, about8.4s per valid leg. `src/app/journey/[id].tsx:80` enables Story playback when there is no manually requested stop; its expanded panel disables it at91. | A global artwork swap would affect Home/discovery and editor contexts too. Use an explicit scoped variant. |
| Preview interaction | `native-map.tsx:75`,112,145,188,231 coordinate idle, gestures, selection, foreground/focus and reduced motion. Playback automatically starts after idle; remount restarts it. | Explicit Play/Pause/Replay and a Journey preview label are new work. True pause/resume requires retained traversal progress, not a playing toggle alone. |
| Live marker | `native-map.tsx:222` renders a separate travel-current-position source with a blue dot or heading arrow and fixed nine-pixel halo. | Keep this source and heading authoritative. The halo is not an accuracy-radius visualization. |
| Accepted live coordinates | `travel/[id].tsx:130` passes only navigationFix-approved coordinates. `lib/journey/navigation.ts:22` gates valid coordinates, age at most15s and accuracy at most50m. | Buddy must use the same accepted coordinate and existing stale/invalid behavior. No preview interpolation, route snapping or extrapolated location. |
| GPS lifecycle | `hooks/use-trip-location.ts:16` synchronizes the existing controller with trip state, focus and foreground, with cleanup. Native location adapter requests high-accuracy updates at a3000ms interval and separate compass observations. | Reuse the existing controller and updates; add zero observers. |
| Transport | `navigation.ts:64` selects a driving routing profile. Speed/course are used for direction, not trustworthy mode detection. | Do not infer walking, flying or vehicle travel. Use a neutral live pose. |
| Existing Buddy | `_layout.tsx:16`,25 mounts a global provider/host; Story and Travel register floating Buddy. Existing local preference, reduced-motion handling, help, poses and transient success reactions already exist. | Adding a map Buddy without ownership coordination would duplicate him or remove existing help/feedback. |
| Assets | BuddySprite owns a leaf-local sprite clock and fallback, using a64dp canvas. Assets provide left/right mirroring rather than full compass poses. | Prototype upright smaller artwork; do not equate facing with actual heading. Validate padding, contrast and anchoring on-device. |

Source paths above are relative to `src/components/journey/map/` where abbreviated as native-map. Other full component path: `src/components/discovery/globe/native-globe.tsx`. Line references describe this inspected local snapshot and may shift after edits.

## Rendering feasibility

**Start with the existing image/symbol rendering pattern for preview.** Keep the same geographic playback clock and substitute a bundled static Buddy pose for the plane glyph. Measure legibility, anchor stability and comprehension before adding sprite animation. This introduces fewer moving parts than changing geographic playback and sprite playback together.

For an animated variant, evaluate one MarkerView hosting the existing sprite. Installed `D:/JBuild/node_modules/@rnmapbox/maps/src/components/MarkerView.tsx:20` exposes coordinate/anchor and React Native children; its documentation at68 notes static image/symbol rendering performs better. This is a plausible spike, not a proven smooth or compatible animated implementation.

Do not assume PointAnnotation is suitable for animated children: installed `PointAnnotation.tsx:122` documents bitmap snapshots and warns about animations being captured in an unknown state. Existing photo-pin refresh behavior is not evidence that per-frame refresh is efficient.

The current camera-aware pin projection helper has cancellation/timeouts but is not an existing per-frame sprite-placement engine. Avoid continuous bridge projection without profiling. Validate upright screen-space presentation, bottom-center anchor, offset and touch pass-through using the chosen installed renderer. No new library or dependency is selected by this plan.

## Prototype A: published Story preview

- Gate the experiment to published Story through an explicit presentation variant; preserve discovery/Home and editor defaults.
- Keep current spherical geometry, leg/stop timing, stop order, camera ownership and missing-coordinate behavior equal between plane and Buddy variants.
- Start playback on request. Label it **Journey preview** and retain stop numbers/names and manual selection.
- Provide accessible Play, Pause and Replay. Pause retains progress; Replay resets intentionally. Gesture, stop-selection, blur/background and reduced-motion transitions remain deterministic.
- Compare the current plane with a static-pose Buddy on the same coordinates first. A low-rate sprite variant is a subsequent renderer spike, not assumed scope.
- Essential route/stop information remains visible with Buddy off, reduced motion or asset failure. Preserve the plane/static baseline and controls as fallback.

## Prototype B: live companion

- Retain the existing blue dot/arrow, heading logic, accepted coordinate and status text unchanged.
- Anchor a small neutral upright Buddy beside that same coordinate with a visual offset, never a fabricated latitude/longitude offset.
- No autonomous walking/running along the route, transport inference, arrival celebration or extrapolated movement.
- Follow the current marker's valid/stale/paused visibility contract. Do not introduce a persistent last-known Buddy that looks like a fresh position.
- Keep actual position visible when off-route; never snap Buddy onto the published path.
- Hide or simplify the decorative companion where it obscures position, route, selected/next stops, guidance, arrival or controls. Live heading remains the existing arrow's responsibility.
- Preserve existing accuracy/status information. A measured accuracy-radius circle is not currently available in MapDisplayProps and is a separate product/implementation decision.

## One coordinated Buddy

Reuse the current stored on/off preference without changing its meaning. Add scoped presentation ownership rather than setting the preference off when the map character appears. Only one Buddy presentation should be active in that context; release ownership on blur, unmount, map failure and playback/travel exit.

Before suppressing the floating actor, define an accessible way to reach its existing help and retain the already-implemented confirmed-save Jump and accepted-start/resume Run feedback. Options include routing those events to the active representation when safe, or retaining a separate explicit help affordance. This decision is required before prototype implementation; silently losing help or success feedback is unacceptable. Active guidance/arrival still has priority.

With Buddy disabled, keep the ordinary preview/live markers and equivalent controls. Reduced motion removes decorative animation without removing essential route or position information.

## Implementation sequence and ownership

| Stage | Proposed owner | Deliverable / exit condition |
| --- | --- | --- |
| Backend preflight before feature coding | Backend Developer | Compare relevant repository migrations/current schema under the existing workflow; record a no-change conclusion or required work. Planning here does not substitute for implementation preflight. |
| Renderer spike | Mobile Developer | Isolated static Buddy preview and optional animated renderer comparison; physical anchor/rotation/gesture and frame-cost evidence. |
| Story preview prototype | Mobile Developer | Scoped plane/Buddy variants with labeled explicit playback controls, deterministic progress and coordinated Buddy presentation. |
| Live companion prototype | Mobile Developer | Same accepted fixes and authoritative marker, neutral offset companion, lifecycle/priority/fallback behavior; zero added location observers. |
| Automated/device comparison | QA Tester | Equivalent input scenarios and regression evidence against both baselines. |
| Independent review | Code Reviewer | Source/snapshot review of location truth, lifecycle, accessibility, ownership and performance risks. |
| Product evaluation | Product owner | Evaluate comprehension and preference separately; authorize any later production scope. |

## Test and evaluation plan

Existing tests to extend, not newly run for this assessment:

- `tests/story-interaction.test.mjs:1528`: invalid/stale/inaccurate marker exclusions.
- At1597: preview yields to gestures, selection, background and reduced motion.
- At1622: direction arrow/compact dot and route-layer order.
- At1220/1257: camera ownership and lifecycle cleanup.
- Buddy/floating tests: preference, geometry, drag, help, suppression and confirmed-success animations.

Add deterministic preview-progress/control tests, missing-coordinate gaps, identical selected/destination stops, one active Buddy owner, asset/map failure fallbacks and touch pass-through. Assert no preview updates can enter live position, arrival or completion state.

For live replay, use synthetic moving/stationary, stale/future/inaccurate, GPS loss/recovery, off-route and direction-change inputs, plus Pause/Resume/Finish, blur/background, rotation and preview-to-live transitions. Assert no new GPS watchers, unchanged marker validity/heading and preserved cleanup. No live database fixtures or user saves are necessary for these rendering scenarios.

Compare plane/Buddy preview with identical geometry, timing, camera and controls. Ask participants for first/next/final stops and whether the scene is simulated or their location. Compare original live marker versus marker-plus-Buddy using identical synthetic fixes; ask for actual position, uncertainty, route relationship and guidance/stop selection. Counterbalance order. Record correctness, hesitation, accidental taps and preference separately.

Measure frame stalls, CPU/memory and sustained resource use on the owner's Android phone plus a representative lower-performance device when available. Establish current baseline and acceptable thresholds before claiming performance or battery benefit. No such measurements or user-study outcomes exist for this proposal. Use synthetic/sanitized routes; omit private home starts and other private details from shared research materials.

## Planning estimate and decisions

Provisional effort: renderer spike0.5–1.5 developer days; Story controls/coordination1.5–3; quiet live companion1–2; regression/device comparison/fixes1–2. Budget approximately **4–8 developer days**, subject to renderer findings and existing playback-state refactoring. These are planning estimates, not delivery commitments; production polish, recruitment and broader platform coverage are additional.

Before coding, settle the Story-only experiment boundary, help/success-feedback ownership, Buddy-off fallback, desired static versus sprite variant and comparison criteria. Do not broaden to Home/editor implicitly. No transport-mode inference or new accuracy visualization belongs to this bounded plan.

## Approvals and result

This task delivers feasibility and a bounded prototype plan; map implementation remains pending explicit prototype authorization and the required preflight. Local implementation, if authorized, remains unpublished. Dependency/native-build changes, live record writes, production database changes, field research/recruitment, GitHub publication and deployment are outside this assessment and follow their existing authorization rules.

No application code or original business brief changed. Only this local report was created. No tests run for this planning task; no prototype performance, usability or device compatibility outcome is claimed.
