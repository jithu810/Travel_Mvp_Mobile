# Approved Mobile UI baseline

Approved by the product owner on 2026-10-31 after reviewing the pages on their phone. This is the current design reference for future Mobile work. Later explicit owner instructions take precedence. Earlier QA reports describe intermediate layouts and must not be used to restore superseded spacing or scrolling.

## Mandatory preservation rule

A request to change a button, icon, image, label or animation authorizes that requested change only. Preserve the approved layout around it. Do not introduce scrolling, reposition other elements, resize cards or maps, change map shape/corners, alter safe-area/status-bar treatment, move bottom controls, or recreate discarded empty space unless the owner explicitly requests that change. Ask before expanding the visual scope. A shared-component refactor or an animation is not permission to redesign another page.

Preserve the current scrolling behavior, including existing accessibility/short-screen fallbacks. Do not add or broaden scrolling as an automatic solution to an overflow. If the requested change cannot fit while preserving the approved design and usable controls, explain the conflict and obtain the owner's decision before changing the layout or scroll behavior.

## Approved composition

| Area | Preserve |
| --- | --- |
| Public Journey, including remixed journeys | Map at top, stop progress and browsing arrows, equal-height stop cards, guide/credit area, start slider, floating main navigation. Normal fitted portrait does not vertically scroll. |
| Public Journey card | 300dp height in the fitted layout; all stops use the same height regardless of empty/short descriptions. Width stays within the existing 16dp screen margins. Rounded 22dp corners and stacked-card appearance remain. One-line fitted title and description slots; full story stays available through Read story. |
| Selected-stops preview (`/customized/`) | Same ordered map/card/selection-note/slider/navigation composition. Fitted card remains 328dp, with Remove and About reachable. Main navigation is visible with Story selected. The stop-choice screen (`/customize/`) is a different presentation; do not silently change it. |
| Saved-draft edit page | Fitted card remains 328dp with 202dp photo/art area and 24dp card corners. Cover, Add stop, Save draft and Settings are a single vertical column on the right, without the old enclosing rectangle. Earlier/Later/Remove stay reachable below the caption. |
| Map | Preserve the existing edge-to-edge rectangular viewport with rounded bottom corners (28dp), clipped contents and current top/status-bar treatment. Map continues behind light phone status icons with a translucent shade. Preserve map controls, gestures, pins, Buddy and camera ownership. Do not replace the shape, add margins or a solid status-bar band, or arbitrarily change its height. |
| Map height | Use the measured available viewport after reserving the approved card/deck, measured footer and navigation clearance. The map receives the remaining room; do not reserve unused blank areas or introduce arbitrary height caps. Different phone heights may change viewport height while preserving the composition and shape. |
| Guide text | Public Journey: “Swipe cards to explore. Swipe below to start.” Small 10dp text with 14dp line height, above the start slider. Edit retains its compact photo guidance; selected preview retains its selection guidance. Keep these visible. |
| Remix credit | Keep the visible original-journey link. Fitted published credit uses the compact row; it is included in measured footer height, rather than forcing the card section to scroll. Preserve loading, unavailable-source and retry behavior. |
| Bottom controls | Slider and main navigation occupy separate reserved space and never cover the card, guide, creator or actions. Keep the existing rounded floating appearance and positions. No blocking rectangular panel over the card. |
| Images/icons | Keep current containers, positions, crop/fill behavior, visual proportions, contrast and usable hit targets. Replacing artwork must not resize the layout. |
| Buddy loop | At the last Story/selected-preview card, another forward swipe or Return to first stop performs the approved jump and gentle direct return to the first card/place. Preserve cancellation and reduced-motion behavior. No layout changes are implied. |

The measured Story deck totals are 362dp for the 300dp public card and 390dp for the 328dp selected card, including progress controls and the stack edge. Fitted Story map height is available height minus measured footer, deck and the 8dp gap. Editor reserves its measured header/deck/footer and tight spacing. These values document the current implementation, not authorization to alter them during unrelated work.

## Verification for later UI changes

Use proportional checks; do not run a full suite for every cosmetic edit. For the affected page and relevant shared callers:

- State the exact requested visual change and the layout being preserved before editing.
- Inspect the dirty Git baseline and preserve prior work.
- Compare before/after appearance at the same viewport: map shape/status-bar area, card size and placement, guide/credit, actions, slider and bottom navigation.
- Check that normal portrait still does not scroll vertically; keep all controls visible and free of overlap. Existing horizontal card browsing and map gestures continue working.
- When shared Story layout changes are explicitly authorized, verify original public, public remixed and selected-preview variants. When editor components are affected, check saved-draft edit too.
- Exercise relevant short-screen, large-text, long/missing-title/description and missing-photo states when the change could affect them. Do not silently add new scrolling or hide controls to make a check pass.
- Record actual tests/device evidence, any unverified cases and whether the approved layout/scroll behavior was preserved. A device or tool limitation is not permission to redesign the page.

## Approval and evidence

Owner acceptance: the owner reports verifying the pages and approving their current design on 2026-10-31. Their expectation is responsive behavior across phones. This is acceptance of the layout, not evidence that every phone model, orientation or font setting has been physically tested.

Agent physical evidence in this session is from CPH2813, Android 16, 1080x2344, using the Mobile dev client and Metro 8081. Automated viewport/fallback, interaction, animation and static checks are recorded in the linked reports. Broader-device behavior remains unverified; do not claim universal compatibility from this single device.

Detailed local evidence:

- [Story layout](qa/story-fixed-layout-2026-10-31.md)
- [Editor layout](qa/editor-fixed-layout-2026-10-31.md)
- [Selected-stops preview](qa/customized-fixed-layout-2026-10-31.md)
- [Buddy loop and interruption checks](qa/story-loop-buddy-2026-10-31.md)

This baseline and all current code are local/unpublished on `codex/app-wide-dark-theme`, based on `0c5743b` plus the preserved working-tree changes. No commit, push, deployment or backend change is authorized by this documentation task.
