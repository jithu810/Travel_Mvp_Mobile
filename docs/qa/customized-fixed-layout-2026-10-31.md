# Selected-stops preview layout ? 2026-10-31

Focused local/unpublished UI fix. Existing Story/editor changes preserved.

Backend-impact assessment before editing: inspected Story route, StopCardDeck, StopTimeline, FloatingNavigation and customized route. Only layout sizing/footer measurement and existing main-link visibility change; local selection/remove/trip handlers, auth, persistence, API/RPC/query/Storage and GPS behavior unchanged. UI-only gate released; no live preflight or backend changes required/authorized.

Fixed normal-font fitted Story/selected card to328dp, with390dp deck including48dp browsing controls and14dp stack edge. Actual footer height includes selection note and swipe control; map receives exactly the remaining budget after390dp deck,12dp content padding and8dp gap. Fit requires130dp minimum map; short/error/large-font cases retain accessible scrolling. Footer background remains transparent and occupies normal layout space.

MainNavigationFrame now exposes its existing links and measured bottom slot on /customized/ previews with Story active. /customize/ picker and Travel remain unchanged.

Verification:90 affected Story/deck/Home-navigation tests pass, including measured-footer overflow fallback and restored /customized/ navigation visibility, selected Story destination and bottom clearance; /customize/ remains excluded. TypeScript and scoped ESLint pass. Diff whitespace checked.

Architect physical evidence: CPH2813 Android16,1080x2344, expected Mobile checkout Metro8081; customize-nav-fit.png in owner-local Temp shows full card author/About, selection note, slider and restored bottom navigation with Story selected. Earlier customize-fit.png documents clipping before the fix. Shared fixed328dp card retains the intended prior Story size. No live writes, navigation into Travel/GPS or publication performed. Independent final review handled by Architect.

Final Architect: physical vertical card drag leaves bounds unchanged (customize-drag-fixed.png scratch evidence), with full card, note, slider and nav visible. Independent Code Reviewer reports no actionable findings on final measured-footer/fixed-card/navigation diff; selection/remove/trip handlers unchanged. Checks unchanged and passing. Local/unpublished.


Final owner acceptance (2026-10-31): owner reports verifying the current pages. The canonical approved design and future UI preservation rules are in [Approved Mobile UI baseline](../approved-mobile-ui.md). Its final geometry supersedes intermediate values in this chronological report. No new scrolling, position/card/map-shape changes or layout redesign during button/icon/image/animation edits without explicit owner approval. Broad multi-phone compatibility has not been physically verified. Documentation-only update; prior code preserved, no backend impact, no app tests repeated. Links/instruction consistency/whitespace checked; local/unpublished.
