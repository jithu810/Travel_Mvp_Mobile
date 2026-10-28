# Selected journey story view — 2026-10-28

Assessment owner: Architect. Tier: focused, existing temporary-route presentation and removal interaction; independent review for shared-story regression risk.
Baseline: codex/customize-travel-preview at 6c6e6ec; pre-existing modifications only in AGENTS.md, CLAUDE.md and .claude/agents/*.md. Preserve those changes.
Inspected: src/app/customized/[id].tsx, src/app/journey/[id].tsx, src/components/journey/customize-stops.tsx, src/lib/journey/customized-travel.ts and travel route callers.
Backend impact: UI-only repository assessment. Customized routes remain process-memory snapshots; synthetic IDs must never reach public journey queries/social/remix. Existing queries, contracts, auth, persistence, RPCs and Storage remain unchanged. No live Supabase check required. Implementation gate released; live writes not authorized.
Plan: reuse JourneyStoryContent for selected-only route; expose temporary-only removal, no add/edit/delete-original actions; guard active/paused sessions and last remaining stop. Preserve selected order and local travel handoff. Original Story unchanged.
Checks planned: affected customization/story behavior tests, TypeScript and scoped lint, phone visual inspection, independent review. Local changes only; no publication authorized.

## Verification result
- Implemented shared JourneyStoryContent temporary mode with selected-only map/cards/details, Remove/About, and Swipe to journey. No Add stop or public social/Remix/refresh actions in this view.
- Removal is memory-only, preserves original order/source and captured snapshots, updates old-token aliases, and rejects active/paused/stale/last-stop edits.
- Passed: 87 affected customization/story tests, TypeScript, scoped ESLint and diff whitespace check. Full suite skipped for focused scope.
- Independent Code Reviewer: no actionable findings in scoped stable diff.
- Physical device: CPH2813, Android 16, wireless 192.168.1.2:32859, Codex Metro8081 serving this checkout. Opened selection completion with four selected/one discarded; selected journey showed Stop1of4, map/cards, Remove and Swipe to journey, no Add. Removed Temple: Stop1of3 and Lullu mall became first. Swiped to Travel: three numbered map stops, To Lullu mall, Ready to start and Begin Trip. Begin Trip was not pressed; actual GPS trip, active/paused guards on device, TalkBack/large text remain pending (guards covered by tests). Returned to selected journey page. Screenshot inspected from scratch temp folder; no screenshots committed.
- No backend writes, dependencies, native build changes, commits or publication. Existing instruction changes preserved.

## Follow-up: running Buddy and return to cards
Baseline: previous selected-story task changes plus unrelated instruction edits remain local. Focused tier. Inspected shared journey Story, customized wrapper, customize deck, map-frame/native-map/StoryWalkingBuddy and existing running mode. UI-only: existing playback motion prop and stack-back navigation, unchanged backend/auth/persistence/API/Storage; no live check required, implementation gate released.
Plan: temporary Story maps use existing run motion; visible back control returns to retained Customize deck for Undo/reselection, with safe missing-history behavior. Preserve normal Story walk and focused/foreground/reduced-motion safeguards. Check affected interaction/playback/customize tests, TypeScript/scoped lint and device; independent review for shared-view regression.
Follow-up investigation: src/lib/buddy/model.ts route allowlist omitted /customized/*, so Buddy store suppressed this page even though shared Story playback was wired. Scope includes narrowly allowing customized preview route in existing Buddy policy; /customize deck remains excluded. Existing visibility/accessibility/lifecycle guards retained.

Follow-up verification complete: 147 affected customization/story/playback/Buddy tests, TypeScript, scoped ESLint and diff check passed. Independent review: no actionable findings. Physical CPH2813/Android16: selected five stops, opened temporary Story, observed Buddy on map and running between Home and Temple when Next memory changed the card; Back to cards is visible below map with no Fit/help/expand overlap and returned to All5stops decided / 5selected with Undo available. No GPS trip/live writes. Compact native view and retained stack confirmed; expanded-map motion covered by wiring/tests, expanded native animation and broader accessibility remain pending. Changes remain unpublished.

Publication checkpoint: owner explicitly approved branch publication and merging PR #22 into main. Existing focused test/typecheck/lint/review evidence reused for unchanged application snapshot. Unrelated instruction files excluded. No live backend writes or manual deployments authorized/performed.
