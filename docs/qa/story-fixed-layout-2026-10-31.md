# Story card layout fix ? 2026-10-31

Local/unpublished focused UI bug fix. Architect assigned Mobile Developer ownership of Story route, StopCardDeck, StopTimeline and directly affected tests/report. Baseline Mobile clean on codex/app-wide-dark-theme; unrelated Web Supabase temp folders preserved.

## Backend-impact assessment

Inspected src/app/journey/[id].tsx, src/components/journey/stop-card-deck.tsx, stop-timeline.tsx, social-actions.tsx, journey-options.tsx and story-header.tsx. Changes only size and arrange existing views and reserve text lines. Data contracts, auth/authorization, persistence, RPC/API/query behavior, Storage, GPS and lifecycle behavior are unchanged. UI-only gate released; no live Supabase preflight or changes required/authorized.

## Implementation

Measure available Story viewport above navigation. Normal original stories at default font size and viewport height >=640dp fit a bounded map and flexible card/photo without vertical scrolling. Swipe footer occupies normal layout space rather than covering the card. Photo retains at least162dp for social controls. Every card reserves two title lines and one description line, including empty descriptions; slot height follows system font scale. Full notes remain in Read story.

Short viewports, enlarged fonts, temporary selections and source-attributed stories retain accessible scrolling to avoid clipping their extra content. They still use consistent text slots and a non-overlapping footer.

## Checks

86 affected tests pass across stop-card-deck, story-interaction, swipe-journey-start and map suites. Story interaction regression covers portrait fixed layout, resize into short scrolling viewport, and restoration to portrait. TypeScript and scoped ESLint pass. Git diff whitespace check passes. No full suite/native rebuild needed for scoped JS layout change.

Independent reviewer identified enlarged-font and extra-row budget overflow risks; fixed layout now applies only to default-font original stories without source attribution. Primary owns final independent review and physical-device evidence; see Architect completion for that evidence. No dependency changes, commits, pushes, deployments or live writes performed.

## Final Architect verification

2026-10-31 Asia/Kolkata: physical CPH2813 / Android 16 / 1080x2344, existing dev client using Codex Metro 8081. Metro process confirmed travel-mvp-mobile; owner supplied wireless-debugging connection. Before image showed start footer obscuring card action labels. After images show original Story stops 1 (Nedumangad, empty description), 2 (Palode, empty description) and 3 (Thenmala, description) with matching card bounds, visible social/options actions, slider and bottom navigation. Next arrow advances 1 to 2. Vertical drag leaves page bounds unchanged. No trip/GPS activation or backend writes. Scratch screenshots: C:/Users/sreej/AppData/Local/Temp/story-before.png, story-after.png, story-next.png and story-final-next.png. Enlarged-font and extra-row variants are code-reviewed fallback behavior, not physically tested in this task.

Independent Code Reviewer rechecked final diff after both corrections: no remaining actionable findings; whitespace check passes. Work remains local/unpublished.

Physical evidence from Architect: CPH2813 Android16,1080x2344, expected Mobile checkout Metro8081. Before labels overlapped; after stop1 Nedumangad and stop2 Palode (empty descriptions) and stop3 Thenmala (description) share fixed bounds. Vertical drag did not scroll; arrow advanced1->2. All labels, slider and navigation visible. Evidence in owner-local Temp/story-{before,after,next,final-next}.png. No writes/GPS/trip.

## Public remixed Story correction

Owner reported a missed public-source variant during the later Buddy-loop work. The animation diff did not change layout sizing; earlier Story logic conservatively excluded every non-temporary source-attributed journey from fitting, so public remixed Stories still scrolled. This was a missed variant in the UI fix. Public SourceAttribution now occupies measured footer space, source exclusion is removed, and returning to fixed composition resets any retained scroll offset to zero. Fixed328dp card and default original/selected layouts remain intact; existing short/large-font/error fallback policy was not expanded.

Owner rule: never introduce scrolling through UI changes without asking first. Preserve the agreed no-scroll behavior and verify original, public-remixed and selected-preview variants in layout changes. Startup note owned by Architect; this task did not edit PROJECT_STATUS.md.

Regression assertions cover public remixed Story default no-scroll, source attribution outside map/card scroll content and old offset reset on fixed-layout restoration. Story tests, TypeScript and scoped lint pass; Architect owns final physical confirmation.

Latest owner correction2026-10-31: public remixed Story also fits without scrolling; credit measured in footer instead of excluding source journeys. Tightened requested card/footer gap to give24dp back to map; exact390deck+8gap+measuredfooter budget, fixed328card. Verified phone publicsource verticaldrag and controls,92affected tests/static/review pass. No unsolicited layout or scroll changes permitted going forward; explicit owner approval required. See story-loop-buddy-2026-10-31.md for final evidence and constraints.

Owner comparison follow-up2026-10-31: Journey vs edit screenshots show same328dp cards but published attribution/footer consumed more height. Small authorized UI-only correction; inspected Story route, SourceAttribution and editor/footer usage, retained dirty baseline. No contracts/auth/persistence/API/RPC/Storage/GPS impact; no live check required. Added opt-in compact published attribution32dp/text10/14 only in fitted Story; credit still supports2lines, full accessibility label, original link and retry. Default/draft/editor and enlarged layout credit remain unchanged. Removed8dp Story footer bottom padding; recovered20dp for map, fixed card stays328dp and no-scroll stays enforced. No card/editor/animation redesign.86 affected attribution+Story tests, TypeScript, scopedlint and whitespace pass (legacy line-ending warnings only). Self-review proportionate small layout adjustment; no separate specialist required. Physical CPH2813Android16 Metro8081 screenshot story-compact-credit.png and verticaldrag story-compact-credit-drag.png confirm taller map, visible credit/actions/slider/nav and unchanged page bounds. Local/unpublished.

Owner guide/card-height request2026-10-31: add small guide between Journey card and start slider, make card HEIGHT smaller to accommodate. Inspected Story route, shareddeck/Timeline compact passthrough and social/options rail minimums; UI-only, contracts/auth/persistence/API/RPC/Storage/GPS unchanged. Prior local baseline preserved. Public fitted Story card now300dp vs328, deck362 vs390; one-line title replaces reserved two-line blank slot. Photo rail retains162dp minimum and all48dp controls. All cards in this presentation share same height regardless description length; full text remains in Read story. Edit and selected-preview card heights unchanged. Measured footer includes14dp guide plus4gap; exact map budget deck+8gap preserves map room and no-scroll behavior. Guide: Swipe cards to explore. Swipe below to start.75 affected deck/Story tests,TypeScript,scopedlint pass. Phone CPH2813Android16 Metro8081 screenshot story-guide-small-card.png confirms300dp card, visible guide/slider/actions/nav and fixed layout; punctuation subsequently normalized to ASCII period. Self-review proportional focused cosmetic layout, no separate reviewer. Local/unpublished; no writes/startTrip/GPS/publication.


Final owner acceptance (2026-10-31): owner reports verifying the current pages. The canonical approved design and future UI preservation rules are in [Approved Mobile UI baseline](../approved-mobile-ui.md). Its final geometry supersedes intermediate values in this chronological report. No new scrolling, position/card/map-shape changes or layout redesign during button/icon/image/animation edits without explicit owner approval. Broad multi-phone compatibility has not been physically verified. Documentation-only update; prior code preserved, no backend impact, no app tests repeated. Links/instruction consistency/whitespace checked; local/unpublished.
