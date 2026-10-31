# R5 reduced motion and scoped contrast — 2026-10-31

Owner authorized continuing standalone accessibility checks. Architect direct small presentation correction/self-review. Baseline feature/backlog-phase1,d2c3f0d plus preserved previous R5 source/test/docs changes. Installed Outdoor APK remains EF949F0F42B5846F50EFD61ED5369B05C9C852CB3280A90A15C7A95DD05E6ECF.

Backend assessment before correction: inspected explore-tile.tsx,mobile-theme.ts,shared discovery UI and navigation palette. Only destination-caption foreground opacity changes; no data,auth,persistence,query/RPC/API or Storage behavior change. No live preflight needed. No dependency/native/build changes planned.

Contrast benchmark: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (normal text4.5:1,not whole-app/native certification). Calculation uses sRGB relative luminance and alpha compositing of source colors.

| Pair | Ratio |
| --- | --- |
| Body #101B2E / background #EDF1F8 | 15.217 |
| Muted #505D73 / background | 5.877 |
| Muted / surface #F7F8FC | 6.273 |
| Active navigation #276392 / #C9DFFF | 4.712 |
| Inactive navigation #48554F / #F2F6FF | 7.218 |
| Accent #4B46A2 / background | 6.874 |
| White / primary gradient endpoints | 5.383 / 6.343 / 5.770 |

Photo-caption bound: rgba(17,17,17,.62) over all-white photo gives background(107.44,107.44,107.44). Opaque white title ratio5.29465; old destination white alpha.86 gives4.41477,below4.5. Opaque white destination gives the same5.29465 worst-case bound without layout changes. Source-level bright-photo case,not a claim every displayed tile failed. Scope excludes other text-over-photo styles and gradients/transparency not listed.

Reduced-motion phone check complete for Home only. Installed RN AccessibilityInfoModule.kt reads TRANSITION_ANIMATION_SCALE. animator_duration_scale inspected(null),never changed. Original transition_animation_scale1.0,font_scale1.0,density override480. First attempt's second frame was lock/always-on display; discarded as motion evidence and restored1.0 immediately. Owner then confirmed phone on; inspected unlocked Home before retry.

Retry: selected Home to refresh user activity,transition scale0,wait2s/capture,wait4s/capture,restore1.0. Both full-screen PNGs identical SHA256 EB767BBEE55BC8FF7DAC9188C9EC2EAB1CAEE7D67B2F76329AF8DE634C125441; visual inspection shows unlocked Home,static globe/Buddy. Restored normal captures show changed globe orientation and Buddy frame. This supports stationary Home decorative animation during that reduced-motion sample,not all gestures/transitions/Travel behavior. Verified transition1.0,animator null,font1.0 afterward; no preferences,trip/GPS or hosted writes.

Local evidence in C:/Users/sreej/AppData/Local/Temp/journey-outdoor-build-1031/: motion-retry-ready.png,reduced-confirmed-1.png,reduced-confirmed-2.png,restored-motion-1.png,restored-motion-2.png. Initial reduced-2.png is excluded (lockscreen). All evidence local/unpublished.

Correction: src/components/discovery/explore-tile.tsx destination foreground changed only from white alpha.86 to opaque white. Analytical contrast recalculation and10/10 existing search-explore tests pass; whitespace and Architect self-review pass. No new implementation-mirroring test or full suite/typecheck for a single static color. No independent review required for small styling scope. No installed-build visual verification of the correction claimed.

Installed Outdoor APK and D:/JBuild remain unchanged: caption correction is local in canonical Mobile only,not rebuilt/installed/pushed. Can batch it with later verified fixes for a separately approved APK update. Broad R5 stays unchecked,16/24 complete. Remaining contrast regions,full touch-target/keyboard/motion matrix,TalkBack(owner-deferred),sustained performance and R4 GPS/network checks are not complete.
