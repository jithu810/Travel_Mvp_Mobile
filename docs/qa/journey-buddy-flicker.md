# Journey Buddy Home Locate / Journey-load flicker

User-authorized local bug fix, 2026-10-25. Architect integration and physical-device record. Completed locally; unpublished.

## Baseline and ownership

Mobile branch `codex/remove-3d-companion`, HEAD `7c113f07a595af7977a54a961752dfb4e0598ea7`. Preserve the complete existing dirty Buddy implementation and zero-space floating correction. Prior reviewed application/test/asset snapshot: `240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8` (61 files). Web application, migrations, dependencies and credentials are outside this correction.

Backend preflight refresh: [report](../journey-buddy-flicker-preflight.md). Architect reviewed and released the UI-only implementation gate. The report explicitly reuses completed same-conversation live-schema evidence after confirming no material scope or migration changes; it does not claim a new live query. No hosted writes authorized or performed.

Mobile specialist owns pin hook, two native map event adapters and focused regressions. Architect owns this record and status/roadmap updates. QA owns its independent report. Independent reviewer reads a stable final snapshot.

## Root cause and baseline device evidence

Repeated map idle and measurement callbacks unconditionally mark pin geometry moving before asynchronous projection. Host hides/unmounts the actor whenever geometry is pending, so duplicate events destroy and restart its sprite clock. Camera callbacks also previously invalidated geometry without comparing the actual camera pose.

Physical CPH2813 / Android 16, existing native Expo development client and Metro8081, wireless adb `<phone-LAN-address>`; reverse and foreground app verified by the shared phone-session check. Existing configured Metro retained; no environment files inspected or changed. Signed-in public Home/Journey browsing only; no trip/GPS start or backend mutation.

Scratch evidence directory: `<local-temp>/journey-buddy-device/` (not committed). `flicker-locate-before-0.png` through `-7.png`, sampled at 1.02, 2.14, 3.36, 4.53, 5.72, 6.95, 8.11 and 9.38 seconds after Home Locate. Buddy is absent in samples0–2, visible in3–5 and absent again in6–7. `flicker-before-contact.png` is a contact sheet of those exact screenshots. Sampling establishes repeated disappearance; it does not measure subframe timing.

Android screenrecord was denied by the device for shared and temporary output paths; no recording obtained. An attempted baseline Journey transition returned black screenshots, so `flicker-journey-before-*` is not accepted as flicker evidence. Subsequent display/window metadata established `mWakefulness=Dozing` and `isKeyguardShowing=true`; the black surface is not evidence of an application failure. Metro remains running and Journey is the activity behind the lockscreen. Requested product owner to unlock via asynchronous input; native verification resumes only after unlock.

## Verification

First frozen correction: native map adapters forward camera properties; pin hook caches accepted relative rectangles, coalesces identical active projections, translates origin-only changes and filters subpixel camera jitter against the last meaningful pose. Controls, page layout, global overlay stacking and drag logic are preserved.

Independent automated QA passed677/677 non-PG cases, including49Buddy/floating cases, TypeScript and zero-warning current-source lint on61-file snapshot `553836f2310e58bf7302674834dfd253466bcb83ba0626b975b1a4c267f00cf0`. Unchanged disposable PostgreSQL policy test was excluded, retaining its previously documented isolated pass. A review then identified an unknown-camera-input cache invalidation edge case; follow-up correction and final rerun pending. These results do not cover the subsequent follow-up yet.

After user unlocked the phone, confirmed Awake/keyguardfalse and cold-relaunched. `flicker-locate-final-0.png` through `-9.png` (1.08–12.23sec) exclude the earlier Fast Refresh banner: Buddy remains hidden during the actual camera transition, then appears at5.75sec and remains visible through12.23sec, including the interval where baseline disappeared again. Contact sheet: `flicker-final-contact.png`. Earlier `flicker-locate-after-*` samples include a development Fast Refresh banner and are supplementary only.

`flicker-journey-final-*` initially showed no Buddy through13.28sec despite a loaded map; recorded as a failed visibility check, not accepted as a successful transition. A later controlled entry with temporary sanitized eligibility diagnostics showed valid20-area geometry and visible Buddy; `flicker-journey-diagnostic.png` confirms ready-map sprite rendering. Diagnostics also captured early transient eligibility before the map frame was protected, followed by whole-map loading protection and then valid projected pins. Follow-up closes this loading ownership gap. Diagnostic data includes only booleans, owner indices and layout rectangles; no IDs, coordinates or account information. All temporary diagnostics must be removed before final acceptance.

## Final acceptance

Final61-file application/test/asset snapshot: `8db188794999ab396e83b063bf48c9e96755896e7306d64e03b3e3d446484b18`. Pin hook SHA256 `10bb9e309e7f5db479aa4b7cf6aa3c8297fd5bcb55f3c28a3bba1e50626d72cf`. Host `bbdde6f015a670c4e8db80c34e6e7b47c582e8f186d2174b9daffa3517ddfedb` and store `b201c5fde7a0a08ea47c8ee95f4d66ca03eb2fd6bed9db10e555643c9b641b99` are restored exactly; all temporary diagnostics removed.

Follow-up fixes: missing/invalid camera properties invalidate accepted caches; an initial pin owner remains pending until measured, with a fixed1500ms unrendered-map watchdog. A rendered native map with missing measurements remains protected after initialization and movement deadlines. Measured but unready maps retain whole-frame protection. Blur, disable and detach clean up ownership and clocks. Independent review identified both edge cases, then reported no remaining actionable findings at15:09:03UTC on the final snapshot.

- Independent final QA: **680/680 non-PG cases passed**,0fail/0skip,39.0148894sec, including52Buddy/floating tests. TypeScript, zero-warning current-source lint and whitespace checks passed. Historical ignored publication snapshots remain excluded from lint. See [independent QA](journey-buddy-flicker-independent.md).
- Android export passed:1714modules,56assets, `entry-0fa62539be6ddf1ad6c4fcda79429f51.hbc`,4,081,544bytes, ignored `.expo/buddy-flicker-export`. Export source-map contents match final hook, two native adapters, host and store exactly after newline normalization. Export ran offline without dotenv; existing configured development Metro was retained. This is an export, not a new native build.
- Offline Expo compatibility reports dependencies up to date, with its stated offline-validation reliability caveat. No dependency changes.
- Final clean native source: `flicker-verified-locate-0.png` through `-9.png`,1.33–12.39sec; Buddy remains visible in every sample after5.98sec, through12.39sec. A brief appearance between cinematic stages precedes genuine camera motion; conservative hiding during actual motion is retained. Acceptance is stable visibility after camera settling, not a claim of uninterrupted rendering throughout every transition.
- Final Journey entry: `flicker-verified-journey-0.png` through `-11.png`,1.16–12.33sec. The0sample remains Home during navigation; Journey samples show Buddy visible while loading and on the ready map, including a changed Walk pose in the final sample. No repeated disappearance was observed in these sampled Journey frames. `flicker-verified-contact.png` is the final contact sheet. Phone remained Awake/unlocked, no Fast Refresh banner, no GPS-trip start or live save. Buddy left enabled on Journey with Metro running.

Application changes are confined to the pin hook and two map event adapters; regressions changed in floating, camera-motion and Story test adapters. Status and this report record the final result. Page geometry, root layering and drag implementation remain unchanged. Screenshot cadence is approximately1sec and cannot prove absence of subframe artifacts. TalkBack, broad rotation/large-font, active GPS and battery measurements remain outside this bug's verified scope.

Local and unpublished. No commit, push, merge, deployment, native build or live-service write. No remaining blocker for this local correction.
