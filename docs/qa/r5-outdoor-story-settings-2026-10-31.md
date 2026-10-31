# R5 standalone Story and Account settings — 2026-10-31

- Scope: owner authorized continuing checks on the updated installed Outdoor build. Architect performed a focused read-only layout/selected-bound audit; no specialist or separate review required for this bounded check. Existing local source/test/docs changes preserved on feature/backlog-phase1 at d2c3f0d.
- Build: com.sree8100.journeycreatormobile.outdoor0.1.0/code1,installed2026-10-31 08:20:05; previously verified APK SHA256 EF949F0F42B5846F50EFD61ED5369B05C9C852CB3280A90A15C7A95DD05E6ECF. Physical CPH2813/Android16,1080×2344,existing override density480 (360dp width). Font scale1.0 baseline,2.0 check,1.0 restored; density unchanged.
- Backend impact: no implementation,auth,permissions,persistence,queries/API/RPC or Storage changes. Read-only navigation and temporary system text setting only; no live preflight needed. Did not Like/Save/Remix/Create,change Buddy/preferences,sign out or begin GPS/trip.

## Results
- Opened Goa journey Story at1.0; observed labels/actions. At2.0 Android recreated Activity and returned Home; reopened same Story deliberately.
- Initial2.0 viewport put lower card actions behind the fixed trip slider. A vertical scroll inside Story revealed Read story,creator,Make it yours and About entirely above the slider. Therefore no unreachable-action defect established. Creator text truncates in the compact rail; About shows the full creator name. No claim that TalkBack read it.
- Make it yours sheet at2.0: title,Close and both explanatory cards readable,including temporary selection versus private editable copy. Neither action selected. Close returned to Story.
- About sheet at2.0: long text scrolls to the complete GPS explanation and Refresh action; fixed Close remains visible. No Refresh/trip action activated.
- Account at2.0: profile/main controls readable; settings content scrolls. Initial capture showed a lower scroll position; scrolling upward reached Account settings,Close,Buddy switch and greeting-reset control. No preferences or switch changed. No claim about why the initial offset occurred.
- Closed settings with the measured Close control,restored font_scale1.0 and inspected Home afterward. No code change or new build indicated by these layout observations.

## Selected accessible bounds
UIAutomator idle dump failed on the animated map; no Story-rail bounds claimed. Static-sheet compressed dumps succeeded. At3 physical pixels per dp:

| Control | Exposed bounds(px) | Size(dp) |
| --- | --- | --- |
| Options Close | [752,189][1026,321] | 91.3×44 |
| Pick stops | [60,450][1020,1297] | 320×282.3 |
| Save editable copy (not pressed) | [60,1351][1020,1988] | 320×212.3 |
| Settings Close | [888,412][1020,544] | 44×44 |
| Native Buddy Switch (not changed) | [880,703][1020,808] | 46.7×35 |
| Reset greetings (not pressed) | [60,1003][1020,1205] | 320×67.3 |
| Edit/Forget preferences (neither pressed) | [60,1518][1020,1680] / [60,1710][1020,1872] | 320×54 each |

These are accessible node bounds,not proof of the full native hit/slop region or a complete touch-target compliance pass. Small Close/Switch bounds remain inputs to the unfinished touch-target audit.

## Evidence, limits and checks
- Temporary local folder C:/Users/sreej/AppData/Local/Temp/journey-outdoor-build-1031/: story-normal.png,story-large.png,story-large-scroll.png,options-large.png/options-large.xml,options-closed.png,about-large.png,about-bottom-large.png,account-r5-large.png,settings-large.png/settings-large.xml,settings-top-large.png/settings-top-large.xml,settings-closed-large.png,r5-restored-normal.png. Contains account/personal display data; keep local,not published.
- Automatic approval review rejected a batched close+next-tap command because the second coordinate overlapped Save editable copy in the then-current modal. Nothing executed. Used a separate measured Close tap,screenshot confirming Story,and only then a separate About navigation. No save authorization requested or live save performed; rejection resolved through state verification.
- No application tests repeated: installed code unchanged; prior build QA applies. Documentation whitespace/self-review only. No independent accessibility certification claimed.
- Remaining: broad touch-target/contrast/reduced-motion audit,TalkBack (owner-deferred),other screens/dialogs,keyboard variants, sustained resource/device coverage and R4 physical GPS/network matrix. R5 stays unchecked;16/24 complete. This slice is local/unpublished.
